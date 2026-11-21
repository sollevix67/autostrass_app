/** Recette métier devis/commandes exclusivement dans une base et une API jetables. */
import { deepEqual, equal, ok, rejects } from 'node:assert/strict'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { DevisRow } from '../server/repositories/devisRepository.js'
import { createTestEnvironment } from './lib/test-environment.js'

type Session = { cookie: string; csrf: string }
type QuoteInput = {
  clientId: number
  dateDevis: string
  dateValidite?: string | null
  notes?: string | null
  articles: Array<{ reference: string; quantite: number; prixUnitaire: number }>
}

const environment = await createTestEnvironment()
const { connection, baseUrl } = environment
const dateDevis = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
const validUntil = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
let scenarios = 0
function passed(label: string) { scenarios += 1; console.log(`OK ${label}`) }

async function login(email: string): Promise<Session> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, motDePasse: 'demo1234' }), signal: AbortSignal.timeout(15000),
  })
  equal(response.status, 200)
  const cookie = response.headers.getSetCookie().map((part) => part.split(';')[0]).join('; ')
  const csrf = cookie.match(/autostrass_csrf=([^;]+)/)?.[1]
  ok(csrf)
  return { cookie, csrf: decodeURIComponent(csrf) }
}

async function call<T = any>(session: Session | null, method: string, path: string, body?: unknown, csrf = true) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(session ? { cookie: session.cookie, ...(csrf ? { 'x-csrf-token': session.csrf } : {}) } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  return { status: response.status, body: await response.json() as T }
}

async function rows(statement: string, values: unknown[] = []) {
  const [result] = await connection.query<RowDataPacket[]>(statement, values)
  return result
}

async function businessCounts() {
  const result: Record<string, number> = {}
  for (const table of ['devis', 'devis_lines', 'commandes', 'commande_lines', 'articles_a_commander', 'journal_actions']) {
    result[table] = Number((await rows(`SELECT COUNT(*) AS n FROM ${table}`))[0].n)
  }
  return result
}

async function stockSnapshot() {
  const result: Record<string, RowDataPacket[]> = {}
  for (const table of ['stock_balances', 'stock_par_emplacements', 'stock_movements']) {
    result[table] = await rows(`SELECT * FROM ${table} ORDER BY 1, 2`)
  }
  return result
}

async function fiscalSnapshot() {
  const result: Record<string, RowDataPacket[]> = {}
  for (const table of ['ventes', 'vente_lines', 'cash_sessions', 'cash_movements']) {
    result[table] = await rows(`SELECT * FROM ${table} ORDER BY 1, 2`)
  }
  return result
}

async function article(reference: string, designation: string, quantity: number, rate = 20) {
  const [inserted] = await connection.execute<ResultSetHeader>(
    'INSERT INTO articles(reference, designation, category, unit_price_ht, tva_id) VALUES (?, ?, ?, ?, (SELECT id FROM tva WHERE taux = ? LIMIT 1))',
    [reference, designation, 'freins', 99, rate],
  )
  await connection.execute('INSERT INTO stock_balances(reference_id, quantity, minimum_quantity) VALUES (?, ?, 0)', [inserted.insertId, quantity])
  return inserted.insertId
}

function updatePayload(devis: DevisRow, changes: Record<string, unknown> = {}) {
  return {
    version: devis.version, clientId: devis.clientId, dateDevis: devis.dateDevis,
    dateValidite: devis.dateValidite, notes: devis.notes,
    articles: devis.articles.map(({ reference, quantite, prixUnitaire }) => ({ reference, quantite, prixUnitaire })),
    ...changes,
  }
}

