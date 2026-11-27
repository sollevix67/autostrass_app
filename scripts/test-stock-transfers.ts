/** Tests réels sur une base créée pour ce processus puis supprimée. */
import { deepEqual, equal, ok } from 'node:assert/strict'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { ApiArticleEmplacements } from '../src/services/contracts.js'
import type { ArticleRow } from '../server/repositories/articleRepository.js'
import { createTestEnvironment } from './lib/test-environment.js'
import './test-stock-transfer-validation.js'

const environment = await createTestEnvironment()
const { connection, baseUrl } = environment
type Session = { cookie: string; csrf: string; userId: number }
let scenarios = 0

async function login(email: string): Promise<Session> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, motDePasse: 'demo1234' }),
  })
  equal(response.status, 200, 'Connexion du compte de démonstration')
  const body = await response.json() as { user: { id: number } }
  const cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
  const csrf = cookie.match(/autostrass_csrf=([^;]+)/)?.[1]
  ok(csrf)
  return { cookie, csrf: decodeURIComponent(csrf), userId: body.user.id }
}

async function call<T = { error?: string }>(
  path: string, session?: Session, body?: unknown, includeCsrf = true, method = body === undefined ? 'GET' : 'POST',
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = {}
  if (session) headers.cookie = session.cookie
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    if (session && includeCsrf) headers['x-csrf-token'] = session.csrf
  }
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })
  return { status: response.status, body: await response.json() as T }
}

function passed(label: string): void {
  scenarios += 1
  console.log(`  OK   ${label}`)
}

