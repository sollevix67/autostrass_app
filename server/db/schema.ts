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

/**
 * Horodatage de creation, partage par toutes les tables.
 *
 * Drizzle 0.45 expose `defaultNow()` / `onUpdateNow()` comme methodes du
 * builder, pas comme cles de configuration. Mais `defaultNow()` produit
 * `DEFAULT (now())`, que le serialiseur MariaDB de drizzle-kit abandonne :
 * la colonne est creee sans defaut, donc tout INSERT — Drizzle compris, qui
 * passe par `DEFAULT` — laisse `created_at` a NULL. On ecrit donc
 * `DEFAULT CURRENT_TIMESTAMP` explicitement, seule forme que le dialecte
 * MariaDB restitue.
 */
const createdAt = (name = 'created_at') => timestamp(name, { mode: 'date' }).default(sql`CURRENT_TIMESTAMP`)

/**
 * Horodatage de mise a jour. `ON UPDATE CURRENT_TIMESTAMP` exige une
 * colonne `TIMESTAMP` (pas `DATETIME`) et une valeur par defaut, d'ou le
 * `CURRENT_TIMESTAMP` sur les deux.
 */
const updatedAt = (name = 'updated_at') =>
  timestamp(name, { mode: 'date' })
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()

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

// ---------------------------------------------------------------------------
// Journal des evenements systeme (NF525)
// ---------------------------------------------------------------------------

/**
 * Evenements du **systeme** de caisse, distincts des ventes.
 *
 * La NF525 impose de pouvoir expliquer ce que faisait la machine a un instant
 * donne : elle a demarre, elle s'est arretee normalement, elle est passee en
 * mode degrade, elle s'est reconnectee. Ces evenements se produisent meme
 * quand aucune vente n'a lieu, donc ils ne peuvent pas vivre dans le journal
 * des ventes.
 *
 * Distinct du `journal_actions` prevu plus tard (qui retrace les actions
 * metier des utilisateurs) : ici, on trace la machine, pas l'utilisateur.
 */
export const SYSTEM_EVENT_TYPES = [
  'démarrage',
  'arrêt',
  'mode dégradé',
  'retour nominal',
  'ouverture',
  'clôture',
  'alarme',
] as const
export type SystemEventType = (typeof SYSTEM_EVENT_TYPES)[number]

export const systemEvents = mysqlTable(
  'system_events',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    type: varchar('type', { length: 32, enum: SYSTEM_EVENT_TYPES }).notNull(),
    /** Detail libre : version, cause de l'alarme, compte rendu de reconnexion. */
    detail: varchar('detail', { length: 255 }),
    /**
     * Mode degrade actif a cet instant. Un evenement de coupure porte
     * `degrade = 1`, ce qui permet d'identifier la periode hors service sans
     * reconstruire une chronologie.
     */
    degrade: boolean('degrade').notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [index('idx_system_events_type').on(table.type)],
)

/**
 * Ventes accumulees en mode degrade, a rejouer au retour du service.
 *
 * Le poste de caisse continue a encaisser pendant une coupure reseau. Ces
 * ventes sont d'abord ecrites **localement** par le poste, puis transmises
 * ici : les deux moities doivent se rapprocher, sinon le total de la journee
 * ne correspond pas au tiroir.
 */
export const offlineVenteQueue = mysqlTable(
  'offline_vente_queue',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    /**
     * Identifiant attribue par le poste de caisse. La cle d'unicite impose
     * au serveur est sa protection contre un rejeu : la meme vente ne peut
     * pas etre enregistree deux fois.
     */
    reference: varchar('reference', { length: 64 }).notNull(),
    /** Charge JSON exacte de la vente, telle que le poste l'a enregistree. */
    payload: text('payload').notNull(),
    /** Empreinte calculee par le poste : permet de detecter un envoi altere. */
    fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
    /** `false` tant que la vente n'a pas ete integree a `ventes`. */
    integree: boolean('integree').notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('uq_offline_vente_reference').on(table.reference),
    index('idx_offline_vente_integree').on(table.integree),
  ],
)

export const PAYMENT_MODES = ['espèces', 'carte', 'chèque'] as const
export type PaymentMode = (typeof PAYMENT_MODES)[number]

