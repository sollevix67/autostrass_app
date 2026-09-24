export type ActivityType = 'RECEPTION' | 'VENTE' | 'TRANSFERT' | 'INVENTAIRE' | string

export type LowStockItem = {
  reference: string
  label: string
  quantity: number
  minimum: number
  location: string
}

export type Activity = {
  type: ActivityType
  title: string
  detail: string
  time: string
}

export type DashboardData = {
  stockValue: number
  references: number
  lowStock: number
  pendingOrders: number
  lowStockItems: LowStockItem[]
  activity: Activity[]
}

export type ApiDashboard = Partial<DashboardData> & {
  stockItems?: Array<{ ref: string; name: string; location: string; stock: number; minimum: number }>
  activities?: Activity[]
}

export type ApiMode = 'loading' | 'connected' | 'error'

export interface Article {
  reference: string
  designation: string
  category: string
  prixUnitaireHT: number
  quantite: number
  minimum: number
  emplacement: string
  description?: string
}

export interface Reception {
  id?: string
  fournisseur: string
  dateReception: string
  articles: Array<{
    reference: string
    designation: string
    quantiteRecue: number
    prixUnitaire: number
  }>
  totalHT: number
  notes?: string
}

export interface Vente {
  id?: string
  clientId: string
  dateVente: string
  caissier: string
  articles: Array<{
    reference: string
    designation: string
    quantite: number
    prixUnitaire: number
    montant: number
  }>
  totalHT: number
  montantPaye: number
  monnaie: number
  modePaiement: 'espèces' | 'carte' | 'chèque'
}

export interface CommandeClient {
  id?: string
  clientId: string
  dateCommande: string
  articles: Array<{
    reference: string
    designation: string
    quantite: number
    prixUnitaire: number
  }>
  statut: 'en attente' | 'validée' | 'expédiée' | 'livrée' | 'annulée'
  dateLivraisonPrevue?: string
}

export interface Livraison {
  id?: string
  commandeId: string
  transporteur: string
  dateExpedition: string
  dateLivraisonPrevue: string
  adresseLivraison: string
  statut: 'en transit' | 'livrée' | 'en attente'
  tracking?: string
}

export interface Retour {
  id?: string
  venteId: string
  clientId: string
  dateRetour: string
  motif: string
  articles: Array<{
    reference: string
    designation: string
    quantite: number
    prixUnitaire: number
  }>
  montantRembourse: number
}

export interface Client {
  id?: string
  nom: string
  prenom: string
  telephone: string
  email: string
  adresse: string
  ville: string
  codePostal: string
  type: 'particulier' | 'professionnel'
  numeroClient: string
}

export interface Vehicule {
  id?: string
  immatriculation: string
  marque: string
  modele: string
  annee: number
  type: 'voiture' | 'camionnette' | 'camion' | 'autre'
  kilometrage: number
  proprietaire: string
  statut: 'disponible' | 'en service' | 'en maintenance'
}

export interface Utilisateur {
  id?: string
  nom: string
  prenom: string
  email: string
  telephone: string
  role: 'admin' | 'magasinier' | 'caissier'
  actif: boolean
}
