/**
 * Genere un identifiant de ligne stable pour les listes dynamiques
 * (lignes de reception, panier de vente comptoir, etc.).
 *
 * Pourquoi pas `key={index}` : l'index bouge des qu'un element est supprime
 * au milieu de la liste, ce qui fait reattribuer l'etat React (focus,
 * saisie en cours) au mauvais element.
 */
export function createLineId(prefix = 'line'): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${random}`
}

/**
 * Genere un identifiant sequentiel du type `L-004` a partir d'un prefixe
 * et du nombre d'elements deja presents.
 *
 * Reserve au mode local (donnees non persistes). Cote API, l'identifiant
 * est genere par la base.
 */
export function nextId(prefix: string, currentCount: number, pad = 3): string {
  return `${prefix}-${String(currentCount + 1).padStart(pad, '0')}`
}
