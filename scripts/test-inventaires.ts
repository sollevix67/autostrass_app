/** Comptages physiques sur MariaDB jetable ; aucun accès à DB_NAME. */
import { deepEqual, equal, ok } from 'node:assert/strict'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { createTestEnvironment } from './lib/test-environment.js'
import type { ApiInventaire, ApiInventairePreparation } from '../src/services/contracts.js'
import type { InventaireInput } from '../src/schemas/inventaire.js'

const environment = await createTestEnvironment()
const { connection, baseUrl } = environment
type Session = { cookie: string; csrf: string; userId: number }
let scenarios = 0
function pass(label: string) { scenarios++; console.log(`OK ${label}`) }
async function login(email: string): Promise<Session> {
  const response = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, motDePasse: 'demo1234' }) })
  equal(response.status, 200)
  const body = await response.json() as { csrfToken: string; user: { id: number } }
  return { cookie: response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; '), csrf: body.csrfToken, userId: body.user.id }
}
async function call<T = { error: string }>(path: string, session?: Session, method = 'GET', body?: unknown, csrf = true) {
  const response = await fetch(`${baseUrl}/api${path}`, { method, headers: {
    'content-type': 'application/json', ...(session ? { cookie: session.cookie, ...(csrf ? { 'x-csrf-token': session.csrf } : {}) } : {}),
  }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) })
  const content = await response.text()
  return { status: response.status, data: (content ? JSON.parse(content) : null) as T }
}

