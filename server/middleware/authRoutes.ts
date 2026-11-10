/**
 * Routes d'authentification.
 *
 * Le jeton de session est renvoyé dans le corps de la réponse **et** dans un
 * cookie `httpOnly` : le corps permet au client de le stocker en mémoire, le
 * cookie permet aux requêtes natives (et au rechargement de page) de passer
 * sans manipulation manuelle.
 *
 * Un jeton CSRF accompagne ce cookie, car `SameSite=Lax` n'interdit pas les
 * requêtes émanant du même site : voir l'analyse en tête de `csrf.ts`.
 */

import { Router } from 'express'
import { AUTH_COOKIE, authenticate, issueToken, requireAuth, type AuthenticatedRequest } from './auth.js'
import { handler, parseBody } from './crud.js'
import { loginBodySchema } from './schemas.js'
import { issueCsrfCookie, rateLimit, CSRF_COOKIE_NAME } from './csrf.js'
import { getSettings } from '../services/settingsStore.js'
import { verifyTurnstile } from '../services/turnstile.js'

/** Duree du cookie de session, alignee sur la duree du jeton (12 h). */
const COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000

/** `secure` n'est actif qu'en production : en local on sert du HTTP. */
const useSecureCookies = process.env.NODE_ENV === 'production'

/** Options du cookie de session. */
const cookieOptions = {
  httpOnly: true,
  // `lax` et non `strict` : avec `strict`, un lien externe vers le depot
  // (mailto dans un mail, lien dans un ticket) arriverait sans cookie et
  // l'utilisateur devrait se reconnecter. La protection CSRF du
  // double-soumission couvre ce que `lax` laisse passer.
  sameSite: 'lax' as const,
  secure: useSecureCookies,
  path: '/',
  maxAge: COOKIE_MAX_AGE_MS,
}

export function createAuthRouter(): Router {
  const router = Router()

  router.get('/configuration', (_request, response) => {
    const { enabled, siteKey } = getSettings().turnstile
    response.setHeader('Cache-Control', 'no-store')
    response.json({ enabled, siteKey: enabled ? siteKey : '' })
  })

  router.post(
    '/login',
    // Limite avant toute vérification : c'est la seule action où un mot de
    // passe peut etre devine, donc la seule qui merite un compteur.
    rateLimit(),
    handler(async (request, response) => {
      const value = parseBody(loginBodySchema, request.body)
      await verifyTurnstile(getSettings().turnstile, value.turnstileToken, 'login')
      const user = await authenticate(value.email, value.motDePasse)
      const token = await issueToken(user)
      const csrf = issueCsrfCookie(response, useSecureCookies)

      response.cookie(AUTH_COOKIE, token, cookieOptions)
      // Le jeton CSRF est renvoye dans le corps : le client le stocke en
      // memoire et le renvoie dans `X-CSRF-Token` sur chaque ecriture.
      response.json({ token, csrfToken: csrf, user })
    }),
  )

  /**
   * Sonde de limitation de tentatives, reservee aux tests.
   *
   * Elle a son propre compteur (`/api/auth/rate-limit` != `/api/auth/login`),
   * donc `scripts/test-security.ts` peut saturer celle-ci sans bloquer les
   * connexions reelles : sans ce separation, la suite de securite
   * empecherait ensuite `test-api.ts` de se connecter pendant 15 minutes.
   *
   * Absente en production : le router n'est pas monte du tout.
   */
  if (process.env.NODE_ENV !== 'production') {
    router.post(
      '/rate-limit-probe',
      // `limit: 5, blockMs: 60s` : assez pour saturer en 8 appels, assez
      // court pour ne pas gener la reprise de poste apres un redemarrage.
      rateLimit({ limit: 5, windowMs: 60_000, blockMs: 60_000 }),
      handler(async (_request, response) => {
        // 500 volontaire : le compteur ne compte que les ECHECS, cette sonde
        // doit donc « echouer » pour etre comptee.
        response.status(500).json({ error: 'PROBE', message: 'Sonde de test.' })
      }),
    )
  }

  router.post(
    '/logout',
    handler(async (_request, response) => {
      // Le cookie est efface, pas le jeton : celui-ci reste valide jusqu'a
      // expiration. Un stockage de jetons révocationnables serait nécessaire
      // pour un deconnexion immediate et definitif.
      response.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined })
      response.clearCookie(CSRF_COOKIE_NAME, { path: '/', secure: useSecureCookies })
      response.status(204).end()
    }),
  )

  /** Verifie la validite du jeton courant sans renvoyer d'information sensible. */
  router.get(
    '/me',
    requireAuth,
    handler(async (request, response) => {
      // requireAuth relit le compte : identité actuelle et droits vérifiés.
      const user = (request as AuthenticatedRequest).user!
      // Renouvelle le jeton CSRF à chaque vérification : après un expiration
      // de session, l'ancien couple cookie/jeton ne doit pas rester valable.
      const csrf = issueCsrfCookie(response, useSecureCookies)
      response.json({ user, csrfToken: csrf })
    }),
  )

  return router
}
