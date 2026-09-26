/**
 * Schemas de validation des 8 metiers, pour l'API.
 *
 * Distincts des schemas du frontend (`src/schemas/index.ts`) : ceux-la
 * valident un formulaire et renvoient des messages a l'utilisateur, ceux-ci
 * valident une requete HTTP. Ils partagent volontairement les memes unions
 * (importees de `server/db/schema.ts`) pour qu'une valeur refusee par le
 * formulaire ne puisse pas passer par l'API.
 */

import { z } from 'zod'
import { USER_ROLES, CLIENT_TYPES, VEHICLE_TYPES, VEHICLE_STATUSES, ORDER_STATUSES, DELIVERY_STATUSES, PAYMENT_MODES } from '../db/schema.js'

/** Champ texte requis, borne, espaces de debut/fin neutralises. */
const required = (label: string, max = 255) =>
  z
    .string({ message: `${label} est requis.` })
    .trim()
    .min(1, `${label} est requis.`)
    .max(max, `${label} ne doit pas depasser ${max} caracteres.`)

const optionalText = (label: string, max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `${label} ne doit pas depasser ${max} caracteres.`)
    .optional()
    .or(z.literal(''))

const nonNegative = (label: string) =>
  z
    .number({ message: `${label} est requis.` })
    .finite(`${label} doit etre un nombre.`)
    .min(0, `${label} ne peut pas etre negatif.`)

const positiveInt = (label: string, max = 1_000_000) =>
  nonNegative(label)
    .refine((value) => Number.isInteger(value) && value > 0, `${label} doit etre un entier positif.`)
    .refine((value) => value <= max, `${label} depasse la limite (${max}).`)

const dateISO = (label: string) =>
  z
    .string({ message: `${label} est requise.` })
    .trim()
    .min(1, `${label} est requise.`)
    .regex(/^\d{4}-\d{2}-\d{2}/, `${label} doit etre au format AAAA-MM-JJ.`)

const dateTimeISO = (label: string) =>
  z
    .string({ message: `${label} est requise.` })
    .trim()
    .min(1, `${label} est requise.`)
    .refine((value) => !Number.isNaN(Date.parse(value)), `${label} invalide.`)

/** Reference de piece : memes caracteres que le formulaire de catalogue. */
const reference = z
  .string({ message: 'La reference est requise.' })
  .trim()
  .min(1, 'La reference est requise.')
  .max(64, 'La reference ne doit pas depasser 64 caracteres.')
  .regex(/^[A-Za-z0-9._/-]+$/, 'Caracteres autorises : lettres, chiffres, . - _ /')
  .transform((value) => value.toUpperCase())

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clientBodySchema = z.object({
  nom: required('Le nom', 64),
  prenom: required('Le prenom', 64),
  telephone: z
    .string({ message: 'Le telephone est requis.' })
    .trim()
    .min(1, 'Le telephone est requis.')
    .regex(/^[+0-9\s().-]{6,20}$/, 'Numero de telephone invalide.'),
  email: z.string({ message: "L'email est requis." }).trim().min(1, "L'email est requis.").email("Format d'email invalide."),
  adresse: required("L'adresse", 255),
  ville: required('La ville', 64),
  codePostal: z
    .string({ message: 'Le code postal est requis.' })
    .trim()
    .regex(/^[0-9]{4,10}$/, 'Le code postal doit contenir 4 a 10 chiffres.'),
  type: z.enum(CLIENT_TYPES, { message: 'Type invalide.' }),
  /** Rarement fourni : sinon derive de l'id. */
  numeroClient: z.string().trim().max(32).optional(),
})

/** Mise a jour partielle : toutes les clefs sont facultatives. */
export const clientPatchSchema = clientBodySchema.partial()

// ---------------------------------------------------------------------------
// Vehicules
// ---------------------------------------------------------------------------

export const vehiculeBodySchema = z.object({
  immatriculation: z
    .string({ message: "L'immatriculation est requise." })
    .trim()
    .toUpperCase()
    .min(1, "L'immatriculation est requise.")
    .max(16, "L'immatriculation ne doit pas depasser 16 caracteres.")
    .regex(/^[A-Z0-9 -]{4,15}$/, 'Format attendu : AA-123-AA'),
  marque: required('La marque', 64),
  modele: required('Le modele', 64),
  annee: z
    .number({ message: "L'annee est requise." })
    .int("L'annee doit etre un entier.")
    .min(1950, 'Annee trop ancienne.')
    .max(new Date().getFullYear() + 1, 'Annee dans le futur.'),
  type: z.enum(VEHICLE_TYPES, { message: 'Type invalide.' }),
  kilometrage: nonNegative('Le kilometrage').refine((value) => Number.isInteger(value), 'Le kilometrage doit etre un entier.'),
  proprietaire: required('Le proprietaire', 128),
  statut: z.enum(VEHICLE_STATUSES, { message: 'Statut invalide.' }),
})

