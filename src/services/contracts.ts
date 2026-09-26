/**
 * Contrats de reponse de l'API partages par les hooks et les vues.
 *
 * Isoles du client HTTP : `api.ts` ne connait que le transport, ces types
 * decrivent la forme des payloads. Toute evolution de l'API se voit ici.
 */

import type { UserRole } from '../types'

/** Reponse de `POST /api/auth/login`. */
export type LoginResponse = {
  token: string
  /**
   * Jeton CSRF, a renvoyer dans `X-CSRF-Token` sur chaque ecriture.
   * Egalement pose dans un cookie lisible par le JavaScript.
   */
  csrfToken: string
  user: {
    id: number
    email: string
    role: UserRole
    nom: string
    prenom: string
  }
}

/** Reponse de `GET /api/auth/me`. */
export type MeResponse = {
  user: LoginResponse['user']
  /** Jeton CSFR renouvele a chaque verification de session. */
  csrfToken: string
}

/** Ligne de document telle que renvoyee par l'API (receptions, ventes, ...). */
export type ApiLine = {
  ligne: number
  reference: string
  designation: string
  quantite: number
  prixUnitaire: number
  montant: number
}

/** Client renvoye par `GET /api/clients`. */
export type ApiClient = {
  id: number
  nom: string
  prenom: string
  telephone: string
  email: string
  adresse: string
  ville: string
  codePostal: string
  type: 'particulier' | 'professionnel'
  numeroClient: string
  createdAt: string
  updatedAt: string
}

/** Vehicule renvoye par `GET /api/vehicules`. */
export type ApiVehicule = {
  id: number
  immatriculation: string
  marque: string
  modele: string
  annee: number
  type: 'voiture' | 'camionnette' | 'camion' | 'autre'
  kilometrage: number
  proprietaire: string
  statut: 'disponible' | 'en service' | 'en maintenance'
  createdAt: string
  updatedAt: string
}

/** Utilisateur renvoye par `GET /api/utilisateurs` (jamais de hash). */
export type ApiUtilisateur = {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string | null
  role: UserRole
  actif: boolean
  createdAt: string
  updatedAt: string
}

/** Reception renvoyee par `GET /api/receptions`. */
export type ApiReception = {
  id: number
  fournisseur: string
  dateReception: string
  notes: string | null
  articles: ApiLine[]
  totalHT: number
  createdAt: string
  updatedAt: string
}

/** Vente renvoyee par `GET /api/ventes`. */
export type ApiVente = {
  id: number
  clientId: number | null
  dateVente: string
  caissier: string
  articles: ApiLine[]
  totalHT: number
  montantPaye: number
  monnaie: number
  modePaiement: 'espèces' | 'carte' | 'chèque'
  createdAt: string
}

/** Commande renvoyee par `GET /api/commandes`. */
export type ApiCommande = {
  id: number
  clientId: number
  dateCommande: string
  articles: ApiLine[]
  statut: 'en attente' | 'validée' | 'expédiée' | 'livrée' | 'annulée'
  dateLivraisonPrevue: string | null
  createdAt: string
  updatedAt: string
}

/** Livraison renvoyee par `GET /api/livraisons`. */
export type ApiLivraison = {
  id: number
  commandeId: number
  transporteur: string
  dateExpedition: string
  dateLivraisonPrevue: string
  adresseLivraison: string
  statut: 'en transit' | 'livrée' | 'en attente'
  tracking: string | null
  createdAt: string
  updatedAt: string
}

/** Retour renvoye par `GET /api/retours`. */
export type ApiRetour = {
  id: number
  venteId: number | null
  clientId: number
  dateRetour: string
  motif: string
  articles: ApiLine[]
  montantRembourse: number
  createdAt: string
}
