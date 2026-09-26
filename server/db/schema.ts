/**
 * Schema Drizzle — Autostrass (version 2).
 *
 * Couvre les 8 metiers restants apres la v1 (articles / stock / mouvements) :
 * clients, vehicules, utilisateurs, receptions, ventes, commandes, livraisons
 * et retours.
 *
 * Conventions :
 * - Noms de colonnes en `snake_case` (convention MariaDB du projet), les
 *   proprietes JS restent lisibles.
 * - Les cles etrangeres sont declarees sans `references()` vers les tables
 *   existantes du schema v1 pour que `drizzle-kit generate` ne tente pas de
 *   recreer `articles` : on utilise `AnyMySQLColumn` et une contrainte
 *   `FOREIGN KEY` en SQL si necessaire.
 * - Les montants sont en `DECIMAL(12,2)` ; MariaDB renvoie des chaines,
 *   la conversion en `number` est faite explicitement par le repository
 *   (cf. les notes : un DECIMAL lu en `number` peut perdre en precision).
 */

import { relations, sql } from 'drizzle-orm'
import {
  mysqlTable,
  varchar,
  text,
  int,
  decimal,
  date,
  datetime,
  timestamp,
  boolean,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/mysql-core'

/** Horodatage de creation standard, partage par toutes les tables. */
const createdAt = (name = 'created_at') =>
  timestamp(name, { mode: 'date', default: sql`CURRENT_TIMESTAMP` })

/** Horodatage de mise a jour. */
const updatedAt = (name = 'updated_at') =>
  timestamp(name, {
    mode: 'date',
    default: sql`CURRENT_TIMESTAMP`,
    onUpdate: sql`CURRENT_TIMESTAMP`,
  })

// ---------------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------------

/**
 * Roles applicatifs. Le RBAC (`requireRole`) s'appuie sur cette liste :
 * `admin` passe partout, les deux autres sont des roles metier.
 */
export const USER_ROLES = ['admin', 'magasinier', 'caissier'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const users = mysqlTable(
  'users',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    nom: varchar('nom', { length: 64 }).notNull(),
    prenom: varchar('prenom', { length: 64 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    telephone: varchar('telephone', { length: 32 }),
    role: varchar('role', { length: 32, enum: USER_ROLES }).notNull().default('caissier'),
    actif: boolean('actif').notNull().default(true),
    /**
     * Hash bcrypt du mot de passe. Volontairement absent des types de sortie
     * de l'API : les repositories le selectionnent uniquement pour l'authentification.
     */
    password_hash: varchar('password_hash', { length: 255 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('uq_users_email').on(table.email),
    index('idx_users_role').on(table.role),
  ],
)

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const CLIENT_TYPES = ['particulier', 'professionnel'] as const
export type ClientType = (typeof CLIENT_TYPES)[number]

export const clients = mysqlTable(
  'clients',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    nom: varchar('nom', { length: 64 }).notNull(),
    prenom: varchar('prenom', { length: 64 }).notNull(),
    telephone: varchar('telephone', { length: 32 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    adresse: varchar('adresse', { length: 255 }).notNull(),
    ville: varchar('ville', { length: 64 }).notNull(),
    code_postal: varchar('code_postal', { length: 16 }).notNull(),
    type: varchar('type', { length: 32, enum: CLIENT_TYPES }).notNull().default('particulier'),
    /**
     * Numero de dossier client. Genere a l'insertion : la sequence est portee
     * par MariaDB (`AUTO_INCREMENT` sur la cle) et lisible pour un humain.
     */
    numero_client: varchar('numero_client', { length: 32 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('uq_clients_numero').on(table.numero_client),
    index('idx_clients_nom').on(table.nom),
  ],
)

// ---------------------------------------------------------------------------
// Vehicules
// ---------------------------------------------------------------------------

export const VEHICLE_TYPES = ['voiture', 'camionnette', 'camion', 'autre'] as const
export type VehicleType = (typeof VEHICLE_TYPES)[number]

export const VEHICLE_STATUSES = ['disponible', 'en service', 'en maintenance'] as const
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

export const vehicules = mysqlTable(
  'vehicules',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    immatriculation: varchar('immatriculation', { length: 16 }).notNull(),
    marque: varchar('marque', { length: 64 }).notNull(),
    modele: varchar('modele', { length: 64 }).notNull(),
    annee: int('annee').notNull(),
    type: varchar('type', { length: 32, enum: VEHICLE_TYPES }).notNull().default('voiture'),
    kilometrage: int('kilometrage').notNull().default(0),
    proprietaire: varchar('proprietaire', { length: 128 }).notNull(),
    statut: varchar('statut', { length: 32, enum: VEHICLE_STATUSES }).notNull().default('disponible'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('uq_vehicules_immatriculation').on(table.immatriculation),
    index('idx_vehicules_statut').on(table.statut),
  ],
)

// ---------------------------------------------------------------------------
// Receptions
// ---------------------------------------------------------------------------

/**
 * Entete de reception. Les lignes vivent dans `reception_lines` ; la vue
 * `v_receptions` les agrege pour l'API.
 */
export const receptions = mysqlTable(
  'receptions',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    fournisseur: varchar('fournisseur', { length: 128 }).notNull(),
    date_reception: date('date_reception', { mode: 'string' }).notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('idx_receptions_date').on(table.date_reception)],
)

export const receptionLines = mysqlTable(
  'reception_lines',
  {
    reception_id: int('reception_id', { unsigned: true })
      .notNull()
      .references(() => receptions.id, { onDelete: 'cascade' }),
    /** Rang de la ligne dans la reception : sert de cle React cote client. */
    ligne: int('ligne').notNull().default(1),
    /** Reference article (`articles.reference` de la v1). */
    reference: varchar('reference', { length: 64 }).notNull(),
    designation: varchar('designation', { length: 255 }).notNull(),
    quantite_recue: int('quantite_recue').notNull(),
    prix_unitaire: decimal('prix_unitaire', { precision: 12, scale: 2 }).notNull().default('0.00'),
  },
  (table) => [primaryKey({ columns: [table.reception_id, table.ligne] })],
)

// ---------------------------------------------------------------------------
// Ventes comptoir
// ---------------------------------------------------------------------------

export const PAYMENT_MODES = ['espèces', 'carte', 'chèque'] as const
export type PaymentMode = (typeof PAYMENT_MODES)[number]

export const ventes = mysqlTable(
  'ventes',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    client_id: int('client_id', { unsigned: true })
      .references(() => clients.id, { onDelete: 'set null' }),
    date_vente: datetime('date_vente', { mode: 'date' }).notNull(),
    caissier: varchar('caissier', { length: 128 }).notNull(),
    total_ht: decimal('total_ht', { precision: 12, scale: 2 }).notNull().default('0.00'),
    montant_paye: decimal('montant_paye', { precision: 12, scale: 2 }).notNull().default('0.00'),
    /** Monnaie rendue, calcule par le client. */
    monnaie: decimal('monnaie', { precision: 12, scale: 2 }).notNull().default('0.00'),
    mode_paiement: varchar('mode_paiement', { length: 16, enum: PAYMENT_MODES }).notNull().default('espèces'),
    createdAt: createdAt(),
  },
  (table) => [index('idx_ventes_date').on(table.date_vente)],
)

export const venteLines = mysqlTable(
  'vente_lines',
  {
    vente_id: int('vente_id', { unsigned: true })
      .notNull()
      .references(() => ventes.id, { onDelete: 'cascade' }),
    ligne: int('ligne').notNull().default(1),
    reference: varchar('reference', { length: 64 }).notNull(),
    designation: varchar('designation', { length: 255 }).notNull(),
    quantite: int('quantite').notNull(),
    prix_unitaire: decimal('prix_unitaire', { precision: 12, scale: 2 }).notNull().default('0.00'),
    montant: decimal('montant', { precision: 12, scale: 2 }).notNull().default('0.00'),
  },
  (table) => [primaryKey({ columns: [table.vente_id, table.ligne] })],
)

// ---------------------------------------------------------------------------
// Commandes clients
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = ['en attente', 'validée', 'expédiée', 'livrée', 'annulée'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const commandes = mysqlTable(
  'commandes',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    client_id: int('client_id', { unsigned: true })
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    date_commande: date('date_commande', { mode: 'string' }).notNull(),
    statut: varchar('statut', { length: 32, enum: ORDER_STATUSES }).notNull().default('en attente'),
    date_livraison_prevue: date('date_livraison_prevue', { mode: 'string' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('idx_commandes_client').on(table.client_id),
    index('idx_commandes_statut').on(table.statut),
  ],
)

export const commandeLines = mysqlTable(
  'commande_lines',
  {
    commande_id: int('commande_id', { unsigned: true })
      .notNull()
      .references(() => commandes.id, { onDelete: 'cascade' }),
    ligne: int('ligne').notNull().default(1),
    reference: varchar('reference', { length: 64 }).notNull(),
    designation: varchar('designation', { length: 255 }).notNull(),
    quantite: int('quantite').notNull(),
    prix_unitaire: decimal('prix_unitaire', { precision: 12, scale: 2 }).notNull().default('0.00'),
  },
  (table) => [primaryKey({ columns: [table.commande_id, table.ligne] })],
)

// ---------------------------------------------------------------------------
// Livraisons
// ---------------------------------------------------------------------------

export const DELIVERY_STATUSES = ['en transit', 'livrée', 'en attente'] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export const livraisons = mysqlTable(
  'livraisons',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    commande_id: int('commande_id', { unsigned: true })
      .notNull()
      .references(() => commandes.id, { onDelete: 'cascade' }),
    transporteur: varchar('transporteur', { length: 128 }).notNull(),
    date_expedition: date('date_expedition', { mode: 'string' }).notNull(),
    date_livraison_prevue: date('date_livraison_prevue', { mode: 'string' }).notNull(),
    adresse_livraison: varchar('adresse_livraison', { length: 255 }).notNull(),
    statut: varchar('statut', { length: 32, enum: DELIVERY_STATUSES }).notNull().default('en attente'),
    tracking: varchar('tracking', { length: 64 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('idx_livraisons_commande').on(table.commande_id)],
)

// ---------------------------------------------------------------------------
// Retours
// ---------------------------------------------------------------------------

export const retours = mysqlTable(
  'retours',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    vente_id: int('vente_id', { unsigned: true }).references(() => ventes.id, { onDelete: 'set null' }),
    client_id: int('client_id', { unsigned: true })
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    date_retour: date('date_retour', { mode: 'string' }).notNull(),
    motif: varchar('motif', { length: 255 }).notNull(),
    montant_rembourse: decimal('montant_rembourse', { precision: 12, scale: 2 }).notNull().default('0.00'),
    createdAt: createdAt(),
  },
  (table) => [index('idx_retours_client').on(table.client_id)],
)

export const retourLines = mysqlTable(
  'retour_lines',
  {
    retour_id: int('retour_id', { unsigned: true })
      .notNull()
      .references(() => retours.id, { onDelete: 'cascade' }),
    ligne: int('ligne').notNull().default(1),
    reference: varchar('reference', { length: 64 }).notNull(),
    designation: varchar('designation', { length: 255 }).notNull(),
    quantite: int('quantite').notNull(),
    prix_unitaire: decimal('prix_unitaire', { precision: 12, scale: 2 }).notNull().default('0.00'),
  },
  (table) => [primaryKey({ columns: [table.retour_id, table.ligne] })],
)

// ---------------------------------------------------------------------------
// Relations (utilisees par `db.query.*` avec le mode relational)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  ventes: many(ventes),
}))

export const clientsRelations = relations(clients, ({ many }) => ({
  commandes: many(commandes),
  ventes: many(ventes),
  retours: many(retours),
}))

export const receptionsRelations = relations(receptions, ({ many }) => ({
  lignes: many(receptionLines),
}))

export const receptionLinesRelations = relations(receptionLines, ({ one }) => ({
  reception: one(receptions, { fields: [receptionLines.reception_id], references: [receptions.id] }),
}))

export const ventesRelations = relations(ventes, ({ one, many }) => ({
  client: one(clients, { fields: [ventes.client_id], references: [clients.id] }),
  lignes: many(venteLines),
  retours: many(retours),
}))

export const venteLinesRelations = relations(venteLines, ({ one }) => ({
  vente: one(ventes, { fields: [venteLines.vente_id], references: [ventes.id] }),
}))

export const commandesRelations = relations(commandes, ({ one, many }) => ({
  client: one(clients, { fields: [commandes.client_id], references: [clients.id] }),
  lignes: many(commandeLines),
  livraisons: many(livraisons),
}))

export const commandeLinesRelations = relations(commandeLines, ({ one }) => ({
  commande: one(commandes, { fields: [commandeLines.commande_id], references: [commandes.id] }),
}))

export const livraisonsRelations = relations(livraisons, ({ one }) => ({
  commande: one(commandes, { fields: [livraisons.commande_id], references: [commandes.id] }),
}))

export const retoursRelations = relations(retours, ({ one, many }) => ({
  vente: one(ventes, { fields: [retours.vente_id], references: [ventes.id] }),
  client: one(clients, { fields: [retours.client_id], references: [clients.id] }),
  lignes: many(retourLines),
}))

export const retourLinesRelations = relations(retourLines, ({ one }) => ({
  retour: one(retours, { fields: [retourLines.retour_id], references: [retours.id] }),
}))

/**
 * Colonnes de `articles` (v1) referencees par les lignes de documents.
 * Type d'appui : les lignes stockent la reference en texte, pas l'id.
 */
export type ArticleRef = { id: number; reference: string }
