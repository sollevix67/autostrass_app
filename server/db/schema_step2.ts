// Étape 2 — schéma de données (emplacements, TVA, fournisseurs, audit, stock par emplacement)
// Ce fichier est injecté dans `schema.ts` (manuel) pour éviter la perte d'exports.

import { relations, sql } from 'drizzle-orm'
import { mysqlTable, varchar, text, int, decimal, date, datetime, timestamp, boolean, primaryKey, index, uniqueIndex } from 'drizzle-orm/mysql-core'
import type { UserRole } from './schema.js'

// NOTE: on réutilise `createdAt/updatedAt` définis dans schema.ts.
// Ce fichier ne doit pas être importé directement dans drizzle-kit.

export const LOCATION_LEVELS = ['allee', 'etagere', 'place'] as const
export type LocationLevel = (typeof LOCATION_LEVELS)[number]

export const emplacements = mysqlTable('emplacements', {
  id: int('id', { unsigned: true }).primaryKey().autoincrement(),
  niveau: varchar('niveau', { length: 16, enum: LOCATION_LEVELS }).notNull(),
  parent_id: int('parent_id', { unsigned: true }),
  code: varchar('code', { length: 32 }).notNull(),
  libelle: varchar('libelle', { length: 128 }),
  capacite: int('capacite').notNull().default(0),
  actif: boolean('actif').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => [
  uniqueIndex('uq_emplacements_parent_code').on(table.parent_id, table.code),
  index('idx_emplacements_niveau').on(table.niveau),
  index('idx_emplacements_parent').on(table.parent_id),
])

export const tva = mysqlTable('tva', {
  id: int('id', { unsigned: true }).primaryKey().autoincrement(),
  taux: decimal('taux', { precision: 5, scale: 2 }).notNull(),
  libelle: varchar('libelle', { length: 64 }).notNull(),
  defaut: boolean('defaut').notNull().default(false),
  actif: boolean('actif').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => [
  uniqueIndex('uq_tva_taux').on(table.taux),
  index('idx_tva_defaut').on(table.defaut),
])

export const DELIVERY_MODES = ['retrait', 'livraison', 'express', 'franchise'] as const
export type DeliveryMode = (typeof DELIVERY_MODES)[number]

export const fournisseurs = mysqlTable('fournisseurs', {
  id: int('id', { unsigned: true }).primaryKey().autoincrement(),
  nom: varchar('nom', { length: 128 }).notNull(),
  code: varchar('code', { length: 32 }),
  email: varchar('email', { length: 255 }),
  telephone: varchar('telephone', { length: 32 }),
  adresse: varchar('adresse', { length: 255 }),
  ville: varchar('ville', { length: 64 }),
  code_postal: varchar('code_postal', { length: 16 }),
  delai_livraison: int('delai_livraison').notNull().default(0),
  mode_livraison: varchar('mode_livraison', { length: 16, enum: DELIVERY_MODES }).notNull().default('livraison'),
  actif: boolean('actif').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => [
  uniqueIndex('uq_fournisseurs_nom').on(table.nom),
  index('idx_fournisseurs_actif').on(table.actif),
])

export const SUPPLIER_ORDER_STATUSES = ['brouillon', 'envoyée', 'reçue', 'partielle', 'annulée'] as const
export type SupplierOrderStatus = (typeof SUPPLIER_ORDER_STATUSES)[number]

export const commandesFournisseurs = mysqlTable('commandes_fournisseurs', {
  id: int('id', { unsigned: true }).primaryKey().autoincrement(),
  fournisseur_id: int('fournisseur_id', { unsigned: true }).notNull(),
  date_commande: date('date_commande', { mode: 'string' }).notNull(),
  statut: varchar('statut', { length: 16, enum: SUPPLIER_ORDER_STATUSES }).notNull().default('brouillon'),
  mode_livraison: varchar('mode_livraison', { length: 16, enum: DELIVERY_MODES }).notNull().default('livraison'),
  date_livraison_prevue: date('date_livraison_prevue', { mode: 'string' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => [
  index('idx_cmd_four_fournisseur').on(table.fournisseur_id),
  index('idx_cmd_four_statut').on(table.statut),
  index('idx_cmd_four_date').on(table.date_commande),
])

export const commandeFournisseurLines = mysqlTable('commande_four_lines', {
  commande_id: int('commande_id', { unsigned: true }).notNull(),
  ligne: int('ligne').notNull().default(1),
  reference: varchar('reference', { length: 64 }).notNull(),
  designation: varchar('designation', { length: 255 }).notNull(),
  quantite: int('quantite').notNull(),
  prix_unitaire: decimal('prix_unitaire', { precision: 12, scale: 2 }).notNull().default('0.00'),
}, (table) => [
  primaryKey({ columns: [table.commande_id, table.ligne] }),
])

export const AUDIT_ACTIONS = ['création', 'modification', 'suppression'] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const journalActions = mysqlTable('journal_actions', {
  id: int('id', { unsigned: true }).primaryKey().autoincrement(),
  utilisateur_id: int('utilisateur_id', { unsigned: true }),
  entite: varchar('entite', { length: 64 }).notNull(),
  entite_id: varchar('entite_id', { length: 64 }).notNull(),
  action: varchar('action', { length: 16, enum: AUDIT_ACTIONS }).notNull(),
  details: text('details'),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_journal_entite').on(table.entite, table.entite_id),
  index('idx_journal_utilisateur').on(table.utilisateur_id),
  index('idx_journal_date').on(table.createdAt),
])

export const stockParEmplacements = mysqlTable('stock_par_emplacements', {
  reference_id: int('reference_id', { unsigned: true }).notNull(),
  emplacement_id: int('emplacement_id', { unsigned: true }).notNull(),
  quantite: int('quantite').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => [
  uniqueIndex('uq_stock_emplacement').on(table.reference_id, table.emplacement_id),
  index('idx_stock_emplacement_place').on(table.emplacement_id),
])
