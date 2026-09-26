/**
 * Types metier partages.
 *
 * `Article` et les types du tableau de bord decrivent des formes qui
 * n'existent pas encore dans l'API (catalogue v1, agregats) et restent
 * partagees entre le hook, la vue et les schemas.
 *
 * Les sept autres metiers (clients, vehicules, receptions, ventes, commandes,
 * livraisons, retours) sont desagrees par l'API : leurs formes vivent dans
 * `src/services/contracts.ts`. Les interfaces locales correspondantes ont ete
 * supprimees — elles concentraient des `id` en chaine et des `lineId`
 * locaux que la base ignore, ce qui avait produit deux definitions
 * concurrentes du meme metier.
 */

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

/**
 * Roles applicatifs, alignes sur l'enum `users.role` du schema Drizzle.
 *
 * Exporte ici pour que le frontend n'ait pas a importer le schema serveur :
 * `src` et `server` sont deux projets TypeScript distincts.
 */
export const USER_ROLES = ['admin', 'magasinier', 'caissier'] as const
export type UserRole = (typeof USER_ROLES)[number]

/**
 * Reference de piece du catalogue et du stock.
 *
 * `emplacement` est aujourd'hui un texte libre (« A-03 / E-02 / P-14 »). Le
 * cahier des charges demande une hierarchie allee -> etagere -> place ; le
 * passage a une cle etrangere fait partie de l'etape 2 de la feuille de route.
 */
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
