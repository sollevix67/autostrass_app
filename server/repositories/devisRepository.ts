import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { AuthenticatedUser } from '../middleware/auth.js'
import { venteTotals } from '../../src/utils/venteTotals.js'
import { dateParis, generateDocumentNumber } from '../services/documentNumbers.js'
import { toIsoString } from './mapping.js'
import { RepositoryError, toRepositoryError } from './simpleRepositories.js'
import type { CommandeRow } from './documentRepositories.js'
import type { DeliveryMode, DevisStatus } from '../db/schema.js'

export type DevisClientSnapshot = {
  nom: string
  prenom: string
  email: string
  telephone: string
  adresse: string
  ville: string
  codePostal: string
  numeroClient: string
  siret: string | null
  typeClient: 'particulier' | 'professionnel'
}

export type DevisLine = {
  ligne: number
  reference: string
  designation: string
  quantite: number
  prixUnitaire: number
  tauxTva: number
  montant: number
  montantTVA: number
  montantTTC: number
}

export type DevisRow = {
  id: number
  numero: string
  clientId: number
  clientSnapshot: DevisClientSnapshot
  dateDevis: string
  dateValidite: string | null
  notes: string | null
  statut: DevisStatus
  version: number
  commandeId: number | null
  articles: DevisLine[]
  totalHT: number
  totalTVA: number
  totalTTC: number
  createdAt: string
  updatedAt: string
}

type DevisLineInput = { reference: string; quantite: number; prixUnitaire: number }
export type DevisInput = {
  clientId: number
  dateDevis: string
  dateValidite?: string | null
  notes?: string | null
  articles: DevisLineInput[]
}
export type DevisPatch = Partial<DevisInput> & {
  version: number
  statut?: Exclude<DevisStatus, 'converti'>
}
export type DevisConversionInput = { version: number; dateLivraisonPrevue?: string | null }
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
export type ConversionResult = { devis: DevisRow; commande: CommandeRow; articlesACommander: ArticleACommanderRow[] }
type Actor = Pick<AuthenticatedUser, 'id' | 'nom' | 'prenom'>
type Query = Pick<PoolConnection, 'query'>

const headColumns = `d.*, DATE_FORMAT(d.date_devis, '%Y-%m-%d') AS date_devis_iso,
  DATE_FORMAT(d.date_validite, '%Y-%m-%d') AS date_validite_iso`
// La priorité des commandes actives est stable : identifiant, puis rang de ligne.
// La projection reste une seule lecture cohérente et ne réserve ni ne déplace le stock.
const procurementQuery = `WITH demandes AS (
  SELECT c.id AS commande_id, l.ligne, l.reference, l.quantite,
    COALESCE(SUM(l.quantite) OVER (
      PARTITION BY l.reference ORDER BY c.id, l.ligne
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS quantite_avant
  FROM commandes c JOIN commande_lines l ON l.commande_id = c.id
  WHERE c.statut IN ('en attente', 'validée')
), besoins AS (
  SELECT a.*, c.numero AS commande_numero, c.client_id,
    GREATEST(0, d.quantite - GREATEST(0, COALESCE(s.quantity, 0) - d.quantite_avant)) AS quantite_actuelle
  FROM articles_a_commander a
  JOIN commandes c ON c.id = a.commande_id
  JOIN demandes d ON d.commande_id = a.commande_id AND d.ligne = a.ligne
  LEFT JOIN articles article ON article.reference = d.reference
  LEFT JOIN stock_balances s ON s.reference_id = article.id
) SELECT * FROM besoins WHERE quantite_actuelle > 0`

function mapLine(row: RowDataPacket): DevisLine {
  return {
    ligne: Number(row.ligne), reference: String(row.reference), designation: String(row.designation),
    quantite: Number(row.quantite), prixUnitaire: Number(row.prix_unitaire), tauxTva: Number(row.taux_tva),
    montant: Number(row.montant), montantTVA: Number(row.montant_tva), montantTTC: Number(row.montant_ttc),
  }
}

function mapProcurement(row: RowDataPacket): ArticleACommanderRow {
  return {
    id: Number(row.id), commandeId: Number(row.commande_id), commandeNumero: row.commande_numero ?? null,
    clientId: Number(row.client_id), ligne: Number(row.ligne), reference: String(row.reference),
    designation: String(row.designation), quantite: Number(row.quantite_actuelle),
    fournisseurId: row.fournisseur_id == null ? null : Number(row.fournisseur_id),
    modeLivraison: row.mode_livraison as DeliveryMode,
  }
}

