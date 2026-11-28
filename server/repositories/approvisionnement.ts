import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import type { DeliveryMode } from '../db/schema.js'
import { toRepositoryError } from './simpleRepositories.js'

type Query = Pick<PoolConnection, 'query'>
type Scope = { commandeId: number } | { besoinIds: number[] }

export type ArticleACommanderRow = {
  id: number
  commandeId: number
  commandeNumero: string | null
  clientId: number
  ligne: number
  reference: string
  designation: string
  quantite: number
  fournisseurId: number | null
  modeLivraison: DeliveryMode
}

export async function withSupplyTransaction<T>(pool: Pool, action: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection()
  let started = false
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
    await connection.beginTransaction()
    started = true
    const result = await action(connection)
    await connection.commit()
    return result
  } catch (error) {
    if (started) await connection.rollback()
    throw toRepositoryError(error)
  } finally {
    connection.release()
  }
}

// Une attribution physique est prioritaire pour sa commande. Si le stock baisse,
// les attributions encore couvertes sont départagées par commande puis ligne.
// Le stock libre couvre en FIFO la demande restante, y compris les commandes directes.
// Pour un achat, les quantités déjà en route couvrent leur besoin avant ce dernier partage.
async function readRequirements(connection: Query, scope: Scope | undefined, onlyMissing: boolean): Promise<RowDataPacket[]> {
  let selection = ''
  const params: Array<number | number[]> = []
  if (scope && 'besoinIds' in scope) {
    if (scope.besoinIds.length === 0) return []
    selection = 'WHERE id IN (?)'
    params.push(scope.besoinIds)
  } else if (scope) {
    selection = 'WHERE commande_id = ?'
    params.push(scope.commandeId)
  }
  const achatsCibles = scope
    ? 'JOIN articles_a_commander suivi ON suivi.id = f.besoin_id JOIN references_cibles rc ON rc.reference = suivi.reference'
    : ''
  const [rows] = await connection.query<RowDataPacket[]>(`
    WITH cibles AS (
      SELECT id, reference, designation, fournisseur_id, mode_livraison FROM articles_a_commander ${selection}
    ), references_cibles AS (
      SELECT DISTINCT reference FROM cibles
    ), en_cours AS (
      SELECT f.besoin_id, SUM(f.quantite - f.quantite_recue) AS attendu
      FROM commande_four_lines f ${achatsCibles}
      JOIN commandes_fournisseurs c ON c.id = f.commande_id
      WHERE f.besoin_id IS NOT NULL AND c.statut IN ('envoyée', 'partielle')
      GROUP BY f.besoin_id
    ), attributions AS (
      SELECT f.besoin_id, SUM(l.quantite_attribuee) AS attribue
      FROM commande_four_lines f ${achatsCibles}
      JOIN receptions r ON r.commande_fournisseur_id = f.commande_id
      JOIN reception_lines l ON l.reception_id = r.id AND l.ligne_commande_fournisseur = f.ligne
      WHERE f.besoin_id IS NOT NULL
      GROUP BY f.besoin_id
    ), demandes AS (
      SELECT a.id, c.id AS commande_id, l.ligne, l.reference, l.quantite,
        COALESCE(s.quantity, 0) AS stock, COALESCE(e.attendu, 0) AS attendu,
        COALESCE(t.attribue, 0) AS deja_attribue, LEAST(l.quantite, COALESCE(t.attribue, 0)) AS reserve
      FROM references_cibles rc JOIN commande_lines l ON l.reference = rc.reference
      JOIN commandes c ON c.id = l.commande_id
      LEFT JOIN articles_a_commander a ON a.commande_id = c.id AND a.ligne = l.ligne
      LEFT JOIN articles article ON article.reference = l.reference
      LEFT JOIN stock_balances s ON s.reference_id = article.id
      LEFT JOIN en_cours e ON e.besoin_id = a.id
      LEFT JOIN attributions t ON t.besoin_id = a.id
      WHERE c.statut IN ('en attente', 'validée')
    ), priorites AS (
      SELECT demandes.*,
        SUM(reserve) OVER (PARTITION BY reference) AS reserve_total,
        COALESCE(SUM(reserve) OVER avant, 0) AS reserve_avant,
        COALESCE(SUM(quantite - reserve) OVER avant, 0) AS demande_avant,
        COALESCE(SUM(GREATEST(0, quantite - reserve - attendu)) OVER avant, 0) AS demande_sans_achat_avant
      FROM demandes WINDOW avant AS (
        PARTITION BY reference ORDER BY commande_id, ligne ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      )
    ), soldes AS (
      SELECT priorites.*, GREATEST(0, stock - reserve_total) AS stock_libre,
        quantite - LEAST(reserve, GREATEST(0, stock - reserve_avant)) AS a_couvrir
      FROM priorites
    ), besoins AS (
      SELECT soldes.*,
        GREATEST(0, a_couvrir - GREATEST(0, stock_libre - demande_avant)) AS manque_physique,
        GREATEST(0, a_couvrir - attendu - GREATEST(0, stock_libre - demande_sans_achat_avant)) AS a_commander
      FROM soldes
    )
    SELECT b.id, b.commande_id, c.numero AS commande_numero, c.client_id, b.ligne, b.quantite,
      b.deja_attribue, b.manque_physique, b.a_commander, cibles.reference, cibles.designation,
      cibles.fournisseur_id, cibles.mode_livraison
    FROM besoins b JOIN cibles ON cibles.id = b.id JOIN commandes c ON c.id = b.commande_id
    ${onlyMissing ? 'WHERE b.a_commander > 0' : ''}
    ORDER BY ${scope && 'commandeId' in scope ? 'b.ligne' : 'b.id DESC'}`, params)
  return rows
}

export async function listProcurementNeeds(connection: Query, scope?: Scope): Promise<ArticleACommanderRow[]> {
  const rows = await readRequirements(connection, scope, true)
  return rows.map((row) => ({
    id: Number(row.id), commandeId: Number(row.commande_id), commandeNumero: row.commande_numero ?? null,
    clientId: Number(row.client_id), ligne: Number(row.ligne), reference: row.reference,
    designation: row.designation, quantite: Number(row.a_commander),
    fournisseurId: row.fournisseur_id == null ? null : Number(row.fournisseur_id), modeLivraison: row.mode_livraison,
  }))
}

export async function getReceivingNeeds(connection: Query, besoinIds: number[]) {
  const rows = await readRequirements(connection, { besoinIds }, false)
  return new Map(rows.map((row) => [Number(row.id), {
    quantiteDemandee: Number(row.quantite),
    quantiteDejaAttribuee: Number(row.deja_attribue),
    quantiteManquantePhysique: Number(row.manque_physique),
  }]))
}
