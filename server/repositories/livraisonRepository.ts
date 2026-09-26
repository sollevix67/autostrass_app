/**
 * Repository des livraisons.
 *
 * Une livraison n'a pas de lignes : elle est rattachee a une commande par
 * `commande_id` et suit un cycle de statuts. Les lectures passent par
 * `SimpleRepository`, les ecritures sont explicites pour conserver le typage.
 */

import { asc, eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '../db/schema.js'
import { toDateString, toIsoString } from './mapping.js'
import { SimpleRepository, toRepositoryError } from './simpleRepositories.js'

type Tables = typeof schema

export type LivraisonRow = {
  id: number
  commandeId: number
  transporteur: string
  dateExpedition: string
  dateLivraisonPrevue: string
  adresseLivraison: string
  statut: schema.DeliveryStatus
  tracking: string | null
  createdAt: string
  updatedAt: string
}

export type LivraisonInput = Omit<LivraisonRow, 'id' | 'createdAt' | 'updatedAt'>

function mapLivraison(raw: Record<string, unknown>): LivraisonRow {
  return {
    id: Number(raw.id),
    commandeId: Number(raw.commande_id ?? 0),
    transporteur: String(raw.transporteur ?? ''),
    dateExpedition: toDateString(raw.date_expedition as Date | null),
    dateLivraisonPrevue: toDateString(raw.date_livraison_prevue as Date | null),
    adresseLivraison: String(raw.adresse_livraison ?? ''),
    statut: (raw.statut as schema.DeliveryStatus) ?? 'en attente',
    tracking: raw.tracking === null || raw.tracking === undefined ? null : String(raw.tracking),
    createdAt: toIsoString(raw.created_at as Date | null),
    updatedAt: toIsoString(raw.updated_at as Date | null),
  }
}

export class LivraisonRepository {
  private readonly base: SimpleRepository<typeof schema.livraisons, LivraisonRow, never, never>

  constructor(private readonly db: MySql2Database<Tables>) {
    this.base = new SimpleRepository(db, schema.livraisons, schema.livraisons.id, mapLivraison)
  }

  list(): Promise<LivraisonRow[]> {
    return this.base.list()
  }

  /** Liste triee par date d'expedition : l'ordre de travail du transporteur. */
  async listOrdered(): Promise<LivraisonRow[]> {
    const rows = await this.db
      .select()
      .from(schema.livraisons)
      .orderBy(asc(schema.livraisons.date_expedition), asc(schema.livraisons.id))
    return rows.map((row) => mapLivraison(row as unknown as Record<string, unknown>))
  }

  findById(id: number): Promise<LivraisonRow | null> {
    return this.base.findById(id)
  }

  /** Livraisons rattachees a une commande donnee. */
  async listByCommande(commandeId: number): Promise<LivraisonRow[]> {
    const rows = await this.db
      .select()
      .from(schema.livraisons)
      .where(eq(schema.livraisons.commande_id, commandeId))
      .orderBy(asc(schema.livraisons.date_expedition))
    return rows.map((row) => mapLivraison(row as unknown as Record<string, unknown>))
  }

  async create(input: LivraisonInput): Promise<LivraisonRow> {
    return this.base.create({
      commande_id: input.commandeId,
      transporteur: input.transporteur,
      date_expedition: input.dateExpedition,
      date_livraison_prevue: input.dateLivraisonPrevue,
      adresse_livraison: input.adresseLivraison,
      statut: input.statut,
      tracking: input.tracking ?? null,
    } as never)
  }

  async update(id: number, input: Partial<LivraisonInput>): Promise<LivraisonRow | null> {
    try {
      const [result] = await this.db
        .update(schema.livraisons)
        .set({
          ...(input.commandeId !== undefined && { commande_id: input.commandeId }),
          ...(input.transporteur !== undefined && { transporteur: input.transporteur }),
          ...(input.dateExpedition !== undefined && { date_expedition: input.dateExpedition }),
          ...(input.dateLivraisonPrevue !== undefined && { date_livraison_prevue: input.dateLivraisonPrevue }),
          ...(input.adresseLivraison !== undefined && { adresse_livraison: input.adresseLivraison }),
          ...(input.statut !== undefined && { statut: input.statut }),
          ...(input.tracking !== undefined && { tracking: input.tracking }),
        })
        .where(eq(schema.livraisons.id, id))
      if (result.affectedRows === 0) return null
      return this.findById(id)
    } catch (error) {
      throw toRepositoryError(error)
    }
  }

  remove(id: number): Promise<boolean> {
    return this.base.remove(id)
  }
}