function parseSnapshot(value: unknown): DevisClientSnapshot {
  return (typeof value === 'string' ? JSON.parse(value) : value) as DevisClientSnapshot
}

/** Le document, sa conversion et son audit sont écrits dans une transaction. */
export class DevisRepository {
  constructor(private readonly pool: Pool) {}

  private async transaction<T>(action: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection()
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

  async list(): Promise<DevisRow[]> {
    return this.read()
  }

  async findById(id: number): Promise<DevisRow | null> {
    return (await this.read(id))[0] ?? null
  }

  private async read(id?: number): Promise<DevisRow[]> {
    // Une requête garantit une tête et des lignes du même état, même en édition.
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `SELECT ${headColumns}, l.ligne, l.reference, l.designation, l.quantite, l.prix_unitaire,
        l.taux_tva, l.montant, l.montant_tva, l.montant_ttc FROM devis d
        LEFT JOIN devis_lines l ON l.devis_id = d.id ${id === undefined ? '' : 'WHERE d.id = ?'}
        ORDER BY d.id DESC, l.ligne`, id === undefined ? [] : [id],
    )
    const groups = new Map<number, { head: RowDataPacket; lines: RowDataPacket[] }>()
    for (const row of rows) {
      let group = groups.get(Number(row.id))
      if (!group) {
        group = { head: row, lines: [] }
        groups.set(Number(row.id), group)
      }
      if (row.ligne !== null) group.lines.push(row)
    }
    return [...groups.values()].map(({ head, lines }) => this.mapQuote(head, lines))
  }

