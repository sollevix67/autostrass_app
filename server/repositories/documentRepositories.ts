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

import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { AnyMySqlColumn, AnyMySqlTable } from 'drizzle-orm/mysql-core'
import * as schema from '../db/schema.js'
import { toNumber, toDateString, toIsoString } from './mapping.js'
import { toRepositoryError, type RepositoryError } from './simpleRepositories.js'

type Tables = typeof schema

/** Type de transaction Drizzle, deduit pour eviter de le redeclarer. */
type Tx = Parameters<Parameters<MySql2Database<Tables>['transaction']>[0]>[0]

/** Ligne de document exposee par l'API (forme commune a tous les metiers). */
export type DocumentLine = {
  /** Rang de la ligne, 1-based : sert de cle React cote client. */
  ligne: number
  reference: string
  designation: string
  quantite: number
  prixUnitaire: number
  montant: number
}

/** Ligne d'entree, avant conversion vers la forme exposee. */
export type LineInput = {
  reference: string
  designation: string
  quantite: number
  prixUnitaire: number
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
    montant: Math.round(input.quantite * input.prixUnitaire * 100) / 100,
  }
}

export class DocumentRepository<TRow extends { id: number }> {
  constructor(
    private readonly db: MySql2Database<Tables>,
    private readonly headTable: AnyMySqlTable,
    private readonly headId: AnyMySqlColumn,
    private readonly mapping: DocumentMapping<TRow>,
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

  /** Cree l'entete et ses lignes dans une seule transaction. */
  async create(head: Record<string, unknown>, lines: LineInput[]): Promise<TRow> {
    return this.db.transaction(async (tx) => {
      const [result] = await tx.insert(this.headTable).values(head as never)
      const id = result.insertId
      await this.mapping.insertLines(tx, lines, id)
      const created = await tx.select().from(this.headTable).where(eq(this.headId, id)).limit(1)
      return this.mapping.mapRow(
        created[0] as unknown as Record<string, unknown>,
        lines.map(toLine),
      )
    })
  }

  /**
   * Remplace toutes les lignes d'un document existant, en transaction.
   *
   * Le `WHERE` sur la cle etrangere est indispensable : sans lui, la
   * suppression viderait la table des lignes de *tous* les documents.
   */
  async replaceLines(id: number, lines: LineInput[]): Promise<TRow | null> {
    return this.db.transaction(async (tx) => {
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
  dateVente: string
  caissier: string
  articles: DocumentLine[]
  totalHT: number
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
      dateVente: toIsoString(raw.date_vente as Date | null),
      caissier: String(raw.caissier ?? ''),
      articles: lines,
      totalHT: totalOf(lines),
      montantPaye: toNumber(raw.montant_paye as string | number | null),
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
  clientId: number
  dateCommande: string
  articles: DocumentLine[]
  statut: schema.OrderStatus
  dateLivraisonPrevue: string | null
  createdAt: string
  updatedAt: string
}

export function createCommandeRepository(db: MySql2Database<Tables>): DocumentRepository<CommandeRow> {
  return new DocumentRepository<CommandeRow>(db, schema.commandes, schema.commandes.id, {
    linesTable: schema.commandeLines,
    lineFk: schema.commandeLines.commande_id,
    mapLine: baseLine,
    mapRow: (raw, lines) => ({
      id: Number(raw.id),
      clientId: Number(raw.client_id ?? 0),
      dateCommande: toDateString(raw.date_commande as Date | null),
      articles: lines,
      statut: (raw.statut as schema.OrderStatus) ?? 'en attente',
      dateLivraisonPrevue:
        raw.date_livraison_prevue === null || raw.date_livraison_prevue === undefined
          ? null
          : toDateString(raw.date_livraison_prevue as Date | null),
      createdAt: toIsoString(raw.created_at as Date | null),
      updatedAt: toIsoString(raw.updated_at as Date | null),
    }),
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
        })),
      )
    },
  })
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