try {
  const admin = await login('marie.laurent@autostrass.fr')
  const caissier = await login('sophie.bernard@autostrass.fr')
  const magasinier = await login('karim.moreau@autostrass.fr')
  const fiscalBefore = await fiscalSnapshot()
  const client = await call(admin, 'POST', '/clients', {
    nom: 'Snapshot Devis', prenom: 'Alice', telephone: '0388000011', email: 'devis@example.test',
    adresse: '1 rue du Devis', ville: 'Strasbourg', codePostal: '67000', type: 'professionnel', siret: '12345678900011',
  })
  equal(client.status, 201)
  const clientId = client.body.id as number
  const reducedId = await article('DEVIS-REDUIT', 'Désignation figée réduite', 20, 5.5)
  await article('DEVIS-NORMAL', 'Désignation figée normale', 20)
  await article('DEVIS-PENURIE', 'Article en pénurie partielle', 5)
  await article('DEVIS-DISPONIBLE', 'Article disponible', 10)
  await article('DEVIS-ROLLBACK', 'Article pour rollback', 0)
  const stockBefore = await stockSnapshot()
  const input: QuoteInput = {
    clientId, dateDevis, dateValidite: validUntil, notes: 'Conditions de recette',
    articles: [
      { reference: 'DEVIS-REDUIT', quantite: 3, prixUnitaire: 0.01 },
      { reference: 'DEVIS-NORMAL', quantite: 1, prixUnitaire: 0.1 },
    ],
  }

  equal((await call(null, 'GET', '/devis')).status, 401)
  equal((await call(magasinier, 'GET', '/devis')).status, 403)
  equal((await call(magasinier, 'POST', '/devis', input)).status, 403)
  equal((await call(admin, 'POST', '/devis', input, false)).status, 403)
  equal((await call(magasinier, 'GET', '/articles-a-commander')).status, 200)
  equal((await call(caissier, 'GET', '/articles-a-commander')).status, 200)
  passed('Authentification, CSRF et droits devis/dépôt respectés')

  const created = await call<DevisRow>(caissier, 'POST', '/devis', input)
  equal(created.status, 201, JSON.stringify(created.body))
  const quote = created.body
  ok(new RegExp(`^${dateDevis.replaceAll('-', '')}-D-[a-zA-Z]{6}$`).test(quote.numero))
  equal(quote.statut, 'brouillon')
  equal(quote.version, 1)
  equal(quote.commandeId, null)
  deepEqual([quote.totalHT, quote.totalTVA, quote.totalTTC], [0.13, 0.02, 0.15])
  deepEqual(quote.articles.map((line) => [line.tauxTva, line.montant, line.montantTVA, line.montantTTC]), [[5.5, 0.03, 0, 0.03], [20, 0.1, 0.02, 0.12]])
  deepEqual((await call<DevisRow>(admin, 'GET', `/devis/${quote.id}`)).body, quote)
  deepEqual(await stockSnapshot(), stockBefore)
  equal((await rows('SELECT COUNT(*) AS n FROM articles_a_commander'))[0].n, 0)
  passed('Création/relecture, numéro alphabétique, taxes mixtes arrondies par ligne et absence de réservation au devis')

  const physical = (await rows('SELECT total_ht, total_tva, total_ttc FROM devis WHERE id = ?', [quote.id]))[0]
  deepEqual([physical.total_ht, physical.total_tva, physical.total_ttc].map(Number), [0.13, 0.02, 0.15])
  const legacyCommands = (await call(admin, 'GET', '/commandes')).body
  ok(legacyCommands.length > 0)
  ok(legacyCommands.every((order: any) => order.numero === null && order.totalTVA === null && order.totalTTC === null))
  passed('DECIMAL identiques aux réponses ; numérotation et taxes historiques de commandes conservées à NULL')

  const invalidInputs: QuoteInput[] = [
    { ...input, clientId: 2147483647 },
    { ...input, articles: [] },
    { ...input, dateValidite: '2000-01-01' },
    { ...input, articles: [{ reference: 'DEVIS-INCONNU', quantite: 1, prixUnitaire: 1 }] },
    ...[0, -1, 0.5].map((quantite) => ({ ...input, articles: [{ reference: 'DEVIS-NORMAL', quantite, prixUnitaire: 1 }] })),
    ...[-1, 0.015].map((prixUnitaire) => ({ ...input, articles: [{ reference: 'DEVIS-NORMAL', quantite: 1, prixUnitaire }] })),
  ]
  const beforeInvalid = await businessCounts()
  for (const invalid of invalidInputs) equal((await call(admin, 'POST', '/devis', invalid)).status, 422)
  deepEqual(await businessCounts(), beforeInvalid)
  equal((await call(admin, 'PUT', `/devis/${quote.id}`, updatePayload(quote, { statut: 'converti' }))).status, 422)
  passed('Client/références, lignes, dates, quantités, centimes et statut converti validés sans écriture partielle')

  const concurrentCreates = await Promise.all(Array.from({ length: 8 }, () => call<DevisRow>(admin, 'POST', '/devis', input)))
  ok(concurrentCreates.every((result) => result.status === 201), JSON.stringify(concurrentCreates))
  equal(new Set(concurrentCreates.map((result) => result.body.numero)).size, 8)
  ok(concurrentCreates.every((result) => new RegExp(`^${dateDevis.replaceAll('-', '')}-D-[a-zA-Z]{6}$`).test(result.body.numero)))
  const two = concurrentCreates.slice(0, 2).map((result) => result.body)
  await connection.execute('UPDATE devis SET numero = ? WHERE id = ?', [`${dateDevis.replaceAll('-', '')}-D-AbCdEf`, two[0].id])
  await connection.execute('UPDATE devis SET numero = ? WHERE id = ?', [`${dateDevis.replaceAll('-', '')}-D-aBcDeF`, two[1].id])
  await rejects(connection.execute('UPDATE devis SET numero = ? WHERE id = ?', [`${dateDevis.replaceAll('-', '')}-D-AbCdEf`, two[1].id]), (error: any) => error.code === 'ER_DUP_ENTRY')
  for (const item of two) await connection.execute('UPDATE devis SET numero = ? WHERE id = ?', [item.numero, item.id])
  passed('Huit créations concurrentes uniques ; index numéros sensible à la casse et doublon exact refusé')

  await connection.execute('UPDATE clients SET nom = ?, email = ?, adresse = ? WHERE id = ?', ['Client actuel modifié', 'actuel@example.test', 'Adresse actuelle', clientId])
  await connection.execute('UPDATE articles SET designation = ?, unit_price_ht = ?, tva_id = (SELECT id FROM tva WHERE taux = 20 LIMIT 1) WHERE id = ?', ['Catalogue actuel modifié', 500, reducedId])
  const snapshot = (await call<DevisRow>(admin, 'GET', `/devis/${quote.id}`)).body
  equal(snapshot.clientSnapshot.nom, 'Snapshot Devis')
  equal(snapshot.clientSnapshot.email, 'devis@example.test')
  equal(snapshot.articles[0].designation, 'Désignation figée réduite')
  equal(snapshot.articles[0].tauxTva, 5.5)
  deepEqual([snapshot.totalHT, snapshot.totalTVA, snapshot.totalTTC], [0.13, 0.02, 0.15])
  passed('Modification ultérieure client/catalogue : coordonnées, désignations, tarifs et TVA du devis conservés')

  const competingEdits = await Promise.all([
    call<DevisRow & { error?: string }>(admin, 'PUT', `/devis/${quote.id}`, updatePayload(quote, { notes: 'Version A' })),
    call<DevisRow & { error?: string }>(caissier, 'PUT', `/devis/${quote.id}`, updatePayload(quote, { notes: 'Version B' })),
  ])
  deepEqual(competingEdits.map((result) => result.status).sort(), [200, 409])
  equal(competingEdits.find((result) => result.status === 409)!.body.error, 'DEVIS_CONFLICT')
  const edited = competingEdits.find((result) => result.status === 200)!.body
  equal(edited.version, quote.version + 1)
  equal(edited.numero, quote.numero)
  equal(edited.articles[0].tauxTva, 5.5)
  equal(edited.articles[0].designation, quote.articles[0].designation)
  equal((await call(admin, 'PUT', `/devis/${quote.id}`, updatePayload(edited, { dateDevis: '2000-01-01' }))).status, 409)
  const sent = await call<DevisRow>(caissier, 'PUT', `/devis/${quote.id}`, updatePayload(edited, { statut: 'envoyé' }))
  equal(sent.status, 200)
  equal(sent.body.statut, 'envoyé')
  passed('Édition concurrente/version obsolète refusée, date et numéro immuables, TVA existante figée et état envoyé')

  const stalePdf = await fetch(`${baseUrl}/api/devis/${quote.id}/pdf?version=${quote.version}`, { headers: { cookie: caissier.cookie }, signal: AbortSignal.timeout(15000) })
  equal(stalePdf.status, 409)
  equal((await stalePdf.json()).error, 'DEVIS_CONFLICT')
  const pdf = await fetch(`${baseUrl}/api/devis/${quote.id}/pdf?version=${sent.body.version}`, { headers: { cookie: caissier.cookie }, signal: AbortSignal.timeout(15000) })
  equal(pdf.status, 200)
  ok(pdf.headers.get('content-type')?.includes('application/pdf'))
  ok(pdf.headers.get('content-disposition')?.includes(quote.numero))
  equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-')
  equal((await fetch(`${baseUrl}/api/devis/${quote.id}/pdf`, { headers: { cookie: magasinier.cookie } })).status, 403)
  passed('PDF réel identifié par le numéro et protégé par les droits et la version du devis')

  const conversionInput: QuoteInput = {
    clientId, dateDevis, dateValidite: validUntil,
    articles: [
      { reference: 'DEVIS-PENURIE', quantite: 7, prixUnitaire: 25 },
      { reference: 'DEVIS-DISPONIBLE', quantite: 2, prixUnitaire: 10 },
    ],
  }
  const convertible = await call<DevisRow>(admin, 'POST', '/devis', conversionInput)
  equal(convertible.status, 201)
  const convertPath = `/devis/${convertible.body.id}/convertir`
  equal((await call(magasinier, 'POST', convertPath, { version: 1 })).status, 403)
  equal((await call(admin, 'POST', convertPath, { version: 2 })).status, 409)
  equal((await call(admin, 'POST', convertPath, { version: 1 }, false)).status, 403)
  const beforeConversion = await businessCounts()
  const conversions = await Promise.all(Array.from({ length: 6 }, () => call(admin, 'POST', convertPath, { version: 1, dateLivraisonPrevue: validUntil })))
  ok(conversions.every((result) => [200, 201].includes(result.status)), JSON.stringify(conversions))
  equal(new Set(conversions.map((result) => result.body.commande.id)).size, 1)
  const converted = conversions[0].body
  equal(converted.devis.statut, 'converti')
  equal(converted.devis.commandeId, converted.commande.id)
  equal(converted.devis.version, 2)
  ok(new RegExp(`^${converted.commande.dateCommande.replaceAll('-', '')}-C-[a-zA-Z]{6}$`).test(converted.commande.numero))
  deepEqual([converted.commande.totalHT, converted.commande.totalTVA, converted.commande.totalTTC], [195, 39, 234])
  deepEqual(converted.commande.articles.map((line: any) => [line.reference, line.quantite, line.prixUnitaire, line.tauxTva]), [['DEVIS-PENURIE', 7, 25, 20], ['DEVIS-DISPONIBLE', 2, 10, 20]])
  deepEqual(converted.articlesACommander.map((line: any) => [line.reference, line.quantite]), [['DEVIS-PENURIE', 2]])
  const afterConversion = await businessCounts()
  equal(afterConversion.commandes, beforeConversion.commandes + 1)
  equal(afterConversion.commande_lines, beforeConversion.commande_lines + 2)
  equal(afterConversion.articles_a_commander, beforeConversion.articles_a_commander + 2)
  deepEqual(await stockSnapshot(), stockBefore)
  passed('Six conversions concurrentes idempotentes : une commande numérotée TTC, manque partiel exact et stock inchangé')

  const replay = await call(admin, 'POST', convertPath, { version: 1 })
  equal(replay.status, 200)
  equal(replay.body.commande.id, converted.commande.id)
  deepEqual(await businessCounts(), afterConversion)
  equal((await call(admin, 'PUT', `/devis/${convertible.body.id}`, updatePayload(convertible.body))).status, 409)
  const orderPath = `/commandes/${converted.commande.id}`
  equal((await call(admin, 'PUT', orderPath, { articles: [{ reference: 'DEVIS-PENURIE', designation: 'Tarif arbitraire', quantite: 1, prixUnitaire: 1 }] })).status, 422)
  equal((await call(admin, 'PUT', `${orderPath}/lignes`, { articles: [{ reference: 'DEVIS-PENURIE', designation: 'Tarif arbitraire', quantite: 1, prixUnitaire: 1 }] })).status, 409)
  equal((await call(admin, 'PUT', orderPath, { clientId: 1 })).status, 409)
  equal((await call(admin, 'DELETE', orderPath)).status, 409)
  equal((await call(admin, 'PUT', orderPath, { statut: 'validée', dateLivraisonPrevue: validUntil })).status, 200)
  await connection.execute('UPDATE clients SET nom = ? WHERE id = ?', ['Client après conversion', clientId])
  const frozenOrder = (await call(admin, 'GET', orderPath)).body
  equal(frozenOrder.clientSnapshot.nom, convertible.body.clientSnapshot.nom)
  deepEqual([frozenOrder.totalHT, frozenOrder.totalTVA, frozenOrder.totalTTC], [195, 39, 234])
  passed('Rejeu sans nouvel effet ; devis et lignes/client/suppression de commande issus du devis figés, suivi modifiable')

  const later = await call<DevisRow>(admin, 'POST', '/devis', { ...conversionInput, articles: [{ reference: 'DEVIS-PENURIE', quantite: 3, prixUnitaire: 25 }] })
  equal(later.status, 201)
  const laterConversion = await call(admin, 'POST', `/devis/${later.body.id}/convertir`, { version: later.body.version })
  ok([200, 201].includes(laterConversion.status), JSON.stringify(laterConversion.body))
  deepEqual(laterConversion.body.articlesACommander.map((line: any) => [line.reference, line.quantite]), [['DEVIS-PENURIE', 3]])
  const queue = (await call(magasinier, 'GET', '/articles-a-commander')).body
  deepEqual(queue.filter((line: any) => line.reference === 'DEVIS-PENURIE').map((line: any) => line.quantite).sort((a: number, b: number) => a - b), [2, 3])
  ok(queue.every((line: any) => line.commandeNumero && line.fournisseurId === null && line.modeLivraison === 'livraison'))
  equal((await call(admin, 'PUT', orderPath, { statut: 'annulée' })).status, 200)
  const activeQueue = (await call(magasinier, 'GET', '/articles-a-commander')).body
  ok(!activeQueue.some((line: any) => line.commandeId === converted.commande.id))
  ok(!activeQueue.some((line: any) => line.reference === 'DEVIS-PENURIE'), 'L’annulation libère le stock logique et supprime aussi le manque de la commande suivante')
  passed('Demandes actives consomment la disponibilité logique ; annulation libère le stock et actualise les pénuries restantes')

  const cancelled = await call<DevisRow>(admin, 'POST', '/devis', conversionInput)
  equal(cancelled.status, 201)
  const cancelledUpdate = await call<DevisRow>(admin, 'PUT', `/devis/${cancelled.body.id}`, updatePayload(cancelled.body, { statut: 'annulé' }))
  equal(cancelledUpdate.status, 200)
  const expired = await call<DevisRow>(admin, 'POST', '/devis', { ...conversionInput, dateDevis: '2000-01-01', dateValidite: '2000-01-02' })
  equal(expired.status, 201)
  const beforeRefused = await businessCounts()
  const cancelledResult = await call(admin, 'POST', `/devis/${cancelled.body.id}/convertir`, { version: cancelledUpdate.body.version })
  equal(cancelledResult.status, 409)
  equal(cancelledResult.body.error, 'DEVIS_CANCELLED')
  const expiredResult = await call(admin, 'POST', `/devis/${expired.body.id}/convertir`, { version: expired.body.version })
  equal(expiredResult.status, 409)
  equal(expiredResult.body.error, 'DEVIS_EXPIRED')
  deepEqual(await businessCounts(), beforeRefused)
  passed('Devis annulé ou expiré : conversion refusée sans commande, approvisionnement ni audit partiel')

  const rollbackQuote = await call<DevisRow>(admin, 'POST', '/devis', { ...input, articles: [{ reference: 'DEVIS-ROLLBACK', quantite: 1, prixUnitaire: 25 }] })
  equal(rollbackQuote.status, 201)
  const beforeRollback = await businessCounts()
  await connection.query("CREATE TRIGGER test_devis_appro_failure BEFORE INSERT ON articles_a_commander FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test rollback approvisionnement'")
  try {
    equal((await call(admin, 'POST', `/devis/${rollbackQuote.body.id}/convertir`, { version: rollbackQuote.body.version })).status, 500)
    deepEqual(await businessCounts(), beforeRollback)
    const unchanged = (await call<DevisRow>(admin, 'GET', `/devis/${rollbackQuote.body.id}`)).body
    deepEqual([unchanged.statut, unchanged.version, unchanged.commandeId], ['brouillon', 1, null])
  } finally { await connection.query('DROP TRIGGER test_devis_appro_failure') }
  const retry = await call(admin, 'POST', `/devis/${rollbackQuote.body.id}/convertir`, { version: rollbackQuote.body.version })
  ok([200, 201].includes(retry.status), JSON.stringify(retry.body))
  equal(retry.body.articlesACommander[0].quantite, 1)
  passed('Échec SQL de la liste à commander : rollback devis/commande/lignes/audit, puis conversion réessayable')

  const beforeLineFailure = await businessCounts()
  await connection.query("CREATE TRIGGER test_devis_line_failure BEFORE INSERT ON devis_lines FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test rollback lignes devis'")
  try {
    equal((await call(admin, 'POST', '/devis', input)).status, 500)
    deepEqual(await businessCounts(), beforeLineFailure)
  } finally { await connection.query('DROP TRIGGER test_devis_line_failure') }
  passed('Échec d’insertion des lignes : aucun entête de devis, ligne ou journal résiduel')

  deepEqual(await stockSnapshot(), stockBefore)
  deepEqual(await fiscalSnapshot(), fiscalBefore)
  passed('Tous les devis/conversions laissent soldes, allocations, mouvements de stock et données fiscales inchangés')
  console.log(`${scenarios} groupes devis/commandes réussis sur base jetable.`)
} finally {
  await environment.close()
}
