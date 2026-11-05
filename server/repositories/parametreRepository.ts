import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import type { Referentiel, SousCategorie } from '../../src/schemas/parametres.js'
import { settingsError } from '../services/settingsStore.js'

const tables = { categories: 'categories_articles', 'sous-categories': 'sous_categories_articles', secteurs: 'secteurs_livraison' } as const
export type ReferentielKind = keyof typeof tables
type Input = Omit<Referentiel, 'id'> & { categorieId?: number }

export async function listTva(pool: Pool) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, taux, libelle, defaut, actif FROM tva ORDER BY taux DESC, id')
  return rows.map((row) => ({ id: Number(row.id), taux: Number(row.taux), libelle: String(row.libelle), defaut: Boolean(row.defaut), actif: Boolean(row.actif) }))
}

export class ParametreRepository {
  constructor(private readonly pool: Pool, private readonly kind: ReferentielKind) {}
  private get table() { return tables[this.kind] }

  async list(): Promise<Array<Referentiel | SousCategorie>> {
    const [rows] = await this.pool.query<RowDataPacket[]>(`SELECT id, code, libelle, actif${this.kind === 'sous-categories' ? ', categorie_id AS categorieId' : ''} FROM ${this.table} ORDER BY libelle, id`)
    return rows.map((row) => ({ id: Number(row.id), code: String(row.code), libelle: String(row.libelle), actif: Boolean(row.actif), ...(this.kind === 'sous-categories' ? { categorieId: Number(row.categorieId) } : {}) }))
  }

  async save(input: Input, id?: number) {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()
      if (this.kind === 'sous-categories') {
        const [parents] = await connection.query<RowDataPacket[]>('SELECT id, actif FROM categories_articles WHERE id = ? FOR UPDATE', [input.categorieId])
        if (!parents.length || (!parents[0].actif && !id)) throw settingsError('Choisissez une catégorie active.')
      }
      if (id) {
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${this.table} WHERE id = ? FOR UPDATE`, [id])
        if (!rows.length) throw settingsError('Élément introuvable.', 404, 'NOT_FOUND')
        if (rows[0].code !== input.code || (this.kind === 'sous-categories' && rows[0].categorie_id !== input.categorieId)) throw settingsError('Le code et la catégorie de rattachement ne peuvent pas être modifiés.')
        await connection.execute(`UPDATE ${this.table} SET libelle = ?, actif = ? WHERE id = ?`, [input.libelle, input.actif, id])
      } else {
        const [result] = await connection.execute<ResultSetHeader>(`INSERT INTO ${this.table} (code, libelle, actif${this.kind === 'sous-categories' ? ', categorie_id' : ''}) VALUES (?, ?, ?${this.kind === 'sous-categories' ? ', ?' : ''})`, [input.code, input.libelle, input.actif, ...(this.kind === 'sous-categories' ? [input.categorieId ?? null] : [])])
        id = result.insertId
      }
      await connection.commit()
      return { ...input, id }
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }

  async remove(id: number) {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${this.table} WHERE id = ? FOR UPDATE`, [id])
      if (!rows.length) throw settingsError('Élément introuvable.', 404, 'NOT_FOUND')
      if (this.kind === 'categories') {
        const [usage] = await connection.query<RowDataPacket[]>('SELECT id FROM articles WHERE category = ? LIMIT 1', [rows[0].code])
        if (usage.length) throw settingsError('Cette catégorie est utilisée par des articles.', 409, 'IN_USE')
      }
      // Les FK protègent aussi les sous-catégories, articles et clients concurrents.
      await connection.execute(`DELETE FROM ${this.table} WHERE id = ?`, [id])
      await connection.commit()
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
}
