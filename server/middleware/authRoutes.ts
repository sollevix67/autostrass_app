/**
 * Routes d'authentification.
 *
 * Le jeton est renvoye dans le corps de la reponse **et** dans un cookie
 * `httpOnly` : le corps permet au client de le stocker en memoire, le cookie
 * permet aux requetes natives (et au rechargement de page) de passer sans
 * manipulation manuelle. Le `sameSite=lax` bloque l'envoi cross-site, le
 * `secure` est active en production.
 */

import { Router } from 'express'
import { AUTH_COOKIE, authenticate, issueToken, verifyToken, AuthError, type AuthenticatedUser } from './auth.js'
import { handler, parseBody } from './crud.js'
import { loginBodySchema } from './schemas.js'

/** Duree du cookie, alignee sur la duree du jeton (12 h). */
const COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000

/** Options du cookie de session. */
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // En local on sert du HTTP : `secure` immobiliserait le cookie.
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: COOKIE_MAX_AGE_MS,
}

export function createAuthRouter(): Router {
  const router = Router()

  router.post(
    '/login',
    handler(async (request, response) => {
      const value = parseBody(loginBodySchema, request.body)
      const user = await authenticate(value.email, value.motDePasse)
      const token = await issueToken(user)

      response.cookie(AUTH_COOKIE, token, cookieOptions)
      response.json({ token, user })
    }),
  )

  router.post(
    '/logout',
    handler(async (_request, response) => {
      // Le cookie est efface, pas le jeton : celui-ci reste valide jusqu'a
      // expiration. Un stockage de jetons revocationnables serait necessaire
      // pour un deconnexion immediate et definitif.
      response.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined })
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
      response.json({ user })
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
