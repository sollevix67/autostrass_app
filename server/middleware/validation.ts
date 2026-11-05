import type { Response } from 'express'

/** Resultat d'une validation de corps de requete. */
type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> }

export type ArticleBody = {
  tvaId?: number
  ean13?: string | null
  delaiDisponibilite?: number
  forcerSurCommande?: boolean
  sousCategorieId?: number | null
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

/** Donnees attendues pour creer un emplacement. */
export type EmplacementBody = {
  niveau: 'allee' | 'etagere' | 'place'
  parent_id: number | null
  code: string
  libelle?: string | null
  capacite: number
}

/** Donnees attendues pour mettre a jour un emplacement. */
export type EmplacementPatch = {
  code?: string
  libelle?: string | null
  capacite?: number
  actif?: boolean
}

/** Donnees pour un transfert d'article entre emplacements. */
export type TransfertBody = {
  source_emplacement_id?: number | null
  emplacement_id: number | null
  quantite: number
  motif?: string | null
}

const MAX_LENGTHS_EMPLACEMENT = {
  code: 32,
  libelle: 128,
} as const

type Niveau = 'allee' | 'etagere' | 'place'

function readNiveau(value: unknown): Niveau | null {
  if (typeof value !== 'string') return null
  if (value !== 'allee' && value !== 'etagere' && value !== 'place') return null
  return value
}

/**
 * Valide le corps d'un emplacement a la creation.
 */
export function validateEmplacementBody(body: unknown): ValidationResult<EmplacementBody> {
  const errors: Record<string, string> = {}

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: { body: 'Un objet JSON est attendu.' } }
  }

  const source = body as Record<string, unknown>

  const niveau = readNiveau(source['niveau'])
  if (!niveau) errors['niveau'] = "Niveau invalide ('allee', 'etagere' ou 'place')."

  const parentIdRaw = source['parent_id']
  let parentId: number | null = null
  if (niveau === 'etagere' || niveau === 'place') {
    if (typeof parentIdRaw !== 'number' || !Number.isInteger(parentIdRaw) || parentIdRaw < 1) {
      errors['parent_id'] = 'Parent requis.'
    } else {
      parentId = parentIdRaw
    }
  }

  const code = readString(source, 'code', MAX_LENGTHS_EMPLACEMENT.code, true, errors)
  const libelle = readString(source, 'libelle', MAX_LENGTHS_EMPLACEMENT.libelle, false, errors) || null

  const capacite = readNumber(source, 'capacite', errors, 0)

  if (niveau === null) {
    errors['niveau'] = "Niveau invalide ('allee', 'etagere' ou 'place')."
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, value: { niveau: niveau!, parent_id: parentId, code, libelle, capacite } }
}

/**
 * Valide le corps d'une mise a jour partielle d'emplacement.
 */
export function validateEmplacementPatch(body: unknown): ValidationResult<EmplacementPatch> {
  const errors: Record<string, string> = {}
  const result: EmplacementPatch = {}

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: { body: 'Un objet JSON est attendu.' } }
  }

  const source = body as Record<string, unknown>

  if ('code' in source) {
    const code = readString(source, 'code', MAX_LENGTHS_EMPLACEMENT.code, true, errors)
    if (code) result.code = code
  }
  if ('libelle' in source) {
    result.libelle = readString(source, 'libelle', MAX_LENGTHS_EMPLACEMENT.libelle, false, errors) || null
  }
  if ('capacite' in source) {
    result.capacite = readNumber(source, 'capacite', errors, 0)
  }
  if ('actif' in source) {
    result.actif = typeof source['actif'] === 'boolean' ? source['actif'] : undefined
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, value: result }
}

/**
 * Valide le corps d'un transfert d'article entre emplacements.
 */
export function validateTransfertBody(body: unknown): ValidationResult<TransfertBody> {
  const errors: Record<string, string> = {}

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: { body: 'Un objet JSON est attendu.' } }
  }

  const source = body as Record<string, unknown>

  // Une destination nulle explicite prime sur l'alias historique.
  const emplacementIdRaw = Object.hasOwn(source, 'emplacement_id')
    ? source['emplacement_id']
    : source['destination_id']
  const readEmplacementId = (value: unknown, key: string): number | null => {
    if (value === null) return null
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 4_294_967_295) {
      errors[key] = 'Un identifiant d emplacement entier positif ou null est attendu.'
      return null
    }
    return value
  }
  const emplacementId = readEmplacementId(emplacementIdRaw, 'emplacement_id')
  const sourceEmplacementId = Object.hasOwn(source, 'source_emplacement_id')
    ? readEmplacementId(source['source_emplacement_id'], 'source_emplacement_id')
    : undefined
  const quantite = source['quantite']
  if (typeof quantite !== 'number' || !Number.isInteger(quantite) || quantite < 1 || quantite > 2_147_483_647) {
    errors['quantite'] = 'Une quantite entiere comprise entre 1 et 2147483647 est attendue.'
  }
  if (source['motif'] !== undefined && source['motif'] !== null && typeof source['motif'] !== 'string') {
    errors['motif'] = 'Texte attendu.'
  }
  const motif = readString(source, 'motif', 255, false, errors) || null

  if (Object.keys(errors).length > 0 || typeof quantite !== 'number') {
    return { ok: false, errors }
  }

  return { ok: true, value: { source_emplacement_id: sourceEmplacementId, emplacement_id: emplacementId, quantite, motif } }
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
    emplacement: readString(source, 'emplacement', MAX_LENGTHS.emplacement, false, errors),
    prixUnitaireHT: readNumber(source, 'prixUnitaireHT', errors),
    quantite: readNumber(source, 'quantite', errors),
    minimum: readNumber(source, 'minimum', errors),
  }

  const description = readString(source, 'description', 2000, false, errors)
  for (const key of ['tvaId', 'delaiDisponibilite'] as const) {
    if (key in source) {
      const number = source[key]
      if (typeof number !== 'number' || !Number.isInteger(number) || number < (key === 'tvaId' ? 1 : 0)) errors[key] = 'Un entier valide est attendu.'
      else value[key] = number
    }
  }
  if ('ean13' in source) {
    if (source.ean13 !== null && (typeof source.ean13 !== 'string' || !/^\d{0,16}$/.test(source.ean13))) errors.ean13 = 'Code EAN invalide.'
    else value.ean13 = (source.ean13 || null) as string | null
  }
  if ('forcerSurCommande' in source) {
    if (typeof source.forcerSurCommande !== 'boolean') errors.forcerSurCommande = 'Une valeur booléenne est attendue.'
    else value.forcerSurCommande = source.forcerSurCommande
  }
  if ('sousCategorieId' in source) {
    const subId = source.sousCategorieId
    if (subId !== null && (typeof subId !== 'number' || !Number.isInteger(subId) || subId <= 0)) errors.sousCategorieId = 'Identifiant de sous-catégorie invalide.'
    else value.sousCategorieId = subId as number | null
  }
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
