/**
 * Repositories des referentiels simples : clients et vehicules.
 *
 * Ecrits explicitement plutot que genericises autour de `SimpleRepository` :
 * les types d'insertion et de patch different par table, et le mapping de
 * sortie est specifique a chaque metier. On reutilise `SimpleRepository` pour
 * la lecture, et on ecrit les ecritures ici pour garder le typage strict.
 */

import { asc, eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '../db/schema.js'
import { toIsoString } from './mapping.js'
import { RepositoryError, SimpleRepository, toRepositoryError } from './simpleRepositories.js'

type Tables = typeof schema

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export type ClientRow = {
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
  nom: string
  prenom: string
  telephone: string
  email: string
  adresse: string
  ville: string
  codePostal: string
  type: schema.ClientType
  /** Absent a la creation : derive de l'id. */
  numeroClient?: string
}

function mapClient(raw: Record<string, unknown>): ClientRow {
  return {
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

export class ClientRepository {
  private readonly base: SimpleRepository<typeof schema.clients, ClientRow, never, never>

  constructor(private readonly db: MySql2Database<Tables>) {
    this.base = new SimpleRepository(db, schema.clients, schema.clients.id, mapClient)
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
   * `numero_client` est NOT NULL et unique, or il depend de l'id attribue par
   * MariaDB : on cree d'abord la ligne avec une valeur temporaire, puis on la
   * corrige. Deux insertions concurrentes recoivent deux ids distincts, donc
   * deux numeros distincts — pas de collision.
   */
  async create(input: ClientInput): Promise<ClientRow> {
    const numero = input.numeroClient ?? `TMP-${crypto.randomUUID().slice(0, 8)}`
    const created = await this.base.create({
      nom: input.nom,
      prenom: input.prenom,
      telephone: input.telephone,
      email: input.email,
      adresse: input.adresse,
      ville: input.ville,
      code_postal: input.codePostal,
      type: input.type,
      numero_client: numero,
    } as never)

    if (input.numeroClient) return created

    const finalNumber = `CLI-${String(created.id).padStart(4, '0')}`
    await this.db.update(schema.clients).set({ numero_client: finalNumber }).where(eq(schema.clients.id, created.id))
    return { ...created, numeroClient: finalNumber }
  }

  /** Le numero de dossier est imuable : on le retire des mises a jour. */
  async update(id: number, input: Partial<ClientInput>): Promise<ClientRow | null> {
    const { numeroClient: _ignored, ...rest } = input
    try {
      const [result] = await this.db
        .update(schema.clients)
        .set({
          ...(rest.nom !== undefined && { nom: rest.nom }),
          ...(rest.prenom !== undefined && { prenom: rest.prenom }),
          ...(rest.telephone !== undefined && { telephone: rest.telephone }),
          ...(rest.email !== undefined && { email: rest.email }),
          ...(rest.adresse !== undefined && { adresse: rest.adresse }),
          ...(rest.ville !== undefined && { ville: rest.ville }),
          ...(rest.codePostal !== undefined && { code_postal: rest.codePostal }),
          ...(rest.type !== undefined && { type: rest.type }),
        })
        .where(eq(schema.clients.id, id))
      if (result.affectedRows === 0) return null
      return this.findById(id)
    } catch (error) {
      throw toRepositoryError(error)
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

export { RepositoryError }
