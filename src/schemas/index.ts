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
    .refine((value) => !Number.isNaN(Date.parse(value)), `${label} invalide.`)

/** Reutilise par le catalogue, le stock et la vente comptoir. */
export const articleSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, 'La reference est requise.')
    .max(64, 'La reference ne doit pas depasser 64 caracteres.')
    // Reference de piece : lettres, chiffres, tirets, points, slash
    .regex(/^[A-Za-z0-9._/-]+$/, 'Caracteres autorises : lettres, chiffres, . - _ /')
    .transform((value) => value.toUpperCase()),
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

/** Ligne de reception : meme validation que l'article mais sans stock. */
export const receptionLineSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, 'La reference est requise.')
    .max(64, 'Reference trop longue.')
    .regex(/^[A-Za-z0-9._/-]+$/, 'Caracteres autorises : lettres, chiffres, . - _ /')
    .transform((value) => value.toUpperCase()),
  designation: required('La designation'),
  quantiteRecue: nonNegative('La quantite recue').refine((value) => Number.isInteger(value) && value > 0, 'La quantite doit etre un entier positif.'),
  prixUnitaire: nonNegative('Le prix unitaire'),
})

export const receptionSchema = z.object({
  fournisseur: z.string().trim().min(1, 'Le fournisseur est requis.'),
  dateReception: dateISO('La date de reception'),
  articles: z
    .array(receptionLineSchema)
    .min(1, 'Ajoutez au moins un article a la reception.'),
})

/** Ligne de panier : la quantite doit rester un entier positif borne. */
export const cartLineSchema = z.object({
  reference: z.string().trim().min(1, 'La reference est requise.'),
  quantite: z
    .number({ message: 'La quantite est requise.' })
    .int('La quantite doit etre un entier.')
    .min(1, 'La quantite doit etre au moins 1.')
    .max(9999, 'Quantite maximale : 9999.'),
})

/** Regles de la vente ; le total est ajoute comme contexte par `venteContext`. */
const venteBase = z.object({
  clientId: optionalText('Le client'),
  modePaiement: z.enum(['espèces', 'carte', 'chèque'], { message: 'Mode de paiement invalide.' }),
  montantPaye: nonNegative('Le montant paye'),
})

/** Ajoute la regle "montant encaisse >= total" avec un message contextuel. */
export function venteContext(totalHT: number) {
  return venteBase.refine((value) => value.montantPaye >= totalHT, {
    message: `Le montant encaisse est inferieur au total de ${totalHT.toFixed(2)} EUR.`,
    path: ['montantPaye'],
  })
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
})

export const livraisonSchema = z.object({
  commandeId: required('Le numero de commande').max(64, 'Numero trop long.'),
  transporteur: z.string().trim().min(1, 'Le transporteur est requis.'),
  dateExpedition: dateISO("La date d'expedition"),
  dateLivraisonPrevue: dateISO('La date de livraison prevue'),
  adresseLivraison: required("L'adresse de livraison").max(255, 'Adresse trop longue.'),
  statut: z.enum(['en transit', 'livrée', 'en attente'], { message: 'Statut invalide.' }),
  tracking: optionalText('Le numero de suivi', 64),
})

/** Types deduits des schemas : source de verite pour les formulaires. */
export type ArticleFormValues = z.input<typeof articleSchema>
export type ArticleFormOutput = z.output<typeof articleSchema>
export type ReceptionFormValues = z.input<typeof receptionSchema>
export type ReceptionLineFormValues = z.input<typeof receptionLineSchema>
export type ClientFormValues = z.input<typeof clientSchema>
export type VehiculeFormValues = z.input<typeof vehiculeSchema>
export type UtilisateurFormValues = z.input<typeof utilisateurSchema>
export type LivraisonFormValues = z.input<typeof livraisonSchema>
