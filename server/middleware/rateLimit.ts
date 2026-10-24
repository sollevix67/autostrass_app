/**
 * Limitation du debit (rate limiting) par IP.
 *
 * CodeQL signale les handlers qui exercent une autorisation sans etre limites
 * en debit : sans plafond, une meme source peut epuiser les ressources du
 * serveur (cycle DB, tentatives d'authentification) par simple repetition.
 *
 * La politique retenue est deliberement simple et partagee : 100 requetes par
 * fenetre glissante de 15 minutes et par identite appelee (IP, ou login lors
 * des tentatives d'authentification). Ce plafond est hors de portee d'un usage
 * d'atelier normal — y compris avec plusieurs PDA Zebra TC22 derriere le meme
 * NAT — et suffit a neutralir un balayage automatise.
 *
 * La reponse 429 porte `Retry-After` : les clients bien concus (PWA, client
 * mobile) savent l'attendre au lieu de rejouer immediatement.
 *
 * Aucune dependance externe n'est utilisee : une carte en memoire suffit au
 * deploiement mono-instance vise par le depot.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** Nombre de requetes autorisees par fenetre, par identite. */
const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 100

type Bucket = { count: number; resetAt: number }

/**
 * Compteurs par identite.
 *
 * L'entree est soit l'IP du client, soit, pour les routes d'authentification,
 * le login saisi : deux attaquants distincts ne doivent pas partager un
 * compteur, mais une attaque par dictionnaire sur un compte precis doit etre
 * plafonnee meme si elle provient de plusieurs IP.
 */
const buckets = new Map<string, Bucket>()

/** Purge periodique des buckets expires : evite une croissance non bornee. */
const sweeper = setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, WINDOW_MS)
sweeper.unref()

/**
 * Identite utilisee pour le compteur.
 *
 * `request.ip` satisfait `req.ip`, l'adresse distante reelle ; en reverse
 * proxy, `app.set('trust proxy', ...)` cote serveur doit etre ajuste au
 * deploiement pour eviter qu'une valeur forgeable ne serve de cle.
 */
function identityFor(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? 'unknown'
}

/** Cle dediee aux tentatives d'authentification (par login saisi). */
function loginIdentityFor(request: Request, body: unknown): string {
  if (body && typeof body === 'object' && 'login' in body) {
    const login = (body as { login?: unknown }).login
    if (typeof login === 'string' && login.length > 0) {
      return `login:${login.toLowerCase().slice(0, 64)}`
    }
  }
  return `ip:${identityFor(request)}`
}

/**
 * Limite le debit d'une route autorisee.
 *
 * @param useLoginIdentity dedie le compteur au login saisi quand le corps de
 * requete en contient un (route de connexion). Laisse a `false` partout
 * ailleurs : la cle reste l'IP.
 */
export function rateLimit(useLoginIdentity = false): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    const key = useLoginIdentity ? loginIdentityFor(request, request.body) : identityFor(request)
    const now = Date.now()

    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + WINDOW_MS }
      buckets.set(key, bucket)
    }

    bucket.count += 1
    const remaining = Math.max(0, MAX_REQUESTS - bucket.count)

    response.setHeader('RateLimit-Limit', String(MAX_REQUESTS))
    response.setHeader('RateLimit-Remaining', String(remaining))
    response.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > MAX_REQUESTS) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
      response.setHeader('Retry-After', String(retryAfter))
      response.status(429).json({
        error: 'RATE_LIMITED',
        message: `Trop de requetes. Reessayez dans ${retryAfter} secondes.`,
      })
      return
    }

    next()
  }
}

/**
 * Limite specifique aux tentatives d'authentification.
 *
 * Plafond plus bas (10 par fenetre) et compte par login : c'est le vecteur de
 * devinette de mot de passe, pas la charge du serveur, qu'il faut freiner.
 * Une derive sur un compte precis est donc bloquee rapidement meme repartie
 * sur plusieurs IP, sans penaliser les utilisateurs voisins.
 */
export function authRateLimit(): RequestHandler {
  const bucketByLogin = new Map<string, Bucket>()
  const sweeper = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of bucketByLogin) {
      if (bucket.resetAt <= now) bucketByLogin.delete(key)
    }
  }, WINDOW_MS)
  sweeper.unref()

  const AUTH_MAX = 10

  return (request: Request, response: Response, next: NextFunction): void => {
    const key = loginIdentityFor(request, request.body)
    const now = Date.now()

    let bucket = bucketByLogin.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + WINDOW_MS }
      bucketByLogin.set(key, bucket)
    }

    bucket.count += 1
    const remaining = Math.max(0, AUTH_MAX - bucket.count)

    response.setHeader('RateLimit-Limit', String(AUTH_MAX))
    response.setHeader('RateLimit-Remaining', String(remaining))
    response.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > AUTH_MAX) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
      response.setHeader('Retry-After', String(retryAfter))
      response.status(429).json({
        error: 'RATE_LIMITED',
        message: `Trop de tentatives de connexion. Reessayez dans ${retryAfter} secondes.`,
      })
      return
    }

    next()
  }
}
