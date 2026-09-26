/**
 * Utilitaires partages par les repositories Drizzle.
 *
 * Deux pieges MariaDB dominent ici :
 * 1. `DECIMAL` est renvoye par mysql2 comme **chaine** (`'15.50'`). Le laisser
 *    passer produirait `"15.50" + 1 === "15.501"` et un JSON incoherent avec
 *    les types du frontend. On convertit systematiquement en `number`.
 * 2. `DATE` est renvoye comme `Date` UTC par mysql2 alors que la valeur stockee
 *    est une date civile. On formate en `YYYY-MM-DD` pour eviter un decalage
 *    d'un jour selon le fuseau du serveur.
 */

/** Convertit un DECIMAL MariaDB (chaine ou nombre) en `number`. */
export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number.parseFloat(String(value ?? '0'))
  return Number.isFinite(parsed) ? parsed : 0
}

/** Formate un `Date` en `YYYY-MM-DD` (date civile, sans decalage de fuseau). */
export function toDateString(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  return value.toISOString().slice(0, 10)
}

/** Formate un `Date` en ISO 8601 complet, ou chaine vide si absent. */
export function toIsoString(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return value.toISOString()
}

/** Parse un identifiant de route en entier positif, ou `null` si invalide. */
export function parseId(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Transforme une erreur mysql2 en code metier exploitable.
 * `ER_DUP_ENTRY` (1062) devient 409, `ER_ROW_IS_REFERENCED_2` (1451) 409 aussi.
 */
export function toHttpError(error: unknown): { status: number; code: string } {
  const code = typeof error === 'object' && error !== null ? (error as { code?: string }).code : undefined
  if (code === 'ER_DUP_ENTRY') return { status: 409, code: 'ALREADY_EXISTS' }
  if (code === 'ER_ROW_IS_REFERENCED_2') return { status: 409, code: 'IN_USE' }
  if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_NO_REFERENCED_ROW') {
    return { status: 422, code: 'UNKNOWN_REFERENCE' }
  }
  return { status: 500, code: 'INTERNAL_ERROR' }
}
