/**
 * Repositories des referentiels simples : clients et vehicules.
 *
 * Ecrits explicitement plutot que genericises autour de `SimpleRepository` :
 * les types d'insertion et de patch different par table, et le mapping de
 * sortie est spécifique à chaque métier. On réutilise `SimpleRepository` pour
 * la lecture, et on ecrit les ecritures ici pour garder le typage strict.
 */

import { asc, eq, sql } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '../db/schema.js'
import { toIsoString } from './mapping.js'
import { RepositoryError, SimpleRepository, toRepositoryError } from './simpleRepositories.js'

type Tables = typeof schema

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export type ClientRow = {
  secteurId: number | null
  id: number
  nom: string
  prenom: string
  telephone: string
  email: string
  adresse: string
  ville: string
  codePostal: string
  type: schema.ClientType
  numeroClient: string
  createdAt: string
  updatedAt: string
}

export type ClientInput = {
  secteurId?: number | null
  nom: string
  prenom: string
  telephone: string
  email: string
  adresse: string
  ville: string
  codePostal: string
  type: schema.ClientType
  /** Facultatif à la création : génération automatique si absent. */
  numeroClient?: string
}

function mapClient(raw: Record<string, unknown>): ClientRow {
  return {
    secteurId: raw.secteur_id == null ? null : Number(raw.secteur_id),
    id: Number(raw.id),
    nom: String(raw.nom ?? ''),
    prenom: String(raw.prenom ?? ''),
    telephone: String(raw.telephone ?? ''),
    email: String(raw.email ?? ''),
    adresse: String(raw.adresse ?? ''),
    ville: String(raw.ville ?? ''),
    codePostal: String(raw.code_postal ?? ''),
    type: (raw.type as schema.ClientType) ?? 'particulier',
    numeroClient: String(raw.numero_client ?? ''),
    createdAt: toIsoString(raw.created_at as Date | null),
    updatedAt: toIsoString(raw.updated_at as Date | null),
  }
}

function clientWriteError(error: unknown): RepositoryError {
  const mapped = toRepositoryError(error)
  return mapped.code === 'ALREADY_EXISTS'
    ? new RepositoryError(409, 'CLIENT_NUMBER_EXISTS', 'Ce numéro de client est déjà utilisé.')
    : mapped
}

export class ClientRepository {
  private readonly base: SimpleRepository<typeof schema.clients, ClientRow, never, never>

  constructor(private readonly db: MySql2Database<Tables>) {
    this.base = new SimpleRepository(db, schema.clients, schema.clients.id, mapClient)
  }

  private async validateSecteur(id: number | null | undefined, clientId?: number) {
    if (id == null) return
    const [secteur] = await this.db.select().from(schema.secteursLivraison).where(eq(schema.secteursLivraison.id, id)).limit(1)
    const previous = clientId ? await this.findById(clientId) : null
    if (!secteur || (!secteur.actif && previous?.secteurId !== id)) throw new RepositoryError(422, 'UNKNOWN_REFERENCE', 'Choisissez un secteur actif.')
  }

  list(): Promise<ClientRow[]> {
    return this.base.list()
  }

  findById(id: number): Promise<ClientRow | null> {
    return this.base.findById(id)
  }

  /** Recherche par numero de dossier, la seule colonne d'unicite metier. */
  async findByNumber(numero: string): Promise<ClientRow | null> {
    const rows = await this.db.select().from(schema.clients).where(eq(schema.clients.numero_client, numero)).limit(1)
    const row = rows[0]
    return row ? mapClient(row as unknown as Record<string, unknown>) : null
  }

  /**
   * Sans numéro saisi, on cherche parmi 000001 à 999999 en partant de l'id
   * modulo cette plage. On passe les numéros occupés et revient au début si
   * nécessaire. L'index unique arbitre aussi
   * les créations concurrentes. La transaction ne publie jamais de numéro
   * temporaire et annule l'insertion si la génération échoue.
   */
  async create(input: ClientInput): Promise<ClientRow> {
    await this.validateSecteur(input.secteurId)
    try {
      return await this.db.transaction(async (transaction) => {
        const [result] = await transaction.insert(schema.clients).values({
          nom: input.nom,
          prenom: input.prenom,
          telephone: input.telephone,
          email: input.email,
          adresse: input.adresse,
          ville: input.ville,
          code_postal: input.codePostal,
          type: input.type,
          numero_client: input.numeroClient ?? `TMP-${crypto.randomUUID().replaceAll('-', '').slice(0, 28)}`,
          secteur_id: input.secteurId ?? null,
        })
        if (input.numeroClient === undefined) {
          const maximum = 999999
          const existing = await transaction.select({ numero: schema.clients.numero_client }).from(schema.clients)
            .where(sql`${schema.clients.numero_client} REGEXP '^[0-9]{6}$'`)
          const occupied = new Set(existing.map((row) => row.numero))
          let assigned = false
          for (let offset = 0; offset < maximum; offset += 1) {
            const numero = String(((result.insertId - 1 + offset) % maximum) + 1).padStart(6, '0')
            if (occupied.has(numero)) continue
            try {
              await transaction.update(schema.clients)
                .set({ numero_client: numero })
                .where(eq(schema.clients.id, result.insertId))
              assigned = true
              break
            } catch (error) {
              if (toRepositoryError(error).code !== 'ALREADY_EXISTS') throw error
            }
          }
          if (!assigned) throw new RepositoryError(409, 'CLIENT_NUMBER_EXHAUSTED', 'Aucun numéro automatique à six chiffres disponible.')
        }
        const [created] = await transaction.select().from(schema.clients).where(eq(schema.clients.id, result.insertId)).limit(1)
        if (!created) throw new RepositoryError(500, 'INTERNAL_ERROR', 'Client illisible après insertion.')
        return mapClient(created as unknown as Record<string, unknown>)
      })
    } catch (error) {
      throw clientWriteError(error)
    }
  }

