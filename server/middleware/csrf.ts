/**
 * Protection CSRF et limitation de tentatives.
 *
 * ## Pourquoi un jeton CSRF alors que le cookie est `SameSite=Lax`
 *
 * `Lax` bloque le cookie sur les requetes **cross-site** de premier niveau,
 * donc un `<form>` ou un `fetch` declenche depuis une page tierce n'est pas
 * authentifie. En revanche, `Lax` autorise explicitement les requetes
 * **de meme site** et les navigations de premier niveau. Concretement :
 * une page-XSS sur `http://localhost:5173` (ou un sous-domaine vole) est
 * « de meme site » et peut donc emettre `POST /api/ventes` avec le cookie.
 *
 * Le jeton CSRF ferme ce reste : meme si le cookie part, un en-tete
 * `X-CSRF-Token` est exige, et l'attaquant d'un autre site ne peut pas le
 * lire a cause de la politique d'origine du navigateur.
 *
 * ## Pourquoi une double soumission
 *
 * Le jeton n'est pas conserve en base : il est pose dans un cookie **non
 * `httpOnly`** et compare a l'en-tete. Un cookie lisible par le JavaScript de
 * la page ne peut pas etre lu par un site tiers ; l'en-tete, lui, ne peut pas
 * etre pose depuis un autre site. Les deux concorder est donc la preuve
 * qu'un tiers n'a pas forge la requete.
 */

import type { NextFunction, Request, Response } from 'express'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const CSRF_COOKIE = 'autostrass_csrf'

/** Longueur du jeton en octets : 32 entiers, 64 caracteres hexadecimaux. */
const TOKEN_BYTES = 32

/** Requetes qui ne modifient rien et ne necesitan donc pas de jeton. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Genere un jeton CSRF aleatoire. */
export function generateCsrfToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

/**
 * Comparaison a temps constant de deux jetons.
 *
 * Un `===` ordinaire s'arrete au premier caractere different et revele, par
 * le temps mis a repondre, combien de caracteres corrects ont ete devines.
 * Sur un jeton de 64 caracteres, cela rend le forcage progressif possible.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  // `createHash` met les deux valeurs a longueur fixe : `timingSafeEqual`
  // refuse les entrees de tailles differentes, et la longueur du jeton est
  // fixe par construction.
  const bufferA = createHash('sha256').update(a, 'utf8').digest()
  const bufferB = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(bufferA, bufferB)
}

/** Lit un cookie par son nom. */
function readCookie(request: Request, name: string): string | null {
  const header = request.headers.cookie
  if (typeof header !== 'string') return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('=')) || null
  }
  return null
}

/** Pose le cookie CSRF, et renvoie le jeton pour que la route le transporte. */
export function issueCsrfCookie(response: Response, secure: boolean): string {
  const token = generateCsrfToken()
  response.cookie(CSRF_COOKIE, token, {
    // Lisible par le JavaScript de la page : le client doit le recopier dans
    // l'en-tete `X-CSRF-Token`. Ce n'est pas une fuite — un site tiers ne peut
    // pas lire les cookies d'un autre site.
    httpOnly: false,
    sameSite: 'strict',
    secure,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  })
  return token
}

/** Nom du cookie CSRF, pour que le client puisse le lire. */
export const CSRF_COOKIE_NAME = CSRF_COOKIE

/** Nom de l'en-tete porteur du jeton. */
export const CSRF_HEADER = 'x-csrf-token'

/**
 * Exige un jeton CSRF valide sur toute requete mutante.
 *
 * A monter **apres** `requireAuth` : inutile de verifier un jeton pour une
 * requete qui sera refusee de toute facon.
 */