  async create(input: DevisInput, user: Actor): Promise<DevisRow> {
    return this.transaction(async (connection) => {
      const snapshot = await this.clientSnapshot(connection, input.clientId)
      const lines = await this.resolveLines(connection, input.articles)
      const totals = this.totals(lines)
      let id = 0
      for (let attempt = 0; attempt < 12; attempt += 1) {
        try {
          const [result] = await connection.execute<ResultSetHeader>(
            `INSERT INTO devis (numero, client_id, client_snapshot, utilisateur_id, date_devis,
              date_validite, notes, total_ht, total_tva, total_ttc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [generateDocumentNumber('D', input.dateDevis), input.clientId, JSON.stringify(snapshot), user.id,
              input.dateDevis, input.dateValidite ?? null, input.notes || null,
              totals.totalHT.toFixed(2), totals.totalTVA.toFixed(2), totals.totalTTC.toFixed(2)],
          )
          id = result.insertId
          break
        } catch (error) {
          if ((error as { code?: string }).code !== 'ER_DUP_ENTRY') throw error
        }
      }
      if (!id) throw new RepositoryError(503, 'DOCUMENT_NUMBER_UNAVAILABLE', 'Impossible de générer un numéro unique. Réessayez.')
      await this.insertLines(connection, id, lines)
      await this.audit(connection, user, id, 'création', 'Création du devis')
      return this.load(connection, id)
    })
  }

  async update(id: number, input: DevisPatch, user: Actor): Promise<DevisRow> {
    return this.transaction(async (connection) => {
      const current = await this.load(connection, id, true)
      this.checkEditable(current, input.version)
      if (input.dateDevis !== undefined && input.dateDevis !== current.dateDevis) {
        throw new RepositoryError(409, 'DOCUMENT_NUMBER_FROZEN', 'La date et le numéro de ce devis ne peuvent pas être modifiés.')
      }
      const clientId = input.clientId ?? current.clientId
      const snapshot = clientId === current.clientId ? current.clientSnapshot : await this.clientSnapshot(connection, clientId)
      const lines = input.articles ? await this.resolveLines(connection, input.articles, current.articles) : current.articles
      const totals = this.totals(lines)
      const validity = input.dateValidite === undefined ? current.dateValidite : input.dateValidite
      if (validity && validity < current.dateDevis) {
        throw new RepositoryError(422, 'INVALID_VALIDITY', 'La validité doit être postérieure ou égale à la date du devis.')
      }
      await connection.execute(
        `UPDATE devis SET client_id = ?, client_snapshot = ?, date_validite = ?, notes = ?, statut = ?,
          version = version + 1, total_ht = ?, total_tva = ?, total_ttc = ? WHERE id = ?`,
        [clientId, JSON.stringify(snapshot), validity ?? null,
          input.notes === undefined ? current.notes : input.notes || null, input.statut ?? current.statut,
          totals.totalHT.toFixed(2), totals.totalTVA.toFixed(2), totals.totalTTC.toFixed(2), id],
      )
      if (input.articles) {
        await connection.execute('DELETE FROM devis_lines WHERE devis_id = ?', [id])
        await this.insertLines(connection, id, lines)
      }
      await this.audit(connection, user, id, 'modification', 'Modification du devis')
      return this.load(connection, id)
    })
  }

  async convertir(id: number, input: DevisConversionInput, user: Actor): Promise<ConversionResult> {
    return this.transaction(async (connection) => {
      const current = await this.load(connection, id, true)
      // Un second clic ou un rejeu réseau retrouve exactement la même commande.
      if (current.commandeId !== null) return this.conversionResult(connection, current)
      this.checkEditable(current, input.version)
      if (current.statut === 'annulé') throw new RepositoryError(409, 'DEVIS_CANCELLED', 'Ce devis est annulé.')
      if (current.dateValidite && current.dateValidite < dateParis()) {
        throw new RepositoryError(409, 'DEVIS_EXPIRED', 'Ce devis a expiré. Modifiez sa validité avant de le convertir.')
      }
      const initialRequirements: Array<{ line: DevisLine; quantite: number }> = []
      // Même ordre que les créations/éditions de commandes, transferts et inventaires.
      for (const line of [...current.articles].sort((a, b) => a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0)) {
        const [articles] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM articles WHERE reference = ? FOR UPDATE', [line.reference],
        )
        if (!articles[0]) throw new RepositoryError(422, 'UNKNOWN_REFERENCE', `Référence inconnue : ${line.reference}.`)
        const [balances] = await connection.query<RowDataPacket[]>(
          'SELECT quantity FROM stock_balances WHERE reference_id = ? FOR UPDATE', [articles[0].id],
        )
        const [demand] = await connection.query<RowDataPacket[]>(
          `SELECT COALESCE(SUM(l.quantite), 0) AS quantite FROM commande_lines l
            JOIN commandes c ON c.id = l.commande_id
            WHERE l.reference = ? AND c.statut IN ('en attente', 'validée')`, [line.reference],
        )
        const available = Math.max(0, Number(balances[0]?.quantity ?? 0) - Number(demand[0].quantite))
        const shortage = Math.max(0, line.quantite - available)
        initialRequirements.push({ line, quantite: shortage })
      }
      const commandeDate = dateParis()
      let commandeId = 0
      for (let attempt = 0; attempt < 12; attempt += 1) {
        try {
          const [result] = await connection.execute<ResultSetHeader>(
            `INSERT INTO commandes (numero, client_snapshot, client_id, date_commande, statut, date_livraison_prevue)
              VALUES (?, ?, ?, ?, 'en attente', ?)`,
            [generateDocumentNumber('C', commandeDate), JSON.stringify(current.clientSnapshot), current.clientId,
              commandeDate, input.dateLivraisonPrevue ?? null],
          )
          commandeId = result.insertId
          break
        } catch (error) {
          if ((error as { code?: string }).code !== 'ER_DUP_ENTRY') throw error
        }
      }
      if (!commandeId) throw new RepositoryError(503, 'DOCUMENT_NUMBER_UNAVAILABLE', 'Impossible de générer un numéro unique. Réessayez.')
      for (const line of current.articles) {
        await connection.execute(
          `INSERT INTO commande_lines (commande_id, ligne, reference, designation, quantite, prix_unitaire, taux_tva)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [commandeId, line.ligne, line.reference, line.designation, line.quantite,
            line.prixUnitaire.toFixed(2), line.tauxTva.toFixed(2)],
        )
      }
      for (const { line, quantite } of initialRequirements) {
        await connection.execute(
          `INSERT INTO articles_a_commander (commande_id, ligne, reference, designation, quantite)
            VALUES (?, ?, ?, ?, ?)`, [commandeId, line.ligne, line.reference, line.designation, quantite],
        )
      }
      await connection.execute("UPDATE devis SET commande_id = ?, statut = 'converti', version = version + 1 WHERE id = ?", [commandeId, id])
      await this.audit(connection, user, id, 'modification', `Conversion en commande ${commandeId}`)
      await this.audit(connection, user, commandeId, 'création', `Commande créée depuis le devis ${current.numero}`, 'commandes')
      return this.conversionResult(connection, await this.load(connection, id))
    })
  }

  async listArticlesACommander(): Promise<ArticleACommanderRow[]> {
    return this.procurement(this.pool)
  }

  private async procurement(connection: Query, commandeId?: number): Promise<ArticleACommanderRow[]> {
    const [rows] = await connection.query<RowDataPacket[]>(
      `${procurementQuery}${commandeId === undefined ? '' : ' AND commande_id = ?'} ORDER BY ${commandeId === undefined ? 'id DESC' : 'ligne'}`,
      commandeId === undefined ? [] : [commandeId],
    )
    return rows.map(mapProcurement)
  }

  private checkEditable(current: DevisRow, version: number) {
    if (current.commandeId !== null || current.statut === 'converti') {
      throw new RepositoryError(409, 'DEVIS_FROZEN', 'Ce devis a déjà été converti en commande et ne peut plus être modifié.')
    }
    if (current.version !== version) {
      throw new RepositoryError(409, 'DEVIS_CONFLICT', 'Ce devis a changé. Actualisez-le avant de réessayer.')
    }
  }

  private async clientSnapshot(connection: Query, clientId: number): Promise<DevisClientSnapshot> {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM clients WHERE id = ?', [clientId])
    if (!rows[0]) throw new RepositoryError(422, 'UNKNOWN_REFERENCE', 'Client inconnu.')
    const row = rows[0]
    return {
      nom: String(row.nom ?? ''), prenom: String(row.prenom ?? ''), email: String(row.email ?? ''), telephone: String(row.telephone ?? ''),
      adresse: String(row.adresse ?? ''), ville: String(row.ville ?? ''), codePostal: String(row.code_postal ?? ''),
      numeroClient: String(row.numero_client ?? ''), siret: row.siret ?? null, typeClient: row.type ?? 'particulier',
    }
  }

  private async resolveLines(connection: Query, inputs: DevisLineInput[], previous: DevisLine[] = []): Promise<DevisLine[]> {
    if (inputs.length === 0 || inputs.length > 200) throw new RepositoryError(422, 'INVALID_LINES', 'Le devis doit contenir de 1 à 200 lignes.')
    const found = new Map<string, { designation: string; tauxTva: number }>()
    const previousByRef = new Map(previous.map((line) => [line.reference.toUpperCase(), line]))
    for (const input of [...inputs].sort((a, b) => a.reference.toUpperCase() < b.reference.toUpperCase() ? -1 : a.reference.toUpperCase() > b.reference.toUpperCase() ? 1 : 0)) {
      const reference = input.reference.toUpperCase()
      if (found.has(reference)) throw new RepositoryError(422, 'INVALID_LINES', 'Une référence ne peut apparaître qu’une fois dans un devis.')
      const existing = previousByRef.get(reference)
      if (existing) {
        found.set(reference, { designation: existing.designation, tauxTva: existing.tauxTva })
        continue
      }
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT id, designation, tva_id FROM articles WHERE reference = ? FOR UPDATE', [reference],
      )
      if (!rows[0]) throw new RepositoryError(422, 'UNKNOWN_REFERENCE', `Référence inconnue : ${reference}.`)
      const [taxes] = await connection.query<RowDataPacket[]>('SELECT taux FROM tva WHERE id = ?', [rows[0].tva_id])
      if (!taxes[0]) throw new RepositoryError(422, 'UNKNOWN_REFERENCE', `TVA inconnue pour la référence ${reference}.`)
      found.set(reference, { designation: String(rows[0].designation), tauxTva: Number(taxes[0].taux) })
    }
    return inputs.map((input, index) => {
      const reference = input.reference.toUpperCase()
      const catalogue = found.get(reference)!
      let amounts: ReturnType<typeof venteTotals>
      try { amounts = venteTotals([{ ...input, tauxTva: catalogue.tauxTva }]) } catch {
        throw new RepositoryError(422, 'INVALID_AMOUNT', 'Quantité, prix ou montant du devis invalide.')
      }
      return {
        ligne: index + 1, reference, designation: catalogue.designation, quantite: input.quantite,
        prixUnitaire: input.prixUnitaire, tauxTva: catalogue.tauxTva,
        montant: amounts.totalHT, montantTVA: amounts.totalTVA, montantTTC: amounts.totalTTC,
      }
    })
  }

