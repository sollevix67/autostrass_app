/** Routes PDF exclusivement dans une base, une API et des réglages jetables. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { RowDataPacket } from 'mysql2/promise'
import type { ApiDevis, ApiParametres, ApiVente } from '../src/services/contracts.js'
import { DEFAULT_DOCUMENTS_PDF_SETTINGS, DOCUMENTS_PDF_LIMITS, type DocumentsPdfSettings } from '../src/schemas/parametres.js'
import { createTestEnvironment } from './lib/test-environment.js'
import { makePng, makePngLogo, makePalettePng, makeJpegLogo, pngAtByteLength } from './lib/image-fixtures.js'
import { textFromPdf } from './lib/pdf-buffer-text.js'
import { rgbaImagesFromPdf } from './lib/pdf-buffer-images.js'
import { verifyPdf } from './lib/pdf-assertions.js'

type Session = { cookie: string; csrf: string }
type ApiFailure = { error: string; message: string; details?: Record<string, string> }
const environment = await createTestEnvironment()
const { connection, baseUrl, settingsPath } = environment
const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
let groups = 0
function passed(message: string) { groups += 1; console.log(`OK ${message}`) }

async function login(email: string): Promise<Session> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, motDePasse: 'demo1234' }), signal: AbortSignal.timeout(15000),
  })
  assert.equal(response.status, 200)
  const data = await response.json() as { csrfToken: string }
  return { cookie: response.headers.getSetCookie().map((item) => item.split(';')[0]).join('; '), csrf: data.csrfToken }
}

async function request(path: string, session?: Session, method = 'GET', body?: unknown, csrf: string | false = session?.csrf ?? false) {
  return fetch(`${baseUrl}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(session ? { cookie: session.cookie } : {}), ...(csrf ? { 'x-csrf-token': csrf } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
  })
}

async function call<T = ApiFailure>(path: string, session?: Session, method = 'GET', body?: unknown, csrf?: string | false) {
  const response = await request(path, session, method, body, csrf)
  return { status: response.status, data: await response.json() as T }
}

async function settings(session: Session) {
  const response = await call<ApiParametres>('/parametres', session)
  assert.equal(response.status, 200)
  return response.data
}

async function settingsBytes() { return existsSync(settingsPath) ? readFile(settingsPath) : null }

async function snapshot(includeSystemEvents = true) {
  const [tables] = await connection.query<RowDataPacket[]>("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")
  const result: Record<string, { rows: number; sha256: string }> = {}
  for (const table of tables) {
    const name = String(Object.values(table)[0])
    assert.match(name, /^[a-zA-Z0-9_]+$/)
    if (!includeSystemEvents && name === 'system_events') continue
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM \`${name}\``)
    const content = rows.map((row) => JSON.stringify(row)).sort().join('\n')
    result[name] = { rows: rows.length, sha256: createHash('sha256').update(content).digest('hex') }
  }
  return result
}

async function pdf(path: string, session: Session, method = 'GET', draft?: DocumentsPdfSettings) {
  const response = await request(path, session, method, draft)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') ?? '', /^application\/pdf\b/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const buffer = Buffer.from(await response.arrayBuffer())
  verifyPdf(buffer)
  return { buffer, text: textFromPdf(buffer).join(' '), disposition: response.headers.get('content-disposition') ?? '' }
}

function assertPresentation(text: string, values: DocumentsPdfSettings) {
  for (const marker of [values.nomEmetteur, values.activite, ...values.coordonnees.split('\n'), ...values.piedCommun.split('\n')].filter(Boolean)) {
    assert.ok(text.includes(marker), `Marqueur PDF absent : ${marker}`)
  }
}

function assertAmounts(text: string, ht: string, tva: string, ttc: string) {
  for (const [label, value] of [['Total HT', ht], ['TVA', tva], ['Total TTC', ttc]]) {
    assert.ok(text.includes(`${label} ${value} EUR`), `Montant PDF attendu : ${label} ${value} EUR`)
  }
}

try {
  const admin = await login('marie.laurent@autostrass.fr')
  const caissier = await login('sophie.bernard@autostrass.fr')
  const magasinier = await login('karim.moreau@autostrass.fr')
  const endpoints = [['/parametres/documents-pdf', 'PUT'], ['/parametres/documents-pdf/apercu', 'POST']] as const
  const initialSnapshot = await snapshot()
  const initialBytes = await settingsBytes()
  const initial = await settings(admin)
  assert.deepEqual(initial.documentsPdf, DEFAULT_DOCUMENTS_PDF_SETTINGS)
  assert.equal(initialBytes, null)
  assert.equal(existsSync(settingsPath), false, 'La consultation des defaults ne crée pas de réglages')
  assert.ok(initialSnapshot.__drizzle_migrations.rows > 0, 'Le schéma jetable a été migré')
  passed('Ancien fichier absent : defaults publics compatibles, aucune création automatique ni migration supplémentaire')

  assert.equal((await call('/parametres')).status, 401)
  for (const session of [caissier, magasinier]) assert.equal((await call('/parametres', session)).status, 403)
  for (const [path, method] of endpoints) {
    assert.equal((await call(path, undefined, method, initial.documentsPdf)).status, 401)
    for (const session of [caissier, magasinier]) assert.equal((await call(path, session, method, initial.documentsPdf)).status, 403)
    assert.equal((await call(path, admin, method, initial.documentsPdf, false)).status, 403)
    assert.equal((await call(path, admin, method, initial.documentsPdf, 'incorrect')).status, 403)
  }
  assert.deepEqual(await snapshot(), initialSnapshot)
  assert.deepEqual(await settingsBytes(), initialBytes)
  passed('Consultation, sauvegarde et aperçu réservés à l’admin ; requêtes anonymes et CSRF absent/incorrect refusés sans écriture')

  const corrupt = makePng(); corrupt[corrupt.length - 2] ^= 255
  const invalid = [
    { ...initial.documentsPdf, nomEmetteur: '' }, { ...initial.documentsPdf, nomEmetteur: 'A'.repeat(81) },
    { ...initial.documentsPdf, activite: 'A\u202eB' },
    { ...initial.documentsPdf, coordonnees: Array(9).fill('Ligne').join('\n') },
    { ...initial.documentsPdf, piedCommun: 'A'.repeat(101) },
    { ...initial.documentsPdf, unexpected: true },
    { ...initial.documentsPdf, logo: { mimeType: 'image/png', data: corrupt.toString('base64') } },
    { ...initial.documentsPdf, logo: makePngLogo(1025, 1) },
    { ...initial.documentsPdf, logo: { mimeType: 'image/png', data: pngAtByteLength(DOCUMENTS_PDF_LIMITS.logoOctets + 1).toString('base64') } },
    { ...initial.documentsPdf, logo: { mimeType: 'image/png', data: 'https://example.test/logo.png' } },
  ]
  for (const [path, method] of endpoints) {
    for (const values of invalid) {
      const refusal = await call(path, admin, method, values)
      assert.equal(refusal.status, 422, JSON.stringify(refusal.data))
      assert.equal(refusal.data.error, 'VALIDATION_ERROR')
    }
  }
  assert.deepEqual(await settingsBytes(), initialBytes)
  assert.deepEqual((await settings(admin)).documentsPdf, initial.documentsPdf)
  assert.deepEqual(await snapshot(), initialSnapshot)
  passed('Validation des textes/logo/limites/clé inconnue sur les deux routes : 422 et configuration/base inchangées')

  const palette = makePalettePng()
  const draft: DocumentsPdfSettings = {
    nomEmetteur: 'EMETTEUR_BROUILLON', activite: 'ACTIVITE_BROUILLON',
    coordonnees: 'COORDONNEE_BROUILLON_1\nCOORDONNEE_BROUILLON_2',
    piedCommun: 'PIED_BROUILLON_1\nPIED_BROUILLON_2', logo: palette.logo,
  }
  const preview = await pdf('/parametres/documents-pdf/apercu', admin, 'POST', draft)
  assertPresentation(preview.text, draft)
  assert.match(preview.disposition, /^inline;/)
  assert.ok(preview.text.includes('APERÇU') && preview.text.includes('Client de démonstration') && preview.text.includes('EXEMPLE-001'))
  assertAmounts(preview.text, '35,00', '5,55', '40,55')
  assert.deepEqual(rgbaImagesFromPdf(preview.buffer), [{ width: 8, height: 1, rgba: palette.rgba }])
  const jpegDraft = { ...draft, logo: await makeJpegLogo() }
  assertPresentation((await pdf('/parametres/documents-pdf/apercu', admin, 'POST', jpegDraft)).text, draft)
  assert.deepEqual(await settingsBytes(), initialBytes)
  assert.deepEqual(await settings(admin), initial)
  assert.deepEqual(await snapshot(), initialSnapshot)
  passed('Aperçus PNG palette transparent/JPEG réels, inline/no-store, textes fictifs exacts et aucune persistance/écriture métier')

  await connection.execute(
    'INSERT INTO articles(reference, designation, category, unit_price_ht, tva_id) VALUES (?, ?, ?, ?, (SELECT id FROM tva WHERE taux = ? LIMIT 1))',
    ['PDF-SALE', 'Article facture fictif', 'freins', 12.5, 20],
  )
  await connection.execute('INSERT INTO stock_balances(reference_id, quantity, minimum_quantity) SELECT id, 10, 0 FROM articles WHERE reference = ?', ['PDF-SALE'])
  await connection.execute(
    'INSERT INTO articles(reference, designation, category, unit_price_ht, tva_id) VALUES (?, ?, ?, ?, (SELECT id FROM tva WHERE taux = ? LIMIT 1))',
    ['PDF-QUOTE', 'Article devis fictif', 'freins', 10, 5.5],
  )
  const createdClient = await call<{ id: number }>('/clients', admin, 'POST', {
    nom: 'Client PDF fictif', prenom: 'Camille', telephone: '0388000011', email: 'pdf@example.test',
    adresse: '10 rue de l’Exemple', ville: 'Strasbourg', codePostal: '67000', type: 'particulier',
  })
  assert.equal(createdClient.status, 201)
  assert.equal((await call('/caisse/ouvrir', caissier, 'POST', { fondsCaisse: 0 })).status, 201)
  const createdSale = await call<ApiVente>('/ventes', caissier, 'POST', {
    clientId: createdClient.data.id, dateVente: new Date().toISOString(), modePaiement: 'espèces', montantPaye: 40,
    articles: [{ reference: 'PDF-SALE', designation: 'Article facture fictif', quantite: 2, prixUnitaire: 12.5 }],
  })
  assert.equal(createdSale.status, 201, JSON.stringify(createdSale.data))
  const sale = createdSale.data
  const createdQuote = await call<ApiDevis>('/devis', caissier, 'POST', {
    clientId: createdClient.data.id, dateDevis: date, dateValidite: '2099-12-31', notes: 'NOTE_DEVIS_FICTIVE',
    articles: [{ reference: 'PDF-QUOTE', quantite: 2, prixUnitaire: 10 }],
  })
  assert.equal(createdQuote.status, 201, JSON.stringify(createdQuote.data))
  const quote = createdQuote.data
  const invoicePath = `/ventes/${sale.id}/facture`, quotePath = `/devis/${quote.id}/pdf?version=${quote.version}`
  const business = await snapshot()
  const defaultInvoice = await pdf(invoicePath, caissier)
  const defaultQuote = await pdf(quotePath, caissier)
  assertPresentation(defaultInvoice.text, initial.documentsPdf)
  assertPresentation(defaultQuote.text, initial.documentsPdf)
  assertAmounts(defaultInvoice.text, '25,00', '5,00', '30,00')
  assertAmounts(defaultQuote.text, '20,00', '1,10', '21,10')
  assert.equal(rgbaImagesFromPdf(defaultInvoice.buffer).length, 0)
  const previewAfterBusiness = await pdf('/parametres/documents-pdf/apercu', admin, 'POST', draft)
  assert.ok(!previewAfterBusiness.text.includes('Client PDF fictif') && !previewAfterBusiness.text.includes('PDF-SALE') && !previewAfterBusiness.text.includes('PDF-QUOTE'))
  assert.deepEqual(await snapshot(), business)
  passed('Facture/devis métier créés uniquement dans la base jetable : defaults et montants conservés ; aperçu indépendant de leur contenu')

  const saved: DocumentsPdfSettings = { ...draft, nomEmetteur: 'EMETTEUR_ENREGISTRE', piedCommun: 'PIED_ENREGISTRE' }
  const concurrent = await Promise.all([
    call<ApiParametres>('/parametres/documents-pdf', admin, 'PUT', saved),
    call<ApiParametres>('/parametres/api', admin, 'PUT', { maxRequests: 400, windowSeconds: 600 }),
  ])
  for (const result of concurrent) assert.equal(result.status, 200)
  const stored = await settings(admin)
  assert.deepEqual(stored.documentsPdf, saved)
  assert.deepEqual(stored.api, { maxRequests: 400, windowSeconds: 600 })
  assert.deepEqual(stored.caisse, initial.caisse)
  assert.deepEqual(stored.database, initial.database)
  const physical = JSON.parse(await readFile(settingsPath, 'utf8'))
  assert.deepEqual(physical.documentsPdf, saved, 'Le logo source reste enregistré sans transformation')
  assert.deepEqual(physical.api, stored.api)
  const liveInvoice = await pdf(invoicePath, caissier)
  const liveQuote = await pdf(quotePath, caissier)
  for (const result of [liveInvoice, liveQuote]) {
    assertPresentation(result.text, saved)
    assert.ok(!result.text.includes('EMETTEUR_BROUILLON'))
    assert.deepEqual(rgbaImagesFromPdf(result.buffer), [{ width: 8, height: 1, rgba: palette.rgba }])
  }
  assertAmounts(liveInvoice.text, '25,00', '5,00', '30,00')
  assertAmounts(liveQuote.text, '20,00', '1,10', '21,10')
  assert.ok(liveInvoice.text.includes('Sophie Bernard') && liveInvoice.text.includes('Client PDF fictif') && liveInvoice.text.includes('Montant reçu : 40,00 EUR') && liveInvoice.text.includes('Monnaie rendue : 10,00 EUR'))
  // Le lecteur ajoute un séparateur entre opérateurs PDF distincts, notamment après un tiret.
  assert.ok(liveQuote.text.replace(/\s/g, '').includes(quote.numero), 'Numéro du devis conservé sans perte de caractère')
  assert.ok(liveQuote.text.includes('Client PDF fictif'), 'Identité du client conservée dans le PDF')
  assert.ok(liveQuote.text.includes('NOTE_DEVIS_FICTIVE'), 'Note du devis conservée dans le PDF')
  assert.deepEqual(await snapshot(), business)
  passed('PUT concurrent avec une autre rubrique, fichier atomique et textes/logo appliqués à chaud aux vrais PDF ; données/fiscalité inchangées')

  const next: DocumentsPdfSettings = { ...saved, nomEmetteur: 'EMETTEUR_APRES_MODIFICATION', piedCommun: 'PIED_APRES_MODIFICATION', logo: null }
  assert.equal((await call('/parametres/documents-pdf', admin, 'PUT', next)).status, 200)
  for (const path of [invoicePath, quotePath]) {
    const result = await pdf(path, caissier)
    assertPresentation(result.text, next)
    assert.ok(!result.text.includes(saved.nomEmetteur) && !result.text.includes(saved.piedCommun))
    assert.equal(rgbaImagesFromPdf(result.buffer).length, 0)
  }
  const beforePreview = await settingsBytes()
  await pdf('/parametres/documents-pdf/apercu', admin, 'POST', draft)
  assert.deepEqual(await settingsBytes(), beforePreview)
  assert.deepEqual((await settings(admin)).documentsPdf, next)
  assert.deepEqual(await snapshot(), business)
  passed('Deuxième sauvegarde sans relance : identité/pied remplacés, logo retiré et nouvel aperçu distinct des valeurs enregistrées')

  const beforeRestart = await snapshot(false)
  const beforeRestartBytes = await settingsBytes()
  await environment.restartApi()
  const restartedAdmin = await login('marie.laurent@autostrass.fr')
  const restartedCashier = await login('sophie.bernard@autostrass.fr')
  const persisted = await settings(restartedAdmin)
  assert.deepEqual(persisted.documentsPdf, next)
  assert.deepEqual(persisted.api, stored.api)
  assert.deepEqual(await settingsBytes(), beforeRestartBytes)
  for (const path of [invoicePath, quotePath]) assertPresentation((await pdf(path, restartedCashier)).text, next)
  assert.deepEqual((await call<ApiVente>(`/ventes/${sale.id}`, restartedCashier)).data, sale)
  assert.deepEqual((await call<ApiDevis>(`/devis/${quote.id}`, restartedCashier)).data, quote)
  assert.deepEqual(await snapshot(false), beforeRestart)
  passed('Configuration relue après redémarrage ; vente/devis/stock/journaux/migrations intacts, seuls événements système de démarrage exclus')

  const afterRestart = await snapshot()
  assert.equal((await call('/parametres/documents-pdf', restartedAdmin, 'PUT', DEFAULT_DOCUMENTS_PDF_SETTINGS)).status, 200)
  for (const path of [invoicePath, quotePath]) {
    const result = await pdf(path, restartedCashier)
    assertPresentation(result.text, DEFAULT_DOCUMENTS_PDF_SETTINGS)
    assert.ok(!result.text.includes(next.nomEmetteur))
    assert.equal(rgbaImagesFromPdf(result.buffer).length, 0)
  }
  assert.deepEqual(await snapshot(), afterRestart)
  passed('Retour aux defaults par sauvegarde explicite, sans toucher aux documents historiques ni aux autres données')
} finally { await environment.close() }
assert.equal(existsSync(settingsPath), false, 'La configuration jetable a été nettoyée')
console.log(`${groups} groupes API Documents PDF réussis ; base/API/configuration jetables nettoyées.`)
