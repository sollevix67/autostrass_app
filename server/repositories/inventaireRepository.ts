import { createHash } from 'node:crypto'
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { ApiInventaire, ApiInventairePreparation } from '../../src/services/contracts.js'
import type { InventaireInput } from '../../src/schemas/inventaire.js'
import type { AuthenticatedUser } from '../middleware/auth.js'
import { RepositoryError } from './simpleRepositories.js'

const emplacementColumns = `e.id,
  CASE e.niveau WHEN 'allee' THEN e.code
    WHEN 'etagere' THEN CONCAT_WS(' / ', parent.code, e.code)
    ELSE CONCAT_WS(' / ', grand_parent.code, parent.code, e.code) END AS chemin`
const emplacementJoins = `FROM emplacements e
  LEFT JOIN emplacements parent ON parent.id = e.parent_id
  LEFT JOIN emplacements grand_parent ON grand_parent.id = parent.parent_id`

function mapInventaire(row: RowDataPacket): ApiInventaire {
  return {
    id: Number(row.id), reference: String(row.reference), designation: String(row.designation),
    utilisateurId: Number(row.utilisateur_id), auteur: String(row.auteur), motif: String(row.motif),
    quantiteAvant: Number(row.quantite_avant), quantiteComptee: Number(row.quantite_comptee),
    lignes: typeof row.lignes === 'string' ? JSON.parse(row.lignes) : row.lignes,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export class InventaireRepository {
  constructor(private readonly pool: Pool) {}

  private async transaction<T>(action: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection()
    try {
      // Éviter les verrous d’intervalle sur les allocations encore inexistantes
      // lorsque plusieurs références sont comptées simultanément.
      await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
      await connection.beginTransaction()
      const result = await action(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /** Même ordre de verrouillage que les transferts : article, solde, allocations. */
  private async snapshot(connection: PoolConnection, reference: string) {
    const [articles] = await connection.query<RowDataPacket[]>(
      'SELECT id, reference, designation FROM articles WHERE reference = ? FOR UPDATE', [reference],
    )
    if (!articles.length) throw new RepositoryError(404, 'NOT_FOUND', 'Article introuvable.')
    const article = articles[0]
    const articleId = Number(article.id)
    const [balances] = await connection.query<RowDataPacket[]>(
      'SELECT quantity, updated_at FROM stock_balances WHERE reference_id = ? FOR UPDATE', [articleId],
    )
    if (!balances.length) throw new RepositoryError(409, 'INCONSISTENT_STOCK', 'Le solde de cet article est absent.')
    const [allocations] = await connection.query<RowDataPacket[]>(
      'SELECT emplacement_id, quantite FROM stock_par_emplacements WHERE reference_id = ? ORDER BY emplacement_id FOR UPDATE', [articleId],
    )
    const [movements] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM stock_movements WHERE reference_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [articleId],
    )
    const [paths] = await connection.query<RowDataPacket[]>(
      `SELECT ${emplacementColumns} ${emplacementJoins}
       JOIN stock_par_emplacements spe ON spe.emplacement_id = e.id WHERE spe.reference_id = ?`, [articleId],
    )
    const total = Number(balances[0].quantity)
    const allocated = allocations.reduce((sum, row) => sum + Number(row.quantite), 0)
    const version = createHash('sha256').update(JSON.stringify({
      articleId, total, updatedAt: balances[0].updated_at, movement: movements[0]?.id ?? 0,
      allocations: allocations.map((row) => [Number(row.emplacement_id), Number(row.quantite)]),
    })).digest('hex')
    const preparation: ApiInventairePreparation = {
      reference: String(article.reference), designation: String(article.designation), version,
      quantiteTotale: total, incoherent: total < allocated || allocations.some((row) => Number(row.quantite) < 0),
      lignes: [
        { emplacementId: null, chemin: 'Stock non affecté', quantiteAvant: total - allocated },
        ...allocations.map((row) => ({
          emplacementId: Number(row.emplacement_id), quantiteAvant: Number(row.quantite),
          chemin: String(paths.find((path) => path.id === row.emplacement_id)?.chemin ?? `Emplacement supprimé #${row.emplacement_id}`),
        })),
      ],
    }
    return { articleId, preparation }
  }

  prepare(reference: string): Promise<ApiInventairePreparation> {
    // Verrous brefs : aucune transaction ne reste ouverte pendant le comptage physique.
    return this.transaction(async (connection) => (await this.snapshot(connection, reference)).preparation)
  }

  async list(reference?: string, before?: number): Promise<ApiInventaire[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT * FROM inventaires_stock
       WHERE (? IS NULL OR reference = ?) AND (? IS NULL OR id < ?)
       ORDER BY id DESC LIMIT 50`, [reference ?? null, reference ?? null, before ?? null, before ?? null],
    )
    return rows.map(mapInventaire)
  }

  record(reference: string, input: InventaireInput, user: AuthenticatedUser): Promise<ApiInventaire> {
    return this.transaction(async (connection) => {
      const { articleId, preparation } = await this.snapshot(connection, reference)
      if (input.version !== preparation.version) {
        throw new RepositoryError(409, 'STOCK_CHANGED', 'Le stock a changé depuis le début du comptage. Consultez l’historique puis recommencez le comptage avec le stock actualisé.')
      }
      if (preparation.lignes.some((line) => !input.lignes.some((count) => count.emplacementId === line.emplacementId))) {
        throw new RepositoryError(422, 'INCOMPLETE_COUNT', 'Comptez chaque emplacement, y compris les emplacements vides et le stock non affecté.')
      }
      // Ordre stable pour sérialiser aussi les suppressions d’emplacements.
      const counts = [...input.lignes].sort((a, b) => (a.emplacementId ?? 0) - (b.emplacementId ?? 0))
      const lignes: ApiInventaire['lignes'] = []
      for (const count of counts) {
        const previous = preparation.lignes.find((line) => line.emplacementId === count.emplacementId)
        let chemin = previous?.chemin ?? ''
        if (count.emplacementId !== null) {
          const [locations] = await connection.query<RowDataPacket[]>(
            'SELECT id, actif FROM emplacements WHERE id = ? FOR UPDATE', [count.emplacementId],
          )
          // Une allocation orpheline peut être vidée, jamais recréée.
          if ((!locations.length && (!previous || count.quantiteComptee > 0))
            || (locations.length > 0 && !locations[0].actif && !previous)) {
            throw new RepositoryError(422, 'INVALID_LOCATION', 'Un nouvel emplacement doit exister et être actif. Un emplacement supprimé doit être compté à zéro.')
          }
          if (!previous) {
            const [paths] = await connection.query<RowDataPacket[]>(
              `SELECT ${emplacementColumns} ${emplacementJoins} WHERE e.id = ?`, [count.emplacementId],
            )
            chemin = String(paths[0].chemin)
          }
        }
        lignes.push({ ...count, chemin, quantiteAvant: previous?.quantiteAvant ?? 0 })
      }
      const quantiteComptee = lignes.reduce((sum, line) => sum + line.quantiteComptee, 0)
      const delta = quantiteComptee - preparation.quantiteTotale
      await connection.execute('UPDATE stock_balances SET quantity = ? WHERE reference_id = ?', [quantiteComptee, articleId])
      await connection.execute('DELETE FROM stock_par_emplacements WHERE reference_id = ?', [articleId])
      for (const line of lignes) {
        if (line.emplacementId !== null && line.quantiteComptee > 0) {
          await connection.execute(
            'INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite) VALUES (?, ?, ?)',
            [articleId, line.emplacementId, line.quantiteComptee],
          )
        }
      }
      await connection.execute('UPDATE articles SET location = ?, emplacement_id = NULL WHERE id = ?', ['', articleId])
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO inventaires_stock
         (reference, designation, utilisateur_id, auteur, motif, quantite_avant, quantite_comptee, lignes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [preparation.reference, preparation.designation, user.id, `${user.prenom} ${user.nom}`, input.motif,
          preparation.quantiteTotale, quantiteComptee, JSON.stringify(lignes)],
      )
      // Même un comptage sans écart constitue une nouvelle version et une preuve de contrôle.
      await connection.execute(
        "INSERT INTO stock_movements (reference_id, delta, reason) VALUES (?, ?, 'INVENTAIRE_PHYSIQUE')", [articleId, delta],
      )
      await connection.execute(
        `INSERT INTO journal_actions (utilisateur_id, entite, entite_id, action, details)
         VALUES (?, 'article', ?, 'modification', ?)`,
        [user.id, preparation.reference, JSON.stringify({ type: 'INVENTAIRE_PHYSIQUE', inventaireId: result.insertId,
          motif: input.motif, quantiteAvant: preparation.quantiteTotale, quantiteComptee, delta, lignes })],
      )
      const [saved] = await connection.query<RowDataPacket[]>('SELECT * FROM inventaires_stock WHERE id = ?', [result.insertId])
      return mapInventaire(saved[0])
    })
  }
}