/**
 * Sessions de caisse : ouverture, fond de caisse, cloture.
 *
 * Modelise le « tiroir » du depot. Une session est ouverte par un caissier a un
 * instant donne, le ferme apres comptage, et porte le resultat de ce comptage.
 * Toute vente doit se rattacher a une session **ouverte** : sans cela, on ne
 * sait jamais a quel encaissement rattacher un ticket, ni qui detient la caisse
 * a un instant donne.
 */
export const CASH_SESSION_STATUSES = ['ouverte', 'clôturée'] as const
export type CashSessionStatus = (typeof CASH_SESSION_STATUSES)[number]

/**
 * Monnaies followees au comptage. `especes` est denomme `fonds_caisse` : c'est
 * le fond remis au caissier a l'ouverture, et non la recette du jour.
 */
export const CASH_BREAK_DENOMINATIONS = ['0.50', '1.00', '2.00', '5.00', '10.00', '20.00', '50.00'] as const
export type CashBreakDenomination = (typeof CASH_BREAK_DENOMINATIONS)[number]

export const cashSessions = mysqlTable(
  'cash_sessions',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    /** Caissier proprietaire : la personne qui detient reellement le tiroir. */
    caissier: varchar('caissier', { length: 128 }).notNull(),
    /**
     * Session deja ouverte par ce caissier. Une session par caissier : deux
     * tiroirs ouverts sur le meme poste rendraient la cloture ambigue.
     */
    utilisateur_id: int('utilisateur_id', { unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    statut: varchar('statut', { length: 16, enum: CASH_SESSION_STATUSES }).notNull().default('ouverte'),
    /** Fond de caisse remis a l'ouverture, en euros. */
    fonds_caisse: decimal('fonds_caisse', { precision: 12, scale: 2 }).notNull().default('0.00'),
    /**
     * Total **theorique** en especes : `fonds_caisse + somme(ventes especes) -
     * (monnaie rendue)`. Compare au comptage reel pour degager l'ecart.
     */
    total_theorique: decimal('total_theorique', { precision: 12, scale: 2 }),
    /** Total **reel** compte en especes au moment de la cloture. */
    total_reel: decimal('total_reel', { precision: 12, scale: 2 }),
    /**
     * Ecart = `total_reel - total_theorique`. Nul tant que la session est
     * ouverte : un ecart calcule avant le comptage n'aurait aucun sens.
     */
    ecart: decimal('ecart', { precision: 12, scale: 2 }),
    opened_at: datetime('opened_at', { mode: 'date' }).notNull(),
    closed_at: datetime('closed_at', { mode: 'date' }),
    /** Commentaire libre : motif de l'ecart, incident de comptage. */
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('idx_cash_sessions_statut').on(table.statut),
    index('idx_cash_sessions_caissier').on(table.utilisateur_id),
  ],
)

/**
 * Detail du comptage de la caisse, billet par billet.
 *
 * Indispensable pour comprendre un ecart : « il manque 12 € » ne se traite pas
 * comme « il manque 7 € », le premier est un billet de 10 et le second une
 * combinaison. Un seul ecart global ne permet pas de retro-animer le deficit.
 */
export const cashSessionBreaks = mysqlTable(
  'cash_session_breaks',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    session_id: int('session_id', { unsigned: true })
      .notNull()
      .references(() => cashSessions.id, { onDelete: 'cascade' }),
    denomination: decimal('denomination', { precision: 8, scale: 2 }).notNull(),
    /** Nombre de billets ou pieces comptes. */
    quantite: int('quantite').notNull().default(0),
  },
  (table) => [index('idx_cash_breaks_session').on(table.session_id)],
)

/**
 * Journal des mouvements de caisse.
 *
 * Une entree par evenement : ouverture, encaissement, rendu, cloture. Sert a
 * expliquer un ecart ligne a ligne — le fond seul ne dit pas *quand* l'argent
 * a disparu, la sequence le dit.
 */
export const CASH_MOVEMENT_TYPES = [
  'ouverture',
  'encaissement',
  'rendu',
  'clôture',
  'ajustement',
] as const
export type CashMovementType = (typeof CASH_MOVEMENT_TYPES)[number]

