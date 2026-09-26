import { z } from 'zod'

/**
 * Schémas de validation partagés entre le frontend (React Hook Form) et,
 * si besoin, le backend. Les messages sont en francais et destines a
 * l'utilisateur final : ils apparaissent tels quels dans les champs.
 */

/** Trim + refus des chaines vides : utilitaire interne. */
const required = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} est requis.`)
    .max(255, `${label} ne doit pas depasser 255 caracteres.`)

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

const dateISO = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} est requise.`)
    .regex(/^\d{4}-\d{2}-\d{2}/, `${label} doit etre au format AAAA-MM-JJ.`)

/**
 * Horodatage complet (ventes).
 *
 * Distinct de `dateISO` : l'API attend un `dateTimeISO` pour `dateVente` et un
 * `dateISO` pour les dates de document. Utiliser le mauvais schema ferait
 * rejeter par l'API une valeur que le formulaire jugeait valide.
 */
const dateTimeISO = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} est requise.`)
    .refine((value) => !Number.isNaN(Date.parse(value)), `${label} invalide.`)

/**
 * Champ select dont la valeur est un identifiant numerique.
 *
 * `<select>` et `valueAsNumber` renvoient `NaN` sur l'option vide, pas `''`.
 * Sans ce preprocess, un champ obligatoire affiche « est requis » sur une
 * option volontairement laissee vide, et un champ facultatif envoie `NaN`
 * a l'API, qui le refuse en 422.
 */
const toNullableNumber = (value: unknown): unknown =>
  value === '' || value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))
    ? null
    : value

/** Reference obligatoire vers une ligne du referentiel (client, commande...). */
const requiredRef = (label: string) =>
  z.preprocess(
    (value) => (toNullableNumber(value) === null ? undefined : toNullableNumber(value)),
    z.number({ message: `${label} est requis.` }).int().positive(),
  )

/** Reference facultative : l'absence est acceptee, l'id invalide non. */
const optionalRef = (label: string) =>
  z.preprocess(toNullableNumber, z.number({ message: `${label} est invalide.` }).int().positive().nullable())

/** Reference de piece : meme grammaire que celle de l'API. */
const pieceReference = z
  .string()
  .trim()
  .min(1, 'La reference est requise.')
  .max(64, 'La reference ne doit pas depasser 64 caracteres.')
  // Reference de piece : lettres, chiffres, tirets, points, slash
  .regex(/^[A-Za-z0-9._/-]+$/, 'Caracteres autorises : lettres, chiffres, . - _ /')
  .transform((value) => value.toUpperCase())

/** Reutilise par le catalogue, le stock et la vente comptoir. */
export const articleSchema = z.object({
  reference: pieceReference,
  designation: required('La designation').max(255, 'La designation ne doit pas depasser 255 caracteres.'),
  category: z
    .string()
    .trim()
    .min(1, 'La categorie est requise.')
    .max(64, 'Categorie trop longue.'),
  prixUnitaireHT: nonNegative('Le prix unitaire HT').refine(
    (value) => value <= 1_000_000,
    'Prix trop eleve.',
  ),
  quantite: nonNegative('La quantite').refine((value) => Number.isInteger(value), 'La quantite doit etre un entier.'),
  minimum: nonNegative('Le seuil minimum').refine((value) => Number.isInteger(value), 'Le seuil doit etre un entier.'),
  emplacement: required("L'emplacement").max(64, 'Emplacement trop long.'),
  description: optionalText('La description'),
})

/**
 * Ligne de document, forme unique partagee par les quatre metiers
 * (reception, vente, commande, retour).
 *
 * Volontairement identique a `documentLineSchema` cote API : c'est ce meme
 * contrat que `PUT /:id/lignes` attend, si bien qu'une ligne saisie en
 * reception peut etre reprise a l'identique dans un panier de vente.
 */
export const documentLineSchema = z.object({
  reference: pieceReference,
  designation: required('La designation'),
  quantite: nonNegative('La quantite')
    .refine((value) => Number.isInteger(value) && value > 0, 'La quantite doit etre un entier positif.')
    .refine((value) => value <= 9999, 'Quantite maximale : 9999.'),
  prixUnitaire: nonNegative('Le prix unitaire').refine((value) => value <= 1_000_000, 'Prix unitaire trop eleve.'),
})

/** Ligne de reception : alias conserve pour les formulaires existants. */
export const receptionLineSchema = documentLineSchema

export const receptionSchema = z.object({
  fournisseur: required('Le fournisseur').max(128, 'Nom de fournisseur trop long.'),
  dateReception: dateISO('La date de reception'),
  notes: optionalText('Les notes'),
  articles: z
    .array(documentLineSchema)
    .min(1, 'Ajoutez au moins un article a la reception.')
    .max(200, 'Maximum 200 lignes par document.'),
})

/** Ligne de panier : la quantite doit rester un entier positif borne. */
export const cartLineSchema = documentLineSchema

/**
 * Vente au comptoir.
 *
 * Le total n'est jamais saisi : il est recalcule par le serveur a partir des
 * lignes. Le formulaire ne verifie donc que la regle « montant encaisse >=
 * total », que `venteContext` replique cote client.
 */
const venteBase = z.object({
  clientId: optionalRef('Le client'),
  dateVente: dateTimeISO('La date de vente'),
  caissier: required('Le caissier').max(128, 'Nom de caissier trop long.'),
  modePaiement: z.enum(['espèces', 'carte', 'chèque'], { message: 'Mode de paiement invalide.' }),
  montantPaye: nonNegative('Le montant paye'),
})

/** Ajoute la regle "montant encaisse >= total" avec un message contextuel. */
export function venteContext(totalHT: number) {
  return venteBase.refine((value) => value.montantPaye >= totalHT - 0.005, {
    message: `Le montant encaisse est inferieur au total de ${totalHT.toFixed(2)} EUR.`,
    path: ['montantPaye'],
  })
}

/** Schema de vente a valider en submission : depend du total calcule. */
export function venteSchema(totalHT: number) {
  return venteContext(totalHT)
}

export const clientSchema = z.object({
  nom: required('Le nom').max(64, 'Nom trop long.'),
  prenom: required('Le prenom').max(64, 'Prenom trop long.'),
  telephone: z
    .string()
    .trim()
    .min(1, 'Le telephone est requis.')
    .regex(/^[+0-9\s().-]{6,20}$/, 'Numero de telephone invalide.'),
  email: z.string().trim().min(1, "L'email est requis.").email("Format d'email invalide."),
  adresse: required('L\'adresse').max(255, 'Adresse trop longue.'),
  ville: required('La ville').max(64, 'Ville trop longue.'),
  codePostal: z
    .string()
    .trim()
    .regex(/^[0-9]{4,10}$/, 'Le code postal doit contenir 4 a 10 chiffres.'),
  type: z.enum(['particulier', 'professionnel'], { message: 'Type invalide.' }),
})

export const vehiculeSchema = z.object({
  immatriculation: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "L'immatriculation est requise.")
    .regex(/^[A-Z0-9 -]{4,15}$/, 'Format attendu : AA-123-AA'),
  marque: required('La marque').max(64, 'Marque trop longue.'),
  modele: required('Le modele').max(64, 'Modele trop long.'),
  annee: z
    .number({ message: "L'annee est requise." })
    .int("L'annee doit etre un entier.")
    .min(1950, 'Annee trop ancienne.')
    .max(new Date().getFullYear() + 1, 'Annee dans le futur.'),
  type: z.enum(['voiture', 'camionnette', 'camion', 'autre'], { message: 'Type invalide.' }),
  kilometrage: nonNegative('Le kilometrage').refine((value) => Number.isInteger(value), 'Le kilometrage doit etre un entier.'),
  proprietaire: required('Le proprietaire').max(128, 'Proprietaire trop long.'),
  statut: z.enum(['disponible', 'en service', 'en maintenance'], { message: 'Statut invalide.' }),
})

/**
 * Creation d'un compte : le mot de passe est obligatoire cote API.
 *
 * Les regles de robustesse du serveur (8 caracteres minimum, 72 octets maximum
 * car bcrypt tronque au-dela) sont reprises ici pour ne pas faire subir au
 * usuario un aller-retour reseau sur une erreur predictable.
 */
export const utilisateurSchema = z.object({
  nom: required('Le nom').max(64, 'Nom trop long.'),
  prenom: required('Le prenom').max(64, 'Prenom trop long.'),
  email: z.string().trim().min(1, "L'email est requis.").email("Format d'email invalide."),
  telephone: z
    .string()
    .trim()
    .regex(/^[+0-9\s().-]{6,20}$/, 'Numero de telephone invalide.')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'magasinier', 'caissier'], { message: 'Role invalide.' }),
  motDePasse: z
    .string({ message: 'Le mot de passe est requis.' })
    .min(8, 'Le mot de passe doit contenir au moins 8 caracteres.')
    .max(72, 'Mot de passe trop long (72 caracteres maximum).'),
})

export const livraisonSchema = z.object({
  commandeId: requiredRef('Le numero de commande'),
  transporteur: z.string().trim().min(1, 'Le transporteur est requis.').max(128, 'Transporteur trop long.'),
  dateExpedition: dateISO("La date d'expedition"),
  dateLivraisonPrevue: dateISO('La date de livraison prevue'),
  adresseLivraison: required("L'adresse de livraison").max(255, 'Adresse trop longue.'),
  statut: z.enum(['en transit', 'livrée', 'en attente'], { message: 'Statut invalide.' }),
  tracking: optionalText('Le numero de suivi', 64),
})

/** Commande client : l'entete seule ne suffit pas, il faut des lignes. */
export const commandeSchema = z.object({
  clientId: requiredRef('Le client'),
  dateCommande: dateISO('La date de commande'),
  statut: z.enum(['en attente', 'validée', 'expédiée', 'livrée', 'annulée'], { message: 'Statut invalide.' }),
  dateLivraisonPrevue: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? '' : value),
    dateISO('La date de livraison prevue').optional().or(z.literal('')),
  ),
  articles: z
    .array(documentLineSchema)
    .min(1, 'Ajoutez au moins un article a la commande.')
    .max(200, 'Maximum 200 lignes par document.'),
})

/**
 * Retours : la vente d'origine est facultative (retour fournisseur, avoir...).
 */
export const retourSchema = z.object({
  venteId: optionalRef('La vente'),
  clientId: requiredRef('Le client'),
  dateRetour: dateISO('La date de retour'),
  motif: required('Le motif').max(255, 'Motif trop long.'),
  articles: z
    .array(documentLineSchema)
    .min(1, 'Ajoutez au moins un article au retour.')
    .max(200, 'Maximum 200 lignes par document.'),
})

/** Ouverture de caisse : le fond remise au caissier. */
export const caisseOuvertureSchema = z.object({
  fondsCaisse: nonNegative('Le fond de caisse').refine(
    (value) => value <= 10_000,
    'Le fond de caisse ne peut pas depasser 10 000 EUR.',
  ),
  notes: optionalText('Les notes'),
})

/**
 * Ligne de comptage.
 *
 * La denomination est un **montant en euros**, pas un indice de coupure :
 * `10` vaut un billet de 10 EUR. Le message le dit explicitement, parce que
 * la confusion inverse (lire `10` comme « coupure n° 10 ») donnerait un
 * comptage aberrant sans lever la moindre erreur.
 */
export const comptageLineSchema = z.object({
  denomination: z
    .number({ message: 'La denomination est requise.' })
    .finite('La denomination doit etre un nombre.')
    .positive('La denomination doit etre strictement positive.'),
  quantite: z
    .number({ message: 'La quantite est requise.' })
    .int('La quantite doit etre un entier.')
    .min(0, 'La quantite ne peut pas etre negative.')
    .max(10_000, 'Quantite maximale : 10 000.'),
})

/**
 * Cloture apres comptage.
 *
 * Un comptage vide est legitime : une session entierement payee par carte se
 * clot sans un seul billet. C'est la quantite negative qui est refusee, pas
 * l'absence de comptage.
 */
export const caisseClotureSchema = z.object({
  comptage: z.array(comptageLineSchema).max(20, 'Maximum 20 denominations comptees.'),
  notes: optionalText('Les notes'),
})

/** Types deduits des schemas : source de verite pour les formulaires. */
export type ArticleFormValues = z.input<typeof articleSchema>
export type ArticleFormOutput = z.output<typeof articleSchema>
export type ReceptionFormValues = z.input<typeof receptionSchema>
export type DocumentLineFormValues = z.input<typeof documentLineSchema>
export type CartLineFormValues = z.input<typeof cartLineSchema>
export type ClientFormValues = z.input<typeof clientSchema>
export type VehiculeFormValues = z.input<typeof vehiculeSchema>
export type UtilisateurFormValues = z.input<typeof utilisateurSchema>
export type LivraisonFormValues = z.input<typeof livraisonSchema>
export type CommandeFormValues = z.input<typeof commandeSchema>
export type RetourFormValues = z.input<typeof retourSchema>
export type CaisseOuvertureFormValues = z.input<typeof caisseOuvertureSchema>
export type ComptageLineFormValues = z.input<typeof comptageLineSchema>
export type CaisseClotureFormValues = z.input<typeof caisseClotureSchema>
