/**
 * Repository des utilisateurs.
 *
 *_isole du `SimpleRepository` pour une raison de securite : `password_hash`
 * ne doit jamais quitter cette couche. `list()` et `findById()` selectionnent
 * explicitement les colonnes exposees ; seul `findByEmailWithSecret()`
 * renvoie le hash, et il n'est appele que par le service d'authentification.
 */

import { asc, eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '../db/schema.js'
import { toIsoString } from './mapping.js'
import { toRepositoryError, type RepositoryError } from './simpleRepositories.js'

type Tables = typeof schema

/** Utilisateur expose par l'API. Le hash n'existe pas dans ce type. */
export type UtilisateurRow = {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string | null
  role: schema.UserRole
  actif: boolean
  createdAt: string
  updatedAt: string
}

/** Utilisateur enrichi du hash : usage unique, verification de mot de passe. */
export type UtilisateurAuth = UtilisateurRow & { passwordHash: string }

export type UtilisateurInput = {
  nom: string
  prenom: string
  email: string
  telephone?: string | null
  role: schema.UserRole
  actif: boolean
  passwordHash: string
}

/** Projection publique : liste explicite pour ne pas avoir a retirer le hash. */
const PUBLIC_COLUMNS = {
  id: schema.users.id,
  nom: schema.users.nom,
  prenom: schema.users.prenom,
  email: schema.users.email,
  telephone: schema.users.telephone,
  role: schema.users.role,
  actif: schema.users.actif,
  createdAt: schema.users.createdAt,
  updatedAt: schema.users.updatedAt,
} as const

function mapUtilisateur(raw: Record<string, unknown>): UtilisateurRow {
  return {
    id: Number(raw.id),
    nom: String(raw.nom ?? ''),
    prenom: String(raw.prenom ?? ''),
    email: String(raw.email ?? ''),
    telephone: raw.telephone === null || raw.telephone === undefined ? null : String(raw.telephone),
    role: (raw.role as schema.UserRole) ?? 'caissier',
    // mysql2 renvoie 0 ou 1 pour un BOOLEAN : on normalise en `boolean`.
    actif: Boolean(raw.actif),
    createdAt: toIsoString(raw.created_at as Date | null),
    updatedAt: toIsoString(raw.updated_at as Date | null),
  }
}

export class UtilisateurRepository {
  constructor(private readonly db: MySql2Database<Tables>) {}

  async list(): Promise<UtilisateurRow[]> {
    const rows = await this.db.select(PUBLIC_COLUMNS).from(schema.users).orderBy(asc(schema.users.nom))
    return rows.map((row) => mapUtilisateur(row as unknown as Record<string, unknown>))
  }

  async findById(id: number): Promise<UtilisateurRow | null> {
    const rows = await this.db.select(PUBLIC_COLUMNS).from(schema.users).where(eq(schema.users.id, id)).limit(1)
    const row = rows[0]
    return row ? mapUtilisateur(row as unknown as Record<string, unknown>) : null
  }

  /**
   * Recherche par email avec le hash. Reserve a la verification de mot de passe :
   * ne jamais serialiser ce resultat dans une reponse HTTP.
   */
  async findByEmailWithSecret(email: string): Promise<UtilisateurAuth | null> {
    const rows = await this.db
      .select({
        ...PUBLIC_COLUMNS,
        passwordHash: schema.users.password_hash,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)

    const row = rows[0]
    if (!row) return null
    const mapped = mapUtilisateur(row as unknown as Record<string, unknown>)
    return { ...mapped, passwordHash: String(row.passwordHash) }
  }

  async create(input: UtilisateurInput): Promise<UtilisateurRow> {
    try {
      const [result] = await this.db.insert(schema.users).values({
        nom: input.nom,
        prenom: input.prenom,
        email: input.email,
        telephone: input.telephone ?? null,
        role: input.role,
        actif: input.actif,
        password_hash: input.passwordHash,
      })
      const created = await this.findById(result.insertId)
      if (!created) throw new Error('ROW_NOT_READABLE_AFTER_INSERT')
      return created
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  /**
   * Mise a jour partielle. Le champ `passwordHash` est optionnel : s'il est
   * absent, le mot de passe est conserve (un simple changement de role ne
   * doit pas reinitialiser les identifiants).
   */
  async update(id: number, input: Partial<Omit<UtilisateurInput, 'passwordHash'>> & { passwordHash?: string }): Promise<UtilisateurRow | null> {
    try {
      const [result] = await this.db
        .update(schema.users)
        .set({
          ...(input.nom !== undefined && { nom: input.nom }),
          ...(input.prenom !== undefined && { prenom: input.prenom }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.telephone !== undefined && { telephone: input.telephone }),
          ...(input.role !== undefined && { role: input.role }),
          ...(input.actif !== undefined && { actif: input.actif }),
          ...(input.passwordHash !== undefined && { password_hash: input.passwordHash }),
        })
        .where(eq(schema.users.id, id))

      if (result.affectedRows === 0) return null
      return this.findById(id)
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  async remove(id: number): Promise<boolean> {
    try {
      const [result] = await this.db.delete(schema.users).where(eq(schema.users.id, id))
      return result.affectedRows > 0
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  /** Bascule l'activation sans charger le hash. */
  setActif(id: number, actif: boolean): Promise<UtilisateurRow | null> {
    return this.update(id, { actif })
  }
}

export type { RepositoryError }
