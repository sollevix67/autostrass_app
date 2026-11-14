/** Recette transactionnelle exclusivement dans la base/API jetable du harnais. */
import { deepEqual, equal, ok } from 'node:assert/strict'
import type { RowDataPacket } from 'mysql2/promise'
import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import * as schema from '../server/db/schema.js'
import { CashRegisterRepository } from '../server/repositories/cashRegisterRepository.js'
import { setTimeout as delay } from 'node:timers/promises'
import { createTestEnvironment } from './lib/test-environment.js'
import type { ApiVente, ApiCashMovement } from '../src/services/contracts.js'

const environment = await createTestEnvironment()
const { connection, baseUrl } = environment
let checks = 0
function passed(message: string) { checks += 1; console.log(`OK ${message}`) }
try {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'sophie.bernard@autostrass.fr', motDePasse: 'demo1234' }),
  })
  equal(login.status, 200)
  const user = (await login.json()).user
  const cookie = login.headers.getSetCookie().map((part) => part.split(';')[0]).join('; ')
  const csrf = decodeURIComponent(cookie.match(/autostrass_csrf=([^;]+)/)![1])
  async function call<T = any>(path: string, body?: unknown) {
    const response = await fetch(`${baseUrl}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
    })
    return { status: response.status, body: await response.json() as T }
  }
  await connection.beginTransaction()
  await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [user.id])
  const pending = Array.from({ length: 12 }, () => call('/caisse/ouvrir', { fondsCaisse: 100 }))
  await delay(300)
  await connection.commit()
  const openings = await Promise.all(pending)
  equal(openings.filter((result) => result.status === 201).length, 1, JSON.stringify(openings))
  equal(openings.filter((result) => result.status === 409 && result.body.error === 'SESSION_DEJA_OUVERTE').length, 11)
  const session = openings.find((result) => result.status === 201)!.body
  const [rows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM cash_sessions WHERE utilisateur_id = ? AND statut = ?', [user.id, 'ouverte'])
  equal(Number(rows[0].n), 1)
  passed('12 ouvertures concurrentes : une session, onze conflits, aucune saturation du pool')

  const dateVente = '2026-11-14T10:00:00.000Z'
  const articles = [{ reference: 'PLA-2841', designation: 'Plaquettes', quantite: 2, prixUnitaire: 15.5 }]
  const sale = { dateVente, modePaiement: 'espèces', montantPaye: 50, articles }
  equal((await call('/ventes', { ...sale, montantPaye: 31 })).status, 422)
  for (const monnaie of [50, 99]) equal((await call('/ventes', { ...sale, monnaie })).status, 422)
  equal((await call('/ventes', { ...sale, articles: [{ ...articles[0], prixUnitaire: 0.015 }] })).status, 422)
  passed('sous-paiement HT, rendu arbitraire et prix hors centimes refusés')

  const created = await call<ApiVente>('/ventes', sale)
  equal(created.status, 201, JSON.stringify(created.body))
  deepEqual([created.body.totalHT, created.body.totalTVA, created.body.totalTTC, created.body.monnaie, created.body.fingerprintVersion], [31, 6.2, 37.2, 12.8, 2])
  equal(created.body.articles[0].tauxTva, 20)
  const reread = await call<ApiVente>(`/ventes/${created.body.id}`)
  deepEqual(reread.body, created.body)
  const [physical] = await connection.query<RowDataPacket[]>('SELECT v.total_ttc, v.total_tva, v.monnaie, l.taux_tva, l.prix_unitaire FROM ventes v JOIN vente_lines l ON l.vente_id=v.id WHERE v.id=?', [created.body.id])
  deepEqual([physical[0].total_ttc, physical[0].total_tva, physical[0].monnaie, physical[0].taux_tva, physical[0].prix_unitaire].map(Number), [37.2, 6.2, 12.8, 20, 15.5])
  passed('vente TTC figée, réponse/relecture et DECIMAL identiques')

  const journal = await call<ApiCashMovement[]>(`/caisse/${session.id}/mouvements`)
  const movements = journal.body.filter((movement) => movement.venteId === created.body.id)
  deepEqual(movements.map((movement) => [movement.type, movement.montant]).sort(), [['encaissement', 50], ['rendu', -12.8]].sort())
  equal(Math.round(journal.body.reduce((sum, movement) => sum + movement.montant, 0) * 100) / 100, 137.2)
  equal((await call('/caisse/actuelle')).body.totalEspeces, 37.2)
  passed('journal et solde théorique concordent au centime')

  const [beforeFailure] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM ventes')
  await connection.query("CREATE TRIGGER test_cash_failure BEFORE INSERT ON cash_movements FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Test rollback'")
  try { equal((await call('/ventes', sale)).status, 500) }
  finally { await connection.query('DROP TRIGGER test_cash_failure') }
  const [afterFailure] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM ventes')
  equal(afterFailure[0].n, beforeFailure[0].n)
  passed('échec journal : vente et lignes annulées atomiquement')

  equal((await call('/ventes', { ...sale, modePaiement: 'carte' })).status, 422)
  equal((await call('/ventes', { ...sale, modePaiement: 'carte', montantPaye: 37.2 })).status, 201)
  equal((await call('/caisse/actuelle')).body.totalEspeces, 37.2)
  passed('carte exacte TTC, aucune incidence sur le tiroir')

  await connection.query('UPDATE articles SET tva_id = (SELECT id FROM tva WHERE taux=5.50 LIMIT 1) WHERE reference=?', ['PLA-2841'])
  const stale = await call('/ventes', { ...sale, articles: [{ ...articles[0], tauxTva: 20 }] })
  equal(stale.status, 409)
  equal(stale.body.error, 'TVA_MODIFIEE')
  const frozen = await call<ApiVente>(`/ventes/${created.body.id}`)
  equal(frozen.body.articles[0].tauxTva, 20)
  const mixed = await call<ApiVente>('/ventes', { ...sale, montantPaye: 100, articles: [...articles, { reference: 'FIL-0920', designation: 'Filtre', quantite: 1, prixUnitaire: 10 }] })
  equal(mixed.status, 201, JSON.stringify(mixed.body))
  deepEqual([mixed.body.totalHT, mixed.body.totalTVA, mixed.body.totalTTC, mixed.body.monnaie], [41, 3.71, 44.71, 55.29])
  passed('TVA modifiée détectée, historique conservé et taux mixtes exacts')
  const integrity = await call(`/nf525/controle?limite=1`)
  equal(integrity.status, 200, JSON.stringify(integrity.body))
  ok(['intacte', 'anterieures'].includes(integrity.body.etat))
  equal(integrity.body.controleComplet, true)
  passed('chaîne v1/v2 intacte après stockage SQL et contrôle par lots')
  const pdf = await fetch(`${baseUrl}/api/ventes/${mixed.body.id}/facture`, { headers: { cookie } })
  equal(pdf.status, 200)
  ok(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString() === '%PDF-')
  passed('facture PDF réelle pour plusieurs taux')
  const close = await call(`/caisse/${session.id}/cloturer`, { comptage: [{ denomination: 100, quantite: 1 }, { denomination: 50, quantite: 1 }, { denomination: 20, quantite: 1 }, { denomination: 10, quantite: 1 }, { denomination: 1, quantite: 1 }, { denomination: 0.5, quantite: 1 }, { denomination: 0.2, quantite: 2 }, { denomination: 0.01, quantite: 1 }] })
  equal(close.status, 200, JSON.stringify(close.body))
  equal(close.body.totalTheorique, 181.91)
  equal(close.body.ecart, 0)
  passed('clôture TTC et comptage concordent, écart nul')
  // Deux comptes distincts dans la même plage vide : aucun gap lock inter-comptes.
  await connection.query("INSERT INTO users(nom,prenom,email,role,actif,password_hash) SELECT nom,prenom,'cash-test-a@example.fr',role,actif,password_hash FROM users WHERE id=?", [user.id])
  await connection.query("INSERT INTO users(nom,prenom,email,role,actif,password_hash) SELECT nom,prenom,'cash-test-b@example.fr',role,actif,password_hash FROM users WHERE id=?", [user.id])
  const [owners] = await connection.query<RowDataPacket[]>("SELECT id FROM users WHERE email IN ('cash-test-a@example.fr','cash-test-b@example.fr') ORDER BY id")
  const limitedPool = mysql.createPool({ host: process.env.TEST_DB_HOST, port: Number(process.env.TEST_DB_PORT), user: process.env.TEST_DB_USER, password: process.env.TEST_DB_PASSWORD, database: connection.config.database, connectionLimit: 2 })
  try {
    const repository = new CashRegisterRepository(drizzle(limitedPool, { schema, mode: 'default' }))
    const parallel = await Promise.all(owners.map((owner) => repository.open({ utilisateurId: Number(owner.id), caissier: 'Test', fondsCaisse: 0 })))
    equal(parallel.length, 2)
    ok(parallel.every((opening) => opening.totalEspeces === 0 && opening.nombreVentes === 0))
    passed('deux comptes distincts et pool limité à deux : ouvertures concurrentes sans blocage')
  } finally { await limitedPool.end() }
  await connection.query('UPDATE articles SET tva_id = (SELECT id FROM tva WHERE taux=20.00 LIMIT 1) WHERE reference=?', ['PLA-2841'])
  // Suites existantes lancées par le harnais : seeds et écritures restent ici.
  await environment.runScript('scripts/test-api.ts')
  await environment.runScript('scripts/test-security.ts')
  await environment.runScript('scripts/test-fiscal-archive-db.ts')
  console.log(`${checks} groupes ventes/caisse réussis, puis suites API et sécurité.`)
} finally {
  await environment.close()
}
