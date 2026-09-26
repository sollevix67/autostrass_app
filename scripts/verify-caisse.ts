/**
 * Verification manuelle de la caisse : ouverture, vente, comptage, ecart.
 *
 * Ne fait pas partie de `npm run test:api` : il manipule une session de caisse
 * reelle et compte des billets, ce qui n'a pas sa place dans une suite
 * d'assertions automatisee. Sert a 控制 le comportement de bout en bout.
 *
 * Usage : npx tsx scripts/verify-caisse.ts
 */

const BASE = 'http://localhost:3001/api'

type Session = { token: string; user: { id: number; email: string; role: string } }

/**
 * Cookies renvoyes par l'API. La double soumission CSRF compare l'en-tete
 * `X-CSRF-Token` au cookie `autostrass_csrf` : sans le cookie, l'en-tete seul
 * est refuse en 403.
 */
let cookie = ''

async function call<T>(
  path: string,
  options: { method?: string; body?: unknown; session?: Session } = {},
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.session) {
    headers.Authorization = `Bearer ${options.session.token}`
    if (cookie) headers.cookie = cookie
    if (options.method && options.method !== 'GET') {
      const csrf = cookie.match(/autostrass_csrf=([^;]+)/)?.[1]
      if (csrf) headers['X-CSRF-Token'] = decodeURIComponent(csrf)
    }
  }
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const setCookie = response.headers.getSetCookie?.() ?? []
  if (setCookie.length > 0) cookie = setCookie.map((c) => c.split(';')[0]).join('; ')

  const text = await response.text()
  return { status: response.status, body: (text ? JSON.parse(text) : null) as T }
}

/**
 * Affiche une valeur de controle.
 *
 * Les nombres sont arrondis au centime, sauf les entiers (nombre de lignes,
 * nombre de billets) : `4.00 ligne(s)` serait trompeur.
 */
function show(label: string, value: unknown): void {
  if (typeof value === 'number') {
    const text = Number.isInteger(value) ? String(value) : value.toFixed(2)
    console.log(`  ${label.padEnd(34)} ${text}`)
    return
  }
  console.log(`  ${label.padEnd(34)} ${String(value)}`)
}

type CashSession = {
  id: number
  statut: string
  fondsCaisse: number
  totalEspeces: number
  totalTheorique: number | null
  totalReel: number | null
  ecart: number | null
  nombreVentes: number
  comptage: Array<{ denomination: number; quantite: number; sousTotal: number }>
}

const login = await call<Session>('/auth/login', {
  method: 'POST',
  body: { email: 'sophie.bernard@autostrass.fr', motDePasse: 'demo1234' },
})
if (login.status !== 200) throw new Error(`Connexion impossible : ${login.status}`)
const session = login.body
console.log(`\nConnecte : ${session.user.email} (${session.user.role})\n`)

const avant = await call<CashSession | null>('/caisse/actuelle', { session })
show('Session ouverte au depart', avant.body === null ? 'aucune' : `#${avant.body.id}`)

// Rejouable : une session restee ouverte par un lancement precedent est
// cloturee au comptage zero plutot que de faire echouer le script.
if (avant.body !== null) {
  console.log('  (session precedente fermee automatiquement)')
  await call(`/caisse/${avant.body.id}/cloturer`, { method: 'POST', session, body: { comptage: [] } })
}

const opened = await call<CashSession>('/caisse/ouvrir', {
  method: 'POST',
  session,
  body: { fondsCaisse: 150 },
})
if (opened.status !== 201) throw new Error(`Ouverture refusee : ${opened.status} ${JSON.stringify(opened.body)}`)
show('Session ouverte', `#${opened.body.id} (${opened.body.statut})`)
show('Fond de caisse', opened.body.fondsCaisse)

// --- Vente en especes : 3 x 15,50 EUR payes en 50 --------------------------
const vente = await call<{ id: number; totalHT: number; montantPaye: number; monnaie: number }>('/ventes', {
  method: 'POST',
  session,
  body: {
    dateVente: new Date().toISOString(),
    caissier: 'Sophie Bernard',
    modePaiement: 'espèces',
    montantPaye: 50,
    monnaie: 3.5,
    articles: [
      { reference: 'PLA-2841', designation: 'Plaquettes de frein avant', quantite: 3, prixUnitaire: 15.5 },
    ],
  },
})
if (vente.status !== 201) throw new Error(`Vente refusee : ${vente.status} ${JSON.stringify(vente.body)}`)
show('Vente #1 (46,50 EUR / 50 EUR)', `encaissement ${vente.body.totalHT.toFixed(2)}`)

