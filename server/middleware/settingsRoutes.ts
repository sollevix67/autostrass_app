import { Router } from 'express'
import mysql from 'mysql2/promise'
import { requireAuth, requireRole, type AuthenticatedRequest } from './auth.js'
import { requireCsrf } from './csrf.js'
import { handler, parseBody } from './crud.js'
import { apiLimitsSchema, loginLimitsSchema, databaseSettingsSchema, turnstileSettingsSchema, httpsSettingsSchema, type DatabaseSettings } from '../../src/schemas/parametres.js'
import { effectiveDatabaseSettings, getSettings, publicSettings, settingsError, updateSettings } from '../services/settingsStore.js'
import { publicHttpsSettings, validateCertificate } from '../services/httpsSettings.js'
import { verifyTurnstile } from '../services/turnstile.js'

async function testDatabase(settings: DatabaseSettings) {
  let connection: Awaited<ReturnType<typeof mysql.createConnection>> | undefined
  try {
    connection = await mysql.createConnection({ ...settings, connectTimeout: 5000 })
    await connection.query({ sql: 'SELECT 1 FROM users LIMIT 1', timeout: 5000 })
    await connection.query({ sql: 'SELECT 1 FROM articles LIMIT 1', timeout: 5000 })
    await connection.query({ sql: 'SELECT sous_categorie_id FROM articles LIMIT 1', timeout: 5000 })
    await connection.query({ sql: 'SELECT secteur_id FROM clients LIMIT 1', timeout: 5000 })
    for (const table of ['categories_articles', 'sous_categories_articles', 'secteurs_livraison']) {
      await connection.query({ sql: `SELECT id, code, libelle, actif FROM ${table} LIMIT 1`, timeout: 5000 })
    }
  } catch { throw settingsError('Connexion impossible ou schéma Autostrass absent. Vérifiez les réglages et les migrations.', 422, 'DATABASE_TEST_FAILED') }
  finally { await connection?.end().catch(() => {}) }
}

const output = () => ({ ...publicSettings(), https: publicHttpsSettings() })

export function createSettingsRouter() {
  const router = Router()
  router.use(requireAuth, requireRole('admin'), requireCsrf)
  router.get('/', (_request, response) => response.json(output()))
  router.put('/api', handler(async (request, response) => {
    const values = parseBody(apiLimitsSchema, request.body)
    await updateSettings((previous) => ({ ...previous, api: values }), (request as AuthenticatedRequest).user!.id)
    response.json(output())
  }))
  router.put('/connexion', handler(async (request, response) => {
    const values = parseBody(loginLimitsSchema, request.body)
    await updateSettings((previous) => ({ ...previous, login: values }), (request as AuthenticatedRequest).user!.id)
    response.json(output())
  }))
  router.post('/base-de-donnees/test', handler(async (request, response) => {
    const values = parseBody(databaseSettingsSchema, request.body)
    await testDatabase({ ...values, password: values.password ?? getSettings().database?.password ?? effectiveDatabaseSettings().password })
    response.json({ success: true })
  }))
  router.put('/base-de-donnees', handler(async (request, response) => {
    const values = parseBody(databaseSettingsSchema, request.body)
    await updateSettings(async (previous) => {
      const database = { ...values, password: values.password ?? previous.database?.password ?? effectiveDatabaseSettings().password }
      await testDatabase(database)
      return { ...previous, database }
    }, (request as AuthenticatedRequest).user!.id)
    response.json(output())
  }))
  router.put('/https', handler(async (request, response) => {
    const values = parseBody(httpsSettingsSchema, request.body)
    if (values.port === Number(process.env.PORT ?? 3001)) throw settingsError('Le port HTTPS doit être différent du port HTTP.')
    await updateSettings((previous) => {
      const https = { ...values, certificatePem: values.certificatePem || previous.https.certificatePem, privateKeyPem: values.privateKeyPem || previous.https.privateKeyPem }
      if (https.enabled || values.certificatePem || values.privateKeyPem) validateCertificate(https)
      return { ...previous, https }
    }, (request as AuthenticatedRequest).user!.id)
    response.json(output())
  }))
  router.put('/turnstile', handler(async (request, response) => {
    const { verificationToken, ...values } = parseBody(turnstileSettingsSchema, request.body)
    await updateSettings(async (previous) => {
      const turnstile = { ...values, secretKey: values.secretKey || previous.turnstile.secretKey }
      await verifyTurnstile(turnstile, verificationToken, 'settings')
      return { ...previous, turnstile }
    }, (request as AuthenticatedRequest).user!.id)
    response.json(output())
  }))
  return router
}
