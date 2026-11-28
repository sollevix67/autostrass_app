/** Réceptions, concurrence et attributions sur une API et une base jetables. */
import { deepEqual, equal, ok } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { dateParis } from '../server/services/documentNumbers.js'
import { createTestEnvironment } from './lib/test-environment.js'

type Need = { id: number; commandeId: number; quantite: number }
type Received = { ligne: number; quantite: number }
const env = await createTestEnvironment()
const { baseUrl, connection } = env
try {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'marie.laurent@autostrass.fr', motDePasse: 'demo1234' }),
  })
  equal(login.status, 200)
  const cookie = login.headers.getSetCookie().map((part) => part.split(';')[0]).join('; ')
  const csrf = decodeURIComponent(cookie.match(/autostrass_csrf=([^;]+)/)![1])
  async function request(method: string, path: string, body?: unknown) {
    return fetch(`${baseUrl}/api${path}`, {
      method, headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
    })
  }
  async function api<T>(status: number, method: string, path: string, body?: unknown): Promise<T> {
    const response = await request(method, path, body)
    const value = await response.json()
    equal(response.status, status, JSON.stringify(value))
    return value as T
  }
  const rows = async (sql: string, params: (number | string)[] = []) =>
    (await connection.query<RowDataPacket[]>(sql, params))[0]
  const clientId = Number((await rows('SELECT id FROM clients ORDER BY id LIMIT 1'))[0].id)
  const fournisseurId = Number((await rows('SELECT id FROM fournisseurs WHERE actif = 1 ORDER BY id LIMIT 1'))[0].id)
  const affectation = { fournisseurId, modeLivraison: 'livraison' }
  async function createArticle(reference: string, quantity = 0) {
    const [insert] = await connection.execute<ResultSetHeader>(
      `INSERT INTO articles (reference, designation, category, unit_price_ht, tva_id)
       VALUES (?, ?, 'freins', 2, (SELECT id FROM tva WHERE taux = 20 LIMIT 1))`, [reference, reference],
    )
    await connection.execute('INSERT INTO stock_balances (reference_id, quantity) VALUES (?, ?)', [insert.insertId, quantity])
    return insert.insertId
  }
  async function createNeed(reference: string, quantite: number): Promise<Need> {
    const quote = await api<{ id: number; version: number }>(201, 'POST', '/devis', {
      clientId, dateDevis: dateParis(), articles: [{ reference, quantite, prixUnitaire: 2 }],
    })
    const { articlesACommander } = await api<{ articlesACommander: Need[] }>(200, 'POST', `/devis/${quote.id}/convertir`, { version: quote.version })
    equal(articlesACommander.length, 1)
    await api(200, 'PUT', `/articles-a-commander/${articlesACommander[0].id}`, affectation)
    return articlesACommander[0]
  }
  async function createOrder(needs: Need[]) {
    return api<{ id: number; articles: Array<{ besoinId: number; ligne: number; quantite: number }> }>(201, 'POST', '/commandes-fournisseurs', {
      ...affectation, cleCommande: randomUUID(), articles: needs.map((need) => ({ besoinId: need.id, quantite: need.quantite, prixUnitaire: 1.25 })),
    })
  }
  function receive(commandeId: number, articles: Received[], cleOperation = randomUUID()) {
    return api<{ receptionId: number }>(201, 'POST', `/commandes-fournisseurs/${commandeId}/receptions`, { cleOperation, articles })
  }
  async function receiptLines(id: number) {
    return (await api<{ articles: Array<{ ligneCommandeFournisseur: number; quantiteAttribuee: number }> }>(200, 'GET', `/receptions/${id}`)).articles
  }
  const qty = (ligne: number, quantite: number) => ({ ligne, quantite })
  const orderPath = (id: number) => `/commandes-fournisseurs/${id}/receptions`

  const commonId = await createArticle('ACHAT-HORS-ORDRE')
  const first = await createNeed('ACHAT-HORS-ORDRE', 5)
  const second = await createNeed('ACHAT-HORS-ORDRE', 5)
  const firstOrder = await createOrder([first])
  const secondOrder = await createOrder([second])
  const sameKey = randomUUID()
  const received = await Promise.all([receive(secondOrder.id, [qty(1, 5)], sameKey), receive(secondOrder.id, [qty(1, 5)], sameKey)])
  equal(received[0].receptionId, received[1].receptionId)
  equal((await receiptLines(received[0].receptionId))[0].quantiteAttribuee, 5)
  equal((await rows('SELECT quantity FROM stock_balances WHERE reference_id = ?', [commonId]))[0].quantity, 5)
  const toOrder = await api<Need[]>(200, 'GET', '/articles-a-commander')
  ok(!toOrder.some((row) => row.id === first.id || row.id === second.id))
  const receivedFirst = await receive(firstOrder.id, [qty(1, 5)])
  equal((await receiptLines(receivedFirst.receptionId))[0].quantiteAttribuee, 5)
  equal((await rows("SELECT COUNT(*) AS n FROM stock_movements WHERE reason = 'RECEPTION_FOURNISSEUR' AND reference_id = ?", [commonId]))[0].n, 2)
  equal((await rows('SELECT quantity FROM stock_balances WHERE reference_id = ?', [commonId]))[0].quantity, 10)
  equal((await rows('SELECT COUNT(*) AS n FROM stock_par_emplacements WHERE reference_id = ?', [commonId]))[0].n, 0)
  const conflict = await api<{ error: string }>(409, 'POST', orderPath(secondOrder.id), { cleOperation: sameKey, articles: [qty(1, 4)] })
  equal(conflict.error, 'RECEPTION_REPLAY_CONFLICT')
  console.log('OK Réceptions dans l’ordre inverse des commandes clients, dédoublonnage simultané et conflit de rejeu')

  // La consommation du stock fait renaître un manque physique, sans réattribuer une deuxième fois la ligne client.
  await connection.execute('UPDATE stock_balances SET quantity = 5 WHERE reference_id = ?', [commonId])
  const missing = (await api<Need[]>(200, 'GET', '/articles-a-commander')).find((need) => need.id === second.id)
  ok(missing)
  equal(missing.quantite, 5)
  const repeated = await createOrder([missing])
  const replenished = await receive(repeated.id, [qty(1, 5)])
  equal((await receiptLines(replenished.receptionId))[0].quantiteAttribuee, 0)
  console.log('OK Reconstitution d’un stock consommé sans dépasser la quantité attribuée à la ligne client')

  const groupId = await createArticle('ACHAT-CLOTURE')
  const group: Need[] = []
  for (let index = 0; index < 3; index++) group.push(await createNeed('ACHAT-CLOTURE', 3))
  const grouped = await createOrder(group)
  await api(200, 'PUT', `/commandes/${group[0].commandeId}`, { statut: 'annulée' })
  await api(200, 'PUT', `/commandes/${group[1].commandeId}`, { statut: 'expédiée' })
  await connection.execute('UPDATE stock_balances SET quantity = 2 WHERE reference_id = ?', [groupId])
  const receivedLines = grouped.articles.map(({ ligne, quantite }) => qty(ligne, quantite))
  const groupedKey = randomUUID()
  const groupedReceipt = await receive(grouped.id, receivedLines, groupedKey)
  equal((await receive(grouped.id, [...receivedLines].reverse(), groupedKey)).receptionId, groupedReceipt.receptionId)
  const actualLines = await receiptLines(groupedReceipt.receptionId)
  for (const { ligne, besoinId } of grouped.articles) {
    const actual = actualLines.find((item) => item.ligneCommandeFournisseur === ligne)
    equal(actual?.quantiteAttribuee, besoinId === group[2].id ? 1 : 0)
  }
  equal((await rows('SELECT quantity FROM stock_balances WHERE reference_id = ?', [groupId]))[0].quantity, 11)
  console.log('OK Quantités plafonnées après entrée de stock, annulation ou expédition ; surplus physique conservé')

  const locationArticle = await createArticle('ACHAT-EMPLACEMENTS', 3)
  const locationIds: number[] = []
  for (const [index, active] of [false, true, true].entries()) {
    const [place] = await connection.execute<ResultSetHeader>(
      "INSERT INTO emplacements (niveau, code, actif) VALUES ('allee', ?, ?)", [`ACHAT-TEST-${index}`, active],
    )
    await connection.execute('INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite) VALUES (?, ?, 1)', [locationArticle, place.insertId])
    locationIds.push(place.insertId)
  }
  const locationOrder = await createOrder([await createNeed('ACHAT-EMPLACEMENTS', 7)])
  const path = orderPath(locationOrder.id)
  const payload = { cleOperation: randomUUID(), articles: [qty(1, 4)] }
  await api(422, 'POST', path, { ...payload, articles: [qty(1, 1), qty(1, 1)] })
  await api(422, 'POST', path, { ...payload, articles: [qty(2, 1)] })
  await api(409, 'POST', path, { ...payload, articles: [qty(1, 5)] })
  const snapshot = async () => ({
    stock: await rows('SELECT quantity FROM stock_balances WHERE reference_id = ?', [locationArticle]),
    places: await rows('SELECT emplacement_id, quantite FROM stock_par_emplacements WHERE reference_id = ? ORDER BY emplacement_id', [locationArticle]),
    movements: await rows('SELECT id, delta FROM stock_movements WHERE reference_id = ?', [locationArticle]),
    received: await rows('SELECT quantite_recue FROM commande_four_lines WHERE commande_id = ?', [locationOrder.id]),
    status: await rows('SELECT statut FROM commandes_fournisseurs WHERE id = ?', [locationOrder.id]),
    history: await rows('SELECT r.id, l.ligne FROM receptions r LEFT JOIN reception_lines l ON l.reception_id = r.id WHERE r.commande_fournisseur_id = ?', [locationOrder.id]),
    audit: await rows("SELECT id FROM journal_actions WHERE entite = 'article' AND entite_id = 'ACHAT-EMPLACEMENTS'"),
  })
  const initial = await snapshot()
  await connection.query("CREATE TRIGGER test_rollback_reception BEFORE INSERT ON journal_actions FOR EACH ROW BEGIN IF NEW.entite = 'reception' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Arrêt pour test de réception'; END IF; END")
  try {
    await api(500, 'POST', path, payload)
    deepEqual(await snapshot(), initial)
  } finally {
    await connection.query('DROP TRIGGER test_rollback_reception')
  }
  const competitors = await Promise.all([request('POST', path, payload), request('POST', path, { ...payload, cleOperation: randomUUID() })])
  deepEqual(competitors.map((response) => response.status).sort(), [201, 409])
  const after = await snapshot()
  deepEqual(after.places.map((place) => [place.emplacement_id, place.quantite]), locationIds.map((id, index) => [id, index === 1 ? 5 : 1]))
  equal(after.stock[0].quantity, 7)
  equal(after.received[0].quantite_recue, 4)
  equal(after.status[0].statut, 'reçue')
  equal(after.history.length, 1)
  equal(after.audit.length, initial.audit.length + 1)
  equal(after.movements.length, initial.movements.length + 1)
  const receiptPath = `/receptions/${after.history[0].id}`
  await api(409, 'DELETE', receiptPath)
  await api(409, 'PUT', receiptPath, { notes: 'Correction historique' })
  await api(409, 'PUT', receiptPath + '/lignes', { articles: [{ reference: 'ACHAT-EMPLACEMENTS', designation: 'Article', quantite: 1, prixUnitaire: 1.25 }] })
  console.log('OK Refus des doubles lignes et dépassements, annulation intégrale sur erreur d’audit, concurrence et dépôt dans le premier emplacement actif')
  console.log('OK Protection de la réception, de son en-tête et de ses lignes dans les routes historiques')

  const legacyArticle = await createArticle('ACHAT-ANCIEN')
  async function legacyOrder(statut: string) {
    const [order] = await connection.execute<ResultSetHeader>(
      'INSERT INTO commandes_fournisseurs (fournisseur_id, date_commande, statut) VALUES (?, ?, ?)', [fournisseurId, dateParis(), statut],
    )
    await connection.execute(
      "INSERT INTO commande_four_lines (commande_id, ligne, reference, designation, quantite, prix_unitaire) VALUES (?, 1, 'ACHAT-ANCIEN', 'Stock ancien', 2, 1)",
      [order.insertId],
    )
    return order.insertId
  }
  const unknown = await legacyOrder('partielle')
  const unknownBalance = await api<{ error: string }>(409, 'POST', orderPath(unknown), { cleOperation: randomUUID(), articles: [qty(1, 1)] })
  equal(unknownBalance.error, 'RELIQUAT_HISTORIQUE_INCONNU')
  equal((await rows('SELECT quantity FROM stock_balances WHERE reference_id = ?', [legacyArticle]))[0].quantity, 0)
  equal((await rows('SELECT COUNT(*) AS n FROM receptions WHERE commande_fournisseur_id = ?', [unknown]))[0].n, 0)
  const known = await legacyOrder('envoyée')
  const partial = await receive(known, [qty(1, 1)])
  equal((await receiptLines(partial.receptionId))[0].quantiteAttribuee, 0)
  await receive(known, [qty(1, 1)])
  equal((await rows('SELECT quantity FROM stock_balances WHERE reference_id = ?', [legacyArticle]))[0].quantity, 2)
  equal((await rows('SELECT statut FROM commandes_fournisseurs WHERE id = ?', [known]))[0].statut, 'reçue')
  console.log('OK Reliquat historique inconnu refusé ; ancienne commande envoyée reçue en deux fois avec traçabilité')
} finally {
  await env.close()
}
