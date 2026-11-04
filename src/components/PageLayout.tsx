import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type PageLayoutProps = {
  /** Sur-titre court affichant la section (ex: "STOCK"). */
  eyebrow: string
  title: string
  description?: string
  /** Actions a droite du titre (bouton principal, liens). */
  actions?: ReactNode
  children: ReactNode
}

/**
 * Structure commune de toutes les vues de page : sur-titre, titre,
 * description, actions puis contenu.
 *
 * Chaque vue porte son h1 ; le titre d'accueil du shell est réservé au dashboard.
 */
export function PageLayout({ eyebrow, title, description, actions, children }: PageLayoutProps) {
  return (
    <div className="page-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="heading-copy">{description}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>

      {children}

      <Link className="back-link" to="/">← Retour au dashboard</Link>
    </div>
  )
}
