/** Recette fournisseurs sur une base jetable ; --all ajoute API et sécurité. */
import { deepEqual, equal, ok } from 'node:assert/strict'
import type { ApiFournisseur } from '../src/services/contracts.js'
import { fournisseurSchema } from '../src/schemas/index.js'
import { fournisseurBodySchema, fournisseurPatchSchema, clientBodySchema } from '../server/middleware/schemas.js'
import { createTestEnvironment } from './lib/test-environment.js'

const empty = { nom: 'Fournisseur minimal', code: '', email: '', telephone: '', adresse: '', ville: '', codePostal: '', delaiLivraison: 0, modeLivraison: 'livraison', actif: true }
const optionalFields = ['code', 'email', 'telephone', 'adresse', 'ville', 'codePostal'] as const
const full = { ...empty, nom: 'Fournisseur complet', code: 'FOUR/01', email: 'contact@example.test', telephone: '+33 (0)3 88 00 00 00', adresse: '1 rue du Test', ville: 'Strasbourg', codePostal: '67000', delaiLivraison: 3, modeLivraison: 'express' }
let scenarios = 0
function passed(label: string) { scenarios++; console.log(`  OK   ${label}`) }

for (const value of ['', '  ']) {
  const values = { ...empty, ...Object.fromEntries(optionalFields.map((field) => [field, value])) }
  const parsed = fournisseurSchema.parse(values)
  const body = fournisseurBodySchema.parse(JSON.parse(JSON.stringify(parsed)))
  for (const field of optionalFields) equal(body[field], null)
}
passed('Formulaire minimal : tous les champs facultatifs vides ou espacés sont acceptés par l’API')
deepEqual(fournisseurPatchSchema.parse({ nom: 'Renommé' }), { nom: 'Renommé' })
for (const telephone of ['0388000011', '03 88 00 00 11', '+33 (0)3 88 00 00 00', '03.88.00.00.11', '03-88-00-00-11']) {
  const values = { ...full, telephone }
  equal(fournisseurBodySchema.parse(fournisseurSchema.parse(values)).telephone, telephone)
  ok(clientBodySchema.safeParse({ ...values, numeroClient: '123456', prenom: 'Test', type: 'particulier' }).success)
}
passed('Formats téléphoniques usuels acceptés ; mises à jour partielles sans effacement implicite')

for (const [field, value] of [
  ['nom', ''], ['email', 'invalide'], ['telephone', '03AB000011'], ['telephone', '03+88000011'],
  ['code', 'CODE AVEC ESPACE'], ['codePostal', 'ABC'], ['delaiLivraison', -1], ['delaiLivraison', 1.5],
  ['delaiLivraison', 2147483648], ['adresse', 'x'.repeat(256)], ['ville', 'x'.repeat(65)],
] as const) {
  const input = { ...full, [field]: value }
  ok(!fournisseurSchema.safeParse(input).success, `Formulaire ${field}`)
  ok(!fournisseurBodySchema.safeParse(input).success, `API ${field}`)
}
passed('Valeurs renseignées invalides rejetées par le formulaire et l’API')

const environment = await createTestEnvironment()
const { baseUrl } = environment
type Session = { cookie: string; csrf: string }
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
    const response = await fetch(`${baseUrl}/api/fournisseurs${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(session ? { cookie: session.cookie, ...(csrf ? { 'x-csrf-token': session.csrf } : {}) } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    return { status: response.status, body: response.status === 204 ? null : await response.json() as ApiFournisseur & { error?: string; details?: Record<string, string> } }
  }

  const minimal = await call('POST', '', fournisseurSchema.parse(empty))
  equal(minimal.status, 201)
  const minimalPath = `/${minimal.body!.id}`
  for (const field of optionalFields) equal((await call('GET', minimalPath)).body![field], null)
  passed('Création réelle depuis le formulaire minimal et relecture des champs null')

  const omitted = await call('POST', '', { nom: 'Fournisseur sans coordonnées' }, magasinier)
  equal(omitted.status, 201)
  equal(omitted.body!.delaiLivraison, 0)
  equal(omitted.body!.modeLivraison, 'livraison')
  equal(omitted.body!.actif, true)
  const rawEmpty = await call('POST', '', { ...empty, nom: 'Fournisseur chaînes vides' })
  equal(rawEmpty.status, 201)
  passed('Création API avec champs omis ou chaînes vides, valeurs par défaut conservées')

  const created = await call('POST', '', fournisseurSchema.parse(full))
  equal(created.status, 201)
  const path = `/${created.body!.id}`
  for (const field of optionalFields) equal(created.body![field], full[field])
  equal((await call('PUT', path, { nom: 'Fournisseur renommé' })).status, 200)
  const afterName = (await call('GET', path)).body!
  for (const field of optionalFields) equal(afterName[field], full[field])
  passed('Création complète et mise à jour partielle préservant les coordonnées')

  for (const blank of ['', null, '  ']) {
    equal((await call('PUT', path, full)).status, 200)
    const cleared = Object.fromEntries(optionalFields.map((field) => [field, blank]))
    equal((await call('PUT', path, cleared)).status, 200)
    const reloaded = (await call('GET', path)).body!
    for (const field of optionalFields) equal(reloaded[field], null)
  }
  passed('Effacement explicite des coordonnées par chaîne vide, espaces ou null')

  const before = (await call('GET', path)).body!
  for (const [field, value] of [['email', 'invalide'], ['telephone', 'abc123'], ['code', 'CODE AVEC ESPACE'], ['codePostal', 'ABC'], ['delaiLivraison', 1.5], ['nom', '']] as const) {
    const invalid = await call('PUT', path, { nom: 'Ne pas enregistrer', [field]: value })
    equal(invalid.status, 422)
    equal(invalid.body!.error, 'VALIDATION_ERROR')
    ok(invalid.body!.details?.[field])
    deepEqual((await call('GET', path)).body, before)
  }
  equal((await call('POST', '', { ...empty, email: 'invalide' })).status, 422)
  equal((await call('POST', '', { ...empty, nom: '<script>alert(1)</script>' })).status, 422)
  passed('Refus 422 détaillés sans écriture partielle ; protection contre le markup conservée')

  equal((await call('POST', '', full)).status, 409)
  equal((await call('POST', '', empty, null)).status, 401)
  equal((await call('POST', '', empty, caissier)).status, 403)
  equal((await call('PUT', path, { nom: 'Interdit' }, caissier)).status, 403)
  equal((await call('POST', '', empty, admin, false)).body!.error, 'CSRF_INVALID')
  equal((await call('PUT', path, { nom: 'Magasinier autorisé' }, magasinier)).status, 200)
  passed('Doublons, authentification, CSRF et droits admin/magasinier/caissier')

  if (process.argv.includes('--all')) {
    await environment.runScript('scripts/test-api.ts')
    await environment.runScript('scripts/test-security.ts')
  }
  console.log(`\n${scenarios} scénarios fournisseurs réussis.`)
} finally {
  await environment.close()
}
