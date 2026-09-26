/**
 * Routes d'authentification.
 *
 * Le jeton de session est renvoye dans le corps de la reponse **et** dans un
 * cookie `httpOnly` : le corps permet au client de le stocker en memoire, le
 * cookie permet aux requetes natives (et au rechargement de page) de passer
 * sans manipulation manuelle.
 *
 * Un jeton CSRF accompagne ce cookie, car `SameSite=Lax` n'interdit pas les
 * requetes emanant du meme site : voir l'analyse en tete de `csrf.ts`.
 */

import { Router } from 'express'
import { AUTH_COOKIE, authenticate, issueToken, verifyToken, AuthError, type AuthenticatedUser } from './auth.js'
import { handler, parseBody } from './crud.js'
import { loginBodySchema } from './schemas.js'
import { issueCsrfCookie, rateLimit, CSRF_COOKIE_NAME } from './csrf.js'

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

  router.post(
    '/login',
    // Limite avant toute verification : c'est la seule action ou un mot de
    // passe peut etre devine, donc la seule qui merite un compteur.
    rateLimit(),
    handler(async (request, response) => {
      const value = parseBody(loginBodySchema, request.body)
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
      // expiration. Un stockage de jetons revocationnables serait necessaire
      // pour un deconnexion immediate et definitif.
      response.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined })
      response.clearCookie(CSRF_COOKIE_NAME, { path: '/', secure: useSecureCookies })
      response.status(204).end()
    }),
  )

  /** Verifie la validite du jeton courant sans renvoyer d'information sensible. */
  router.get(
    '/me',
    handler(async (request, response) => {
      const token = readToken(request)
      if (!token) throw new AuthError(401, 'UNAUTHENTICATED', 'Authentification requise.')
      const payload = await verifyToken(token)
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        nom: payload.nom,
        prenom: payload.prenom,
      }
      // Renouvelle le jeton CSRF a chaque verification : apres un expiration
      // de session, l'ancien couple cookie/jeton ne doit pas rester valable.
      const csrf = issueCsrfCookie(response, useSecureCookies)
      response.json({ user, csrfToken: csrf })
    }),
  )

  return router
}

/** Extrait le jeton de l'en-tete ou du cookie, pour `/me`. */
function readToken(request: import('express').Request): string | null {
  const header = request.headers.authorization
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7).trim() || null
  }
  const cookies = request.headers.cookie
  if (typeof cookies !== 'string') return null
  for (const part of cookies.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === AUTH_COOKIE) return decodeURIComponent(rest.join('=')) || null
  }
  return null
}
