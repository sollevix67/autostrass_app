/**
 * Repositories des documents metier : entete + lignes.
 *
 * Receptions, ventes, commandes et retours partagent la meme forme (une table
 * d'entete, une table de lignes indexee par `(entete_id, ligne)`). Ils sont
 * factorises dans `DocumentRepository`.
 *
 * Regle metier commune : entete et lignes s'ecrivent dans **une transaction**.
 * Une reception sans ses lignes doit laisser la base intacte.
 *
 * Le total n'est jamais fourni par le client : il est recalcule ici a partir
 * des lignes, ce qui empeche un total incoherent avec le detail.
 */

import { eq, sql } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { AnyMySqlColumn, AnyMySqlTable } from 'drizzle-orm/mysql-core'
import * as schema from '../db/schema.js'
import { toNumber, toDateString, toIsoString } from './mapping.js'
import { toRepositoryError, type RepositoryError } from './simpleRepositories.js'
import { RepositoryError as BusinessError } from './simpleRepositories.js'
import { generateDocumentNumber } from '../services/documentNumbers.js'
import { venteTotals } from '../../src/utils/venteTotals.js'
import type { DevisClientSnapshot } from './devisRepository.js'

type Tables = typeof schema

/** Type de transaction Drizzle, deduit pour eviter de le redeclarer. */
type Tx = Parameters<Parameters<MySql2Database<Tables>['transaction']>[0]>[0]

/**
 * Transaction exportee : les routes ont besoin de ce type pour ecrire dans la
 * meme transaction que la creation du document (journal de caisse).
 */
export type Transaction = Tx

/** Ligne de document exposee par l'API (forme commune a tous les metiers). */
export type DocumentLine = {
  /** Rang de la ligne, 1-based : sert de cle React cote client. */
  ligne: number
  reference: string
  designation: string
  quantite: number
  prixUnitaire: number
  tauxTva?: number | null
  montant: number
}

/** Ligne d'entree, avant conversion vers la forme exposee. */
export type LineInput = {
  reference: string
  designation: string
  quantite: number
  prixUnitaire: number
  tauxTva?: number
}

/** Dossier de mapping : comment convertir entete et lignes d'une table donnee. */
type DocumentMapping<TRow> = {
  linesTable: AnyMySqlTable
  /** Colonne portant l'id de l'entete dans la table des lignes. */
  lineFk: AnyMySqlColumn
  mapRow: (raw: Record<string, unknown>, lines: DocumentLine[]) => TRow
  mapLine: (raw: Record<string, unknown>) => DocumentLine
  /** Insere les lignes en numero ; recoit deja la connexion de transaction. */
  insertLines: (tx: Tx, lines: LineInput[], enteteId: number) => Promise<void>
}

/** Conversion d'une ligne MariaDB vers la forme exposee. */
function baseLine(raw: Record<string, unknown>): DocumentLine {
  const quantite = Number(raw.quantite ?? raw.quantite_recue ?? 0)
  const prixUnitaire = toNumber(raw.prix_unitaire as string | number | null)
  return {
    ligne: Number(raw.ligne ?? 1),
    reference: String(raw.reference ?? ''),
    designation: String(raw.designation ?? ''),
    quantite,
    prixUnitaire,
    ...(raw.taux_tva !== undefined && { tauxTva: raw.taux_tva === null ? null : Number(raw.taux_tva) }),
    // `montant` n'existe que sur les ventes ; ailleurs on le derive.
    montant:
      raw.montant === undefined || raw.montant === null
        ? Math.round(quantite * prixUnitaire * 100) / 100
        : toNumber(raw.montant as string | number | null),
  }
}

/** Somme des montants d'un ensemble de lignes, arrondie au centime. */
export function totalOf(lines: readonly DocumentLine[]): number {
  return Math.round(lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0) * 100) / 100
}

/** Normalise une ligne d'entree vers la forme exposee (rang 1-based). */
function toLine(input: LineInput, index: number): DocumentLine {
  return {
    ligne: index + 1,
    reference: input.reference,
    designation: input.designation,
    quantite: input.quantite,
    prixUnitaire: input.prixUnitaire,
    ...(input.tauxTva !== undefined && { tauxTva: input.tauxTva }),
    montant: Math.round(input.quantite * input.prixUnitaire * 100) / 100,
  }
}