export function requireCsrf(request: Request, _response: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(request.method)) {
    next()
    return
  }

  const cookie = readCookie(request, CSRF_COOKIE)
  const header = request.headers[CSRF_HEADER]

  if (cookie === null || typeof header !== 'string' || header.length === 0) {
    next(
      Object.assign(new Error('Jeton CSRF manquant ou invalide.'), {
        status: 403,
        code: 'CSRF_INVALID',
      }),
    )
    return
  }

  if (!safeEqual(cookie, header)) {
    next(
      Object.assign(new Error('Jeton CSRF manquant ou invalide.'), {
        status: 403,
        code: 'CSRF_INVALID',
      }),
    )
    return
  }

  next()
}

// ---------------------------------------------------------------------------
// Limitation de tentatives
// ---------------------------------------------------------------------------

/**
 * Compteur de tentatives en memoire, a fenetre glissante.
 *
 * Portee : **un seul processus**. Derriere un load balancer, chaque instance
 * compte de son cote, donc la limite effective est multipliee par le nombre
 * d'instances. Pour un depot a une instance c'est suffisant ; au-dela, il
 * faut un stockage partage (Redis, ou une table dediee). Le defaut est
 * volontairement genereux pour ne pas bloquer un depot legitime.
 */
interface Bucket {
  /** Horodatages des tentatives encore dans la fenetre. */
  hits: number[]
  /** Blocage en cours, jusqu'a cet instant. */
  blockedUntil: number
}

const buckets = new Map<string, Bucket>()

/** Fenetre d'observation, en millisecondes. */
const WINDOW_MS = 15 * 60 * 1000
/** Nombre de tentatives tolerees par fenetre et par identite. */
const MAX_ATTEMPTS = 10
/** Duree du blocage apres depassement, en millisecondes. */
const BLOCK_MS = 15 * 60 * 1000

/**
 * Identite de tentatives : adresse IP. Suffisant pour un depot interne ou
 * l'API est sur un reseau prive.
 */
function clientKey(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? 'inconnu'
}

/**
 * Namespace de comptage, derive du chemin de la route.
 *
 * Sans cela, la limite est partagee entre toutes les routes : un blocage sur
 * `/api/auth/login` contaminerait les autres, et surtout la suite de tests
 * (qui enchaine des connexions valides) se bloquerait elle-meme. Chaque
 * famille de routes a son propre compteur.
 */
function bucketKey(request: Request): string {
  // `/api/auth/login` et `/api/une/autre/ressource` sont deux compteurs.
  const segments = request.path.split('/').filter(Boolean)
  const family = segments.slice(0, 3).join('/')
  return `${clientKey(request)}|${family}`
}

/** Purge les entrees expirees pour eviter une croissance illimitee de la Map. */
function prune(bucket: Bucket, now: number, windowMs: number): void {
  bucket.hits = bucket.hits.filter((time) => now - time < windowMs)
}

/** Etat courant d'une identite. */
export function rateLimitState(request: Request): { attempts: number; blocked: boolean } {
  const bucket = buckets.get(bucketKey(request))
  if (bucket === undefined) return { attempts: 0, blocked: false }
  const now = Date.now()
  prune(bucket, now, WINDOW_MS)
  return { attempts: bucket.hits.length, blocked: bucket.blockedUntil > now }
}

/**
 * Limite les tentatives par adresse IP sur la fenetre glissante.
 *
 * Applique a `/api/auth/login` : c'est la seule action par laquelle un
 * attaquant peut obtenir un acces, et la seule ou un mot de passe peut etre
 * devine. Le reste de l'API est derriere un jeton deja obtenu.
 *
 * ## Seules les tentatives ECHOUEES sont comptees
 *
 * Compter toutes les requetes punirait l'utilisateur legitime : un depot
 * voit plusieurs caisses se connecter au fil de la journee, et un depotier qui
 * se trompe de mot de passe dix fois dans la matinee serait bloque, alors
 * que l'attaquant n'a progresse sur rien. Seuls les echecs revelent une
 * tentative.
 *
 * L'efficacite pour l'attaquant reste la meme : un forcage brute doit
 * presenter des mots de passe errones, donc il est compte lui aussi. Le
 * succes remet le compteur a zero, ce qui permet aussi a un utilisateur
 * legitime de « purger » ses erreurs precedentes.
 */
