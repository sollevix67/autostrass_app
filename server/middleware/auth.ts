/**
 * Authentification par jeton JWT (HS256) et controle d'acces par role.
 *
 * Choix techniques :
 * - `jose` plutot que `jsonwebtoken` : maintenu, sans dependance native, et
 *   compatible Web Crypto, donc utilisable cote navigateur plus tard si besoin.
 * - Le jeton ne contient que l'identite et le role. Il n'est pas
 *   revoque : un compte desactive doit donc invalider ses jetons, ce que le
 *   middleware verifie a chaque requete en relisant `users.actif`.
 * - La signature est verifiee en premier : un jeton non signe ne doit jamais
 *   atteindre la logique metier, meme si son contenu est plausible.
 */

import type { NextFunction, Request, Response } from 'express'
import { jwtVerify, SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { db } from '../db/client.js'
import { UtilisateurRepository } from '../repositories/utilisateurRepository.js'
import type { UserRole } from '../db/schema.js'

/** Duree de validite du jeton : une jornada de travail. */
const TOKEN_TTL = '12h'

export const AUTH_COOKIE = 'autostrass_token'

/** Claims portes par le jeton. */
export type TokenPayload = {
  sub: number
  email: string
  role: UserRole
  nom: string
  prenom: string
}

/** Utilisateur authentifie, attache a la requete. */
export type AuthenticatedUser = {
  id: number
  email: string
  role: UserRole
  nom: string
  prenom: string
}

/**
 * Extension de `Request` portant l'utilisateur authentifie.
 * Le proprietaire est optionnel : il est present uniquement apres `requireAuth`.
 */
export type AuthenticatedRequest = Request & { user?: AuthenticatedUser }

/** Erreur metier d'authentification, traduite en 401/403 par le middleware. */
export class AuthError extends Error {
  constructor(
    readonly status: 401 | 403,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Secret de signature. Refuse de demarrer avec une valeur absente ou trop
 * courte : un secret faible rend le jeton falsifiable.
 */
function signingKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET absent ou trop court (32 caracteres minimum requis).')
  }
  return new TextEncoder().encode(secret)
}

/** Delivre un jeton signe pour un utilisateur. */
export async function issueToken(user: AuthenticatedUser): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role, nom: user.nom, prenom: user.prenom })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setIssuer('autostrass-api')
    .setAudience('autostrass-web')
    .setExpirationTime(TOKEN_TTL)
    .sign(signingKey())
}

/** Verifie un jeton et retourne ses claims, ou leve une `AuthError` 401. */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      issuer: 'autostrass-api',
      audience: 'autostrass-web',
    })
    const sub = Number(payload.sub)
    if (!Number.isInteger(sub) || sub <= 0) {
      throw new AuthError(401, 'INVALID_TOKEN', 'Jeton invalide.')
    }
    return {
      sub,
      email: String(payload.email ?? ''),
      role: payload.role as UserRole,
      nom: String(payload.nom ?? ''),
      prenom: String(payload.prenom ?? ''),
    }
  } catch (error) {
    // Une `AuthError` levee explicitement est deja correcte : on la relaie.
    if (error instanceof AuthError) throw error
    throw new AuthError(401, 'INVALID_TOKEN', 'Jeton invalide ou expire.')
  }
}

/**
 * Verifie un couple email / mot de passe.
 *
 * Deux cas volontairement indistinguables pour l'appelant : email inconnu et
 * mot de passe errone. Repondre « utilisateur introuvable » a la place de
 * « mot de passe invalide » permettrait d enumerer les comptes existants.
 */
export async function authenticate(email: string, password: string): Promise<AuthenticatedUser> {
  if (!db) throw new AuthError(401, 'AUTH_UNAVAILABLE', 'Base de donnees non configuree.')

  const repository = new UtilisateurRepository(db)
  const found = await repository.findByEmailWithSecret(email)
  if (!found) throw new AuthError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.')

  const matches = await bcrypt.compare(password, found.passwordHash)
  if (!matches) throw new AuthError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.')

  if (!found.actif) throw new AuthError(403, 'ACCOUNT_DISABLED', 'Ce compte est desactive.')

  return {
    id: found.id,
    email: found.email,
    role: found.role,
    nom: found.nom,
    prenom: found.prenom,
  }
}

/** Hash d'un mot de passe, au cout par defaut de bcrypt (10). */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

/**
 * Regles de robustesse du mot de passe. Un depot manipule des paiements et
 * des acces vehicules : 8 caracteres minimum, et le mot de passe de
 * demonstration est refuse tant que les comptes de test sont en base.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caracteres.'
  if (password === 'demo1234') return 'Ce mot de passe est reserve aux comptes de demonstration.'
  return null
}

/** Extrait le jeton de l'en-tete `Authorization` ou du cookie. */
function readToken(request: Request): string | null {
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

/**
 * Exige un jeton valide et attache l'utilisateur a la requete.
 *
 * Le compte est relu en base a chaque requete : c'est ce qui permet de
 * desactiver un utilisateur sans attendre l'expiration de son jeton.
 */
export async function requireAuth(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const token = readToken(request)
    if (!token) throw new AuthError(401, 'UNAUTHENTICATED', 'Authentification requise.')

    const payload = await verifyToken(token)

    if (!db) throw new AuthError(401, 'AUTH_UNAVAILABLE', 'Base de donnees non configuree.')
    const repository = new UtilisateurRepository(db)
    const user = await repository.findById(payload.sub)

    // Compte supprime, desactive, ou role change depuis l'emission du jeton :
    // dans les trois cas, on applique l'etat courant et on ignore le jeton.
    if (!user) throw new AuthError(401, 'ACCOUNT_MISSING', 'Compte introuvable.')
    if (!user.actif) throw new AuthError(403, 'ACCOUNT_DISABLED', 'Ce compte est desactive.')
    if (user.role !== payload.role) {
      throw new AuthError(401, 'ROLE_CHANGED', 'Vos droits ont change. Reconnectez-vous.')
    }

    ;(request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    }
    next()
  } catch (error) {
    next(error instanceof AuthError ? error : new AuthError(401, 'UNAUTHENTICATED', 'Authentification requise.'))
  }
}

/**
 * Restreint une route a certains roles. `admin` passe partout : il est le role
 * de supervision du depot, pas un role metier parmi d'autres.
 */
export function requireRole(...roles: readonly UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const user = (request as AuthenticatedRequest).user
    if (!user) {
      next(new AuthError(401, 'UNAUTHENTICATED', 'Authentification requise.'))
      return
    }
    if (user.role !== 'admin' && !roles.includes(user.role)) {
      next(new AuthError(403, 'FORBIDDEN', "Vous n'avez pas les droits necessaires pour cette operation."))
      return
    }
    next()
  }
}