export class DocumentRepository<TRow extends { id: number }> {
  constructor(
    protected readonly db: MySql2Database<Tables>,
    private readonly headTable: AnyMySqlTable,
    private readonly headId: AnyMySqlColumn,
    protected readonly mapping: DocumentMapping<TRow>,
  ) {}

  async list(): Promise<TRow[]> {
    const heads = await this.db.select().from(this.headTable)
    return Promise.all(heads.map((head) => this.hydrate(head as unknown as Record<string, unknown>)))
  }

  async findById(id: number): Promise<TRow | null> {
    const heads = await this.db.select().from(this.headTable).where(eq(this.headId, id)).limit(1)
    const head = heads[0]
    if (!head) return null
    return this.hydrate(head as unknown as Record<string, unknown>)
  }

  /**
   * Cree l'entete et ses lignes dans une seule transaction.
   *
   * `before` et `after` s'executent **dans la transaction**, l'un avant
   * l'insertion, l'autre apres. C'est le seul moyen de garantir qu'une
   * écriture liée au document (le journal de caisse pour une vente) est
   * atomique avec lui : deux transactions separes laisseraient une vente sans
   * mouvement de caisse, donc un ecart de caisse invente a la cloture.
   *
   * `before` renvoie les colonnes supplementaires a inserer (par exemple
   * `session_id`). Resoudre la session ici, et non dans `toHead`, ferme la
   * fenêtre entre la lecture et l'écriture : une session fermée entre les deux
   * ferait echouer la vente plutot que de l'imputer a un tiroir deja cloture.
   *
   * `after` recoit l'id insere : c'est ce qu'il faut pour l'empreinte NF525,
   * qui depend de l'identifiant de la vente.
   */
  async create(
    head: Record<string, unknown>,
    lines: LineInput[],
    hooks?: {
      before?: (tx: Tx) => Promise<Record<string, unknown>>
      after?: (tx: Tx, headId: number) => Promise<void>
    },
  ): Promise<TRow> {
    try {
      return await this.db.transaction(async (tx) => {
        const extra = hooks?.before ? await hooks.before(tx) : {}
        const [result] = await tx.insert(this.headTable).values({ ...head, ...extra } as never)
        const id = result.insertId
        await this.mapping.insertLines(tx, lines, id)
        if (hooks?.after) await hooks.after(tx, id)
        const created = await tx.select().from(this.headTable).where(eq(this.headId, id)).limit(1)
        return this.mapping.mapRow(
          created[0] as unknown as Record<string, unknown>,
          lines.map(toLine),
        )
      })
    } catch (error) {
      // Sans cette traduction, une cle etrangere inexistante remonte en 500
      // « erreur interne » au lieu de 422 « reference inconnue ».
      throw toRepositoryError(error)
    }
  }

