/** SIRET des clients professionnels sur MariaDB jetable ; --all ajoute API/sécurité. */
import { deepEqual, equal, ok } from 'node:assert/strict'
import type { RowDataPacket } from 'mysql2/promise'
import { clientSchema, clientUpdateSchema } from '../src/schemas/index.js'
import { clientBodySchema, clientPatchSchema } from '../server/middleware/schemas.js'
import type { ApiClient } from '../src/services/contracts.js'
import { createTestEnvironment } from './lib/test-environment.js'

const client = { numeroClient: '', nom: 'SIRET', prenom: 'Test', telephone: '0388000011', email: 'siret@example.test', adresse: '1 rue du Test', ville: 'Strasbourg', codePostal: '67000', type: 'professionnel' }
const siret = '01234567890123'
let scenarios = 0
function passed(label: string) { scenarios++; console.log(`  OK   ${label}`) }

for (const value of [undefined, '', '  ', siret, ` ${siret} `]) {
  const form = clientSchema.parse({ ...client, siret: value })
  equal(clientBodySchema.parse(form).siret, value === undefined ? undefined : value.trim() || null)
  ok(clientUpdateSchema.safeParse({ ...client, numeroClient: '000042', siret: value }).success)
}
for (const value of ['0123456789012', '012345678901234', '0123456789012A', '012 345 678 90123', '０１２３４５６７８９０１２３', 12345678901234]) {
  ok(!clientSchema.safeParse({ ...client, siret: value }).success)
  ok(!clientUpdateSchema.safeParse({ ...client, numeroClient: '000042', siret: value }).success)
  ok(!clientBodySchema.safeParse({ ...client, siret: value }).success)
}
ok(clientSchema.safeParse({ ...client, type: 'particulier', siret: 'saisie masquée' }).success)
deepEqual(clientPatchSchema.parse({ ville: 'Colmar' }), { ville: 'Colmar' })
passed('Validation conditionnelle du formulaire, formats et contrats partiels API')

const environment = await createTestEnvironment()
type Session = { cookie: string; csrf: string }
async function login(email: string): Promise<Session> {
  const response = await fetch(`${environment.baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, motDePasse: 'demo1234' }) })
  equal(response.status, 200)
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  const csrf = cookie.match(/autostrass_csrf=([^;]+)/)?.[1]
  ok(csrf)
  return { cookie, csrf: decodeURIComponent(csrf) }
}

try {
  const admin = await login('marie.laurent@autostrass.fr')
  const magasinier = await login('karim.moreau@autostrass.fr')
  const caissier = await login('sophie.bernard@autostrass.fr')
  async function call(method: string, path: string, body?: unknown, session: Session | null = admin, csrf = true) {
    const response = await fetch(`${environment.baseUrl}/api/clients${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(session ? { cookie: session.cookie, ...(csrf ? { 'x-csrf-token': session.csrf } : {}) } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    return { status: response.status, body: await response.json() as ApiClient & { error?: string; details?: Record<string, string> } }
  }

  for (const value of [undefined, '', '  ', null]) {
    const created = await call('POST', '', { ...client, siret: value })
    equal(created.status, 201)
    equal(created.body.siret, null)
    ok(/^[0-9]{6}$/.test(created.body.numeroClient))
  }
  passed('Professionnels sans SIRET acceptés, numéro automatique conservé')

  const created = await call('POST', '', { ...client, siret: ` ${siret} ` }, magasinier)
  equal(created.status, 201)
  equal(created.body.siret, siret)
  const path = `/${created.body.id}`
  const [stored] = await environment.connection.query<RowDataPacket[]>('SELECT siret FROM clients WHERE id = ?', [created.body.id])
  equal(stored[0].siret, siret)
  equal((await call('GET', path)).body.siret, siret)
  passed('Création professionnelle avec SIRET, zéros initiaux conservés en base et à la relecture')

  equal((await call('PUT', path, { ville: 'Colmar' })).body.siret, siret)
  equal((await call('PUT', path, { siret: '00123456789012' })).body.siret, '00123456789012')
  equal((await call('GET', path)).body.numeroClient, created.body.numeroClient)
  passed('SIRET seul modifiable, omis conservé et numéro client inchangé')

  for (const value of ['', '  ', null]) {
    equal((await call('PUT', path, { siret })).status, 200)
    equal((await call('PUT', path, { siret: value })).body.siret, null)
  }
  passed('Effacement explicite par chaîne vide, espaces ou null')

  equal((await call('PUT', path, { siret })).body.siret, siret)
  equal((await call('PUT', path, { type: 'particulier' })).body.siret, null)
  equal((await call('PUT', path, { siret })).body.siret, null)
  equal((await call('PUT', path, { type: 'professionnel' })).body.siret, null)
  equal((await call('PUT', path, { type: 'professionnel', siret })).body.siret, siret)
  const particular = await call('POST', '', { ...client, type: 'particulier', siret })
  equal(particular.status, 201)
  equal(particular.body.siret, null)
  passed('Changements de type cohérents ; aucun SIRET stocké pour un particulier')

  const before = (await call('GET', path)).body
  for (const value of ['123', '012345678901234', '0123456789012A', 12345678901234]) {
    const invalid = await call('PUT', path, { nom: 'Ne pas enregistrer', siret: value })
    equal(invalid.status, 422)
    ok(invalid.body.details?.siret)
    equal((await call('POST', '', { ...client, siret: value })).status, 422)
  }
  deepEqual((await call('GET', path)).body, before)
  passed('Refus détaillés des SIRET invalides sans écriture partielle')

  const concurrent = await Promise.all([
    call('PUT', path, { type: 'particulier' }),
    call('PUT', path, { siret: '00123456789012' }),
  ])
  for (const result of concurrent) equal(result.status, 200)
  const after = (await call('GET', path)).body
  equal(after.type, 'particulier')
  equal(after.siret, null)
  passed('Écritures concurrentes type/SIRET : particulier toujours sans SIRET')

  equal((await call('POST', '', { ...client, siret }, null)).status, 401)
  equal((await call('PUT', path, { type: 'professionnel', siret }, caissier)).status, 403)
  equal((await call('PUT', path, { siret }, admin, false)).body.error, 'CSRF_INVALID')
  equal((await call('PUT', path, { type: 'professionnel', siret }, magasinier)).body.siret, siret)
  passed('Authentification, CSRF et droits admin/magasinier/caissier conservés')

  if (process.argv.includes('--all')) {
    await environment.runScript('scripts/test-api.ts')
    await environment.runScript('scripts/test-security.ts')
  }
  console.log(`${scenarios} scénarios SIRET client réussis.`)
} finally {
  await environment.close()
}
