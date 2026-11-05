import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { settingsError } from '../services/settingsStore.js'

/**
 * Forme d'un article telle que renvoyee par l'API (camelCase),
 * alignee sur le type `Article` du frontend.
 */
export type ArticleRow = {
  tvaId: number
  ean13: string | null
  delaiDisponibilite: number
  forcerSurCommande: boolean
  prixUnitaireTTC: number
  sousCategorieId: number | null
  reference: string
  designation: string
  category: string
  prixUnitaireHT: number
  quantite: number
  minimum: number
  emplacement: string  // Code hiérarchique "A-xx / E-xx / P-xx" (emprunte depuis stock_par_emplacements)
  description: string | null
}

/** Donnees attendues pour creer ou remplacer un article. */
export type ArticleInput = {
  tvaId?: number
  ean13?: string | null
  delaiDisponibilite?: number
  forcerSurCommande?: boolean
  sousCategorieId?: number | null
  reference: string
  designation: string
  category: string
  prixUnitaireHT: number
  quantite: number
  minimum: number
  emplacement?: string  // Optionnel: code hiérarchique si connu à la création
  description?: string
}

/** Contenu brut depuis MySQL (snake_case). */
type ArticleRowPacket = RowDataPacket & {
  reference: string
  designation: string
  category: string
  unit_price_ht: number | string
  quantity: number
  minimum: number
  location: string      // ancienne colonne (texte libre)
  emplacement: string | null
  description: string | null
}

/** Une ligne par article, même lorsque son stock occupe plusieurs emplacements. */
const SELECT_COLUMNS = `
  SELECT
    a.reference,
    a.designation,
    a.category,
    a.sous_categorie_id,
    a.tva_id, a.ean13, a.delai_disponibilite, a.forcer_sur_commande, a.prix_unitaire_ttc,
    a.unit_price_ht,
    s.quantity,
    s.minimum_quantity AS minimum,
    a.location,               -- conservé pour compatibilité (texte libre)
    a.description,
    COALESCE((
      SELECT GROUP_CONCAT(
        CASE ep.niveau
          WHEN 'allee' THEN ep.code
          WHEN 'etagere' THEN CONCAT_WS(' / ', parent.code, ep.code)
          WHEN 'place' THEN CONCAT_WS(' / ', grand_parent.code, parent.code, ep.code)
          ELSE CONCAT('Emplacement #', spe.emplacement_id)
        END ORDER BY spe.emplacement_id SEPARATOR ' ; '
      )
      FROM stock_par_emplacements spe
      LEFT JOIN emplacements ep ON ep.id = spe.emplacement_id
      LEFT JOIN emplacements parent ON parent.id = ep.parent_id
      LEFT JOIN emplacements grand_parent ON grand_parent.id = parent.parent_id
      WHERE spe.reference_id = a.id AND spe.quantite > 0
    ), a.location) AS emplacement
  FROM articles a
  JOIN stock_balances s ON s.reference_id = a.id
`

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
  return Number.isFinite(parsed) ? parsed : 0
}

function mapRow(row: ArticleRowPacket): ArticleRow {
  return {
    tvaId: Number(row.tva_id), ean13: row.ean13 ?? null, delaiDisponibilite: Number(row.delai_disponibilite), forcerSurCommande: Boolean(row.forcer_sur_commande), prixUnitaireTTC: toNumber(row.prix_unitaire_ttc),
    reference: row.reference,
    designation: row.designation,
    category: row.category,
    sousCategorieId: row.sous_categorie_id == null ? null : Number(row.sous_categorie_id),
    prixUnitaireHT: toNumber(row.unit_price_ht),
    quantite: toNumber(row.quantity),
    minimum: toNumber(row.minimum),
    emplacement: row.emplacement ?? row.location ?? '',
    description: row.description,
  }
}

export class ArticleRepository {
  constructor(private readonly pool: Pool) {}

  private async validateCategory(connection: import('mysql2/promise').PoolConnection, input: ArticleInput, previous?: RowDataPacket) {
    const [categories] = await connection.query<RowDataPacket[]>('SELECT id, code, actif FROM categories_articles WHERE code = ? FOR UPDATE', [input.category])
    if (!categories.length || (!categories[0].actif && previous?.category !== input.category)) throw settingsError('Choisissez une catégorie active.')
    const subId = input.sousCategorieId === undefined && previous?.category === input.category ? previous.sous_categorie_id : input.sousCategorieId ?? null
    if (subId !== null && subId !== undefined) {
      const [subs] = await connection.query<RowDataPacket[]>('SELECT id, categorie_id, actif FROM sous_categories_articles WHERE id = ? FOR UPDATE', [subId])
      if (!subs.length || subs[0].categorie_id !== categories[0].id || (!subs[0].actif && previous?.sous_categorie_id !== subId)) throw settingsError('Sous-catégorie invalide pour cette catégorie.')
    }
    return subId ?? null
  }

  private async saveCatalogueFields(connection: import('mysql2/promise').PoolConnection, reference: string, input: ArticleInput, previous?: RowDataPacket) {
    const tvaId = input.tvaId ?? previous?.tva_id ?? 1
    const [taxes] = await connection.query<RowDataPacket[]>('SELECT taux FROM tva WHERE id = ?', [tvaId])
    if (!taxes.length) throw settingsError('TVA inconnue.')
    const ttc = Math.round(input.prixUnitaireHT * (1 + Number(taxes[0].taux) / 100) * 100) / 100
    await connection.execute('UPDATE articles SET tva_id = ?, ean13 = ?, delai_disponibilite = ?, forcer_sur_commande = ?, prix_unitaire_ttc = ? WHERE reference = ?', [tvaId, input.ean13 === undefined ? previous?.ean13 ?? null : input.ean13, input.delaiDisponibilite ?? previous?.delai_disponibilite ?? 0, input.forcerSurCommande ?? previous?.forcer_sur_commande ?? false, ttc, reference])
  }

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
      const subId = await this.validateCategory(connection, input)

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO articles (reference, designation, category, unit_price_ht, location, description, sous_categorie_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.reference,
          input.designation,
          input.category,
          input.prixUnitaireHT,
          input.emplacement ?? '',
          input.description ?? null,
          subId,
        ],
      )

      await connection.execute(
        `INSERT INTO stock_balances (reference_id, quantity, minimum_quantity) VALUES (?, ?, ?)`,
        [result.insertId, input.quantite, input.minimum],
      )

      await this.saveCatalogueFields(connection, input.reference, input)

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
      const [existing] = await connection.query<RowDataPacket[]>('SELECT * FROM articles WHERE reference = ? FOR UPDATE', [reference])
      if (!existing.length) { await connection.rollback(); return null }
      const subId = await this.validateCategory(connection, input, existing[0])

      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE articles
            SET designation = ?, category = ?, unit_price_ht = ?, location = ?, emplacement_id = ?, description = ?, sous_categorie_id = ?
          WHERE reference = ?`,
        [
          input.designation,
          input.category,
          input.prixUnitaireHT,
          input.emplacement ?? '',
          null,
          input.description ?? null,
          subId,
          reference,
        ],
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

      await this.saveCatalogueFields(connection, reference, input, existing[0])
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
