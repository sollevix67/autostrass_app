import { z } from 'zod'

const integer = (min: number, max: number) => z.number({ message: 'Un nombre est requis.' }).int('Un entier est requis.').min(min).max(max)
const text = (max: number) => z.string().trim().min(1, 'Ce champ est requis.').max(max)

export const apiLimitsSchema = z.object({ maxRequests: integer(10, 100_000), windowSeconds: integer(10, 86_400) })
export const loginLimitsSchema = z.object({ maxAttempts: integer(3, 100), windowSeconds: integer(10, 86_400), blockSeconds: integer(10, 86_400) })
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
export type DatabaseSettings = z.infer<typeof databaseSettingsSchema>
export type TurnstileSettings = z.infer<typeof turnstileSettingsSchema>
export type HttpsSettings = z.infer<typeof httpsSettingsSchema>
export type Referentiel = z.infer<typeof referentielSchema> & { id: number }
export type SousCategorie = Referentiel & { categorieId: number }