export const vehiculePatchSchema = vehiculeBodySchema.partial()

// ---------------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------------

export const utilisateurBodySchema = z.object({
  nom: required('Le nom', 64),
  prenom: required('Le prenom', 64),
  email: z.string({ message: "L'email est requis." }).trim().min(1, "L'email est requis.").email("Format d'email invalide."),
  telephone: z
    .string()
    .trim()
    .regex(/^[+0-9\s().-]{6,20}$/, 'Numero de telephone invalide.')
    .optional()
    .or(z.literal('')),
  role: z.enum(USER_ROLES, { message: 'Role invalide.' }),
  /** Un compte cree par l'API doit avoir un mot de passe. */
  motDePasse: z
    .string({ message: 'Le mot de passe est requis.' })
    .min(8, 'Le mot de passe doit contenir au moins 8 caracteres.')
    .max(128, 'Mot de passe trop long.'),
  actif: z.boolean().optional(),
})

export const utilisateurPatchSchema = z.object({
  nom: required('Le nom', 64).optional(),
  prenom: required('Le prenom', 64).optional(),
  email: z.string().trim().email("Format d'email invalide.").optional(),
  telephone: z
    .string()
    .trim()
    .regex(/^[+0-9\s().-]{6,20}$/, 'Numero de telephone invalide.')
    .optional()
    .or(z.literal('')),
  role: z.enum(USER_ROLES, { message: 'Role invalide.' }).optional(),
  motDePasse: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres.').max(128).optional(),
  actif: z.boolean().optional(),
})

export const loginBodySchema = z.object({
  email: z.string({ message: "L'email est requis." }).trim().min(1, "L'email est requis.").email("Format d'email invalide."),
  motDePasse: z.string({ message: 'Le mot de passe est requis.' }).min(1, 'Le mot de passe est requis.'),
})

// ---------------------------------------------------------------------------
// Documents : ligne commune
// ---------------------------------------------------------------------------

/**
 * Ligne de reception / vente / commande / retour.
 *
 * Le total de ligne n'est pas fourni : il vaut toujours
 * `quantite * prixUnitaire`, calcule par le repository.
 */
const documentLineSchema = z.object({
  reference,
  designation: required('La designation', 255),
  quantite: positiveInt('La quantite', 9999),
  prixUnitaire: nonNegative('Le prix unitaire').refine((value) => value <= 1_000_000, 'Prix unitaire trop eleve.'),
})

const documentLines = z.array(documentLineSchema).min(1, 'Ajoutez au moins une ligne.').max(200, 'Maximum 200 lignes.')

// ---------------------------------------------------------------------------
// Receptions
// ---------------------------------------------------------------------------

export const receptionBodySchema = z.object({
  fournisseur: required('Le fournisseur', 128),
  dateReception: dateISO('La date de reception'),
  notes: optionalText('Les notes'),
  articles: documentLines,
})

export const receptionHeadPatchSchema = z.object({
  fournisseur: required('Le fournisseur', 128).optional(),
  dateReception: dateISO('La date de reception').optional(),
  notes: optionalText('Les notes'),
})

// ---------------------------------------------------------------------------
// Ventes
// ---------------------------------------------------------------------------

export const venteBodySchema = z
  .object({
    clientId: z.number({ message: 'Le client est requis.' }).int().positive().nullable().optional(),
    dateVente: dateTimeISO('La date de vente'),
    caissier: required('Le caissier', 128),
    modePaiement: z.enum(PAYMENT_MODES, { message: 'Mode de paiement invalide.' }),
    montantPaye: nonNegative('Le montant paye'),
    monnaie: nonNegative('La monnaie').optional(),
    articles: documentLines,
  })
  // Le total etant recalcule par le serveur, on verifie ici que la somme
  // encaissee couvre le total calcule, plutot que de comparer a un total fourni.
  .refine(
    (value) =>
      value.articles.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0) <= value.montantPaye + 0.005,
    { message: 'Le montant encaisse est inferieur au total de la vente.', path: ['montantPaye'] },
  )

