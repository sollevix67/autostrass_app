import { deepEqual, equal, ok } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import type { ApiArticleACommander, ApiCommandeFournisseur, ApiDevis, ApiDevisConversion, ApiHoraireFournisseur, ApiReception } from '../src/services/contracts.js'
import { dateParis } from '../server/services/documentNumbers.js'
import { isSupplierOrderBlocked } from '../server/services/horairesFournisseur.js'
import { createTestEnvironment } from './lib/test-environment.js'

const horaires: Array<[string | null, number | null, string, boolean]> = [
  [null, null, '2026-11-28T10:30Z', false],
  ['17:00:00', 120, '2026-01-12T15:59:59Z', false],
  ['17:00', 120, '2026-01-12T16:00Z', true],
  ['17:00', 120, '2026-01-12T18:00Z', false],
  ['23:30', 120, '2026-07-11T22:45Z', true],
  ['02:30', 60, '2026-03-29T01:29Z', false],
  ['02:30', 60, '2026-03-29T01:30Z', true],
  ['02:30', 60, '2026-03-29T02:30Z', false],
  ['03:30', 60, '2026-03-29T01:30Z', true],
  ['02:30', 60, '2026-10-25T00:30Z', true],
  ['02:30', 60, '2026-10-25T01:30Z', false],
  ['01:30', 120, '2026-10-25T01:29Z', true],
]
for (const [heure, duree, instant, attendu] of horaires) {
  equal(isSupplierOrderBlocked(heure, duree, new Date(instant)), attendu, instant)
}
console.log('OK Horaires de Paris, minuit, durée effective et changements d’heure')

const env = await createTestEnvironment()
const { baseUrl, connection } = env
type Session = { cookie: string; csrf: string }

async function login(email: string): Promise<Session> {
  const response = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, motDePasse: 'demo1234' }),
  })
  equal(response.status, 200)
  const cookie = response.headers.getSetCookie().map((part) => part.split(';')[0]).join('; ')
  const csrf = cookie.match(/autostrass_csrf=([^;]+)/)?.[1]
  ok(csrf)
  return { cookie, csrf: decodeURIComponent(csrf) }
}

