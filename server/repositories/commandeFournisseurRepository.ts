import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { DeliveryMode, SupplierOrderStatus } from '../db/schema.js'
import { dateParis } from '../services/documentNumbers.js'
import { isSupplierOrderBlocked } from '../services/horairesFournisseur.js'
import { listProcurementNeeds, withSupplyTransaction } from './approvisionnement.js'
import { RepositoryError } from './simpleRepositories.js'

type Query = Pick<PoolConnection, 'query'>
type Affectation = { fournisseurId: number; modeLivraison: DeliveryMode }
type LigneAchat = { besoinId: number; quantite: number; prixUnitaire: number }
type CommandeInput = Affectation & { cleCommande: string; articles: LigneAchat[] }

export type CommandeFournisseurRow = Affectation & {
  id: number
  fournisseur: string
  dateCommande: string
  statut: SupplierOrderStatus
  reliquatInconnu: boolean
  articles: Array<{
    ligne: number
    besoinId: number | null
    commandeClientId: number | null
    commandeClientNumero: string | null
    reference: string
    designation: string
    quantite: number
    quantiteRecue: number
    quantiteAttribuee: number
    prixUnitaire: number
  }>
}

async function readOrders(connection: Query, scope?: { id: number } | { cleCommande: string }): Promise<CommandeFournisseurRow[]> {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT c.id, c.fournisseur_id, COALESCE(c.fournisseur_nom, f.nom, CONCAT('Fournisseur #', c.fournisseur_id)) AS fournisseur,
      DATE_FORMAT(c.date_commande, '%Y-%m-%d') AS date_commande, c.statut, c.mode_livraison,
      (c.statut = 'partielle' AND c.cle_commande IS NULL AND NOT EXISTS (
        SELECT 1 FROM receptions r WHERE r.commande_fournisseur_id = c.id
      )) AS reliquat_inconnu,
      l.ligne, l.besoin_id, a.commande_id AS commande_client_id, client.numero AS commande_client_numero,
      l.reference, l.designation, l.quantite, l.quantite_recue, l.prix_unitaire,
      COALESCE((
        SELECT SUM(rl.quantite_attribuee) FROM receptions r JOIN reception_lines rl ON rl.reception_id = r.id
        WHERE r.commande_fournisseur_id = c.id AND rl.ligne_commande_fournisseur = l.ligne
      ), 0) AS quantite_attribuee
    FROM commandes_fournisseurs c
    LEFT JOIN fournisseurs f ON f.id = c.fournisseur_id
    LEFT JOIN commande_four_lines l ON l.commande_id = c.id
    LEFT JOIN articles_a_commander a ON a.id = l.besoin_id
    LEFT JOIN commandes client ON client.id = a.commande_id
    ${scope ? 'WHERE ' + ('id' in scope ? 'c.id' : 'c.cle_commande') + ' = ?' : ''}
    ORDER BY c.id DESC, l.ligne`, scope ? ['id' in scope ? scope.id : scope.cleCommande] : [])
  const orders = new Map<number, CommandeFournisseurRow>()
  for (const row of rows) {
    let order = orders.get(row.id)
    if (!order) {
      order = {
        id: Number(row.id), fournisseurId: Number(row.fournisseur_id), fournisseur: row.fournisseur,
        dateCommande: row.date_commande, modeLivraison: row.mode_livraison, statut: row.statut,
        reliquatInconnu: Boolean(row.reliquat_inconnu), articles: [],
      }
      orders.set(order.id, order)
    }
    if (row.ligne != null) order.articles.push({
      ligne: Number(row.ligne), besoinId: row.besoin_id == null ? null : Number(row.besoin_id),
      commandeClientId: row.commande_client_id == null ? null : Number(row.commande_client_id),
      commandeClientNumero: row.commande_client_numero ?? null, reference: row.reference, designation: row.designation,
      quantite: Number(row.quantite), quantiteRecue: Number(row.quantite_recue),
      quantiteAttribuee: Number(row.quantite_attribuee), prixUnitaire: Number(row.prix_unitaire),
    })
  }
  return [...orders.values()]
}

async function replayOrder(connection: Query, input: CommandeInput) {
  const [order] = await readOrders(connection, { cleCommande: input.cleCommande })
  if (!order) return null
  const requested = new Map(input.articles.map((line) => [line.besoinId, line]))
  if (order.fournisseurId !== input.fournisseurId || order.modeLivraison !== input.modeLivraison
    || order.articles.length !== requested.size || !order.articles.every((line) => {
      const other = line.besoinId === null ? undefined : requested.get(line.besoinId)
      return other?.quantite === line.quantite && Math.round(other.prixUnitaire * 100) === Math.round(line.prixUnitaire * 100)
    })) {
    throw new RepositoryError(409, 'SUPPLIER_ORDER_KEY_CONFLICT', 'Cette clé de commande a déjà servi pour un achat différent.')
  }
  return order
}

async function lockSupplier(connection: PoolConnection, fournisseurId: number) {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT nom, actif, heure_blocage, duree_blocage_minutes FROM fournisseurs WHERE id = ? FOR UPDATE', [fournisseurId],
  )
  return rows[0]
}

function requireActiveSupplier(supplier: RowDataPacket | undefined) {
  if (!supplier || !supplier.actif) {
    throw new RepositoryError(409, 'INACTIVE_SUPPLIER', 'Ce fournisseur n’est plus disponible. Choisissez un fournisseur actif.')
  }
  return supplier
}

async function lockNeeds(connection: PoolConnection, besoinIds: number[]) {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT id, reference FROM articles_a_commander WHERE id IN (?)', [besoinIds])
  if (rows.length !== besoinIds.length) throw new RepositoryError(404, 'NOT_FOUND', 'Un des besoins à commander est introuvable.')
  // Stock, conversions et commandes clients utilisent le même ordre. Relire la projection
  // après le dernier verrou voit les réceptions, commandes et modifications déjà validées.
  const references = [...new Set(rows.map((row) => String(row.reference).toUpperCase()))].sort()
  for (const reference of references) {
    const [articles] = await connection.query<RowDataPacket[]>('SELECT id FROM articles WHERE reference = ? FOR UPDATE', [reference])
    if (!articles[0]) throw new RepositoryError(409, 'UNKNOWN_REFERENCE', `La référence ${reference} a quitté le catalogue.`)
    await connection.query('SELECT quantity FROM stock_balances WHERE reference_id = ? FOR UPDATE', [articles[0].id])
  }
  const needs = await listProcurementNeeds(connection, { besoinIds })
  return new Map(needs.map((need) => [need.id, need]))
}

export class CommandeFournisseurRepository {
  constructor(private readonly pool: Pool) {}

  list() {
    return readOrders(this.pool)
  }

  assign(id: number, input: Affectation, userId: number) {
    return withSupplyTransaction(this.pool, async (connection) => {
      requireActiveSupplier(await lockSupplier(connection, input.fournisseurId))
      const need = (await lockNeeds(connection, [id])).get(id)
      if (!need) throw new RepositoryError(409, 'PROCUREMENT_CHANGED', 'Ce besoin est déjà couvert ou la commande client n’est plus active.')
      if (need.fournisseurId === input.fournisseurId && need.modeLivraison === input.modeLivraison) return need
      await connection.execute('UPDATE articles_a_commander SET fournisseur_id = ?, mode_livraison = ? WHERE id = ?',
        [input.fournisseurId, input.modeLivraison, id])
      await connection.execute(
        "INSERT INTO journal_actions (utilisateur_id, entite, entite_id, action, details) VALUES (?, 'articles_a_commander', ?, 'modification', ?)",
        [userId, String(id), JSON.stringify(input)],
      )
      return { ...need, ...input }
    })
  }

  create(input: CommandeInput, userId: number) {
    return withSupplyTransaction(this.pool, async (connection) => {
      const supplier = await lockSupplier(connection, input.fournisseurId)
      const replay = await replayOrder(connection, input)
      if (replay) return replay
      requireActiveSupplier(supplier)
      const needs = await lockNeeds(connection, input.articles.map((line) => line.besoinId))
      const lines = input.articles.map((line, index) => {
        const need = needs.get(line.besoinId)
        if (!need || line.quantite > need.quantite || need.fournisseurId !== input.fournisseurId || need.modeLivraison !== input.modeLivraison) {
          throw new RepositoryError(409, 'PROCUREMENT_CHANGED', 'Les besoins ou leur affectation ont changé. Actualisez la liste avant de commander.')
        }
        return [index + 1, need.id, need.reference, need.designation, line.quantite, line.prixUnitaire.toFixed(2)]
      })
      const now = new Date()
      if (isSupplierOrderBlocked(supplier.heure_blocage, supplier.duree_blocage_minutes, now)) {
        throw new RepositoryError(409, 'SUPPLIER_ORDER_BLOCKED', 'Les commandes sont fermées pour ce fournisseur à cette heure.')
      }
      let orderId: number
      try {
        const [insert] = await connection.execute<ResultSetHeader>(`
          INSERT INTO commandes_fournisseurs (fournisseur_id, fournisseur_nom, date_commande, statut, mode_livraison, cle_commande)
          VALUES (?, ?, ?, 'envoyée', ?, ?)`, [input.fournisseurId, supplier.nom, dateParis(now), input.modeLivraison, input.cleCommande])
        orderId = insert.insertId
      } catch (error) {
        // Deux fournisseurs distincts peuvent arriver ici avec la même clé.
        if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
          const existing = await replayOrder(connection, input)
          if (existing) return existing
        }
        throw error
      }
      await connection.query(`INSERT INTO commande_four_lines
        (commande_id, ligne, besoin_id, reference, designation, quantite, prix_unitaire) VALUES ?`,
      [lines.map((line) => [orderId, ...line])])
      await connection.execute(
        "INSERT INTO journal_actions (utilisateur_id, entite, entite_id, action, details) VALUES (?, 'commandes_fournisseurs', ?, 'création', ?)",
        [userId, String(orderId), JSON.stringify({ fournisseurId: input.fournisseurId, modeLivraison: input.modeLivraison })],
      )
      return (await readOrders(connection, { id: orderId }))[0]
    })
  }
}