try {
  const admin = await login('marie.laurent@autostrass.fr')
  const magasinier = await login('karim.moreau@autostrass.fr')
  const caissier = await login('sophie.bernard@autostrass.fr')
  const reference = 'TEST/INVENTAIRE + é'
  const path = `/inventaires/${encodeURIComponent(reference)}`
  const articlePath = `/articles/${encodeURIComponent(reference)}`
  const [article] = await connection.execute<ResultSetHeader>("INSERT INTO articles (reference, designation, location) VALUES (?, 'Pièce à compter', 'Ancienne place')", [reference])
  const articleId = article.insertId
  await connection.execute('INSERT INTO stock_balances (reference_id, quantity, minimum_quantity) VALUES (?, 10, 3)', [articleId])
  const locations: number[] = []
  for (const code of ['INV-A', 'INV-B', 'INV-C', 'INV-INACTIF']) {
    const [location] = await connection.execute<ResultSetHeader>("INSERT INTO emplacements (niveau, code, actif) VALUES ('allee', ?, ?)", [code, code !== 'INV-INACTIF'])
    locations.push(location.insertId)
  }
  const [source, destination, extra, inactive] = locations
  async function reset(total = 10, allocations: Array<[number, number]> = [[source, 6], [destination, 2]]) {
    await connection.execute('UPDATE stock_balances SET quantity = ? WHERE reference_id = ?', [total, articleId])
    await connection.execute('DELETE FROM stock_par_emplacements WHERE reference_id = ?', [articleId])
    for (const [id, quantity] of allocations) await connection.execute('INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite) VALUES (?, ?, ?)', [articleId, id, quantity])
  }
  async function snapshot() {
    const [balance] = await connection.query<RowDataPacket[]>('SELECT quantity, minimum_quantity FROM stock_balances WHERE reference_id = ?', [articleId])
    const [allocations] = await connection.query<RowDataPacket[]>('SELECT emplacement_id, quantite FROM stock_par_emplacements WHERE reference_id = ? ORDER BY emplacement_id', [articleId])
    const [history] = await connection.query<RowDataPacket[]>('SELECT * FROM inventaires_stock WHERE reference = ? ORDER BY id', [reference])
    const [movements] = await connection.query<RowDataPacket[]>('SELECT delta, reason FROM stock_movements WHERE reference_id = ? ORDER BY id', [articleId])
    const [audit] = await connection.query<RowDataPacket[]>("SELECT utilisateur_id, details FROM journal_actions WHERE entite = 'article' AND entite_id = ? ORDER BY id", [reference])
    return { balance: balance[0], allocations, history, movements, audit }
  }
  async function prepare() {
    const response = await call<ApiInventairePreparation>(path, magasinier)
    equal(response.status, 200)
    return response.data
  }
  function input(stock: ApiInventairePreparation, quantities?: number[]): InventaireInput {
    return { version: stock.version, motif: 'Contrôle physique du rayon', lignes: stock.lignes.map((line, index) => ({ emplacementId: line.emplacementId, quantiteComptee: quantities?.[index] ?? line.quantiteAvant })) }
  }
  await reset()
  equal((await call(path)).status, 401)
  equal((await call('/inventaires')).status, 401)
  equal((await call(path, undefined, 'POST', {})).status, 401)
  for (const endpoint of [path, '/inventaires']) equal((await call(endpoint, caissier)).status, 403)
  equal((await call(path, caissier, 'POST', {})).status, 403)
  equal((await call('/inventaires/inconnu', admin)).status, 404)
  const preparation = await prepare()
  equal(preparation.reference, reference)
  equal(preparation.quantiteTotale, 10)
  equal(preparation.incoherent, false)
  deepEqual(preparation.lignes.map((line) => line.quantiteAvant), [2, 6, 2])
  equal((await call(path, magasinier, 'POST', input(preparation), false)).status, 403)
  pass('Lecture cohérente, référence encodée, authentification, rôles et CSRF')

  const before = await snapshot()
  const valid = input(preparation)
  for (const body of [
    { ...valid, version: 'invalide' }, { ...valid, motif: '' }, { ...valid, motif: '\u200B' },
    { ...valid, motif: '<script>alert(1)</script>' }, { ...valid, motif: 'x'.repeat(256) },
    { ...valid, lignes: [] }, { ...valid, lignes: valid.lignes.slice(1) },
    { ...valid, lignes: [...valid.lignes, valid.lignes[0]] },
    ...[-1, 0.5, '2', null, 2147483648].map((value) => ({ ...valid, lignes: [{ emplacementId: null, quantiteComptee: value }, ...valid.lignes.slice(1)] })),
    { ...valid, lignes: [{ emplacementId: null, quantiteComptee: 2147483647 }, ...valid.lignes.slice(1)] },
    { ...valid, lignes: [{ emplacementId: String(source), quantiteComptee: 2 }, ...valid.lignes] },
    { ...valid, lignes: valid.lignes.slice(0, 2) },
    { ...valid, lignes: [...valid.lignes, { emplacementId: 4294967295, quantiteComptee: 1 }] },
    { ...valid, lignes: [...valid.lignes, { emplacementId: inactive, quantiteComptee: 1 }] },
  ]) equal((await call(path, magasinier, 'POST', body)).status, 422, JSON.stringify(body))
  equal((await call('/inventaires?before=-1', admin)).status, 422)
  deepEqual(await snapshot(), before)
  pass('Quantités, total, exhaustivité, unicité, motif et emplacements invalides refusés sans écriture')

  const counted = { ...input(preparation, [1, 5, 0]), lignes: [...input(preparation, [1, 5, 0]).lignes, { emplacementId: extra, quantiteComptee: 3 }], auteur: 'Usurpation', utilisateurId: admin.userId }
  const record = await call<ApiInventaire>(path, magasinier, 'POST', counted)
  equal(record.status, 201)
  equal(record.data.quantiteAvant, 10)
  equal(record.data.quantiteComptee, 9)
  equal(record.data.utilisateurId, magasinier.userId)
  ok(record.data.auteur.includes('Karim'))
  const corrected = await snapshot()
  deepEqual(corrected.balance, { quantity: 9, minimum_quantity: 3 })
  deepEqual(corrected.allocations, [{ emplacement_id: source, quantite: 5 }, { emplacement_id: extra, quantite: 3 }])
  deepEqual(corrected.movements, [{ delta: -1, reason: 'INVENTAIRE_PHYSIQUE' }])
  const audit = JSON.parse(String(corrected.audit[0].details))
  equal(audit.inventaireId, record.data.id)
  deepEqual(audit.lignes, record.data.lignes)
  const [legacy] = await connection.query<RowDataPacket[]>('SELECT location, emplacement_id FROM articles WHERE id = ?', [articleId])
  deepEqual(legacy[0], { location: '', emplacement_id: null })
  equal((await call(path, magasinier, 'POST', counted)).status, 409)
  deepEqual(await snapshot(), corrected)
  pass('Ajustement négatif, nouvelle allocation, allocation épuisée, auteur serveur, audit et double envoi')

  const unchanged = await prepare()
  equal((await call(path, admin, 'POST', input(unchanged))).status, 201)
  ok((await prepare()).version !== unchanged.version)
  const afterUnchanged = await snapshot()
  equal(afterUnchanged.movements.at(-1)?.delta, 0)
  equal((await call(path, admin, 'POST', input(unchanged))).status, 409)
  pass('Comptage sans écart conservé et consommé une seule fois')

  const positive = await prepare()
  equal((await call(path, admin, 'POST', input(positive, [12, 5, 3]))).status, 201)
  equal((await snapshot()).balance.quantity, 20)
  const zero = await prepare()
  equal((await call(path, admin, 'POST', input(zero, zero.lignes.map(() => 0)))).status, 201)
  const empty = await snapshot()
  equal(empty.balance.quantity, 0)
  deepEqual(empty.allocations, [])
  equal(empty.movements.at(-1)?.delta, -20)
  pass('Écart positif puis comptage à zéro et nettoyage complet des allocations')

  await reset(10, [[source, 10], [destination, 10]])
  const inconsistent = await prepare()
  equal(inconsistent.incoherent, true)
  equal(inconsistent.lignes[0].quantiteAvant, -10)
  equal((await call(path, admin, 'POST', input(inconsistent, [0, 4, 6]))).status, 201)
  equal((await prepare()).incoherent, false)
  equal((await snapshot()).balance.quantity, 10)
  pass('Réconciliation explicite d’allocations historiques incohérentes par comptage complet')

  await reset(10, [[inactive, 5], [4294967294, 5]])
  const orphan = await prepare()
  equal((await call(path, admin, 'POST', input(orphan, [0, 5, 1]))).status, 422)
  equal((await call(path, admin, 'POST', input(orphan, [0, 5, 0]))).status, 201)
  deepEqual((await snapshot()).allocations, [{ emplacement_id: inactive, quantite: 5 }])
  pass('Emplacement inactif existant comptable et allocation orpheline vidable uniquement')

  await reset()
  const concurrent = await prepare()
  const requests = await Promise.all([
    call(path, admin, 'POST', input(concurrent, [0, 7, 2])),
    call(path, magasinier, 'POST', input(concurrent, [0, 8, 2])),
  ])
  deepEqual(requests.map((result) => result.status).sort(), [201, 409])
  ok([9, 10].includes((await snapshot()).balance.quantity))
  pass('Deux comptages simultanés : un seul résultat appliqué')

  await reset()
  const stale = await prepare()
  equal((await call(`${articlePath}/transfert`, magasinier, 'POST', { source_emplacement_id: source, emplacement_id: destination, quantite: 1 })).status, 200)
  const moved = await snapshot()
  equal((await call(path, magasinier, 'POST', input(stale))).status, 409)
  deepEqual(await snapshot(), moved)
  pass('Transfert intermédiaire détecté malgré un total inchangé')

  const beforeAdjustment = await prepare()
  for (const delta of [1, -1]) equal((await call(`${articlePath}/quantite`, admin, 'PATCH', { delta })).status, 200)
  equal((await call(path, admin, 'POST', input(beforeAdjustment))).status, 409)
  pass('Mouvements intermédiaires détectés même après retour au stock initial')

  await reset()
  const rollback = await prepare()
  const rollbackBefore = await snapshot()
  await connection.query("CREATE TRIGGER fail_inventory_audit BEFORE INSERT ON journal_actions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test rollback inventaire'")
  try { equal((await call(path, admin, 'POST', input(rollback, [0, 1, 1]))).status, 500) }
  finally { await connection.query('DROP TRIGGER fail_inventory_audit') }
  deepEqual(await snapshot(), rollbackBefore)
  equal((await call(path, admin, 'POST', input(rollback, [0, 1, 1]))).status, 201)
  pass('Échec du journal : rollback intégral du stock, allocations et historique, puis nouvelle tentative')

  const independentPaths: string[] = []
  for (const ref of ['INV-PAR-A', 'INV-PAR-B', 'INV-PAR-C']) {
    const [row] = await connection.execute<ResultSetHeader>("INSERT INTO articles (reference, designation) VALUES (?, 'Comptage parallèle')", [ref])
    await connection.execute('INSERT INTO stock_balances (reference_id, quantity) VALUES (?, 0)', [row.insertId])
    independentPaths.push(`/inventaires/${ref}`)
  }
  const independent = await Promise.all(independentPaths.map((endpoint) => call<ApiInventairePreparation>(endpoint, admin)))
  const recorded = await Promise.all(independentPaths.map((endpoint, index) => call(endpoint, admin, 'POST', input(independent[index].data, [2]))))
  deepEqual(recorded.map((result) => result.status), [201, 201, 201])
  pass('Références distinctes sans allocations : comptages parallèles sans conflit d’intervalle')

  await reset()
  const beforeDeletion = await prepare()
  const deletionCount = input(beforeDeletion)
  deletionCount.lignes.push({ emplacementId: extra, quantiteComptee: 1 })
  const [countResult, deletionResult] = await Promise.all([
    call(path, admin, 'POST', deletionCount),
    call(`/emplacements/${extra}`, magasinier, 'DELETE'),
  ])
  ok(countResult.status === 201 && deletionResult.status === 400
    || countResult.status === 422 && deletionResult.status === 204)
  const [orphans] = await connection.query<RowDataPacket[]>(
    'SELECT spe.emplacement_id FROM stock_par_emplacements spe LEFT JOIN emplacements e ON e.id = spe.emplacement_id WHERE spe.reference_id = ? AND e.id IS NULL', [articleId],
  )
  equal(orphans.length, 0)
  pass('Suppression concurrente d’un nouvel emplacement : aucune allocation orpheline créée')

  const history = await call<ApiInventaire[]>(`/inventaires?reference=${encodeURIComponent(reference)}`, magasinier)
  equal(history.status, 200)
  ok(history.data.length >= 8)
  const first = history.data[0]
  const older = await call<ApiInventaire[]>(`/inventaires?reference=${encodeURIComponent(reference)}&before=${first.id}`, admin)
  ok(older.data.every((item) => item.id < first.id))
  equal(older.data.length, history.data.length - 1)
  equal((await call(`/inventaires/${first.id}`, admin, 'DELETE')).status, 404)
  equal((await call(`/inventaires/${first.id}`, admin, 'PUT', {})).status, 404)
  await connection.execute('UPDATE emplacements SET code = ? WHERE id = ?', ['INV-RENOMME', source])
  await connection.execute('DELETE FROM articles WHERE id = ?', [articleId])
  const retained = await call<ApiInventaire[]>(`/inventaires?reference=${encodeURIComponent(reference)}`, admin)
  deepEqual(retained.data, history.data)
  pass('Historique filtré, paginé, sans édition/suppression, conservé après renommage et suppression d’article')
  console.log(`${scenarios} scénarios d’inventaire réussis.`)
} finally {
  await environment.close()
}
