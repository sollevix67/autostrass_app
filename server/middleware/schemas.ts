/**
 * Schemas de validation des 8 metiers, pour l'API.
 *
 * Distincts des schemas du frontend (`src/schemas/index.ts`) : ceux-la
 * valident un formulaire et renvoient des messages a l'utilisateur, ceux-ci
 * valident une requete HTTP. Ils partagent volontairement les memes unions
 * (importees de `server/db/schema.ts`) pour qu'une valeur refusee par le
 * formulaire ne puisse pas passer par l'API.
 *
 * Chaque champ texte passe par `sanitizeText` / `sanitizeCode` : c'est la
 * couche qui supprime les caracteres invisibles et de controle et qui rejette
 * les marqueurs de markup. L'injection SQL et le XSS sont deja couverts par
 * ailleurs (requetes parametrées, echappement React) ; voir l'analyse en tete
 * de `sanitize.ts`.
 */

import { z } from 'zod'
import { USER_ROLES, CLIENT_TYPES, VEHICLE_TYPES, VEHICLE_STATUSES, ORDER_STATUSES, DELIVERY_STATUSES, PAYMENT_MODES } from '../db/schema.js'
import { sanitizeCode, sanitizeText, normalizeText } from './sanitize.js'

/**
 * Champ texte requis : longueur bornee, normalise, sans markup.
 *
 * L'ordre compte : la normalisation est appliquee AVANT les controles de
 * longueur, sinon une suite de caracteres de largeur nulle passerait sous la
 * limite en etant supprimee ensuite.
 *
 * L'exception du `transform` est lancee avec `ctx` : Zod 4 la convertit en
 * `issue` au lieu de la laisser se propager, ce qui donnerait un 500.
 */
const required = (label: string, max = 255) =>
  z
    .string({ message: `${label} est requis.` })
    .transform((value, ctx) => {
      try {
        return sanitizeText(value, max, label)
      } catch (error) {
        ctx.addIssue({ code: 'custom', message: (error as Error).message })
        return z.NEVER
      }
    })
    .pipe(z.string().min(1, `${label} est requis.`).max(max, `${label} ne doit pas depasser ${max} caracteres.`))

/** Champ texte facultatif, memes garanties. Une chaine vide reste acceptee. */
const optionalText = (label: string, max = 2000) =>
  z
    .string()
    .transform((value, ctx) => {
      try {
        return sanitizeText(value, max, label)
      } catch (error) {
        ctx.addIssue({ code: 'custom', message: (error as Error).message })
        return z.NEVER
      }
    })
    .pipe(z.string().max(max, `${label} ne doit pas depasser ${max} caracteres.`))
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

/**
 * Reference de piece : jeu de caracteres strict, meme grammaire que le
 * formulaire de catalogue.
 *
 * `sanitizeCode` ecarte deja tout ce qui n'est pas `[A-Za-z0-9._/-]` et
 * supprime les caracteres invisibles ; la regex n'est donc qu'une
 * confirmation, pas la premiere barriere.
 */
const reference = z
  .string({ message: 'La reference est requise.' })
  .transform(guarded<string>((value) => sanitizeCode(value, 64, 'La reference')))
  .pipe(z.string().min(1, 'La reference est requise.').max(64, 'La reference ne doit pas depasser 64 caracteres.'))
  .transform((value) => value.toUpperCase())

/**
 * Adresse email : longueur bornee et jeu de caracteres strict.
 *
 * On n'applique volontairement pas `sanitizeText` : le format d'email
 * autorise `@` et `.`, et le stockage se fait avec un collation insensible a
 * la casse. Le HTML et le SQL sont deja neutralises en amont.
 */
const email = (label = "L'email") =>
  z
    .string({ message: `${label} est requis.` })
    .trim()
    .max(255, `${label} est trop long.`)
    // Plafond RFC 5321 : 254 octets, 64 pour la partie locale.
    .regex(/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,63}$/, `Format d'email invalide.`)