// --- Vente par carte : ne doit pas toucher le tiroir ------------------------
const carte = await call<{ id: number }>('/ventes', {
  method: 'POST',
  session,
  body: {
    dateVente: new Date().toISOString(),
    caissier: 'Sophie Bernard',
    modePaiement: 'carte',
    montantPaye: 31,
    articles: [
      { reference: 'BAT-7710', designation: 'Batterie 12V 70Ah', quantite: 1, prixUnitaire: 31 },
    ],
  },
})
show('Vente #2 par carte', carte.status === 201 ? 'acceptee (hors tiroir)' : `refusee ${carte.status}`)

const courante = await call<CashSession | null>('/caisse/actuelle', { session })
if (!courante.body) throw new Error('Session introuvable apres ventes')
show('Recette especes de la session', courante.body.totalEspeces)
show('Ventes rattachees', courante.body.nombreVentes)

// --- Cloture avec un comptage exact -----------------------------------------
// Theorique = fond 150 + recettes especes 77,50 = 227,50.
// (La vente par carte de 31 € ne touche pas le tiroir.)
// Comptage = 2x100 + 1x20 + 1x5 + 5x0,50 = 227,50 -> ecart 0.
const comptageExact = [
  { denomination: 100, quantite: 2 },
  { denomination: 20, quantite: 1 },
  { denomination: 5, quantite: 1 },
  { denomination: 0.5, quantite: 5 },
]
const totalComptage = comptageExact.reduce((sum, l) => sum + l.denomination * l.quantite, 0)
console.log(`\nComptage saisit : ${totalComptage.toFixed(2)} EUR`)

const cloture = await call<CashSession>(`/caisse/${courante.body.id}/cloturer`, {
  method: 'POST',
  session,
  body: { comptage: comptageExact, notes: 'Verification de bout en bout' },
})
if (cloture.status !== 200) throw new Error(`Cloture refusee : ${cloture.status} ${JSON.stringify(cloture.body)}`)
show('Statut apres cloture', cloture.body.statut)
show('Total theorique', cloture.body.totalTheorique ?? 0)
show('Total reel compte', cloture.body.totalReel ?? 0)
show('Ecart', cloture.body.ecart ?? 0)
show('Lignes de comptage conservees', cloture.body.comptage.length)
if (cloture.body.ecart !== 0) {
  throw new Error(`Ecart attendu 0, obtenu ${cloture.body.ecart} : le total theorique est faux.`)
}

// --- Re-cloture : doit etre refusee -----------------------------------------
const reCloture = await call<{ error?: string }>(`/caisse/${courante.body.id}/cloturer`, {
  method: 'POST',
  session,
  body: { comptage: comptageExact },
})
show('Re-cloture refusee', reCloture.status === 409 ? `409 ${reCloture.body.error}` : `ATTENDU 409, obtenu ${reCloture.status}`)

// --- Vente apres cloture : doit etre refusee --------------------------------
const apres = await call<{ error?: string }>('/ventes', {
  method: 'POST',
  session,
  body: {
    dateVente: new Date().toISOString(),
    caissier: 'Sophie Bernard',
    modePaiement: 'espèces',
    montantPaye: 10,
    articles: [{ reference: 'HUI-5400', designation: 'Huile 5W30', quantite: 1, prixUnitaire: 10 }],
  },
})
show('Vente apres cloture refusee', apres.status === 409 ? `409 ${apres.body.error}` : `ATTENDU 409, obtenu ${apres.status}`)

const mouvements = await call<Array<{ type: string; montant: number }>>(
  `/caisse/${courante.body.id}/mouvements`,
  { session },
)
console.log('\nJournal des mouvements :')
for (const m of mouvements.body) {
  console.log(`  ${m.type.padEnd(12)} ${m.montant.toFixed(2).padStart(9)}`)
}
console.log()
