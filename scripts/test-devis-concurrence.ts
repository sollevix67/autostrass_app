/** Concurrence et rollback sur une base/API neuves ; aucune donnée applicative. */
import { deepEqual, equal, ok } from 'node:assert/strict'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { DevisRow } from '../server/repositories/devisRepository.js'
import { createTestEnvironment } from './lib/test-environment.js'

const environment = await createTestEnvironment()
const { connection, baseUrl } = environment
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
let scenarios = 0
const passed = (label: string) => { scenarios += 1; console.log(`OK ${label}`) }

try {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'marie.laurent@autostrass.fr', motDePasse: 'demo1234' }),
  })
  equal(login.status, 200)
  const cookie = login.headers.getSetCookie().map((part) => part.split(';')[0]).join('; ')
  const csrf = decodeURIComponent(cookie.match(/autostrass_csrf=([^;]+)/)![1])
  async function call<T = any>(method: string, path: string, body?: unknown) {
    const response = await fetch(`${baseUrl}/api${path}`, {
      method, headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
    })
    return { status: response.status, body: await response.json() as T }
  }
  const [clients] = await connection.query<RowDataPacket[]>('SELECT id FROM clients ORDER BY id LIMIT 1')
  const clientId = Number(clients[0].id)
  async function article(reference: string, quantity: number) {
    const [insert] = await connection.execute<ResultSetHeader>(
      'INSERT INTO articles(reference, designation, category, unit_price_ht, tva_id) VALUES (?, ?, ?, 2, (SELECT id FROM tva WHERE taux = 20 LIMIT 1))',
      [reference, reference, 'freins'],
    )
    await connection.execute('INSERT INTO stock_balances(reference_id, quantity, minimum_quantity) VALUES (?, ?, 0)', [insert.insertId, quantity])
    return insert.insertId
  }
  const articleIds = new Map<string, number>()
  for (const [reference, quantity] of [['DEVIS-COMPETE', 3], ['DEVIS-EDIT-RACE', 10], ['DEVIS-DIRECT', 3], ['DEVIS-AUDIT', 0], ['DEVIS-READ', 10], ['DEVIS-PROJECTION', 10], ['DEVIS-INITIAL-ZERO', 2]] as const) {
    articleIds.set(reference, await article(reference, quantity))
  }
  const [stockBefore] = await connection.query<RowDataPacket[]>('SELECT * FROM stock_balances ORDER BY id')
  const [fiscalBefore] = await connection.query<RowDataPacket[]>('SELECT * FROM ventes ORDER BY id')
  const input = (reference: string, quantite = 2) => ({ clientId, dateDevis: today, articles: [{ reference, quantite, prixUnitaire: 2 }] })
  const quote = async (reference: string, quantite = 2) => {
    const result = await call<DevisRow>('POST', '/devis', input(reference, quantite))
    equal(result.status, 201, JSON.stringify(result.body))
    return result.body
  }
  const counts = async () => {
    const values: Record<string, number> = {}
    for (const table of ['devis', 'devis_lines', 'commandes', 'commande_lines', 'articles_a_commander', 'journal_actions']) {
      const [result] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${table}`)
      values[table] = Number(result[0].n)
    }
    return values
  }

  const beforeInvalidDates = await counts()
  for (const dateCommande of ['2026-02-31', '2026-11-21suffix', '0000-01-01']) {
    const invalid = await call('POST', '/commandes', {
      clientId, dateCommande, statut: 'en attente',
      articles: [{ reference: 'DEVIS-DIRECT', designation: 'Date invalide', quantite: 2, prixUnitaire: 2 }],
    })
    equal(invalid.status, 422, JSON.stringify(invalid.body))
  }
  deepEqual(await counts(), beforeInvalidDates)
  passed('Dates de commande impossibles, suffixées ou année zéro refusées avant toute écriture')

  const competitors = await Promise.all([quote('DEVIS-COMPETE'), quote('DEVIS-COMPETE')])
  const converted = await Promise.all(competitors.map((item) => call('POST', `/devis/${item.id}/convertir`, { version: item.version })))
  ok(converted.every((result) => [200, 201].includes(result.status)), JSON.stringify(converted))
  equal(new Set(converted.map((result) => result.body.commande.id)).size, 2)
  const missing = converted.map((result) => result.body.articlesACommander.reduce((sum: number, line: any) => sum + line.quantite, 0))
  deepEqual(missing.sort(), [0, 1])
  const [queue] = await connection.query<RowDataPacket[]>('SELECT quantite FROM articles_a_commander WHERE reference = ?', ['DEVIS-COMPETE'])
  deepEqual(queue.map((line) => Number(line.quantite)).sort(), [0, 1])
  passed('Deux devis distincts simultanés pour trois unités : deux commandes et exactement une unité manquante')

  const racing = await quote('DEVIS-EDIT-RACE')
  const race = await Promise.all([
    call('PUT', `/devis/${racing.id}`, { ...input('DEVIS-EDIT-RACE', 4), version: racing.version, notes: 'Édition concurrente' }),
    call('POST', `/devis/${racing.id}/convertir`, { version: racing.version }),
  ])
  equal(race.filter((result) => [200, 201].includes(result.status)).length, 1, JSON.stringify(race))
  equal(race.filter((result) => result.status === 409).length, 1)
  const current = (await call<DevisRow>('GET', `/devis/${racing.id}`)).body
  const finalConversion = await call('POST', `/devis/${racing.id}/convertir`, { version: current.version })
  ok([200, 201].includes(finalConversion.status), JSON.stringify(finalConversion.body))
  equal(finalConversion.body.commande.articles[0].quantite, current.articles[0].quantite)
  equal(finalConversion.body.devis.totalTTC, current.totalTTC)
  const [linked] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM devis WHERE id = ? AND commande_id IS NOT NULL', [racing.id])
  equal(Number(linked[0].n), 1)
  passed('Édition/conversion de la même version : un gagnant, un conflit et commande conforme au devis retenu')

  const direct = await call('POST', '/commandes', {
    clientId, dateCommande: today, statut: 'en attente',
    articles: [{ reference: 'DEVIS-DIRECT', designation: 'Texte client ignoré', quantite: 2, prixUnitaire: 2 }],
  })
  equal(direct.status, 201, JSON.stringify(direct.body))
  ok(new RegExp(`^${today.replaceAll('-', '')}-C-[a-zA-Z]{6}$`).test(direct.body.numero))
  equal(direct.body.articles[0].designation, 'DEVIS-DIRECT')
  equal(direct.body.articles[0].tauxTva, 20)
  deepEqual([direct.body.totalHT, direct.body.totalTVA, direct.body.totalTTC], [4, 0.8, 4.8])
  equal((await call('PUT', `/commandes/${direct.body.id}`, { dateCommande: '2000-01-01' })).status, 409)
  const afterDirect = await quote('DEVIS-DIRECT')
  const directConversion = await call('POST', `/devis/${afterDirect.id}/convertir`, { version: afterDirect.version })
  ok([200, 201].includes(directConversion.status), JSON.stringify(directConversion.body))
  equal(directConversion.body.articlesACommander[0].quantite, 1)
  passed('Commande directe numérotée/TVA catalogue et date figée ; demande déjà active prise en compte par la conversion')

  const directPriority = await call('POST', '/commandes', {
    clientId, dateCommande: today, statut: 'en attente',
    articles: [{ reference: 'DEVIS-PROJECTION', designation: 'Projection', quantite: 8, prixUnitaire: 2 }],
  })
  equal(directPriority.status, 201, JSON.stringify(directPriority.body))
  const projectedQuote = await quote('DEVIS-PROJECTION', 5)
  const projected = await call('POST', `/devis/${projectedQuote.id}/convertir`, { version: projectedQuote.version })
  ok([200, 201].includes(projected.status), JSON.stringify(projected.body))
  equal(projected.body.articlesACommander[0].quantite, 3)
  const projectedOrderId = projected.body.commande.id
  const currentShortage = async (orderId: number) => {
    const before = await counts()
    const [trackingBefore] = await connection.query<RowDataPacket[]>('SELECT * FROM articles_a_commander ORDER BY id')
    const list = await call('GET', '/articles-a-commander')
    equal(list.status, 200)
    deepEqual(await counts(), before)
    const [trackingAfter] = await connection.query<RowDataPacket[]>('SELECT * FROM articles_a_commander ORDER BY id')
    deepEqual(trackingAfter, trackingBefore)
    return list.body.filter((line: any) => line.commandeId === orderId).reduce((sum: number, line: any) => sum + line.quantite, 0)
  }
  equal(await currentShortage(projectedOrderId), 3)
  equal((await call('PUT', `/commandes/${directPriority.body.id}`, { statut: 'annulée' })).status, 200)
  equal(await currentShortage(projectedOrderId), 0)
  await connection.execute('UPDATE stock_balances SET quantity = 3 WHERE reference_id = ?', [articleIds.get('DEVIS-PROJECTION')!])
  equal(await currentShortage(projectedOrderId), 2)
  await connection.execute('UPDATE stock_balances SET quantity = 10 WHERE reference_id = ?', [articleIds.get('DEVIS-PROJECTION')!])
  equal(await currentShortage(projectedOrderId), 0)
  passed('Projection courante : annulation d’une commande prioritaire, baisse de stock et réapprovisionnement recalculent le manque en lecture seule')

  const zeroQuote = await quote('DEVIS-INITIAL-ZERO', 2)
  const zero = await call('POST', `/devis/${zeroQuote.id}/convertir`, { version: zeroQuote.version })
  ok([200, 201].includes(zero.status), JSON.stringify(zero.body))
  deepEqual(zero.body.articlesACommander, [])
  await connection.execute('UPDATE stock_balances SET quantity = 1 WHERE reference_id = ?', [articleIds.get('DEVIS-INITIAL-ZERO')!])
  equal(await currentShortage(zero.body.commande.id), 1)
  const replayZero = await call('POST', `/devis/${zeroQuote.id}/convertir`, { version: zeroQuote.version })
  equal(replayZero.status, 200)
  equal(replayZero.body.commande.id, zero.body.commande.id)
  equal(replayZero.body.articlesACommander[0].quantite, 1)
  await connection.execute('UPDATE stock_balances SET quantity = 2 WHERE reference_id = ?', [articleIds.get('DEVIS-INITIAL-ZERO')!])
  equal(await currentShortage(zero.body.commande.id), 0)
  passed('Ligne initialement couverte suivie : pénurie ultérieure visible dans la liste et le rejeu, puis supprimée après réapprovisionnement')

  await connection.execute('UPDATE stock_balances SET quantity = 3 WHERE reference_id = ?', [articleIds.get('DEVIS-PROJECTION')!])
  equal((await call('PUT', `/commandes/${projectedOrderId}`, { statut: 'validée' })).status, 200)
  equal(await currentShortage(projectedOrderId), 2)
  for (const statut of ['expédiée', 'livrée', 'annulée']) {
    equal((await call('PUT', `/commandes/${projectedOrderId}`, { statut })).status, 200)
    equal(await currentShortage(projectedOrderId), 0)
  }
  for (const reference of ['DEVIS-PROJECTION', 'DEVIS-INITIAL-ZERO']) {
    const previous = stockBefore.find((line) => Number(line.reference_id) === articleIds.get(reference))!
    await connection.execute('UPDATE stock_balances SET quantity = ?, updated_at = ? WHERE reference_id = ?', [previous.quantity, previous.updated_at, previous.reference_id])
  }
  passed('Pénuries des commandes validées visibles ; commandes expédiées, livrées ou annulées exclues sans modifier le suivi SQL')

  const beforeCreateAudit = await counts()
  await connection.query("CREATE TRIGGER test_devis_audit_creation BEFORE INSERT ON journal_actions FOR EACH ROW BEGIN IF NEW.entite = 'devis' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test audit devis'; END IF; END")
  try {
    equal((await call('POST', '/devis', input('DEVIS-AUDIT'))).status, 500)
    deepEqual(await counts(), beforeCreateAudit)
  } finally { await connection.query('DROP TRIGGER test_devis_audit_creation') }
  passed('Échec audit à la création du devis : entête et lignes entièrement annulés')

  const auditQuote = await quote('DEVIS-AUDIT')
  const beforeEditAudit = await counts()
  await connection.query("CREATE TRIGGER test_devis_audit_modification BEFORE INSERT ON journal_actions FOR EACH ROW BEGIN IF NEW.entite = 'devis' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test audit édition'; END IF; END")
  try {
    equal((await call('PUT', `/devis/${auditQuote.id}`, { ...input('DEVIS-AUDIT', 4), version: auditQuote.version, notes: 'À annuler' })).status, 500)
    deepEqual((await call<DevisRow>('GET', `/devis/${auditQuote.id}`)).body, auditQuote)
    deepEqual(await counts(), beforeEditAudit)
  } finally { await connection.query('DROP TRIGGER test_devis_audit_modification') }
  passed('Échec audit à l’édition : version, lignes, notes et montants antérieurs restaurés')

  const beforeCommandAudit = await counts()
  await connection.query("CREATE TRIGGER test_devis_audit_commande BEFORE INSERT ON journal_actions FOR EACH ROW BEGIN IF NEW.entite = 'commandes' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test audit commande'; END IF; END")
  try {
    equal((await call('POST', `/devis/${auditQuote.id}/convertir`, { version: auditQuote.version })).status, 500)
    deepEqual(await counts(), beforeCommandAudit)
    deepEqual((await call<DevisRow>('GET', `/devis/${auditQuote.id}`)).body, auditQuote)
  } finally { await connection.query('DROP TRIGGER test_devis_audit_commande') }
  const auditRetry = await call('POST', `/devis/${auditQuote.id}/convertir`, { version: auditQuote.version })
  ok([200, 201].includes(auditRetry.status), JSON.stringify(auditRetry.body))
  equal(auditRetry.body.articlesACommander[0].quantite, 2)
  passed('Échec du second audit après création commande/manques : rollback complet puis reprise unique')

  let moving = await quote('DEVIS-READ', 1)
  const readChecks = async () => {
    for (let iteration = 0; iteration < 16; iteration += 1) {
      const list = await call<DevisRow[]>('GET', '/devis')
      equal(list.status, 200)
      for (const item of list.body) {
        const totalHT = Math.round(item.articles.reduce((sum, line) => sum + line.montant, 0) * 100) / 100
        const totalTVA = Math.round(item.articles.reduce((sum, line) => sum + line.montantTVA, 0) * 100) / 100
        equal(item.totalHT, totalHT)
        equal(item.totalTVA, totalTVA)
        equal(item.totalTTC, Math.round((totalHT + totalTVA) * 100) / 100)
      }
    }
  }
  const edits = async () => {
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const updated = await call<DevisRow>('PUT', `/devis/${moving.id}`, { ...input('DEVIS-READ', iteration % 2 + 1), version: moving.version })
      equal(updated.status, 200, JSON.stringify(updated.body))
      moving = updated.body
    }
  }
  await Promise.all([readChecks(), edits()])
  passed('Lectures répétées pendant huit éditions : lignes et totaux proviennent toujours du même état du devis')

  const [stockAfter] = await connection.query<RowDataPacket[]>('SELECT * FROM stock_balances ORDER BY id')
  const [fiscalAfter] = await connection.query<RowDataPacket[]>('SELECT * FROM ventes ORDER BY id')
  deepEqual(stockAfter, stockBefore)
  deepEqual(fiscalAfter, fiscalBefore)
  passed('Concurrence, erreurs et reprises sans mouvement physique ni modification des ventes fiscales')
  console.log(`${scenarios} groupes concurrence/audit devis réussis sur base jetable.`)
} finally {
  await environment.close()
}