export const venteHeadPatchSchema = z.object({
  clientId: z.number().int().positive().nullable().optional(),
  dateVente: dateTimeISO('La date de vente').optional(),
  caissier: required('Le caissier', 128).optional(),
  modePaiement: z.enum(PAYMENT_MODES, { message: 'Mode de paiement invalide.' }).optional(),
  montantPaye: nonNegative('Le montant paye').optional(),
  monnaie: nonNegative('La monnaie').optional(),
})

// ---------------------------------------------------------------------------
// Commandes clients
// ---------------------------------------------------------------------------

export const commandeBodySchema = z.object({
  clientId: z.number({ message: 'Le client est requis.' }).int().positive(),
  dateCommande: dateISO('La date de commande'),
  statut: z.enum(ORDER_STATUSES, { message: 'Statut invalide.' }).optional(),
  dateLivraisonPrevue: dateISO('La date de livraison prevue').optional().or(z.literal('')),
  articles: documentLines,
})

export const commandeHeadPatchSchema = z.object({
  clientId: z.number().int().positive().optional(),
  dateCommande: dateISO('La date de commande').optional(),
  statut: z.enum(ORDER_STATUSES, { message: 'Statut invalide.' }).optional(),
  dateLivraisonPrevue: dateISO('La date de livraison prevue').optional().or(z.literal('')),
})

// ---------------------------------------------------------------------------
// Livraisons
// ---------------------------------------------------------------------------

export const livraisonBodySchema = z.object({
  commandeId: z.number({ message: 'La commande est requise.' }).int().positive(),
  transporteur: required('Le transporteur', 128),
  dateExpedition: dateISO("La date d'expedition"),
  dateLivraisonPrevue: dateISO('La date de livraison prevue'),
  adresseLivraison: required("L'adresse de livraison", 255),
  statut: z.enum(DELIVERY_STATUSES, { message: 'Statut invalide.' }).optional(),
  tracking: optionalText('Le numero de suivi', 64),
})

export const livraisonPatchSchema = livraisonBodySchema.partial()

// ---------------------------------------------------------------------------
// Retours
// ---------------------------------------------------------------------------

export const retourBodySchema = z.object({
  venteId: z.number().int().positive().nullable().optional(),
  clientId: z.number({ message: 'Le client est requis.' }).int().positive(),
  dateRetour: dateISO('La date de retour'),
  motif: required('Le motif', 255),
  articles: documentLines,
})

export const retourHeadPatchSchema = z.object({
  venteId: z.number().int().positive().nullable().optional(),
  clientId: z.number().int().positive().optional(),
  dateRetour: dateISO('La date de retour').optional(),
  motif: required('Le motif', 255).optional(),
})

/** Changement de statut seul : edition inline dans les tableaux. */
export const statutPatchSchema = z.object({
  statut: z.string({ message: 'Le statut est requis.' }).trim().min(1, 'Le statut est requis.').max(32),
})

// ---------------------------------------------------------------------------
// Types de sortie
//
// La fabrique CRUD impose que le schema Zod produise exactement la forme
// attendue par le repository. Ces alias documentent cette correspondance et
// la verifient a la compilation.
// ---------------------------------------------------------------------------

/** Forme attendue par `ClientRepository` a l'ecriture. */
export type ClientInput = z.output<typeof clientBodySchema>
export type ClientPatch = z.output<typeof clientPatchSchema>
export type VehiculeInput = z.output<typeof vehiculeBodySchema>
export type VehiculePatch = z.output<typeof vehiculePatchSchema>
export type UtilisateurInput = z.output<typeof utilisateurBodySchema>
export type UtilisateurPatch = z.output<typeof utilisateurPatchSchema>
export type LivraisonInput = z.output<typeof livraisonBodySchema>
export type LivraisonPatch = z.output<typeof livraisonPatchSchema>

/** Valeurs d'un document apres validation complete (entete + lignes). */
export type ReceptionInput = z.output<typeof receptionBodySchema>
export type VenteInput = z.output<typeof venteBodySchema>
export type CommandeInput = z.output<typeof commandeBodySchema>
export type RetourInput = z.output<typeof retourBodySchema>

/** Patch d'entete seule, sans les lignes. */
export type ReceptionPatch = z.output<typeof receptionHeadPatchSchema>
export type VentePatch = z.output<typeof venteHeadPatchSchema>
export type CommandePatch = z.output<typeof commandeHeadPatchSchema>
export type RetourPatch = z.output<typeof retourHeadPatchSchema>

/** Ligne de document validee, sans le rang (ajoute a l'ecriture). */
export type LinePayload = z.output<typeof documentLineSchema>
export type LoginInput = z.output<typeof loginBodySchema>
