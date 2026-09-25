import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'

/**
 * Forme d'un article telle que renvoyee par l'API (camelCase),
 * alignee sur le type `Article` du frontend.
 */
export type ArticleRow = {
  reference: string
  designation: string
  category: string
  prixUnitaireHT: number
  quantite: number
  minimum: number
  emplacement: string
  description: string | null
}

/** Donnees attendues pour creer ou remplacer un article. */
export type ArticleInput = {
  reference: string
  designation: string
  category: string
  prixUnitaireHT: number
  quantite: number
  minimum: number
  emplacement: string
  description?: string
}

type ArticleRowPacket = RowDataPacket & {
  reference: string
  designation: string
  category: string
  unit_price_ht: number | string
  quantity: number
  minimum: number
  location: string
  description: string | null
}

const SELECT_COLUMNS = `
  SELECT
    a.reference,
    a.designation,
    a.category,
    a.unit_price_ht,
    s.quantity,
    s.minimum_quantity AS minimum,
    a.location,
    a.description
  FROM articles a
  JOIN stock_balances s ON s.reference_id = a.id
`

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
  return Number.isFinite(parsed) ? parsed : 0
}

function mapRow(row: ArticleRowPacket): ArticleRow {
  return {
    reference: row.reference,
    designation: row.designation,
    category: row.category,
    prixUnitaireHT: toNumber(row.unit_price_ht),
    quantite: toNumber(row.quantity),
    minimum: toNumber(row.minimum),
    emplacement: row.location,
    description: row.description,
  }
}

export class ArticleRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<ArticleRow[]> {
    const [rows] = await this.pool.query<ArticleRowPacket[]>(`${SELECT_COLUMNS} ORDER BY a.reference`)
    return rows.map(mapRow)
  }

  async findByReference(reference: string): Promise<ArticleRow | null> {
    const [rows] = await this.pool.query<ArticleRowPacket[]>(`${SELECT_COLUMNS} WHERE a.reference = ? LIMIT 1`, [reference])
    return rows[0] ? mapRow(rows[0]) : null
  }

  async create(input: ArticleInput): Promise<ArticleRow> {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO articles (reference, designation, category, unit_price_ht, location, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [input.reference, input.designation, input.category, input.prixUnitaireHT, input.emplacement, input.description ?? null],
      )

      await connection.execute(
        `INSERT INTO stock_balances (reference_id, quantity, minimum_quantity) VALUES (?, ?, ?)`,
        [result.insertId, input.quantite, input.minimum],
      )

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    const created = await this.findByReference(input.reference)
    if (!created) throw new Error('ARTICLE_NOT_READABLE_AFTER_INSERT')
    return created
  }

  async update(reference: string, input: ArticleInput): Promise<ArticleRow | null> {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()

      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE articles
            SET designation = ?, category = ?, unit_price_ht = ?, location = ?, description = ?
          WHERE reference = ?`,
        [input.designation, input.category, input.prixUnitaireHT, input.emplacement, input.description ?? null, reference],
      )

      if (result.affectedRows === 0) {
        await connection.rollback()
        return null
      }

      await connection.execute(
        `UPDATE stock_balances s
            JOIN articles a ON a.id = s.reference_id
            SET s.quantity = ?, s.minimum_quantity = ?
          WHERE a.reference = ?`,
        [input.quantite, input.minimum, reference],
      )

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    return this.findByReference(reference)
  }

  /** Ajuste la quantite d'un deltas borne a zero. Retourne la nouvelle quantite. */
  async adjustQuantity(reference: string, delta: number): Promise<number | null> {
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()

      const [rows] = await connection.query<Array<RowDataPacket & { id: number }>>(
        `SELECT a.id FROM articles a WHERE a.reference = ? FOR UPDATE`,
        [reference],
      )

      const articleId = rows[0]?.id
      if (articleId === undefined) {
        await connection.rollback()
        return null
      }

      await connection.execute(
        `UPDATE stock_balances SET quantity = GREATEST(0, quantity + ?) WHERE reference_id = ?`,
        [delta, articleId],
      )

      await connection.execute(
        `INSERT INTO stock_movements (reference_id, delta, reason) VALUES (?, ?, 'AJUSTEMENT_MANUEL')`,
        [articleId, delta],
      )

      await connection.commit()

      const [updated] = await connection.query<Array<RowDataPacket & { quantity: number }>>(
        `SELECT quantity FROM stock_balances WHERE reference_id = ?`,
        [articleId],
      )
      return toNumber(updated[0]?.quantity)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async remove(reference: string): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(`DELETE FROM articles WHERE reference = ?`, [reference])
    return result.affectedRows > 0
  }
}