  private totals(lines: DevisLine[]) {
    try { return venteTotals(lines) } catch {
      throw new RepositoryError(422, 'INVALID_AMOUNT', 'Le montant du devis dépasse la limite autorisée.')
    }
  }

  private async insertLines(connection: PoolConnection, id: number, lines: DevisLine[]) {
    for (const line of lines) {
      await connection.execute(
        `INSERT INTO devis_lines (devis_id, ligne, reference, designation, quantite, prix_unitaire,
          taux_tva, montant, montant_tva, montant_ttc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, line.ligne, line.reference, line.designation, line.quantite, line.prixUnitaire.toFixed(2),
          line.tauxTva.toFixed(2), line.montant.toFixed(2), line.montantTVA.toFixed(2), line.montantTTC.toFixed(2)],
      )
    }
  }

  private async load(connection: Query, id: number, lock = false): Promise<DevisRow> {
    const [heads] = await connection.query<RowDataPacket[]>(
      `SELECT ${headColumns} FROM devis d WHERE d.id = ?${lock ? ' FOR UPDATE' : ''}`, [id],
    )
    if (!heads[0]) throw new RepositoryError(404, 'NOT_FOUND', 'Devis introuvable.')
    return this.hydrate(connection, heads[0])
  }

  private async hydrate(connection: Query, head: RowDataPacket): Promise<DevisRow> {
    const [lines] = await connection.query<RowDataPacket[]>('SELECT * FROM devis_lines WHERE devis_id = ? ORDER BY ligne', [head.id])
    return this.mapQuote(head, lines)
  }

  private mapQuote(head: RowDataPacket, lines: RowDataPacket[]): DevisRow {
    return {
      id: Number(head.id), numero: String(head.numero), clientId: Number(head.client_id), clientSnapshot: parseSnapshot(head.client_snapshot),
      dateDevis: String(head.date_devis_iso), dateValidite: head.date_validite_iso ?? null, notes: head.notes ?? null,
      statut: head.statut as DevisStatus, version: Number(head.version), commandeId: head.commande_id == null ? null : Number(head.commande_id),
      articles: lines.map(mapLine), totalHT: Number(head.total_ht), totalTVA: Number(head.total_tva), totalTTC: Number(head.total_ttc),
      createdAt: toIsoString(head.created_at), updatedAt: toIsoString(head.updated_at),
    }
  }

  private async conversionResult(connection: Query, quote: DevisRow): Promise<ConversionResult> {
    const [heads] = await connection.query<RowDataPacket[]>(
      `SELECT c.*, DATE_FORMAT(c.date_commande, '%Y-%m-%d') AS date_commande_iso,
        DATE_FORMAT(c.date_livraison_prevue, '%Y-%m-%d') AS date_livraison_prevue_iso FROM commandes c WHERE id = ?`, [quote.commandeId],
    )
    if (!heads[0]) throw new RepositoryError(409, 'DEVIS_FROZEN', 'La commande liée au devis est introuvable.')
    const head = heads[0]
    const [lines] = await connection.query<RowDataPacket[]>('SELECT * FROM commande_lines WHERE commande_id = ? ORDER BY ligne', [quote.commandeId])
    const procurement = await this.procurement(connection, quote.commandeId!)
    return {
      devis: quote,
      commande: {
        id: Number(head.id), numero: head.numero ?? null, clientId: Number(head.client_id), clientSnapshot: parseSnapshot(head.client_snapshot),
        dateCommande: String(head.date_commande_iso), statut: head.statut,
        dateLivraisonPrevue: head.date_livraison_prevue_iso ?? null,
        articles: lines.map((line) => ({
          ligne: Number(line.ligne), reference: String(line.reference), designation: String(line.designation),
          quantite: Number(line.quantite), prixUnitaire: Number(line.prix_unitaire), tauxTva: Number(line.taux_tva),
          montant: quote.articles.find((quoteLine) => quoteLine.ligne === Number(line.ligne))!.montant,
        })),
        totalHT: quote.totalHT, totalTVA: quote.totalTVA, totalTTC: quote.totalTTC,
        createdAt: toIsoString(head.created_at), updatedAt: toIsoString(head.updated_at),
      },
      articlesACommander: procurement,
    }
  }

  private async audit(connection: PoolConnection, user: Actor, id: number, action: 'création' | 'modification', detail: string, entity = 'devis') {
    await connection.execute(
      'INSERT INTO journal_actions (utilisateur_id, entite, entite_id, action, details) VALUES (?, ?, ?, ?, ?)',
      [user.id, entity, String(id), action, JSON.stringify({ auteur: `${user.prenom} ${user.nom}`.trim(), detail })],
    )
  }
}