async function api<T = unknown>(session: Session | null, method: string, path: string, body?: unknown, expected = 200) {
  const response = await fetch(baseUrl + '/api' + path, {
    method, signal: AbortSignal.timeout(15_000),
    headers: { 'content-type': 'application/json', ...(session && { cookie: session.cookie, 'x-csrf-token': session.csrf }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json() as T
  equal(response.status, expected, method + ' ' + path + ' ' + JSON.stringify(result))
  return result
}

try {
  const admin = await login('marie.laurent@autostrass.fr')
  const depot = await login('karim.moreau@autostrass.fr')
  const caisse = await login('sophie.bernard@autostrass.fr')
  const achats = '/commandes-fournisseurs'
  const historique = await api<ApiCommandeFournisseur[]>(depot, 'GET', achats)
  ok(historique.some((commande) => commande.articles.some((l) => l.besoinId === null)))
  const { id: fournisseurId } = await api<{ id: number }>(admin, 'POST', '/fournisseurs', { nom: 'Pièces de recette' }, 201)
  const horairesPath = achats + '/horaires/' + fournisseurId
  const ouvert = { heureBlocage: null, dureeBlocageMinutes: null }
  await api(null, 'GET', achats, undefined, 401)
  await api(caisse, 'GET', achats, undefined, 403)
  await api(caisse, 'GET', '/articles-a-commander')
  await api(depot, 'PUT', horairesPath, ouvert, 403)
  await api({ ...admin, csrf: '' }, 'PUT', horairesPath, ouvert, 403)
  await api(admin, 'PUT', horairesPath, { ...ouvert, heureBlocage: '25:00' }, 422)
  await api(admin, 'PUT', horairesPath, { ...ouvert, dureeBlocageMinutes: 15 }, 422)
  await api(admin, 'PUT', horairesPath, { heureBlocage: '12:00', dureeBlocageMinutes: 1440 }, 422)
  console.log('OK Lecture historique, droits dépôt/caisse/admin, CSRF et validation des horaires')

  const reference = 'ACHAT-TEST-FILTRE'
  const [article] = await connection.execute<ResultSetHeader>(
    "INSERT INTO articles(reference, designation, category, unit_price_ht) VALUES (?, 'Filtre commandé', 'freins', 19.50)",
    [reference],
  )
  await connection.execute('INSERT INTO stock_balances(reference_id, quantity, minimum_quantity) VALUES (?, 2, 0)', [article.insertId])
  const [[place]] = await connection.query<RowDataPacket[]>("SELECT id FROM emplacements WHERE niveau = 'place' AND actif = 1 ORDER BY id LIMIT 1")
  await connection.execute('INSERT INTO stock_par_emplacements(reference_id, emplacement_id, quantite) VALUES (?, ?, 2)', [article.insertId, place.id])
  const [[client]] = await connection.query<RowDataPacket[]>('SELECT id FROM clients ORDER BY id LIMIT 1')
  const devis = await api<ApiDevis>(caisse, 'POST', '/devis', {
    clientId: client.id, dateDevis: dateParis(), articles: [{ reference, quantite: 7, prixUnitaire: 19.5 }],
  }, 201)
  const conversion = await api<ApiDevisConversion>(caisse, 'POST', '/devis/' + devis.id + '/convertir', { version: devis.version })
  const besoin = conversion.articlesACommander[0]
  equal(besoin.quantite, 5)
  const affectation = { fournisseurId, modeLivraison: 'express' }
  const choix = '/articles-a-commander/' + besoin.id
  const commande = {
    ...affectation, cleCommande: randomUUID(), articles: [{ besoinId: besoin.id, quantite: 5, prixUnitaire: 6.42 }],
  }
  await api(depot, 'POST', achats, commande, 409)
  await api(caisse, 'PUT', choix, affectation, 403)
  const affecte = await api<ApiArticleACommander>(depot, 'PUT', choix, affectation)
  deepEqual([affecte.fournisseurId, affecte.modeLivraison], [fournisseurId, 'express'])
  await api(depot, 'POST', achats, { ...commande, articles: [...commande.articles, ...commande.articles] }, 422)
  await api(depot, 'POST', achats, { ...commande, articles: [{ ...commande.articles[0], prixUnitaire: 1.125 }] }, 422)
  await api(depot, 'POST', achats, { ...commande, articles: [{ ...commande.articles[0], quantite: 6 }] }, 409)
  const heureBlocage = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date())
  const ferme = await api<ApiHoraireFournisseur>(admin, 'PUT', horairesPath, { heureBlocage, dureeBlocageMinutes: 120 })
  ok(ferme.bloque)
  const regles = await api<ApiHoraireFournisseur[]>(depot, 'GET', achats + '/horaires')
  deepEqual(regles.find((item) => item.fournisseurId === fournisseurId), ferme)
  const refus = await api<{ error: string }>(depot, 'POST', achats, commande, 409)
  equal(refus.error, 'SUPPLIER_ORDER_BLOCKED')
  await api(admin, 'PUT', horairesPath, ouvert)
  console.log('OK Manque calculé après conversion, affectation, prix, quantités et blocage côté serveur')

  // Deux clés distinctes convoitent exactement le même reliquat.
  const concurrentes = [commande, { ...commande, cleCommande: randomUUID() }]
  const reponses = await Promise.all(concurrentes.map((body) => fetch(baseUrl + '/api' + achats, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: depot.cookie, 'x-csrf-token': depot.csrf },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
  })))
  deepEqual(reponses.map((r) => r.status).sort(), [201, 409])
  const gagnant = reponses.findIndex((r) => r.status === 201)
  const achat = await reponses[gagnant].json() as ApiCommandeFournisseur
  equal(achat.articles[0].commandeClientId, conversion.commande.id)
  equal(achat.articles[0].commandeClientNumero, conversion.commande.numero)
  equal(achat.articles[0].prixUnitaire, 6.42)
  const rejoue = await api<ApiCommandeFournisseur>(depot, 'POST', achats, concurrentes[gagnant], 201)
  equal(rejoue.id, achat.id)
  const conflit = await api<{ error: string }>(depot, 'POST', achats, {
    ...concurrentes[gagnant], articles: [{ ...commande.articles[0], prixUnitaire: 0 }],
  }, 409)
  equal(conflit.error, 'SUPPLIER_ORDER_KEY_CONFLICT')
  const besoins = () => api<ApiArticleACommander[]>(depot, 'GET', '/articles-a-commander')
  ok(!(await besoins()).some((row) => row.id === besoin.id))
  const [[avant]] = await connection.execute<RowDataPacket[]>('SELECT quantity FROM stock_balances WHERE reference_id = ?', [article.insertId])
  equal(avant.quantity, 2)
  console.log('OK Achat concurrent, lien à la commande client, prix figé et rejeu sans deuxième achat')

  await api(admin, 'PUT', '/fournisseurs/' + fournisseurId, { nom: 'Pièces renommées', actif: false })
  const entree = achats + '/' + achat.id + '/receptions'
  const partiel = { cleOperation: randomUUID(), articles: [{ ligne: 1, quantite: 2 }] }
  await api(caisse, 'POST', entree, partiel, 403)
  const { receptionId } = await api<{ receptionId: number }>(depot, 'POST', entree, partiel, 201)
  const bon = await api<ApiReception>(depot, 'GET', '/receptions/' + receptionId)
  equal(bon.commandeFournisseurId, achat.id)
  equal(bon.fournisseur, 'Pièces de recette')
  equal(bon.totalHT, 12.84)
  equal(bon.articles[0].quantiteAttribuee, 2)
  const relire = async () => (await api<ApiCommandeFournisseur[]>(depot, 'GET', achats)).find((row) => row.id === achat.id)!
  equal((await relire()).statut, 'partielle')
  ok(!(await besoins()).some((row) => row.id === besoin.id))
  await api(depot, 'POST', entree, { cleOperation: randomUUID(), articles: [{ ligne: 1, quantite: 3 }] }, 201)
  const solde = await relire()
  deepEqual([solde.statut, solde.articles[0].quantiteRecue, solde.articles[0].quantiteAttribuee], ['reçue', 5, 5])
  const [[stock]] = await connection.execute<RowDataPacket[]>(
    'SELECT quantity, quantite FROM stock_balances b JOIN stock_par_emplacements p USING (reference_id) WHERE b.reference_id = ? AND emplacement_id = ?',
    [article.insertId, place.id],
  )
  deepEqual([stock.quantity, stock.quantite], [7, 7])
  const dashboard = await api<{ activity: { type: string; title: string }[] }>(depot, 'GET', '/dashboard')
  ok(dashboard.activity.some((e) => e.type === 'RECEPTION' && e.title === 'Filtre commandé'))
  console.log('OK Réceptions partielles puis soldées, prix et nom historiques, attribution, emplacement et tableau de bord')
} finally {
  await env.close()
}
