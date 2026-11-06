/** Recette sur MariaDB jetable ; --all exécute aussi les suites API/sécurité. */
import { deepEqual, equal, ok } from 'node:assert/strict'
import type { RowDataPacket } from 'mysql2/promise'
import type { ApiClient } from '../src/services/contracts.js'
import { clientSchema, clientUpdateSchema } from '../src/schemas/index.js'
import { createTestEnvironment } from './lib/test-environment.js'

const environment = await createTestEnvironment()
const { baseUrl, connection } = environment
type Session = { cookie: string; csrf: string }
let scenarios = 0
const client = { nom: 'Numéro', prenom: 'Test', telephone: '0388000011', email: 'numero@example.test', adresse: '1 rue du Test', ville: 'Strasbourg', codePostal: '67000', type: 'particulier' }
function passed(label: string) { scenarios++; console.log(`  OK   ${label}`) }

async function login(email: string): Promise<Session> {
  const response = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, motDePasse: 'demo1234' }) })
  equal(response.status, 200)
  const cookie = response.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ')
  const csrf = cookie.match(/autostrass_csrf=([^;]+)/)?.[1]
  ok(csrf)
  return { cookie, csrf: decodeURIComponent(csrf) }
}

try {
  const admin = await login('marie.laurent@autostrass.fr')
  const magasinier = await login('karim.moreau@autostrass.fr')
  const caissier = await login('sophie.bernard@autostrass.fr')
  async function call(method: string, path: string, body?: unknown, session: Session | null = admin, csrf = true) {
    const response = await fetch(`${baseUrl}/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(session ? { cookie: session.cookie, ...(csrf ? { 'x-csrf-token': session.csrf } : {}) } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    return { status: response.status, body: await response.json() as ApiClient & { error?: string } }
  }
  const manual = await call('POST', '/clients', { ...client, numeroClient: '  000042  ' })
  equal(manual.status, 201)
  equal(manual.body.numeroClient, '000042')
  const manualPath = `/clients/${manual.body.id}`
  equal((await call('GET', '/clients/numero/000042')).body.id, manual.body.id)
  passed('Création avec numéro personnalisé, espaces de bord retirés et zéros conservés')

  for (const input of [client, { ...client, numeroClient: '' }, { ...client, numeroClient: '  ' }]) {
    const result = await call('POST', '/clients', input)
    equal(result.status, 201)
    ok(/^CLI-\d{4,}$/.test(result.body.numeroClient))
  }
  passed('Génération automatique si numéro absent ou vide à la création')

  equal((await call('PUT', manualPath, { numeroClient: 'PRO/2026-0042' })).status, 200)
  equal((await call('GET', manualPath)).body.numeroClient, 'PRO/2026-0042')
  equal((await call('GET', `/clients/numero/${encodeURIComponent('PRO/2026-0042')}`)).body.id, manual.body.id)
  equal((await call('GET', '/clients/numero/000042')).status, 404)
  equal((await call('PUT', manualPath, { ville: 'Colmar' })).body.numeroClient, 'PRO/2026-0042')
  passed('Modification/relecture/recherche et conservation du numéro lors des mises à jour partielles')

  const other = await call('POST', '/clients', { ...client, numeroClient: 'PRO-UNIQUE' })
  equal(other.status, 201)
  const duplicateCreate = await call('POST', '/clients', { ...client, numeroClient: 'pro-unique' })
  equal(duplicateCreate.status, 409)
  equal(duplicateCreate.body.error, 'CLIENT_NUMBER_EXISTS')
  const duplicateUpdate = await call('PUT', manualPath, { numeroClient: 'PRO-UNIQUE', nom: 'À ne pas sauvegarder' })
  equal(duplicateUpdate.status, 409)
  equal(duplicateUpdate.body.error, 'CLIENT_NUMBER_EXISTS')
  const unchanged = (await call('GET', manualPath)).body
  equal(unchanged.numeroClient, 'PRO/2026-0042')
  equal(unchanged.nom, client.nom)
  passed('Doublons refusés sans modification partielle, y compris les différences de casse')

  for (const numeroClient of [null, 42, 'A'.repeat(33), '<script>', 'NUM AVEC ESPACE']) {
    equal((await call('POST', '/clients', { ...client, numeroClient })).status, 422)
    equal((await call('PUT', manualPath, { numeroClient })).status, 422)
  }
  for (const numeroClient of ['', ' ', '\u200b']) equal((await call('PUT', manualPath, { numeroClient })).status, 422)
  equal((await call('PUT', manualPath, { numeroClient: 'N'.repeat(32) })).status, 200)
  ok(clientSchema.safeParse({ ...client, numeroClient: '' }).success)
  ok(!clientUpdateSchema.safeParse({ ...client, numeroClient: '' }).success)
  ok(!clientSchema.safeParse({ ...client, numeroClient: 'A'.repeat(33) }).success)
  passed('Validation de longueur, format, type et numéro obligatoire en modification')

  equal((await call('PUT', manualPath, { numeroClient: 'REFUSE' }, null)).status, 401)
  equal((await call('PUT', manualPath, { numeroClient: 'REFUSE' }, caissier)).status, 403)
  equal((await call('PUT', manualPath, { numeroClient: 'REFUSE' }, admin, false)).body.error, 'CSRF_INVALID')
  equal((await call('POST', '/clients', { ...client, numeroClient: 'REFUSE' }, caissier)).status, 403)
  equal((await call('PUT', manualPath, { numeroClient: 'MAG-0042', id: 999999 }, magasinier)).body.id, manual.body.id)
  equal((await call('GET', manualPath)).body.numeroClient, 'MAG-0042')
  passed('Authentification, CSRF et droits ; identifiant interne non modifiable')

  async function related(id: number) {
    const result: Record<string, RowDataPacket[]> = {}
    for (const table of ['commandes', 'ventes', 'retours']) {
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${table} WHERE client_id = ? ORDER BY id`, [id])
      result[table] = rows
    }
    return result
  }
  for (const numero of ['CLI-0001', 'CLI-0002']) {
    const existing = (await call('GET', `/clients/numero/${numero}`)).body
    const before = await related(existing.id)
    ok(Object.values(before).some((rows) => rows.length > 0))
    equal((await call('PUT', `/clients/${existing.id}`, { numeroClient: `REN-${numero}` })).status, 200)
    deepEqual(await related(existing.id), before)
    equal((await call('PUT', `/clients/${existing.id}`, { numeroClient: numero })).status, 200)
  }
  passed('Commandes, ventes, retours et données fiscales inchangés lors du changement de numéro')

  await connection.query('ALTER TABLE clients AUTO_INCREMENT = 1000')
  const reserved = await call('POST', '/clients', { ...client, numeroClient: 'CLI-1001' })
  equal(reserved.body.id, 1000)
  const generated = await call('POST', '/clients', client)
  equal(generated.status, 201)
  equal(generated.body.id, 1001)
  equal(generated.body.numeroClient, 'CLI-1002')
  equal((await call('GET', `/clients/${reserved.body.id}`)).body.numeroClient, 'CLI-1001')
  passed('Génération automatique passe un numéro déjà attribué manuellement')

  const concurrent = await Promise.all(Array.from({ length: 5 }, () => call('POST', '/clients', client)))
  ok(concurrent.every((result) => result.status === 201))
  equal(new Set(concurrent.map((result) => result.body.numeroClient)).size, concurrent.length)
  const competing = await Promise.all([call('POST', '/clients', { ...client, numeroClient: 'CONCURRENT' }), call('POST', '/clients', { ...client, numeroClient: 'CONCURRENT' })])
  deepEqual(competing.map((result) => result.status).sort(), [201, 409])
  const competingUpdates = await Promise.all(concurrent.slice(0, 2).map((result) => call('PUT', `/clients/${result.body.id}`, { numeroClient: 'CONCURRENT-UPDATE' })))
  deepEqual(competingUpdates.map((result) => result.status).sort(), [200, 409])
  passed('Créations automatiques et numéros personnalisés uniques sous concurrence')

  await connection.query("CREATE TRIGGER test_client_number_failure BEFORE UPDATE ON clients FOR EACH ROW BEGIN IF NEW.nom = 'NumberRollback' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Echec de generation simule'; END IF; END")
  try {
    equal((await call('POST', '/clients', { ...client, nom: 'NumberRollback' })).status, 500)
    const [rows] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM clients WHERE nom = 'NumberRollback' OR numero_client LIKE 'TMP-%'")
    equal(Number(rows[0].total), 0)
  } finally {
    await connection.query('DROP TRIGGER test_client_number_failure')
  }
  passed('Échec de génération : transaction annulée, aucun client ou numéro temporaire résiduel')

  if (process.argv.includes('--all')) {
    await environment.runScript('scripts/test-api.ts')
    await environment.runScript('scripts/test-security.ts')
  }
  console.log(`${scenarios} scénarios numéros client réussis.`)
} finally {
  await environment.close()
}
