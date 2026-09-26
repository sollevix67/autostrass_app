/**
 * Listes de valeurs des `<select>`, partagees par les formulaires.
 *
 * Centralisees ici plutot que dupliquees dans chaque vue : les libelles et
 * l'ordre d'affichage doivent etre identiques partout, et une divergence
 * ("Cheque" dans un module, "Chèque" dans un autre) se remarque sur la facture
 * comme sur l'ecran.
 *
 * Les *valeurs*, elles, viennent des unions du schema Drizzle, exposees par
 * `src/types` : le select ne peut donc pas proposer un statut que la base
 * refuserait.
 */

/** Option de liste. `value: ''` est reservee a l'option vide d'un select. */
export type SelectOption = { value: string; label: string }

export const CLIENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'particulier', label: 'Particulier' },
  { value: 'professionnel', label: 'Professionnel' },
]

export const VEHICLE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'voiture', label: 'Voiture' },
  { value: 'camionnette', label: 'Camionnette' },
  { value: 'camion', label: 'Camion' },
  { value: 'autre', label: 'Autre' },
]

export const VEHICLE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en service', label: 'En service' },
  { value: 'en maintenance', label: 'En maintenance' },
]

export const ROLE_OPTIONS: SelectOption[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'magasinier', label: 'Magasinier' },
  { value: 'caissier', label: 'Caissier' },
]

export const ORDER_STATUS_OPTIONS: SelectOption[] = [
  { value: 'en attente', label: 'En attente' },
  { value: 'validée', label: 'Validée' },
  { value: 'expédiée', label: 'Expédiée' },
  { value: 'livrée', label: 'Livrée' },
  { value: 'annulée', label: 'Annulée' },
]

export const DELIVERY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'en attente', label: 'En attente' },
  { value: 'en transit', label: 'En transit' },
  { value: 'livrée', label: 'Livrée' },
]

export const PAYMENT_MODE_OPTIONS: SelectOption[] = [
  { value: 'espèces', label: 'Espèces' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'chèque', label: 'Chèque' },
]

export const CARRIER_OPTIONS: SelectOption[] = [
  { value: 'Chronopost', label: 'Chronopost' },
  { value: 'Colissimo', label: 'Colissimo' },
  { value: 'GLS', label: 'GLS' },
  { value: 'DHL', label: 'DHL' },
  { value: 'DPD', label: 'DPD' },
  { value: 'Inter Transport', label: 'Inter Transport' },
]

export const RETURN_REASON_OPTIONS: SelectOption[] = [
  { value: 'Article défectueux', label: 'Article défectueux' },
  { value: 'Erreur de commande', label: 'Erreur de commande' },
  { value: 'Article non conforme', label: 'Article non conforme' },
  { value: "Changement d'avis", label: "Changement d'avis" },
  { value: 'Autre', label: 'Autre' },
]

/**
 * Fournisseurs du jeu de demonstration.
 *
 * Le cahier des charges demande un carnet de fournisseurs (module non
 * commence) : le fournisseur est aujourd'hui une simple chaine sur la
 * reception. Cette liste sert de repli tant que la table `fournisseurs` n'existe
 * pas, et sera remplacee par une lecture de l'API.
 */
export const SUPPLIER_OPTIONS: SelectOption[] = [
  { value: 'Auto Pieces Nord', label: 'Auto Pieces Nord' },
  { value: 'Frein Plus', label: 'Frein Plus' },
  { value: 'Filtre Pro', label: 'Filtre Pro' },
  { value: 'Batterie Express', label: 'Batterie Express' },
  { value: 'Huile Max', label: 'Huile Max' },
]

/** Formate un montant en euros, format francais. */
const euros = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatEuros(value: number): string {
  return `${euros.format(value)} €`
}

/** Formate un entier avec separateur de milliers (kilometrage). */
const integer = new Intl.NumberFormat('fr-FR')

export function formatInteger(value: number): string {
  return integer.format(value)
}

/** Date du jour au format `AAAA-MM-JJ`, attendu par `<input type="date">`. */
export function today(): string {
  return new Date().toISOString().slice(0, 10)
}
