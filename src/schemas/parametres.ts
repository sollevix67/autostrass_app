import { z } from 'zod'
import { formatEuros } from '../options.js'
import { APP_NAME, APP_SIGNATURE } from '../branding.js'

const integer = (min: number, max: number) => z.number({ message: 'Un nombre est requis.' }).int('Un entier est requis.').min(min).max(max)
const text = (max: number) => z.string().trim().min(1, 'Ce champ est requis.').max(max)

export const apiLimitsSchema = z.object({ maxRequests: integer(10, 100_000), windowSeconds: integer(10, 86_400) })
export const loginLimitsSchema = z.object({ maxAttempts: integer(3, 100), windowSeconds: integer(10, 86_400), blockSeconds: integer(10, 86_400) })
export const DEFAULT_CAISSE_SETTINGS = { maxFondsCaisse: 10_000 }
export const caisseSettingsSchema = z.object({
  maxFondsCaisse: z.number({ message: 'Un montant est requis.' })
    .finite('Le plafond doit être un montant valide.')
    .min(0, 'Le plafond ne peut pas être négatif.')
    .max(9_999_999_999.99, 'Le plafond dépasse la capacité de stockage des montants.')
    .multipleOf(0.01, 'Le plafond doit comporter au maximum deux décimales.'),
})
export const DOCUMENTS_PDF_LIMITS = Object.freeze({
  nomEmetteur: 80,
  activite: 180,
  coordonneesLignes: 8,
  coordonneesLigne: 120,
  piedLignes: 6,
  piedLigne: 100,
  logoOctets: 256 * 1024,
  logoDimension: 1024,
})

function normalizePdfText(value: string): string {
  return value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\u2028\u2029]/g, '\n').replace(/\t/g, ' ').trim()
}

// Les retours à la ligne restent autorisés pour les coordonnées et les mentions.
// oxlint-disable-next-line no-control-regex
const forbiddenPdfCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/
const pdfText = z.string().transform(normalizePdfText).pipe(
  z.string().refine((value) => !forbiddenPdfCharacters.test(value), 'Le texte contient un caractère de contrôle non autorisé.'),
)
const pdfSingleLine = (maximum: number) => pdfText.pipe(z.string()
  .max(maximum, `${maximum} caractères maximum.`)
  .refine((value) => !value.includes('\n'), 'Saisissez le texte sur une seule ligne.'))
const pdfMultipleLines = (lines: number, columns: number) => pdfText.pipe(z.string()
  .max(lines * columns + lines - 1, `${lines} lignes de ${columns} caractères maximum.`)
  .superRefine((value, context) => {
    const parts = value.split('\n')
    if (parts.length > lines) context.addIssue({ code: 'custom', message: `${lines} lignes maximum.` })
    if (parts.some((line) => line.length > columns)) context.addIssue({ code: 'custom', message: `${columns} caractères maximum par ligne.` })
  }))

export const documentsPdfLogoSchema = z.object({
  mimeType: z.enum(['image/png', 'image/jpeg'], { message: 'Choisissez une image PNG ou JPEG.' }),
  data: z.string().min(1, 'Le logo est vide.')
    .max(Math.ceil(DOCUMENTS_PDF_LIMITS.logoOctets / 3) * 4, 'Le logo doit faire au maximum 256 Ko.')
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Le logo doit être une image encodée valide.')
    .refine((value) => value.length % 4 === 0, 'Le logo doit être une image encodée valide.')
    .refine((value) => value.length * 3 / 4 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0) <= DOCUMENTS_PDF_LIMITS.logoOctets, 'Le logo doit faire au maximum 256 Ko.'),
}).strict()

export const documentsPdfSettingsSchema = z.object({
  nomEmetteur: pdfSingleLine(DOCUMENTS_PDF_LIMITS.nomEmetteur).pipe(z.string().min(1, 'Le nom de l’émetteur est requis.')),
  activite: pdfSingleLine(DOCUMENTS_PDF_LIMITS.activite),
  coordonnees: pdfMultipleLines(DOCUMENTS_PDF_LIMITS.coordonneesLignes, DOCUMENTS_PDF_LIMITS.coordonneesLigne),
  piedCommun: pdfMultipleLines(DOCUMENTS_PDF_LIMITS.piedLignes, DOCUMENTS_PDF_LIMITS.piedLigne),
  logo: documentsPdfLogoSchema.nullable(),
}).strict()

