import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { MAX_STOCK } from '../../src/schemas/inventaire.js'
import { dateParis } from '../services/documentNumbers.js'
import { getReceivingNeeds, withSupplyTransaction } from './approvisionnement.js'
import { lockArticleStock } from './articleRepository.js'
import { RepositoryError } from './simpleRepositories.js'

type QuantityReceived = { ligne: number; quantite: number }
type ReceiptInput = { cleOperation: string; articles: QuantityReceived[] }
type OrderLine = RowDataPacket & {
  ligne: number
  besoin_id: number | null
  reference: string
  designation: string
  quantite: number
  quantite_recue: number
  prix_unitaire: string
}
type StockEntry = {
  articleId: number
  reference: string
  quantite: number
  emplacementId: number | null
}

/** La commande est déjà verrouillée, y compris lorsqu'une première requête est encore en cours. */
async function findReplay(connection: PoolConnection, commandeId: number, input: ReceiptInput) {
  const [receipts] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM receptions WHERE commande_fournisseur_id = ? AND cle_operation = ?', [commandeId, input.cleOperation],
  )
  if (!receipts.length) return null
  const receptionId = Number(receipts[0].id)
  const [stored] = await connection.query<RowDataPacket[]>(
    `SELECT ligne_commande_fournisseur, quantite_recue FROM reception_lines
     WHERE reception_id = ? ORDER BY ligne_commande_fournisseur`, [receptionId],
  )
  const sorted = [...input.articles].sort((a, b) => a.ligne - b.ligne)
  if (stored.length !== sorted.length || stored.some((line, index) =>
    Number(line.ligne_commande_fournisseur) !== sorted[index].ligne || Number(line.quantite_recue) !== sorted[index].quantite)) {
    throw new RepositoryError(409, 'RECEPTION_REPLAY_CONFLICT', 'Cette clé de réception correspond déjà à d’autres quantités.')
  }
  return { receptionId }
}

/** Les articles, soldes et allocations sont verrouillés dans le même ordre que les commandes clients. */
async function prepareStock(connection: PoolConnection, totals: Map<string, number>): Promise<StockEntry[]> {
  const entries: Array<StockEntry & { locations: number[] }> = []
  for (const reference of [...totals.keys()].sort()) {
    const [articles] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM articles WHERE reference = ? FOR UPDATE', [reference],
    )
    if (!articles.length) {
      throw new RepositoryError(409, 'UNKNOWN_REFERENCE', `La référence ${reference} de cette commande est absente du catalogue.`)
    }
    const articleId = Number(articles[0].id)
    const { totalQuantity, stockRows, inconsistent } = await lockArticleStock(connection, articleId)
    if (inconsistent) {
      throw new RepositoryError(409, 'INCONSISTENT_STOCK', `La répartition de ${reference} nécessite un inventaire physique.`)
    }
    const quantite = totals.get(reference)!
    if (totalQuantity + quantite > MAX_STOCK) {
      throw new RepositoryError(422, 'INVALID_QUANTITY', `Le stock total de ${reference} dépasserait la quantité maximale.`)
    }
    entries.push({ articleId, reference, quantite, emplacementId: null,
      locations: stockRows.filter((row) => Number(row.quantite) > 0).map((row) => Number(row.emplacement_id)) })
  }
  const locationIds = [...new Set(entries.flatMap((entry) => entry.locations))].sort((a, b) => a - b)
  if (locationIds.length) {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM emplacements WHERE id IN (?) AND actif = 1 ORDER BY id LOCK IN SHARE MODE', [locationIds],
    )
    const active = new Set(rows.map((row) => Number(row.id)))
    // lockArticleStock retourne les allocations par identifiant croissant.
    for (const entry of entries) entry.emplacementId = entry.locations.find((id) => active.has(id)) ?? null
  }
  return entries
}

export class ReceptionFournisseurRepository {
  constructor(private readonly pool: Pool) {}

