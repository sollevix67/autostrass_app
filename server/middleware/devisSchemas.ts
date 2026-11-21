import { z } from 'zod'
import { hasCentPrecision } from '../../src/utils/venteTotals.js'
import { sanitizeCode, sanitizeText } from './sanitize.js'

const date = (label: string) => z.string({ message: `${label} est requise.` })
  .trim()
  .regex(/^[1-9]\d{3}-\d{2}-\d{2}$/, `${label} doit être au format AAAA-MM-JJ.`)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }, `${label} est invalide.`)

const reference = z.string({ message: 'La référence est requise.' })
  .transform((value, context) => {
    try {
      return sanitizeCode(value, 64, 'La référence').toUpperCase()
    } catch (error) {
      context.addIssue({ code: 'custom', message: (error as Error).message })
      return z.NEVER
    }
  })
  .pipe(z.string().min(1, 'La référence est requise.').max(64, 'La référence est trop longue.'))

const notes = z.string().transform((value, context) => {
  try {
    return sanitizeText(value, 2000, 'Les notes')
  } catch (error) {
    context.addIssue({ code: 'custom', message: (error as Error).message })
    return z.NEVER
  }
}).nullable().optional()

const version = z.number({ message: 'La version du devis est requise.' })
  .int('La version du devis est invalide.').positive('La version du devis est invalide.')
  .max(2_147_483_647, 'La version du devis est invalide.')

const line = z.object({
  reference,
  quantite: z.number({ message: 'La quantité est requise.' })
    .int('La quantité doit être entière.').min(1, 'La quantité doit être positive.')
    .max(9999, 'Maximum 9 999 unités par ligne.'),
  prixUnitaire: z.number({ message: 'Le prix HT est requis.' })
    .finite('Le prix HT doit être un nombre.').min(0, 'Le prix HT ne peut pas être négatif.')
    .max(1_000_000, 'Le prix HT est trop élevé.')
    .refine(hasCentPrecision, 'Le prix HT doit être exprimé en centimes.'),
}).strict()

const fields = {
  clientId: z.number({ message: 'Choisissez un client.' }).int().positive().max(4_294_967_295),
  dateDevis: date('La date du devis'),
  dateValidite: date('La date de validité').nullable().optional(),
  notes,
  articles: z.array(line).min(1, 'Ajoutez au moins un article.').max(200, 'Maximum 200 lignes par devis.'),
}

const validateDates = (value: { dateDevis: string; dateValidite?: string | null }, context: z.RefinementCtx) => {
  if (value.dateValidite && value.dateValidite < value.dateDevis) {
    context.addIssue({ code: 'custom', path: ['dateValidite'], message: 'La validité doit être postérieure ou égale à la date du devis.' })
  }
}

export const devisCreateSchema = z.object(fields).strict().superRefine(validateDates)

export const devisUpdateSchema = z.object({
  ...fields,
  version,
  statut: z.enum(['brouillon', 'envoyé', 'annulé'], { message: 'Le statut du devis est invalide.' }).optional(),
}).strict().superRefine(validateDates)

export const devisConversionSchema = z.object({
  version,
  dateLivraisonPrevue: date('La date de livraison prévue').nullable().optional(),
}).strict()

export const devisPdfQuerySchema = z.object({
  version: z.string().regex(/^[1-9]\d{0,9}$/, 'La version du devis est invalide.')
    .transform(Number).refine((value) => value <= 2_147_483_647, 'La version du devis est invalide.').optional(),
}).strict()
