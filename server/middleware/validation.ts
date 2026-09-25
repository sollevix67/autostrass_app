import type { Response } from 'express'

/** Resultat d'une validation de corps de requete. */
type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> }

export type ArticleBody = {
  reference: string
  designation: string
  category: string
  prixUnitaireHT: number
  quantite: number
  minimum: number
  emplacement: string
  description?: string
}

const MAX_LENGTHS = {
  reference: 64,
  designation: 255,
  category: 64,
  emplacement: 64,
} as const

function readString(source: Record<string, unknown>, key: string, max: number, required: boolean, errors: Record<string, string>): string {
  const raw = source[key]
  if (typeof raw !== 'string') {
    if (required) errors[key] = 'Champ requis.'
    return ''
  }
  const trimmed = raw.trim()
  if (required && trimmed.length === 0) {
    errors[key] = 'Valeur vide.'
    return ''
  }
  if (trimmed.length > max) {
    errors[key] = `Maximum ${max} caracteres.`
    return trimmed.slice(0, max)
  }
  return trimmed
}

function readNumber(source: Record<string, unknown>, key: string, errors: Record<string, string>, min = 0): number {
  const raw = source[key]
  const parsed = typeof raw === 'number' ? raw : Number.parseFloat(String(raw))
  if (!Number.isFinite(parsed)) {
    errors[key] = 'Nombre attendu.'
    return 0
  }
  if (parsed < min) {
    errors[key] = `Valeur minimale : ${min}.`
    return min
  }
  return Math.round(parsed * 100) / 100
}

/**
 * Valide le corps d'un article sans dependance externe.
 * Refuse les valeurs negatives, les chaines trop longues et les NaN.
 */
export function validateArticleBody(body: unknown, options: { partial?: boolean } = {}): ValidationResult<ArticleBody> {
  const errors: Record<string, string> = {}

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: { body: 'Un objet JSON est attendu.' } }
  }

  const source = body as Record<string, unknown>
  const required = !options.partial

  const value: ArticleBody = {
    reference: readString(source, 'reference', MAX_LENGTHS.reference, required, errors),
    designation: readString(source, 'designation', MAX_LENGTHS.designation, required, errors),
    category: readString(source, 'category', MAX_LENGTHS.category, required, errors),
    emplacement: readString(source, 'emplacement', MAX_LENGTHS.emplacement, required, errors),
    prixUnitaireHT: readNumber(source, 'prixUnitaireHT', errors),
    quantite: readNumber(source, 'quantite', errors),
    minimum: readNumber(source, 'minimum', errors),
  }

  const description = readString(source, 'description', 2000, false, errors)
  if (description) value.description = description

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value }
}

/** Valide un deltas d'ajustement de stock. */
export function validateDelta(body: unknown): ValidationResult<number> {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, errors: { body: 'Un objet JSON est attendu.' } }
  }
  const raw = (body as Record<string, unknown>).delta
  const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
  if (!Number.isInteger(parsed) || parsed === 0) {
    return { ok: false, errors: { delta: 'Un entier different de zero est attendu.' } }
  }
  if (Math.abs(parsed) > 100_000) {
    return { ok: false, errors: { delta: 'Ajustement trop important (max 100000).' } }
  }
  return { ok: true, value: parsed }
}

/**
 * Middleware : envoie une `ApiResponse` en cas d'erreur de validation.
 * A placer avant les handlers qui utilisent `validateArticleBody`.
 */
export function sendValidationError(response: Response, errors: Record<string, string>): void {
  response.status(422).json({
    error: 'VALIDATION_ERROR',
    message: 'Donnees invalides.',
    details: errors,
  })
}

export function notFound(response: Response, resource: string): void {
  response.status(404).json({ error: 'NOT_FOUND', message: `${resource} introuvable.` })
}

export function badRequest(response: Response, message: string): void {
  response.status(400).json({ error: 'BAD_REQUEST', message })
}