export const cashMovements = mysqlTable(
  'cash_movements',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    session_id: int('session_id', { unsigned: true })
      .notNull()
      .references(() => cashSessions.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 16, enum: CASH_MOVEMENT_TYPES }).notNull(),
    /**
     * Montant **signe** : positif = entree de liquide, negatif = sortie.
     * L'ouverture (fond) et la cloture (comptage) sont donc des mouvements
     * comme les autres, et le solde se deduit par simple somme.
     */
    montant: decimal('montant', { precision: 12, scale: 2 }).notNull().default('0.00'),
    /** Renvoie la vente a l'origine d'un encaissement ou d'un rendu. */
    vente_id: int('vente_id', { unsigned: true }).references(() => ventes.id, { onDelete: 'set null' }),
    libelle: varchar('libelle', { length: 255 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('idx_cash_movements_session').on(table.session_id),
    index('idx_cash_movements_type').on(table.type),
  ],
)

export const ventes = mysqlTable(
  'ventes',
  {
    id: int('id', { unsigned: true }).primaryKey().autoincrement(),
    client_id: int('client_id', { unsigned: true })
      .references(() => clients.id, { onDelete: 'set null' }),
    /**
     * Session de caisse ayant enregistre la vente. Nullable pour rester
     * compatible avec l'historique deja present, mais toute nouvelle vente
     * l'exige : la route la refuse s'il est absent (422).
     */
    session_id: int('session_id', { unsigned: true })
      .references(() => cashSessions.id, { onDelete: 'set null' }),
    date_vente: datetime('date_vente', { mode: 'date' }).notNull(),
    caissier: varchar('caissier', { length: 128 }).notNull(),
    total_ht: decimal('total_ht', { precision: 12, scale: 2 }).notNull().default('0.00'),
    montant_paye: decimal('montant_paye', { precision: 12, scale: 2 }).notNull().default('0.00'),
    /** Monnaie rendue, calcule par le client. */
    monnaie: decimal('monnaie', { precision: 12, scale: 2 }).notNull().default('0.00'),
    mode_paiement: varchar('mode_paiement', { length: 16, enum: PAYMENT_MODES }).notNull().default('espèces'),
    /**
     * Empreinte NF525 : SHA-256 de la vente, liee a l'empreinte de la vente
     * precedente. Modifier une vente ancienne invalide toute la suite de la
     * chaine, ce qui rend l'alteration detectable.
     *
     * Nullable pour l'historique anterieur a la mise en conformite : ces
     * ventes n'ont pas d'empreinte, et le controle les signale comme
     * « anterieures » plutot que comme une rupture.
     */
    fingerprint: varchar('fingerprint', { length: 64 }),
    /**
     * Vente enregistree hors ligne, en mode degrade NF525.
     *
     * Une vente de ce type a ete sous reserve de la cle de securite
     * applicable pendant la coupure de la liaison : elle doit etre
     * identifiable apres coup, ce qu'un simple horodatage ne garantit pas.
     */
    degrade: boolean('degrade').notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    index('idx_ventes_date').on(table.date_vente),
    index('idx_ventes_session').on(table.session_id),
    index('idx_ventes_fingerprint').on(table.fingerprint),
  ],
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

export const cashSessionsRelations = relations(cashSessions, ({ one, many }) => ({
  utilisateur: one(users, { fields: [cashSessions.utilisateur_id], references: [users.id] }),
  comptage: many(cashSessionBreaks),
  mouvements: many(cashMovements),
  ventes: many(ventes),
}))

export const cashSessionBreaksRelations = relations(cashSessionBreaks, ({ one }) => ({
  session: one(cashSessions, {
    fields: [cashSessionBreaks.session_id],
    references: [cashSessions.id],
  }),
}))

export const cashMovementsRelations = relations(cashMovements, ({ one }) => ({
  session: one(cashSessions, { fields: [cashMovements.session_id], references: [cashSessions.id] }),
  vente: one(ventes, { fields: [cashMovements.vente_id], references: [ventes.id] }),
}))

export const ventesRelations = relations(ventes, ({ one, many }) => ({
  client: one(clients, { fields: [ventes.client_id], references: [clients.id] }),
  session: one(cashSessions, { fields: [ventes.session_id], references: [cashSessions.id] }),
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