  /** Numéro modifiable ; l'id interne conserve toutes les relations métier. */
  async update(id: number, input: Partial<ClientInput>): Promise<ClientRow | null> {
    await this.validateSecteur(input.secteurId, id)
    try {
      const [result] = await this.db
        .update(schema.clients)
        .set({
          ...(input.numeroClient !== undefined && { numero_client: input.numeroClient }),
          ...(input.nom !== undefined && { nom: input.nom }),
          ...(input.prenom !== undefined && { prenom: input.prenom }),
          ...(input.telephone !== undefined && { telephone: input.telephone }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.adresse !== undefined && { adresse: input.adresse }),
          ...(input.ville !== undefined && { ville: input.ville }),
          ...(input.codePostal !== undefined && { code_postal: input.codePostal }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.secteurId !== undefined && { secteur_id: input.secteurId }),
        })
        .where(eq(schema.clients.id, id))
      if (result.affectedRows === 0) return null
      return this.findById(id)
    } catch (error) {
      throw clientWriteError(error)
    }
  }

  /** Suppression refusee si le client est reference par une commande. */
  remove(id: number): Promise<boolean> {
    return this.base.remove(id)
  }
}

// ---------------------------------------------------------------------------
// Vehicules
// ---------------------------------------------------------------------------

export type VehiculeRow = {
  id: number
  immatriculation: string
  marque: string
  modele: string
  annee: number
  type: schema.VehicleType
  kilometrage: number
  proprietaire: string
  statut: schema.VehicleStatus
  createdAt: string
  updatedAt: string
}

export type VehiculeInput = Omit<VehiculeRow, 'id' | 'createdAt' | 'updatedAt'>

function mapVehicule(raw: Record<string, unknown>): VehiculeRow {
  return {
    id: Number(raw.id),
    immatriculation: String(raw.immatriculation ?? ''),
    marque: String(raw.marque ?? ''),
    modele: String(raw.modele ?? ''),
    annee: Number(raw.annee ?? 0),
    type: (raw.type as schema.VehicleType) ?? 'voiture',
    kilometrage: Number(raw.kilometrage ?? 0),
    proprietaire: String(raw.proprietaire ?? ''),
    statut: (raw.statut as schema.VehicleStatus) ?? 'disponible',
    createdAt: toIsoString(raw.created_at as Date | null),
    updatedAt: toIsoString(raw.updated_at as Date | null),
  }
}

export class VehiculeRepository {
  private readonly base: SimpleRepository<typeof schema.vehicules, VehiculeRow, never, never>

  constructor(private readonly db: MySql2Database<Tables>) {
    this.base = new SimpleRepository(db, schema.vehicules, schema.vehicules.id, mapVehicule)
  }

  list(): Promise<VehiculeRow[]> {
    return this.base.list()
  }

  /** Parc trie par immatriculation, ordre de lecture naturel. */
  async listOrdered(): Promise<VehiculeRow[]> {
    const rows = await this.db.select().from(schema.vehicules).orderBy(asc(schema.vehicules.immatriculation))
    return rows.map((row) => mapVehicule(row as unknown as Record<string, unknown>))
  }

  findById(id: number): Promise<VehiculeRow | null> {
    return this.base.findById(id)
  }

  async findByPlate(immatriculation: string): Promise<VehiculeRow | null> {
    const rows = await this.db
      .select()
      .from(schema.vehicules)
      .where(eq(schema.vehicules.immatriculation, immatriculation))
      .limit(1)
    const row = rows[0]
    return row ? mapVehicule(row as unknown as Record<string, unknown>) : null
  }