  /**
   * Remplace toutes les lignes d'un document existant, en transaction.
   *
   * Le `WHERE` sur la cle etrangere est indispensable : sans lui, la
   * suppression viderait la table des lignes de *tous* les documents.
   */
  async replaceLines(id: number, lines: LineInput[]): Promise<TRow | null> {
    try {
      return await this.db.transaction(async (tx) => {
        const heads = await tx.select().from(this.headTable).where(eq(this.headId, id)).limit(1)
        if (!heads[0]) return null

        // Suppression puis reinsertion : le rang est la cle primaire composite,
        // on ne peut pas faire de mise a jour positionnelle.
        await tx.delete(this.mapping.linesTable as never).where(eq(this.mapping.lineFk, id))
        await this.mapping.insertLines(tx, lines, id)

        const refreshed = await tx.select().from(this.headTable).where(eq(this.headId, id)).limit(1)
        return this.mapping.mapRow(
          refreshed[0] as unknown as Record<string, unknown>,
          lines.map(toLine),
        )
      })
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  /** Met a jour l'entete sans toucher aux lignes. */
  async updateHead(id: number, patch: Record<string, unknown>): Promise<TRow | null> {
    try {
      const [result] = await this.db.update(this.headTable).set(patch as never).where(eq(this.headId, id))
      if (result.affectedRows === 0) return null
      return this.findById(id)
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  async remove(id: number): Promise<boolean> {
    try {
      // Les lignes tombent en CASCADE (contrainte FK generee par Drizzle).
      const [result] = await this.db.delete(this.headTable).where(eq(this.headId, id))
      return result.affectedRows > 0
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  private async hydrate(raw: Record<string, unknown>): Promise<TRow> {
    const id = Number(raw.id)
    const rows = await this.db
      .select()
      .from(this.mapping.linesTable)
      .where(eq(this.mapping.lineFk, id))
    const lines = rows
      .map((row) => this.mapping.mapLine(row as unknown as Record<string, unknown>))
      .sort((a, b) => a.ligne - b.ligne)
    return this.mapping.mapRow(raw, lines)
  }
}

// ---------------------------------------------------------------------------
// Receptions
// ---------------------------------------------------------------------------

export type ReceptionRow = {
  id: number
  fournisseur: string
  dateReception: string
  notes: string | null
  articles: DocumentLine[]
  totalHT: number
  createdAt: string
  updatedAt: string
}

export function createReceptionRepository(db: MySql2Database<Tables>): DocumentRepository<ReceptionRow> {
  return new DocumentRepository<ReceptionRow>(db, schema.receptions, schema.receptions.id, {
    linesTable: schema.receptionLines,
    lineFk: schema.receptionLines.reception_id,
    mapLine: baseLine,
    mapRow: (raw, lines) => ({
      id: Number(raw.id),
      fournisseur: String(raw.fournisseur ?? ''),
      dateReception: toDateString(raw.date_reception as Date | null),
      notes: raw.notes === null || raw.notes === undefined ? null : String(raw.notes),
      articles: lines,
      totalHT: totalOf(lines),
      createdAt: toIsoString(raw.created_at as Date | null),
      updatedAt: toIsoString(raw.updated_at as Date | null),
    }),
    insertLines: async (tx, lines, enteteId) => {
      if (lines.length === 0) return
      await tx.insert(schema.receptionLines).values(
        lines.map((line, index) => ({
          reception_id: enteteId,
          ligne: index + 1,
          reference: line.reference,
          designation: line.designation,
          quantite_recue: line.quantite,
          prix_unitaire: line.prixUnitaire.toFixed(2),
        })),
      )
    },
  })
}

// ---------------------------------------------------------------------------
// Ventes
// ---------------------------------------------------------------------------

export type VenteRow = {
  id: number
  clientId: number | null
  /** Session de caisse ayant enregistre la vente. */
  sessionId: number | null
  dateVente: string
  caissier: string
  articles: DocumentLine[]
  totalHT: number
  totalTVA: number | null
  totalTTC: number | null
  fingerprintVersion: number
  montantPaye: number
  monnaie: number
  modePaiement: schema.PaymentMode
  createdAt: string
}

export function createVenteRepository(db: MySql2Database<Tables>): DocumentRepository<VenteRow> {
  return new DocumentRepository<VenteRow>(db, schema.ventes, schema.ventes.id, {
    linesTable: schema.venteLines,
    lineFk: schema.venteLines.vente_id,
    mapLine: baseLine,
    mapRow: (raw, lines) => ({
      id: Number(raw.id),
      clientId: raw.client_id === null || raw.client_id === undefined ? null : Number(raw.client_id),
      sessionId: raw.session_id === null || raw.session_id === undefined ? null : Number(raw.session_id),
      dateVente: toIsoString(raw.date_vente as Date | null),
      caissier: String(raw.caissier ?? ''),
      articles: lines,
      totalHT: totalOf(lines),
      montantPaye: toNumber(raw.montant_paye as string | number | null),
      totalTVA: raw.total_tva == null ? null : Number(raw.total_tva),
      totalTTC: raw.total_ttc == null ? null : Number(raw.total_ttc),
      fingerprintVersion: Number(raw.fingerprint_version ?? 1),
      monnaie: toNumber(raw.monnaie as string | number | null),
      modePaiement: (raw.mode_paiement as schema.PaymentMode) ?? 'espèces',
      createdAt: toIsoString(raw.created_at as Date | null),
    }),
    insertLines: async (tx, lines, enteteId) => {
      if (lines.length === 0) return
      await tx.insert(schema.venteLines).values(
        lines.map((line, index) => ({
          vente_id: enteteId,
          ligne: index + 1,
          reference: line.reference,
          designation: line.designation,
          quantite: line.quantite,
          prix_unitaire: line.prixUnitaire.toFixed(2),
          taux_tva: line.tauxTva?.toFixed(2) ?? null,
          montant: (line.quantite * line.prixUnitaire).toFixed(2),
        })),
      )
    },
  })
}

// ---------------------------------------------------------------------------
// Commandes clients
// ---------------------------------------------------------------------------

export type CommandeRow = {
  id: number
  numero: string | null
  clientId: number
  clientSnapshot: DevisClientSnapshot | null
  dateCommande: string
  articles: DocumentLine[]
  statut: schema.OrderStatus
  dateLivraisonPrevue: string | null
  totalHT: number
  totalTVA: number | null
  totalTTC: number | null
  createdAt: string
  updatedAt: string
}

export function createCommandeRepository(db: MySql2Database<Tables>): DocumentRepository<CommandeRow> {
  return new CommandeRepository(db, schema.commandes, schema.commandes.id, {
    linesTable: schema.commandeLines,
    lineFk: schema.commandeLines.commande_id,
    mapLine: baseLine,
    mapRow: (raw, lines) => {
      const taxes = lines.every((line) => typeof line.tauxTva === 'number')
        ? venteTotals(lines as Array<DocumentLine & { tauxTva: number }>) : null
      return {
        id: Number(raw.id),
        numero: raw.numero == null ? null : String(raw.numero),
        clientId: Number(raw.client_id ?? 0),
        clientSnapshot: raw.client_snapshot == null ? null
          : (typeof raw.client_snapshot === 'string' ? JSON.parse(raw.client_snapshot) : raw.client_snapshot) as DevisClientSnapshot,
        dateCommande: toDateString(raw.date_commande as Date | null),
        articles: lines,
        statut: (raw.statut as schema.OrderStatus) ?? 'en attente',
        dateLivraisonPrevue:
          raw.date_livraison_prevue === null || raw.date_livraison_prevue === undefined
            ? null
            : toDateString(raw.date_livraison_prevue as Date | null),
        totalHT: taxes?.totalHT ?? totalOf(lines),
        totalTVA: taxes?.totalTVA ?? null,
        totalTTC: taxes?.totalTTC ?? null,
        createdAt: toIsoString(raw.created_at as Date | null),
        updatedAt: toIsoString(raw.updated_at as Date | null),
      }
    },
    insertLines: async (tx, lines, enteteId) => {
      if (lines.length === 0) return
      await tx.insert(schema.commandeLines).values(
        lines.map((line, index) => ({
          commande_id: enteteId,
          ligne: index + 1,
          reference: line.reference,
          designation: line.designation,
          quantite: line.quantite,
          prix_unitaire: line.prixUnitaire.toFixed(2),
          taux_tva: line.tauxTva?.toFixed(2) ?? null,
        })),
      )
    },
  })
}

/** Les commandes et les conversions sérialisent la demande sur chaque article. */
class CommandeRepository extends DocumentRepository<CommandeRow> {
  override async create(
    head: Record<string, unknown>,
    lines: LineInput[],
    hooks?: {
      before?: (tx: Tx) => Promise<Record<string, unknown>>
      after?: (tx: Tx, headId: number) => Promise<void>
    },
  ): Promise<CommandeRow> {
    try {
      return await this.db.transaction(async (tx) => {
        const resolved = await this.lockReferences(tx, lines)
        const extra = hooks?.before ? await hooks.before(tx) : {}
        const snapshot = await this.clientSnapshot(tx, Number(head.client_id))
        let id = 0
        for (let attempt = 0; attempt < 12; attempt += 1) {
          try {
            const [result] = await tx.insert(schema.commandes).values({
              ...head, ...extra, numero: generateDocumentNumber('C', String(head.date_commande)),
              client_snapshot: snapshot,
            } as typeof schema.commandes.$inferInsert)
            id = result.insertId
            break
          } catch (error) {
            let cause = error as { code?: string; cause?: unknown }
            for (let depth = 0; depth < 5 && cause.cause; depth += 1) cause = cause.cause as typeof cause
            if (cause.code !== 'ER_DUP_ENTRY') throw error
          }
        }
        if (!id) throw new BusinessError(503, 'DOCUMENT_NUMBER_UNAVAILABLE', 'Impossible de générer un numéro unique. Réessayez.')
        await this.mapping.insertLines(tx, resolved, id)
        if (hooks?.after) await hooks.after(tx, id)
        const [created] = await tx.select().from(schema.commandes).where(eq(schema.commandes.id, id))
        return this.mapping.mapRow(created, resolved.map(toLine))
      }, { isolationLevel: 'read committed' })
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  override async replaceLines(id: number, lines: LineInput[]): Promise<CommandeRow | null> {
    try {
      return await this.db.transaction(async (tx) => {
        const [head] = await tx.select().from(schema.commandes).where(eq(schema.commandes.id, id)).for('update')
        if (!head) return null
        await this.requireMutable(tx, id)
        const old = await tx.select().from(schema.commandeLines).where(eq(schema.commandeLines.commande_id, id))
        const resolved = await this.lockReferences(tx, lines, old.map((line) => line.reference))
        await tx.delete(schema.commandeLines).where(eq(schema.commandeLines.commande_id, id))
        await this.mapping.insertLines(tx, resolved, id)
        return this.mapping.mapRow(head, resolved.map(toLine))
      }, { isolationLevel: 'read committed' })
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  override async updateHead(id: number, patch: Record<string, unknown>): Promise<CommandeRow | null> {
    try {
      return await this.db.transaction(async (tx) => {
        const [head] = await tx.select().from(schema.commandes).where(eq(schema.commandes.id, id)).for('update')
        if (!head) return null
        const [quote] = await tx.select({ id: schema.devis.id }).from(schema.devis).where(eq(schema.devis.commande_id, id))
        if (quote && ['client_id', 'date_commande', 'numero'].some((key) => patch[key] !== undefined && patch[key] !== (head as Record<string, unknown>)[key])) {
          throw new BusinessError(409, 'COMMANDE_FROM_DEVIS', 'Cette commande provient d’un devis : client, date et lignes sont figés.')
        }
        if (head.numero && (patch.numero !== undefined && patch.numero !== head.numero
          || patch.date_commande !== undefined && String(patch.date_commande) !== head.date_commande)) {
          throw new BusinessError(409, 'DOCUMENT_NUMBER_FROZEN', 'La date et le numéro de cette commande ne peuvent pas être modifiés.')
        }
        const lines = await tx.select().from(schema.commandeLines).where(eq(schema.commandeLines.commande_id, id))
        await this.lockReferences(tx, [], lines.map((line) => line.reference))
        const values: Record<string, unknown> = { ...patch }
        if (patch.client_id !== undefined && Number(patch.client_id) !== head.client_id) {
          values.client_snapshot = await this.clientSnapshot(tx, Number(patch.client_id))
        }
        await tx.update(schema.commandes).set(values).where(eq(schema.commandes.id, id))
        const [updated] = await tx.select().from(schema.commandes).where(eq(schema.commandes.id, id))
        return this.mapping.mapRow(updated, lines.map(baseLine))
      }, { isolationLevel: 'read committed' })
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  override async remove(id: number): Promise<boolean> {
    try {
      return await this.db.transaction(async (tx) => {
        const [head] = await tx.select().from(schema.commandes).where(eq(schema.commandes.id, id)).for('update')
        if (!head) return false
        await this.requireMutable(tx, id)
        const lines = await tx.select().from(schema.commandeLines).where(eq(schema.commandeLines.commande_id, id))
        await this.lockReferences(tx, [], lines.map((line) => line.reference))
        const [result] = await tx.delete(schema.commandes).where(eq(schema.commandes.id, id))
        return result.affectedRows > 0
      }, { isolationLevel: 'read committed' })
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  private async requireMutable(tx: Tx, id: number) {
    const [quote] = await tx.select({ id: schema.devis.id }).from(schema.devis).where(eq(schema.devis.commande_id, id))
    if (quote) throw new BusinessError(409, 'COMMANDE_FROM_DEVIS', 'Cette commande provient d’un devis : ses lignes et son existence sont figées.')
  }

  private async lockReferences(tx: Tx, inputs: LineInput[], old: string[] = []): Promise<LineInput[]> {
    const references = [...new Set([...old.map((reference) => reference.toUpperCase()), ...inputs.map((line) => line.reference.toUpperCase())])].sort()
    const catalogue = new Map<string, { designation: string; tauxTva: number }>()
    for (const reference of references) {
      const [rows] = await tx.execute(sql`SELECT id, designation, tva_id FROM articles WHERE reference = ${reference} FOR UPDATE`)
      const row = (rows as unknown as Array<{ id: number; designation: string; tva_id: number }>)[0]
      if (!row) {
        if (inputs.some((line) => line.reference.toUpperCase() === reference)) {
          throw new BusinessError(422, 'UNKNOWN_REFERENCE', `Référence inconnue : ${reference}.`)
        }
        continue
      }
      await tx.execute(sql`SELECT id FROM stock_balances WHERE reference_id = ${row.id} FOR UPDATE`)
      const [taxes] = await tx.execute(sql`SELECT taux FROM tva WHERE id = ${row.tva_id}`)
      const tax = (taxes as unknown as Array<{ taux: string }>)[0]
      if (!tax) throw new BusinessError(422, 'UNKNOWN_REFERENCE', `TVA inconnue pour la référence ${reference}.`)
      catalogue.set(reference, { designation: row.designation, tauxTva: Number(tax.taux) })
    }
    const resolved = inputs.map((input) => ({ ...input, reference: input.reference.toUpperCase(), ...catalogue.get(input.reference.toUpperCase())! }))
    try { venteTotals(resolved) } catch {
      throw new BusinessError(422, 'INVALID_AMOUNT', 'Quantité, prix ou montant de la commande invalide.')
    }
    return resolved
  }

  private async clientSnapshot(tx: Tx, clientId: number): Promise<DevisClientSnapshot> {
    const [client] = await tx.select().from(schema.clients).where(eq(schema.clients.id, clientId))
    if (!client) throw new BusinessError(422, 'UNKNOWN_REFERENCE', 'Client inconnu.')
    return {
      nom: client.nom, prenom: client.prenom, email: client.email, telephone: client.telephone,
      adresse: client.adresse, ville: client.ville, codePostal: client.code_postal,
      numeroClient: client.numero_client, siret: client.siret, typeClient: client.type,
    }
  }
}

// ---------------------------------------------------------------------------
// Retours
// ---------------------------------------------------------------------------

export type RetourRow = {
  id: number
  venteId: number | null
  clientId: number
  dateRetour: string
  motif: string
  articles: DocumentLine[]
  montantRembourse: number
  createdAt: string
}

export function createRetourRepository(db: MySql2Database<Tables>): DocumentRepository<RetourRow> {
  return new DocumentRepository<RetourRow>(db, schema.retours, schema.retours.id, {
    linesTable: schema.retourLines,
    lineFk: schema.retourLines.retour_id,
    mapLine: baseLine,
    mapRow: (raw, lines) => ({
      id: Number(raw.id),
      venteId: raw.vente_id === null || raw.vente_id === undefined ? null : Number(raw.vente_id),
      clientId: Number(raw.client_id ?? 0),
      dateRetour: toDateString(raw.date_retour as Date | null),
      motif: String(raw.motif ?? ''),
      articles: lines,
      montantRembourse: totalOf(lines),
      createdAt: toIsoString(raw.created_at as Date | null),
    }),
    insertLines: async (tx, lines, enteteId) => {
      if (lines.length === 0) return
      await tx.insert(schema.retourLines).values(
        lines.map((line, index) => ({
          retour_id: enteteId,
          ligne: index + 1,
          reference: line.reference,
          designation: line.designation,
          quantite: line.quantite,
          prix_unitaire: line.prixUnitaire.toFixed(2),
        })),
      )
    },
  })
}

export type { RepositoryError }
