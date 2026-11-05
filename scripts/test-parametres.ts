import { equal, ok, deepEqual } from 'node:assert/strict'
import { createServer } from 'node:net'
import { get as httpsGet } from 'node:https'
import selfsigned from 'selfsigned'
import { createTestEnvironment } from './lib/test-environment.js'
import type { publicSettings } from '../server/services/settingsStore.js'
import type { publicHttpsSettings } from '../server/services/httpsSettings.js'
import type { Referentiel, SousCategorie } from '../src/schemas/parametres.js'

const environment = await createTestEnvironment()
const { baseUrl } = environment
type ApiParametres = ReturnType<typeof publicSettings> & { https: ReturnType<typeof publicHttpsSettings> }
type Session = { cookie: string; csrf: string }
let checks = 0
function pass(label: string) { checks++; console.log(`OK ${label}`) }
async function login(email: string): Promise<Session> {
  const response = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, motDePasse: 'demo1234' }) })
  equal(response.status, 200)
  const data = await response.json() as { csrfToken: string }
  return { cookie: response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; '), csrf: data.csrfToken }
}
async function call<T = Record<string, unknown>>(path: string, session?: Session, method = 'GET', body?: unknown, csrf = true) {
  const response = await fetch(`${baseUrl}/api${path}`, { method, headers: { ...(session ? { cookie: session.cookie, ...(csrf ? { 'x-csrf-token': session.csrf } : {}) } : {}), 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) })
  const content = await response.text()
  return { status: response.status, data: (content ? JSON.parse(content) : null) as T }
}
try {
  const admin = await login('marie.laurent@autostrass.fr')
  const magasinier = await login('karim.moreau@autostrass.fr')
  const caissier = await login('sophie.bernard@autostrass.fr')
  equal((await call('/tva')).status, 401)
  const taxes = await call<Array<{ id: number; taux: number }>>('/tva', magasinier)
  equal(taxes.status, 200)
  ok(taxes.data.some((tax) => tax.id === 1 && tax.taux === 20))
  equal((await call('/parametres')).status, 401)
  for (const session of [magasinier, caissier]) {
    equal((await call('/parametres', session)).status, 403)
    equal((await call('/categories', session, 'POST', { code: 'X', libelle: 'X', actif: true })).status, 403)
    equal((await call('/secteurs', session, 'POST', { code: 'X', libelle: 'X', actif: true })).status, 403)
    equal((await call('/parametres/api', session, 'PUT', { maxRequests: 500, windowSeconds: 900 })).status, 403)
  }
  equal((await call('/parametres/api', admin, 'PUT', { maxRequests: 500, windowSeconds: 900 }, false)).status, 403)
  equal((await call('/parametres/api', admin, 'PUT', { maxRequests: -1, windowSeconds: 900 })).status, 422)
  equal((await call('/categories', admin, 'POST', { code: 'X', libelle: 'X', actif: true }, false)).status, 403)
  pass('Authentification, rôle admin, CSRF et validation des paramètres')

  const before = (await call<ApiParametres>('/parametres', admin)).data
  const results = await Promise.all([
    call('/parametres/api', admin, 'PUT', { maxRequests: 400, windowSeconds: 600 }),
    call('/parametres/connexion', admin, 'PUT', { maxAttempts: 20, windowSeconds: 300, blockSeconds: 60 }),
  ])
  results.forEach((result) => equal(result.status, 200))
  const stored = (await call<ApiParametres>('/parametres', admin)).data
  equal(stored.api.maxRequests, 400); equal(stored.login.maxAttempts, 20)
  equal('password' in stored.database, false)
  equal('secretKey' in stored.turnstile, false)
  equal('privateKeyPem' in stored.https, false)
  equal((await call('/parametres/base-de-donnees/test', admin, 'POST', before.database)).status, 200)
  equal((await call('/parametres/base-de-donnees', admin, 'PUT', before.database)).status, 200)
  equal((await call('/parametres/base-de-donnees', admin, 'PUT', { ...before.database, port: 1 })).status, 422)
  deepEqual((await call<ApiParametres>('/parametres', admin)).data.database, before.database)
  pass('Sauvegardes concurrentes, secrets masqués, test MariaDB et conservation après refus')

  const category = (await call<Referentiel>('/categories', admin, 'POST', { code: 'test-parameter', libelle: 'Catégorie test', actif: true }))
  equal(category.status, 201)
  equal((await call('/categories', admin, 'POST', category.data)).status, 409)
  equal((await call(`/categories/${category.data.id}`, admin, 'PUT', { ...category.data, libelle: 'Catégorie modifiée' })).status, 200)
  const sub = await call<SousCategorie>('/sous-categories', admin, 'POST', { code: 'sub', libelle: 'Sous-catégorie test', actif: true, categorieId: category.data.id })
  equal(sub.status, 201)
  equal((await call(`/categories/${category.data.id}`, admin, 'DELETE')).status, 409)
  const article = { reference: 'PARAM-TEST', designation: 'Article paramètres', category: category.data.code, sousCategorieId: sub.data.id, prixUnitaireHT: 10, quantite: 0, minimum: 0, emplacement: '', tvaId: 1, ean13: '1234567890123', delaiDisponibilite: 2, forcerSurCommande: true }
  const created = await call('/articles', magasinier, 'POST', article)
  equal(created.status, 201)
  equal(created.data.sousCategorieId, sub.data.id); equal(created.data.ean13, article.ean13); equal(created.data.prixUnitaireTTC, 12)
  equal((await call('/articles/PARAM-TEST', magasinier, 'PUT', { ...article, category: 'freins' })).status, 422)
  equal((await call(`/sous-categories/${sub.data.id}`, admin, 'DELETE')).status, 409)
  equal((await call(`/sous-categories/${sub.data.id}`, admin, 'PUT', { ...sub.data, actif: false })).status, 200)
  equal((await call('/articles', magasinier, 'POST', { ...article, reference: 'PARAM-INVALID' })).status, 422)
  equal((await call('/articles/PARAM-TEST', magasinier, 'PUT', { ...article, designation: 'Article modifié' })).status, 200)
  pass('Catégories et sous-catégories : CRUD, unicité, rattachement cohérent, éléments utilisés et désactivation')

  await environment.connection.execute("INSERT INTO categories_articles (code, libelle) VALUES ('', 'Catégorie historique')")
  const historical = (await call<Referentiel[]>('/categories', admin)).data.find((item) => item.code === '')!
  equal((await call(`/categories/${historical.id}`, admin, 'PUT', { ...historical, libelle: 'Sans catégorie historique', actif: false })).status, 200)
  equal((await call('/categories', admin, 'POST', { code: '', libelle: 'Vide', actif: true })).status, 422)

  const sector = await call<Referentiel>('/secteurs', admin, 'POST', { code: 'test-sector', libelle: 'Secteur test', actif: true })
  equal(sector.status, 201)
  const client = await call<{ id: number; secteurId: number }>('/clients', magasinier, 'POST', { nom: 'Paramètres', prenom: 'Test', telephone: '0388000011', email: 'test@example.test', adresse: '1 rue Test', ville: 'Strasbourg', codePostal: '67000', type: 'particulier', secteurId: sector.data.id })
  equal(client.status, 201); equal(client.data.secteurId, sector.data.id)
  equal((await call(`/secteurs/${sector.data.id}`, admin, 'DELETE')).status, 409)
  equal((await call(`/clients/${client.data.id}`, magasinier, 'PUT', { secteurId: null })).status, 200)
  equal((await call(`/secteurs/${sector.data.id}`, admin, 'DELETE')).status, 204)
  pass('Secteurs et affectations client persistés ; suppression d’un secteur utilisé refusée')

  const location = await call<{ id: number }>('/emplacements', magasinier, 'POST', { niveau: 'allee', parent_id: null, code: 'PARAM-A', libelle: 'Allée test', capacite: 0 })
  equal(location.status, 201)
  const shelf = await call<{ id: number }>('/emplacements', magasinier, 'POST', { niveau: 'etagere', parent_id: location.data.id, code: 'PARAM-E', libelle: '', capacite: 12 })
  equal(shelf.status, 201)
  equal((await call(`/emplacements/${location.data.id}`, magasinier, 'DELETE')).status, 400)
  equal((await call(`/emplacements/${shelf.data.id}`, magasinier, 'PUT', { capacite: 8, actif: false })).status, 200)
  equal((await call(`/emplacements/${shelf.data.id}`, caissier, 'PUT', { capacite: 9 })).status, 403)
  pass('Gestion des emplacements avec parent numérique, capacité nulle et droits préservés')

  equal((await call('/parametres/turnstile', admin, 'PUT', { enabled: true, siteKey: 'site', secretKey: 'test-secret', hostnames: ['localhost'] })).status, 403)
  equal((await call<ApiParametres>('/parametres', admin)).data.turnstile.enabled, false)
  equal((await call('/auth/configuration')).status, 200)
  pass('Turnstile ne peut pas être activé sans vérification réussie')

  const probe = createServer().listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => probe.once('listening', resolve))
  const address = probe.address(); ok(address && typeof address !== 'string')
  const httpsPort = address.port
  await new Promise<void>((resolve) => probe.close(() => resolve()))
  const cert = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { keySize: 2048 })
  const tls = { enabled: true, port: httpsPort, httpMode: 'serve', publicOrigin: '', certificatePem: cert.cert, privateKeyPem: cert.private }
  equal((await call('/parametres/https', admin, 'PUT', tls)).status, 200)
  equal((await call('/parametres/https', admin, 'PUT', { ...tls, privateKeyPem: 'invalid' })).status, 422)
  await environment.restartApi()
  const restarted = await login('marie.laurent@autostrass.fr')
  const settings = (await call<ApiParametres>('/parametres', restarted)).data
  equal(settings.api.maxRequests, 400); equal(settings.login.maxAttempts, 20)
  equal(settings.https.active, true); equal(settings.https.restartRequired, false)
  const httpsStatus = await new Promise<number>((resolve, reject) => {
    httpsGet(`https://127.0.0.1:${httpsPort}/parametres/categories`, { rejectUnauthorized: false }, (response) => { response.resume(); resolve(response.statusCode ?? 0) }).on('error', reject)
  })
  equal(httpsStatus, 200)
  pass('Persistance après redémarrage, certificat valide activé et frontend servi en HTTPS')

  if (process.argv.includes('--all')) {
    await environment.runScript('scripts/test-api.ts')
    await environment.runScript('scripts/test-security.ts')
  }

  const redirectSession = await login('marie.laurent@autostrass.fr')
  const publicOrigin = `https://127.0.0.1:${httpsPort}`
  equal((await call('/parametres/https', redirectSession, 'PUT', { ...tls, httpMode: 'redirect', publicOrigin })).status, 200)
  await environment.restartApi({ expectHttpRedirect: true })
  const redirected = await fetch(`${baseUrl}/parametres/categories?origine=test`, { redirect: 'manual' })
  equal(redirected.status, 308)
  equal(redirected.headers.get('location'), `${publicOrigin}/parametres/categories?origine=test`)
  const health = await new Promise<{ database: string }>((resolve, reject) => {
    httpsGet(`${publicOrigin}/api/health`, { rejectUnauthorized: false }, (response) => {
      let body = ''
      response.on('data', (chunk) => { body += chunk })
      response.on('end', () => { try { resolve(JSON.parse(body)) } catch (error) { reject(error) } })
    }).on('error', reject)
  })
  equal(health.database, 'connected')
  pass('Redirection HTTP 308 conservant chemin et paramètres, API HTTPS disponible')
} finally { await environment.close() }
console.log(`${checks} groupes de contrôles API Paramètres réussis.`)