/**
 * Applique un transformateur en convertissant l'exception en `issue` Zod.
 *
 * Sans ce garde-fou, une exception levee dans un `transform` court-circuite le
 * schema et remonte jusqu'au gestionnaire d'erreurs, qui repond 500.
 */
function guarded<T>(run: (value: string) => string) {
  return (value: string, ctx: z.RefinementCtx): T => {
    try {
      return run(value) as T
    } catch (error) {
      ctx.addIssue({ code: 'custom', message: (error as Error).message })
      return z.NEVER as T
    }
  }
}

/**
 * Numero de telephone FR : chiffres et separateurs uniquement.
 *
 * `sanitizeCode` ecarte deja tout ce qui n'est pas `[A-Za-z0-9._/-]`, puis on
 * exige la forme telephonique.
 *
 * La variante facultative doit rester **absente** du schema quand la cle n'est
 * pas fournie. `base.optional().or(z.literal(''))` echouait sur ce cas : le
 * `or` impose sa branche `z.literal('')` des que la valeur n'est ni undefi-
 * niee ni valide, et une cle **absente** ne valait aucune des deux. D'ou un
 * 422 « Le telephone est requis » sur `PUT { role: 'caissier' }`.
 *
 * La solution est un `preprocess` : cle absente -> `undefined` (accepte),
 * chaine vide -> `undefined` (accepte), sinon la chaine est validee.
 */
const optionalPhone = (label: string) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), phone(label).optional())