  receive(commandeId: number, input: ReceiptInput, actorId: number): Promise<{ receptionId: number }> {
    return withSupplyTransaction(this.pool, async (connection) => {
      const [orders] = await connection.query<RowDataPacket[]>(
        'SELECT statut, fournisseur_id, fournisseur_nom, cle_commande FROM commandes_fournisseurs WHERE id = ? FOR UPDATE', [commandeId],
      )
      const order = orders[0]
      if (!order) throw new RepositoryError(404, 'NOT_FOUND', 'Commande fournisseur introuvable.')
      const existing = await findReplay(connection, commandeId, input)
      if (existing) return existing
      if (order.statut !== 'envoyée' && order.statut !== 'partielle') {
        throw new RepositoryError(409, 'COMMANDE_NON_RECEPTIONNABLE', 'Seule une commande envoyée ou partiellement reçue peut être réceptionnée.')
      }
      if (order.statut === 'partielle' && order.cle_commande === null) {
        const [known] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM receptions WHERE commande_fournisseur_id = ? LIMIT 1', [commandeId],
        )
        if (!known.length) throw new RepositoryError(409, 'RELIQUAT_HISTORIQUE_INCONNU', 'Reliquat historique à rapprocher avant toute nouvelle entrée en stock.')
      }
      const [lines] = await connection.query<OrderLine[]>(
        'SELECT * FROM commande_four_lines WHERE commande_id = ? ORDER BY ligne', [commandeId],
      )
      const ordered = new Map(lines.map((line) => [line.ligne, line]))
      const totals = new Map<string, number>()
      const incoming = [...input.articles].sort((a, b) => a.ligne - b.ligne).map(({ ligne, quantite }) => {
        const source = ordered.get(ligne)
        if (!source) throw new RepositoryError(422, 'UNKNOWN_ORDER_LINE', `La ligne ${ligne} n’appartient pas à cette commande.`)
        if (quantite > source.quantite - source.quantite_recue) {
          throw new RepositoryError(409, 'QUANTITE_RECEPTION_DEPASSEE', `La quantité reçue pour ${source.reference} dépasse le reliquat de la ligne ${ligne}.`)
        }
        const reference = source.reference.toUpperCase()
        totals.set(reference, (totals.get(reference) ?? 0) + quantite)
        return { source, quantite }
      })
      const stockEntries = await prepareStock(connection, totals)
      // Une seule image des besoins avant cette entrée, quel que soit l'ordre de saisie des lignes.
      const needs = await getReceivingNeeds(connection, incoming.flatMap(({ source }) => source.besoin_id === null ? [] : [source.besoin_id]))
      let fournisseur = order.fournisseur_nom
      if (!fournisseur) {
        const [suppliers] = await connection.query<RowDataPacket[]>('SELECT nom FROM fournisseurs WHERE id = ?', [order.fournisseur_id])
        fournisseur = suppliers[0]?.nom ?? `Fournisseur #${order.fournisseur_id}`
      }
      const [receipt] = await connection.execute<ResultSetHeader>(
        `INSERT INTO receptions (commande_fournisseur_id, cle_operation, fournisseur, date_reception)
         VALUES (?, ?, ?, ?)`, [commandeId, input.cleOperation, fournisseur, dateParis()],
      )
      const receptionId = receipt.insertId
      for (const [index, { source, quantite }] of incoming.entries()) {
        const need = source.besoin_id === null ? undefined : needs.get(source.besoin_id)
        const attribuee = need ? Math.min(quantite, need.quantiteManquantePhysique,
          Math.max(0, need.quantiteDemandee - need.quantiteDejaAttribuee)) : 0
        if (need) {
          need.quantiteManquantePhysique -= attribuee
          need.quantiteDejaAttribuee += attribuee
        }
        await connection.execute(
          `INSERT INTO reception_lines (reception_id, ligne, reference, designation, quantite_recue, prix_unitaire,
             ligne_commande_fournisseur, quantite_attribuee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [receptionId, index + 1, source.reference, source.designation, quantite, source.prix_unitaire, source.ligne, attribuee],
        )
        await connection.execute(
          'UPDATE commande_four_lines SET quantite_recue = quantite_recue + ? WHERE commande_id = ? AND ligne = ?',
          [quantite, commandeId, source.ligne],
        )
        source.quantite_recue += quantite
      }
      for (const { articleId, reference, quantite, emplacementId } of stockEntries) {
        await connection.execute('UPDATE stock_balances SET quantity = quantity + ? WHERE reference_id = ?', [quantite, articleId])
        if (emplacementId !== null) {
          await connection.execute(
            'UPDATE stock_par_emplacements SET quantite = quantite + ? WHERE reference_id = ? AND emplacement_id = ?',
            [quantite, articleId, emplacementId],
          )
        }
        await connection.execute(
          "INSERT INTO stock_movements (reference_id, delta, reason) VALUES (?, ?, 'RECEPTION_FOURNISSEUR')", [articleId, quantite],
        )
        await connection.execute(
          "INSERT INTO journal_actions (utilisateur_id, entite, entite_id, action, details) VALUES (?, 'article', ?, 'modification', ?)",
          [actorId, reference, JSON.stringify({ type: 'RECEPTION_FOURNISSEUR', commandeFournisseurId: commandeId, receptionId, quantite, emplacementId })],
        )
      }
      const statut = lines.every((line) => line.quantite_recue === line.quantite) ? 'reçue' : 'partielle'
      await connection.execute('UPDATE commandes_fournisseurs SET statut = ? WHERE id = ?', [statut, commandeId])
      await connection.execute(
        "INSERT INTO journal_actions (utilisateur_id, entite, entite_id, action, details) VALUES (?, 'reception', ?, 'création', ?)",
        [actorId, String(receptionId), JSON.stringify({ commandeFournisseurId: commandeId, statut })],
      )
      return { receptionId }
    })
  }
}