export function rateLimit(options: { limit?: number; windowMs?: number; blockMs?: number } = {}) {
  const limit = options.limit ?? MAX_ATTEMPTS
  const windowMs = options.windowMs ?? WINDOW_MS
  const block = options.blockMs ?? BLOCK_MS

  /**
   * Enregistre un echec ; repond 429 si le compteur est epuise.
   *
   * `emitTooMany` repond via la fonction d'origine, **jamais** via
   * `response.status`. Ce dernier est remplace, dans le middleware retour, par
   * un wrapper qui rappelle `registerFailure` sur tout code >= 400 : y passer
   * ferait boucler `status(429)` -> `registerFailure` -> `status(429)` jusqu'a
  /**
   * Enregistre un echec et indique si le compteur vient d'etre epuise.
   *
   * Cette fonction n'envoie **jamais** de reponse : elle ne fait que tenir le
   * compteur. Deux raisons, l'une et l'autre un bug observe :
   *
   * 1. Appeler `response.status(429)` ici repassait par le remplacement de
   *    `status` installe plus bas, qui rappelle `registerFailure` : la boucle
   *    `status(429)` -> `registerFailure` -> `status(429)` allait jusqu'a la
   *    ligne de pile.
   * 2. Envoyer la reponse ici **et** laisser le handler continuer produisait
   *    un double envoi (`ERR_HTTP_HEADERS_SENT`) : le 429 partait, puis le
   *    handler tentait sa propre reponse.
   *
   * Le handler laisse faire : c'est lui qui repond, une seule fois, apres avoir
   * consulte le retour de cette fonction.
   */
  function registerFailure(request: Request): boolean {
    const key = bucketKey(request)
    const now = Date.now()
    const bucket = buckets.get(key) ?? { hits: [], blockedUntil: 0 }
    prune(bucket, now, windowMs)

    if (bucket.blockedUntil > now) return true

    bucket.hits.push(now)
    if (bucket.hits.length >= limit) {
      bucket.blockedUntil = now + block
      buckets.set(key, bucket)
      return true
    }

    buckets.set(key, bucket)
    return false
  }

  /** Pose le 429 : un seul point de sortie dans tout le middleware. */
  function tooManyAttempts(response: Response, blockedUntil: number): void {
    const retryAfter = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000))
    if (!response.headersSent) {
      response.setHeader('Retry-After', String(retryAfter))
      response.status(429).json({
        error: 'TOO_MANY_ATTEMPTS',
        message: `Trop de tentatives. Reessayez dans ${Math.max(1, Math.ceil(retryAfter / 60))} minute(s).`,
      })
    }
  }

  return (request: Request, response: Response, next: NextFunction): void => {
    // Blocage deja actif : on refuse sans meme consulter la base. Ce chemin
    // n'installe pas le remplacement de `status` : il repond et s'arrete.
    const current = buckets.get(bucketKey(request))
    if (current !== undefined && current.blockedUntil > Date.now()) {
      tooManyAttempts(response, current.blockedUntil)
      return
    }

    // La reponse est interceptee pour compter l'echec apres coup : on ne peut
    // pas le savoir avant, et un middleware ne voit pas l'issue du handler.
    const originalStatus = response.status.bind(response)
    const originalJson = response.json.bind(response)

    response.status = ((code: number) => {
      if (code >= 400 && code !== 429) registerFailure(request)
      return originalStatus(code)
    }) as typeof response.status

    // Un succes purge le compteur. Le point d'observation est `json` et non
    // `status` : un handler peut poser un 401 puis renvoyer autre chose, et on
    // ne veut effacer le compteur que sur une reponse **reellement** envoyee.
    response.json = ((body?: unknown) => {
      if (!response.headersSent && response.statusCode < 400) {
        buckets.delete(bucketKey(request))
      }
      return originalJson(body)
    }) as typeof response.json

    next()
  }
}

/** Remet a zero les compteurs. Reserve aux tests. */
export function resetRateLimits(): void {
  buckets.clear()
}
