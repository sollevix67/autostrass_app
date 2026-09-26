/**
 * Bandeaux d'etat communs aux vues branchees sur l'API.
 *
 * Les sept modules deposes sur l'API partagent les memes trois situations :
 * une erreur a afficher, une API injoignable (mode degrade local), ou des
 * droits insuffisants pour ecrire. Les factoriser ici evite que l'un des
 * modules oublie le bandeau de mode degrade — c'est-a-dire affiche des
 * donnees de demonstration en laissant croire qu'elles sont enregistrees.
 *
 * Aucune donnee metier ici : ce composant ne connait que l'affichage, ce qui
 * le laisse reutilisable par les vues futures (devis, fournisseurs).
 */

import type { ReactNode } from 'react'
import { Icon } from './Icon'

type ResourceBannersProps = {
  /** Message d'erreur metier, ou `null`. */
  error: string | null
  /** `true` quand l'API est injoignable et que les ecritures restent locales. */
  offline: boolean
  /**
   * Metier d'ecriture de la vue. `null` quand l'utilisateur a les droits :
   * aucun bandeau de lecture seule n'est alors affiche.
   */
  readOnly: string | null
  /** Metier a nommer dans le bandeau de mode degrade. */
  resource?: string
}

/**
 * Bandeaux d'etat d'une vue de ressource.
 *
 * `role="alert"` sur l'erreur : le message est annonce aussitot. Le mode
 * degrade est en `role="status"` : c'est une information, pas une panne, et il
 * ne doit pas interrompre la navigation au clavier.
 */
export function ResourceBanners({ error, offline, readOnly, resource = 'donnees' }: ResourceBannersProps) {
  return (
    <>
      {offline && (
        <p className="info-banner" role="status">
          API {resource} indisponible : affichage local uniquement, les modifications ne sont pas
          enregistrees.
        </p>
      )}
      {error !== null && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {readOnly !== null && (
        <p className="info-banner" role="note">
          <Icon name="alert" size="sm" /> {readOnly}
        </p>
      )}
    </>
  )
}

type EditableCardProps = {
  /** `true` si l'utilisateur peut ecrire : sinon le formulaire est masque. */
  canEdit: boolean
  /** Message affiche quand l'utilisateur ne peut pas ecrire. */
  readOnly: string
  title: string
  children: ReactNode
}

/**
 * Carte de formulaire masquee aux utilisateurs sans droits d'ecriture.
 *
 * Le formulaire disparait plutot que d'etre desactive champ par champ : un
 * formulaire visible et inutilisable donne l'impression d'un bug. Le
 * permission d'afficher l'information utile (la liste) est preservee par la
 * vue.
 */
export function EditableCard({ canEdit, readOnly, title, children }: EditableCardProps) {
  if (!canEdit) {
    return (
      <p className="info-banner" role="note">
        <Icon name="alert" size="sm" /> {readOnly}
      </p>
    )
  }

  return (
    <section className="form-card">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
