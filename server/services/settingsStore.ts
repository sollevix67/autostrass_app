import 'dotenv/config'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rename, writeFile, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { apiLimitsSchema, loginLimitsSchema, caisseSettingsSchema, DEFAULT_CAISSE_SETTINGS, databaseSettingsSchema, turnstileSettingsSchema, httpsSettingsSchema } from '../../src/schemas/parametres.js'

const storageSchema = z.object({
  api: apiLimitsSchema.default({ maxRequests: 100, windowSeconds: 900 }),
  login: loginLimitsSchema.default({ maxAttempts: 10, windowSeconds: 900, blockSeconds: 900 }),
  caisse: caisseSettingsSchema.default(DEFAULT_CAISSE_SETTINGS),
  database: databaseSettingsSchema.optional(),
  turnstile: turnstileSettingsSchema.default({ enabled: false, siteKey: '', hostnames: [] }),
  https: httpsSettingsSchema.default({ enabled: false, port: 3443, httpMode: 'serve', publicOrigin: '' }),
  updatedAt: z.string().nullable().default(null), updatedBy: z.number().nullable().default(null),
})
export type Settings = z.infer<typeof storageSchema>
export const settingsFile = resolve(process.env.AUTOSTRASS_SETTINGS_FILE ?? join(process.cwd(), 'config/runtime/settings.json'))

export function settingsError(message: string, status = 422, code = 'VALIDATION_ERROR') {
  return Object.assign(new Error(message), { status, code })
}

function readSettings(): Settings {
  if (existsSync(settingsFile)) {
    try { return storageSchema.parse(JSON.parse(readFileSync(settingsFile, 'utf8'))) }
    catch { throw new Error('Le fichier des paramètres est illisible ou invalide. Restaurez sa dernière version valide.') }
  }
  const settings = storageSchema.parse({})
  // Reprise des certificats locaux historiques, sans changer les fichiers.
  const cert = join(process.cwd(), 'config/ssl/localhost.crt')
  const key = join(process.cwd(), 'config/ssl/localhost.key')
  if (!process.env.AUTOSTRASS_SETTINGS_FILE && existsSync(cert) && existsSync(key)) {
    settings.https = { enabled: true, port: Number(process.env.HTTPS_PORT ?? 3443), httpMode: 'serve', publicOrigin: '', certificatePem: readFileSync(cert, 'utf8'), privateKeyPem: readFileSync(key, 'utf8') }
  }
  return settings
}

let current = readSettings()
export const startupSettings = structuredClone(current)
export function getSettings(): Settings { return structuredClone(current) }
let writes: Promise<unknown> = Promise.resolve()

/** Sérialise les mises à jour et publie l'état seulement après le renommage atomique. */
export function updateSettings(change: (previous: Settings) => Settings | Promise<Settings>, userId: number): Promise<Settings> {
  const operation = writes.then(async () => {
    const next = storageSchema.parse(await change(getSettings()))
    next.updatedAt = new Date().toISOString()
    next.updatedBy = userId
    const temporary = `${settingsFile}.${randomUUID()}.tmp`
    try {
      await mkdir(dirname(settingsFile), { recursive: true })
      await writeFile(temporary, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
      await rename(temporary, settingsFile)
    } catch {
      await unlink(temporary).catch(() => {})
      throw settingsError('Impossible de sauvegarder les paramètres sur le serveur.', 503, 'SETTINGS_UNAVAILABLE')
    }
    current = next
    return getSettings()
  })
  writes = operation.catch(() => {})
  return operation
}

export function effectiveDatabaseSettings() {
  return startupSettings.database ?? {
    host: process.env.DB_HOST ?? '', port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? '', user: process.env.DB_USER ?? '', password: process.env.DB_PASSWORD ?? '',
  }
}

export function publicSettings() {
  const settings = getSettings()
  const database = settings.database ?? effectiveDatabaseSettings()
  const activeDatabase = effectiveDatabaseSettings()
  const { password: _password, ...databasePublic } = database
  return {
    api: settings.api, login: settings.login, caisse: settings.caisse,
    database: { ...databasePublic, passwordConfigured: Boolean(database.password), restartRequired: JSON.stringify(database) !== JSON.stringify(activeDatabase) },
    turnstile: { enabled: settings.turnstile.enabled, siteKey: settings.turnstile.siteKey, hostnames: settings.turnstile.hostnames, secretConfigured: Boolean(settings.turnstile.secretKey) },
    updatedAt: settings.updatedAt,
  }
}