export const DEFAULT_DOCUMENTS_PDF_SETTINGS: DocumentsPdfSettings = Object.freeze({
  nomEmetteur: APP_NAME,
  activite: APP_SIGNATURE,
  coordonnees: '',
  piedCommun: '',
  logo: null,
})
export const fondsCaisseSchema = (maxFondsCaisse: number) => z.number({ message: 'Le fond de caisse est requis.' })
  .finite('Le fond de caisse doit être un nombre valide.')
  .min(0, 'Le fond de caisse ne peut pas être négatif.')
  .max(maxFondsCaisse, `Le fond de caisse ne peut pas dépasser ${formatEuros(maxFondsCaisse)}.`)
export const databaseSettingsSchema = z.object({
  host: text(255), port: integer(1, 65535), database: text(64), user: text(128),
  password: z.string().max(1024).optional(),
})
export const turnstileSettingsSchema = z.object({
  enabled: z.boolean(), siteKey: z.string().trim().max(255), secretKey: z.string().max(255).optional(),
  hostnames: z.array(z.string().trim().toLowerCase().regex(/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|localhost)$/, 'Nom de domaine attendu.').max(253)).max(30),
  verificationToken: z.string().max(2048).optional(),
}).superRefine((value, context) => {
  if (value.enabled && (!value.siteKey || !value.hostnames.length)) context.addIssue({ code: 'custom', message: 'Une clé publique et au moins un domaine sont requis.', path: ['siteKey'] })
})
export const httpsSettingsSchema = z.object({
  enabled: z.boolean(), port: integer(1, 65535), httpMode: z.enum(['serve', 'redirect']),
  publicOrigin: z.string().trim().max(300),
  certificatePem: z.string().max(65536).optional(), privateKeyPem: z.string().max(16384).optional(),
}).superRefine((value, context) => {
  if (value.httpMode !== 'redirect') return
  try {
    const url = new URL(value.publicOrigin)
    if (!value.enabled || url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error()
  } catch {
    context.addIssue({ code: 'custom', message: 'Une origine HTTPS est requise pour la redirection (ex. https://depot.example.fr).', path: ['publicOrigin'] })
  }
})
export const referentielSchema = z.object({ code: text(64), libelle: text(128), actif: z.boolean() })
// Les catégories historiques peuvent porter un code vide ou entouré d'espaces.
// Leur code reste immuable, mais leur libellé et leur état restent administrables.
export const categorieUpdateSchema = referentielSchema.extend({ code: z.string().max(64) })
export const sousCategorieSchema = referentielSchema.extend({ categorieId: integer(1, 2_147_483_647) })
export const emplacementSchema = z.object({
  code: text(32), libelle: z.string().trim().max(128), capacite: integer(0, 2_147_483_647),
  niveau: z.enum(['allee', 'etagere', 'place']), parent_id: integer(1, 2_147_483_647).nullable(), actif: z.boolean(),
}).superRefine((value, context) => {
  if ((value.niveau === 'allee') !== (value.parent_id === null)) context.addIssue({ code: 'custom', message: 'Choisissez un parent pour une étagère ou une place ; une allée reste à la racine.', path: ['parent_id'] })
})

export type ApiLimits = z.infer<typeof apiLimitsSchema>
export type LoginLimits = z.infer<typeof loginLimitsSchema>
export type CaisseSettings = z.infer<typeof caisseSettingsSchema>
export type DocumentsPdfSettings = z.infer<typeof documentsPdfSettingsSchema>
export type DocumentsPdfLogo = z.infer<typeof documentsPdfLogoSchema>
export type DatabaseSettings = z.infer<typeof databaseSettingsSchema>
export type TurnstileSettings = z.infer<typeof turnstileSettingsSchema>
export type HttpsSettings = z.infer<typeof httpsSettingsSchema>
export type Referentiel = z.infer<typeof referentielSchema> & { id: number }
export type SousCategorie = Referentiel & { categorieId: number }