  async create(input: VehiculeInput): Promise<VehiculeRow> {
    return this.base.create({
      immatriculation: input.immatriculation,
      marque: input.marque,
      modele: input.modele,
      annee: input.annee,
      type: input.type,
      kilometrage: input.kilometrage,
      proprietaire: input.proprietaire,
      statut: input.statut,
    } as never)
  }

  async update(id: number, input: Partial<VehiculeInput>): Promise<VehiculeRow | null> {
    try {
      const [result] = await this.db
        .update(schema.vehicules)
        .set({
          ...(input.immatriculation !== undefined && { immatriculation: input.immatriculation }),
          ...(input.marque !== undefined && { marque: input.marque }),
          ...(input.modele !== undefined && { modele: input.modele }),
          ...(input.annee !== undefined && { annee: input.annee }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.kilometrage !== undefined && { kilometrage: input.kilometrage }),
          ...(input.proprietaire !== undefined && { proprietaire: input.proprietaire }),
          ...(input.statut !== undefined && { statut: input.statut }),
        })
        .where(eq(schema.vehicules.id, id))
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

// ---------------------------------------------------------------------------
// Fournisseurs
// ---------------------------------------------------------------------------

export type FournisseurRow = {
  id: number
  nom: string
  code: string | null
  email: string | null
  telephone: string | null
  adresse: string | null
  ville: string | null
  codePostal: string | null
  delaiLivraison: number
  modeLivraison: schema.DeliveryMode
  actif: boolean
  createdAt: string
  updatedAt: string
}

export type FournisseurInput = {
  nom: string
  code?: string | null
  email?: string | null
  telephone?: string | null
  adresse?: string | null
  ville?: string | null
  codePostal?: string | null
  delaiLivraison?: number
  modeLivraison?: schema.DeliveryMode
  actif?: boolean
}

function mapFournisseur(raw: Record<string, unknown>): FournisseurRow {
  return {
    id: Number(raw.id),
    nom: String(raw.nom ?? ''),
    code: raw.code ? String(raw.code) : null,
    email: raw.email ? String(raw.email) : null,
    telephone: raw.telephone ? String(raw.telephone) : null,
    adresse: raw.adresse ? String(raw.adresse) : null,
    ville: raw.ville ? String(raw.ville) : null,
    codePostal: raw.code_postal ? String(raw.code_postal) : null,
    delaiLivraison: Number(raw.delai_livraison ?? 0),
    modeLivraison: (raw.mode_livraison as schema.DeliveryMode) ?? 'livraison',
    actif: Boolean(raw.actif),
    createdAt: toIsoString(raw.created_at as Date | null),
    updatedAt: toIsoString(raw.updated_at as Date | null),
  }
}

export class FournisseurRepository {
  private readonly base: SimpleRepository<typeof schema.fournisseurs, FournisseurRow, never, never>

  constructor(private readonly db: MySql2Database<Tables>) {
    this.base = new SimpleRepository(db, schema.fournisseurs, schema.fournisseurs.id, mapFournisseur)
  }

  list(): Promise<FournisseurRow[]> {
    return this.listOrdered()
  }

  /** Liste triee par nom, ordre de lecture naturel d'un annuaire. */
  async listOrdered(): Promise<FournisseurRow[]> {
    const rows = await this.db.select().from(schema.fournisseurs).orderBy(asc(schema.fournisseurs.nom))
    return rows.map((row) => mapFournisseur(row as unknown as Record<string, unknown>))
  }

  findById(id: number): Promise<FournisseurRow | null> {
    return this.base.findById(id)
  }

  async create(input: FournisseurInput): Promise<FournisseurRow> {
    return this.base.create({
      nom: input.nom,
      code: input.code ?? null,
      email: input.email ?? null,
      telephone: input.telephone ?? null,
      adresse: input.adresse ?? null,
      ville: input.ville ?? null,
      code_postal: input.codePostal ?? null,
      delai_livraison: input.delaiLivraison ?? 0,
      mode_livraison: input.modeLivraison ?? 'livraison',
      actif: input.actif ?? true,
    } as never)
  }

  async update(id: number, input: Partial<FournisseurInput>): Promise<FournisseurRow | null> {
    try {
      const [result] = await this.db
        .update(schema.fournisseurs)
        .set({
          ...(input.nom !== undefined && { nom: input.nom }),
          ...(input.code !== undefined && { code: input.code }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.telephone !== undefined && { telephone: input.telephone }),
          ...(input.adresse !== undefined && { adresse: input.adresse }),
          ...(input.ville !== undefined && { ville: input.ville }),
          ...(input.codePostal !== undefined && { code_postal: input.codePostal }),
          ...(input.delaiLivraison !== undefined && { delai_livraison: input.delaiLivraison }),
          ...(input.modeLivraison !== undefined && { mode_livraison: input.modeLivraison }),
          ...(input.actif !== undefined && { actif: input.actif }),
        })
        .where(eq(schema.fournisseurs.id, id))
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

export { RepositoryError }
