/**
 * Utilitaires de narrowing pour les champs `select` du formulaire.
 *
 * Un `<select>` renvoie toujours une chaîne ; on ne peut donc pas affecter
 * directement `event.target.value` a un type union. `pickEnum` valide
 * l'appartenance à l'union et évite les casts `as` non vérifiés.
 */
export function pickEnum<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

/** Valide qu'une chaîne est un nombre fini, sinon renvoie `fallback`. */
export function toNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