try {
  const admin = await login('marie.laurent@autostrass.fr')
  const magasinier = await login('karim.moreau@autostrass.fr')
  const caissier = await login('sophie.bernard@autostrass.fr')
  const reference = 'TEST/TRANSFERT + é'
  const articlePath = `/articles/${encodeURIComponent(reference)}`
  const [article] = await connection.execute<ResultSetHeader>(
    'INSERT INTO articles (reference, designation, location) VALUES (?, ?, ?)', [reference, 'Article de test transfert', 'Ancienne place'],
  )
  const articleId = article.insertId
  await connection.execute('INSERT INTO stock_balances (reference_id, quantity) VALUES (?, 10)', [articleId])
  const locations: number[] = []
  for (const code of ['TEST-A', 'TEST-B', 'TEST-INACTIF']) {
    const [location] = await connection.execute<ResultSetHeader>(
      "INSERT INTO emplacements (niveau, code, actif) VALUES ('allee', ?, ?)", [code, code !== 'TEST-INACTIF'],
    )
    locations.push(location.insertId)
  }
  const [source, destination, inactive] = locations

  async function reset(allocations: Array<[number, number]> = [], total = 10): Promise<void> {
    await connection.execute('DELETE FROM stock_par_emplacements WHERE reference_id = ?', [articleId])
    await connection.execute('UPDATE stock_balances SET quantity = ? WHERE reference_id = ?', [total, articleId])
    for (const [location, quantity] of allocations) {
      await connection.execute(
        'INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite) VALUES (?, ?, ?)',
        [articleId, location, quantity],
      )
    }
    await connection.execute('DELETE FROM stock_movements WHERE reference_id = ?', [articleId])
    await connection.execute("DELETE FROM journal_actions WHERE entite = 'article' AND entite_id = ?", [reference])
  }

  async function snapshot() {
    const [balance] = await connection.query<RowDataPacket[]>(
      'SELECT quantity, minimum_quantity FROM stock_balances WHERE reference_id = ?', [articleId],
    )
    const [legacy] = await connection.query<RowDataPacket[]>(
      'SELECT designation, location, emplacement_id FROM articles WHERE id = ?', [articleId],
    )
    const [allocations] = await connection.query<RowDataPacket[]>(
      'SELECT emplacement_id, quantite FROM stock_par_emplacements WHERE reference_id = ? ORDER BY emplacement_id', [articleId],
    )
    const [movements] = await connection.query<RowDataPacket[]>(
      'SELECT delta, reason FROM stock_movements WHERE reference_id = ? ORDER BY id', [articleId],
    )
    const [audit] = await connection.query<RowDataPacket[]>(
      "SELECT utilisateur_id, action, details FROM journal_actions WHERE entite = 'article' AND entite_id = ? ORDER BY id", [reference],
    )
    return { total: Number(balance[0].quantity), minimum: Number(balance[0].minimum_quantity), allocations, movements, audit, legacy }
  }

  async function distribution(): Promise<ApiArticleEmplacements> {
    const result = await call<ApiArticleEmplacements>(`${articlePath}/emplacements`, magasinier)
    equal(result.status, 200)
    equal(result.body.reference, reference)
    return result.body
  }

  async function transfer(body: unknown, session = magasinier) {
    return call(`${articlePath}/transfert`, session, body)
  }

  equal((await call(`${articlePath}/emplacements`)).status, 401)
  equal((await call(`${articlePath}/transfert`, undefined, {})).status, 401)
  equal((await call(`${articlePath}/emplacements`, caissier)).status, 200)
  equal((await call('/articles/inexistant/emplacements', admin)).status, 404)
  const initial = await snapshot()
  const valid = { source_emplacement_id: null, emplacement_id: source, quantite: 3 }
  equal((await call(`${articlePath}/transfert`, admin, valid, false)).status, 403)
  equal((await transfer(valid, caissier)).status, 403)
  deepEqual(await snapshot(), initial)
  passed('Lecture authentifiée, référence encodée, CSRF et rôle magasinier')

  for (const body of [
    { ...valid, emplacement_id: String(source) },
    { ...valid, quantite: 1.5 },
    { ...valid, quantite: '3' },
    { quantite: 1 },
  ]) equal((await transfer(body)).status, 422)
  deepEqual(await snapshot(), initial)
  passed('Corps invalides refusés sans déplacement ni journal')

  equal((await distribution()).quantiteNonAffectee, 10)
  equal((await transfer(valid)).status, 200)
  const afterAllocation = await distribution()
  equal(afterAllocation.quantiteTotale, 10)
  equal(afterAllocation.quantiteNonAffectee, 7)
  deepEqual(afterAllocation.emplacements, [{ emplacementId: source, chemin: 'TEST-A', quantite: 3 }])
  const allocated = await snapshot()
  deepEqual(allocated.movements, [{ delta: 0, reason: 'TRANSFERT' }])
  equal(allocated.audit[0].utilisateur_id, magasinier.userId)
  equal(allocated.audit[0].action, 'modification')
  deepEqual(JSON.parse(String(allocated.audit[0].details)), {
    type: 'TRANSFERT', source_emplacement_id: null, destination_emplacement_id: source, quantite: 3, motif: null,
  })
  passed('Allocation depuis le stock non affecté et audit de l’auteur')

  const failures: Array<[unknown, number, string]> = [
    [{ emplacement_id: destination, quantite: 1 }, 409, 'SOURCE_REQUIRED'],
    [{ ...valid, quantite: 8 }, 400, 'INSUFFICIENT_STOCK'],
    [{ ...valid, source_emplacement_id: destination }, 400, 'INVALID_SOURCE'],
    [{ ...valid, emplacement_id: inactive }, 400, 'INVALID_LOCATION'],
    [{ ...valid, emplacement_id: 4_294_967_295 }, 400, 'INVALID_LOCATION'],
  ]
  for (const [body, status, code] of failures) {
    const result = await transfer(body)
    equal(result.status, status, code)
    equal(result.body.error, code)
    deepEqual(await snapshot(), allocated, code)
  }
  passed('Origine ambiguë, stock insuffisant et emplacements invalides refusés')

  equal((await transfer({ source_emplacement_id: source, emplacement_id: destination, quantite: 2, motif: '  Rangement  ' })).status, 200)
  const partial = await distribution()
  equal(partial.quantiteTotale, 10)
  equal(partial.quantiteNonAffectee, 7)
  deepEqual(partial.emplacements.map((row) => row.quantite), [1, 2])
  const afterPartial = await snapshot()
  equal(JSON.parse(String(afterPartial.audit[1].details)).motif, 'Rangement')
  passed('Transfert partiel : retrait exact de la source et conservation du total')

  for (const path of ['/articles', '/stock']) {
    const listed = await call<ArticleRow[]>(path, admin)
    equal(listed.status, 200)
    const matches = listed.body.filter((row) => row.reference === reference)
    equal(matches.length, 1, `${path} ne doit pas dupliquer les articles répartis`)
    equal(matches[0].quantite, 10)
    ok(matches[0].emplacement.includes('TEST-A'))
    ok(matches[0].emplacement.includes('TEST-B'))
  }
  passed('Une seule ligne par article dans les listes après répartition')

  equal((await transfer({ source_emplacement_id: source, emplacement_id: destination, quantite: 1 }, admin)).status, 200)
  deepEqual((await distribution()).emplacements, [{ emplacementId: destination, chemin: 'TEST-B', quantite: 3 }])
  passed('Fusion avec la destination existante et suppression de la source épuisée')

  const beforeNoop = await snapshot()
  equal((await transfer({ source_emplacement_id: destination, emplacement_id: destination, quantite: 2 })).status, 200)
  equal((await transfer({ source_emplacement_id: null, emplacement_id: null, quantite: 2 })).status, 200)
  deepEqual(await snapshot(), beforeNoop)
  passed('Source identique à la destination : aucun changement ni journal')

  equal((await transfer({ source_emplacement_id: destination, emplacement_id: null, destination_id: source, quantite: 3 })).status, 200)
  deepEqual((await distribution()).emplacements, [])
  equal((await distribution()).quantiteNonAffectee, 10)
  equal((await call<ArticleRow>(articlePath, admin)).body.emplacement, '')
  equal((await transfer({ destination_id: source, quantite: 10 })).status, 200)
  equal((await transfer({ emplacement_id: destination, quantite: 10 })).status, 200)
  equal((await distribution()).quantiteNonAffectee, 0)
  passed('Destination nulle prioritaire, alias historique et origine unique déduite')

  await reset([[source, 11]])
  const inconsistent = await snapshot()
  const refused = await transfer({ source_emplacement_id: source, emplacement_id: destination, quantite: 1 })
  equal(refused.status, 409)
  equal(refused.body.error, 'INCONSISTENT_STOCK')
  deepEqual(await snapshot(), inconsistent)
  passed('Allocations historiques excédentaires signalées sans réécriture')

  const catalogue = (await call<ArticleRow>(articlePath, magasinier)).body
  function editQuantity(quantite: number, designation = 'Article modifié', minimum = 2) {
    return call<ArticleRow & { error?: string }>(articlePath, magasinier, {
      ...catalogue, category: 'freins', designation, minimum, quantite,
    }, true, 'PUT')
  }
  function adjust(delta: number | string) {
    return call<{ quantite?: number, error?: string }>(`${articlePath}/quantite`, magasinier, { delta }, true, 'PATCH')
  }

  equal((await adjust(1)).body.error, 'INCONSISTENT_STOCK')
  equal((await editQuantity(12)).body.error, 'INCONSISTENT_STOCK')
  deepEqual(await snapshot(), inconsistent)
  equal((await editQuantity(inconsistent.total, 'Ancien article', 3)).status, 200)
  const metadata = await snapshot()
  equal(metadata.minimum, 3)
  deepEqual(metadata.allocations, inconsistent.allocations)
  deepEqual(metadata.movements, inconsistent.movements)
  passed('Un stock historique excédentaire exige un inventaire pour modifier sa quantité')

  await reset([[source, 3], [destination, 2]], 5)
  const fullyAllocated = await snapshot()
  for (const result of [await adjust(-1), await editQuantity(4)]) {
    equal(result.status, 409)
    equal(result.body.error, 'INSUFFICIENT_STOCK')
  }
  deepEqual(await snapshot(), fullyAllocated)
  equal((await transfer({ source_emplacement_id: source, emplacement_id: null, quantite: 1 })).status, 200)
  equal((await adjust(-1)).body.quantite, 4)
  equal((await distribution()).quantiteNonAffectee, 0)
  passed('Retrait et édition sous les allocations refusés, transfert puis retrait exact possibles')

  await reset([[source, 5]], 10)
  equal((await adjust(-5)).body.quantite, 5)
  equal((await adjust(2)).body.quantite, 7)
  equal((await editQuantity(6)).body.quantite, 6)
  equal((await editQuantity(6)).body.quantite, 6)
  const changed = await snapshot()
  deepEqual(changed.allocations, [{ emplacement_id: source, quantite: 5 }])
  deepEqual(changed.movements, [-5, 2, -1].map((delta) => ({ delta, reason: 'AJUSTEMENT_MANUEL' })))
  passed('Stock non affecté ajusté et chaque variation réelle journalisée une fois, y compris en édition')

  await reset([], 0)
  equal((await adjust(-1)).body.error, 'INSUFFICIENT_STOCK')
  equal((await adjust('1.5')).status, 422)
  equal((await editQuantity(0.001)).status, 422)
  deepEqual((await snapshot()).movements, [])
  await reset([], 2_147_483_647)
  equal((await adjust(1)).status, 422)
  equal((await snapshot()).total, 2_147_483_647)
  passed('Stock vide, quantités fractionnaires et dépassement de capacité refusés sans mouvement')

  await reset()
  const beforeAdjustmentFailure = await snapshot()
  await connection.query(`CREATE TRIGGER test_refuse_adjustment BEFORE INSERT ON stock_movements
    FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Echec mouvement simule'`)
  try {
    equal((await adjust(-1)).status, 500)
    equal((await editQuantity(7, 'Changement annulé', 4)).status, 500)
    deepEqual(await snapshot(), beforeAdjustmentFailure)
  } finally {
    await connection.query('DROP TRIGGER test_refuse_adjustment')
  }
  passed('Échec du journal de stock : ajustement et édition annulés')

  for (const withdrawal of [() => adjust(-3), () => editQuantity(7)]) {
    await reset([[source, 6]], 10)
    const [removed, moved] = await Promise.all([
      withdrawal(), transfer({ source_emplacement_id: null, emplacement_id: destination, quantite: 3 }),
    ])
    ok((removed.status === 200 && moved.status === 400) || (removed.status === 409 && moved.status === 200))
    equal((await distribution()).quantiteNonAffectee, 1)
    equal((await snapshot()).movements.length, 1)
  }
  passed('Ajustement ou édition en concurrence avec un transfert : le stock disponible ne sert qu’une fois')

  for (const origin of [source, null]) {
    await reset(origin === null ? [] : [[source, 10]])
    const results = await Promise.all([1, 2].map(() => transfer({
      source_emplacement_id: origin, emplacement_id: destination, quantite: 7,
    })))
    deepEqual(results.map((result) => result.status).sort(), [200, 400])
    equal(results.find((result) => result.status === 400)?.body.error, 'INSUFFICIENT_STOCK')
    const concurrent = await snapshot()
    equal(concurrent.total, 10)
    equal(concurrent.allocations.find((row) => row.emplacement_id === destination)?.quantite, 7)
    equal(concurrent.movements.length, 1)
    equal(concurrent.audit.length, 1)
  }
  passed('Deux transferts concurrents ne consomment pas deux fois le stock')

  await reset([[source, 10]])
  const beforeFailure = await snapshot()
  await connection.query(`CREATE TRIGGER test_refuse_transfer_audit BEFORE INSERT ON journal_actions
    FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Echec audit simule'`)
  try {
    equal((await transfer({ source_emplacement_id: source, emplacement_id: destination, quantite: 10 })).status, 500)
    deepEqual(await snapshot(), beforeFailure)
  } finally {
    await connection.query('DROP TRIGGER test_refuse_transfer_audit')
  }
  passed('Échec de journalisation : déplacement et mouvement entièrement annulés')

  await reset()
  const [deletable] = await connection.execute<ResultSetHeader>(
    "INSERT INTO emplacements (niveau, code) VALUES ('allee', 'TEST-SUPPRESSION')",
  )
  // La suppression et le transfert sont concurrents. Quel que soit l'ordre,
  // une allocation validée doit toujours conserver sa destination.
  const [deletion, arrival] = await Promise.all([
    fetch(`${baseUrl}/api/emplacements/${deletable.insertId}`, {
      method: 'DELETE', headers: { cookie: admin.cookie, 'x-csrf-token': admin.csrf },
    }),
    transfer({ source_emplacement_id: null, emplacement_id: deletable.insertId, quantite: 1 }),
  ])
  ok((deletion.status === 204 && arrival.status === 400)
    || (deletion.status === 400 && arrival.status === 200), 'Une seule des deux opérations doit réussir')
  const [orphans] = await connection.query<RowDataPacket[]>(
    `SELECT spe.emplacement_id FROM stock_par_emplacements spe
     LEFT JOIN emplacements e ON e.id = spe.emplacement_id
     WHERE spe.reference_id = ? AND e.id IS NULL`, [articleId],
  )
  equal(orphans.length, 0)
  equal((await snapshot()).total, 10)
  passed('Suppression concurrente : aucune allocation vers un emplacement absent')

  console.log(`Transferts : ${scenarios}/${scenarios} scénarios réussis.`)
  if (process.argv.includes('--all')) {
    await environment.restartApi()
    await environment.runScript('scripts/test-api.ts')
    await environment.restartApi()
    await environment.runScript('scripts/test-security.ts')
  }
} finally {
  await environment.close()
  console.log('API de test arrêtée et base jetable supprimée.')
}
