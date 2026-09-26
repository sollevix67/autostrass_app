/**
 * Base commune des repositories Drizzle : CRUD generique + erreur metier.
 *
 * Pourquoi une classe generique plutot que 8 repositories ecrits a la main :
 * les metiers ont le meme cycle (liste / lecture / creation / mise a jour /
 * suppression). Seul change le mapping ligne -> forme API.
 *
 * Le type de colonne est volontairement abstrait (`AnyIdColumn`) : Drizzle type
 * chaque colonne avec son `tableName` litteral, si bien que `clients.id` n'est
 * pas assignable a `vehicules.id`. Un CRUD generique exige d'elargir ce point.
 */

import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { AnyMySqlColumn, AnyMySqlTable } from 'drizzle-orm/mysql-core'
import * as schema from '../db/schema.js'
import { toHttpError } from './mapping.js'

type Tables = typeof schema

/**
 * Colonne de cle primaire, quelle que soit la table.
 *
 * Drizzle type chaque colonne avec son `tableName` litteral : `clients.id`
 * n'est pas assignable a `vehicules.id`. `AnyMySqlColumn` elargit cette
 * contrainte, ce qui est indispensable pour un CRUD generique.
 */
type AnyIdColumn = AnyMySqlColumn

/** Table quelconque du schema, pour le meme raison. */
type AnyTable = AnyMySqlTable

/** Erreur metier levee par les repositories, traduite en HTTP par les routes. */
export class RepositoryError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

/** Traduit une erreur mysql2 en `RepositoryError` ; laisse passer les metier. */
export function toRepositoryError(error: unknown): RepositoryError {
  if (error instanceof RepositoryError) return error
  const mapped = toHttpError(error)
  const messages: Record<string, string> = {
    ALREADY_EXISTS: 'Cette valeur existe deja.',
    IN_USE: 'Element reference par un autre enregistrement : suppression impossible.',
    UNKNOWN_REFERENCE: 'Reference inconnue.',
  }
  return new RepositoryError(mapped.status, mapped.code, messages[mapped.code] ?? "Echec de l'operation.")
}

/**
 * CRUD generique sur une table a cle primaire `id`.
 *
 * @param table    table Drizzle ciblee
 * @param mapRow   conversion ligne MariaDB -> forme exposee par l'API
 */
export class SimpleRepository<TTable extends AnyTable, TRow, TInsert extends object, TPatch extends object> {
  constructor(
    private readonly db: MySql2Database<Tables>,
    private readonly table: TTable,
    private readonly idColumn: AnyIdColumn,
    private readonly mapRow: (raw: Record<string, unknown>) => TRow,
  ) {}

  async list(): Promise<TRow[]> {
    const rows = await this.db.select().from(this.table)
    return rows.map((row) => this.mapRow(row as unknown as Record<string, unknown>))
  }

  async findById(id: number): Promise<TRow | null> {
    const rows = await this.db.select().from(this.table).where(eq(this.idColumn, id)).limit(1)
    const row = rows[0]
    return row ? this.mapRow(row as unknown as Record<string, unknown>) : null
  }

  async create(data: TInsert): Promise<TRow> {
    try {
      const [result] = await this.db.insert(this.table).values(data as never)
      const created = await this.findById(result.insertId)
      if (!created) throw new RepositoryError(500, 'INTERNAL_ERROR', 'Ligne illisible apres insertion.')
      return created
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  async update(id: number, data: TPatch): Promise<TRow | null> {
    try {
      const [result] = await this.db.update(this.table).set(data as never).where(eq(this.idColumn, id))
      // MySQL ne signale rien quand aucune ligne ne correspond : on relit pour
      // distinguer « mis a jour » de « introuvable ».
      if (result.affectedRows === 0) return null
      return this.findById(id)
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  async remove(id: number): Promise<boolean> {
    try {
      const [result] = await this.db.delete(this.table).where(eq(this.idColumn, id))
      return result.affectedRows > 0
    } catch (error) {
      throw toRepositoryError(error)
    }
  }
}
