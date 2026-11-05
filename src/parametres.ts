import type { IconName } from './components/Icon'

export const PARAMETRES_SECTIONS = [
  { slug: 'base-de-donnees', title: 'Base de données', description: 'Tester et configurer la connexion aux données du dépôt.', icon: 'layers', status: 'Disponible', adminOnly: true },
  { slug: 'limites-api', title: 'Limites de requêtes API', description: 'Définir les quotas d’accès aux services de l’application.', icon: 'settings', status: 'Disponible', adminOnly: true },
  { slug: 'connexion', title: 'Tentatives de connexion', description: 'Configurer les limites et les délais de blocage à la connexion.', icon: 'users', status: 'Disponible', adminOnly: true },
  { slug: 'emplacements', title: 'Emplacements de stockage', description: 'Gérer les allées, étagères et places du dépôt.', icon: 'box', status: 'Disponible', adminOnly: false },
  { slug: 'secteurs', title: 'Secteurs de livraison', description: 'Organiser les zones de livraison et leur attribution aux clients.', icon: 'truck', status: 'Disponible', adminOnly: true },
  { slug: 'categories', title: 'Catégories d’articles', description: 'Gérer les catégories et sous-catégories du catalogue.', icon: 'clipboard', status: 'Disponible', adminOnly: true },
  { slug: 'https', title: 'Certificats HTTPS', description: 'Administrer les certificats de connexion sécurisée.', icon: 'check', status: 'Disponible', adminOnly: true },
  { slug: 'turnstile', title: 'Cloudflare Turnstile', description: 'Configurer la protection contre les connexions automatisées.', icon: 'grid', status: 'Disponible', adminOnly: true },
] as const satisfies ReadonlyArray<{
  slug: string
  title: string
  description: string
  icon: IconName
  status: 'Disponible'
  adminOnly: boolean
}>

export type ParametreSlug = (typeof PARAMETRES_SECTIONS)[number]['slug']

export function visibleParametres(role: string | undefined) {
  if (role === 'admin') return PARAMETRES_SECTIONS
  if (role === 'magasinier') return PARAMETRES_SECTIONS.filter((section) => !section.adminOnly)
  return []
}

export function parametreTitle(pathname: string): string | undefined {
  const path = pathname.replace(/\/+$/, '')
  if (path === '/parametres') return 'Paramètres'
  const section = PARAMETRES_SECTIONS.find((item) => path === `/parametres/${item.slug}`)
  return section ? `Paramètres / ${section.title}` : undefined
}