const phone = (label: string, optional = false) => {
  const base = z
    .string({ message: `${label} est requis.` })
    .transform(guarded<string>((value) => sanitizeCode(value, 20, label)))
    .pipe(z.string().regex(/^\+?[0-9 ().-]{6,20}$/, 'Numero de telephone invalide.'))

  return optional ? base.optional() : base
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clientBodySchema = z.object({
  nom: required('Le nom', 64),
  prenom: required('Le prenom', 64),
  telephone: phone('Le telephone'),
  email: email(),
  adresse: required("L'adresse", 255),
  ville: required('La ville', 64),
  codePostal: z
    .string({ message: 'Le code postal est requis.' })
    .transform(guarded<string>((value) => sanitizeCode(value, 10, 'Le code postal')))
    .pipe(z.string().regex(/^[0-9]{4,10}$/, 'Le code postal doit contenir 4 a 10 chiffres.')),
  type: z.enum(CLIENT_TYPES, { message: 'Type invalide.' }),
  // `numeroClient` est volontairement ABSENT du schema. Zod etant en mode
  // « strip », la cle envoyee par le client est simplement ignoree : le
  // numero de dossier est toujours derive de l'id par le repository.
})

/** Mise a jour partielle : toutes les clefs sont facultatives. */
export const clientPatchSchema = clientBodySchema.partial()

// ---------------------------------------------------------------------------
// Vehicules
// ---------------------------------------------------------------------------

export const vehiculeBodySchema = z.object({
  immatriculation: z
    .string({ message: "L'immatriculation est requise." })
    .transform(guarded<string>((value) => sanitizeCode(value, 15, "L'immatriculation")))
    .pipe(
      z
        .string()
        .min(4, "L'immatriculation est requise.")
        .regex(/^[A-Za-z0-9 -]{4,15}$/, 'Format attendu : AA-123-AA'),
    )
    .transform((value) => value.toUpperCase()),
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
  email: email(),
  telephone: optionalPhone('Le telephone'),
  role: z.enum(USER_ROLES, { message: 'Role invalide.' }),
  /** Un compte cree par l'API doit avoir un mot de passe. */
  motDePasse: z
    .string({ message: 'Le mot de passe est requis.' })
    .min(8, 'Le mot de passe doit contenir au moins 8 caracteres.')
    // Plafond bcrypt : 72 octets. Au-dela, le hash est silencieusement tronque,
    // ce qui rend deux mots de passe differents equivalents.
    .max(72, 'Mot de passe trop long (72 caracteres maximum).')
    // Les caracteres de controle et invisibles sont supprimes, pas refuses :
    // « mot\u200Bdepasse » doit se connecter comme « motdepasse ».
    .transform((value) => normalizeText(value)),
  actif: z.boolean().optional(),
})

export const utilisateurPatchSchema = z.object({
  nom: required('Le nom', 64).optional(),
  prenom: required('Le prenom', 64).optional(),
  email: email().optional(),
  telephone: optionalPhone('Le telephone'),
  role: z.enum(USER_ROLES, { message: 'Role invalide.' }).optional(),
  motDePasse: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caracteres.')
    .max(72, 'Mot de passe trop long (72 caracteres maximum).')
    .transform((value) => normalizeText(value))
    .optional(),
  actif: z.boolean().optional(),
})

/**
 * Connexion.
 *
 * Le mot de passe n'est PAS normalise : bcrypt compare octet par octet, et
 * supprimer un caractere invaliderait un mot de passe parfaitement valide.
 * Seule la longueur est bornee, pour ne pas offrir a l'attaquant un
 * hash bcrypt de plusieurs kilo-octets a calculer.
 */
export const loginBodySchema = z.object({
  email: email(),
  motDePasse: z
    .string({ message: 'Le mot de passe est requis.' })
    .min(1, 'Le mot de passe est requis.')
    .max(72, 'Mot de passe trop long.'),
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

/**
 * Maximum de lignes par document.
 *
 * Borne stricte : sans elle, un corps de 1 Mo (limite d'`express.json`) peut
 * contenir des dizaines de milliers de lignes, chacune inseree dans la base
 * dans la meme transaction. C'est un vecteur de deni de service aussi bien
 * qu'un risque de saturation du pool de connexions.
 */
const documentLines = z.array(documentLineSchema).min(1, 'Ajoutez au moins une ligne.').max(200, 'Maximum 200 lignes par document.')

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
    dateVente: dateTimeISO('La date de la vente'),
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
// Caisse : sessions, comptage, journal
// ---------------------------------------------------------------------------

/**
 * Ouverture de session.
 *
 * Le fond de caisse est borne : au-dela de 10 000 €, il ne s'agit plus d'un
 * fond de caisse mais d'une remise de tresorerie, qui releve d'une autre
 * procedure. Sans cette borne, une faute de frappe creerait un ecart de
 * plusieurs milliers d'euros a la cloture.
 */
export const caisseOuvertureSchema = z.object({
  fondsCaisse: nonNegative('Le fond de caisse').refine(
    (value) => value <= 10_000,
    'Le fond de caisse ne peut pas depasser 10 000 EUR.',
  ),
  notes: optionalText('Les notes'),
})

/**
 * Ligne de comptage : combien de billets ou pieces d'une denomination.
 *
 * `denomination` est un montant en euros, et non un indice : la base stocke
 * `DECIMAL(8,2)`, donc `10` et `10.00` sont le meme billet et non deux
 * denominations. Le nom de la colonne le dit, `coupures` l'evite.
 */
const comptageLineSchema = z.object({
  denomination: z
    .number({ message: 'La denomination est requise.' })
    .finite('La denomination doit etre un nombre.')
    .positive('La denomination doit etre strictement positive.'),
  quantite: z
    .number({ message: 'La quantite est requise.' })
    .int('La quantite doit etre un entier.')
    .min(0, 'La quantite ne peut pas etre negative.')
    .max(10_000, 'Quantite maximale : 10 000 billets par denomination.'),
})

/**
 * Cloture de session.
 *
 * Le comptage peut etre vide : une session sans especes (tout paye par carte)
 * se clot legitiment avec un comptage vide. C'est le schema qui refuse les
 * quantites negatives, pas la cloture sans billet.
 */
export const caisseClotureSchema = z.object({
  comptage: z.array(comptageLineSchema).max(20, 'Maximum 20 denominations comptees.'),
  notes: optionalText('Les notes'),
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
export type CaisseOuverture = z.output<typeof caisseOuvertureSchema>
export type CaisseCloture = z.output<typeof caisseClotureSchema>

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
