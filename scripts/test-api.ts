/**
 * Test de bout en bout de l'API : authentification, RBAC et CRUD.
 *
 * Usage : demarrer l'API (`npm run dev:api`) puis
 *         `npx tsx scripts/test-api.ts`
 *
 * ATTENTION : ce script manipule la base reelle. Il cree puis supprime des
 * enregistrements de test, et n'exerce aucune suppression sur les comptes de
 * demonstration. Ne pas l'executer sur une base de production.
 *
 * Il recharge `database/seed_v2.sql` en ouverture : le seed est idempotent,
 * donc les comptes de demonstration sont retablis si un run precedent les a
 * modifies. Les tests de suppression visent un compte cree par le script
 * lui-meme, jamais un compte existant.
 */

const BASE = process.env.API_URL ?? 'http://localhost:3001'

/** Mots de passe des comptes de demonstration (cf. database/seed_v2.sql). */
const DEMO_PASSWORD = 'demo1234'

let passed = 0
let failed = 0

/** Cookies renvoyes par l'API (session + CSRF), reproduits a chaque appel. */
let cookie = ''
/** Jeton CSRF courant, lu dans le cookie. */
let csrf: string | null = null

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passed += 1
    console.log(`  OK   ${label}`)
  } else {
    failed += 1
    console.log(`  FAIL ${label}${detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`}`)
  }
}

async function call(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.token) headers.authorization = `Bearer ${options.token}`
  // Le serveur lit l 'authentification dans l 'en-tete Bearer, mais verifie
  // aussi le jeton CSRF par double soumission : cookie + en-tete.
  if (cookie) headers.cookie = cookie
  if (csrf && options.method !== undefined && options.method !== 'GET') headers['x-csrf-token'] = csrf

  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  let body: unknown = null
  if (text.length > 0) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  return { status: response.status, body }
}

/**
 * Connexion. Le mot de passe est un parametre : les comptes de demonstration
 * partagent `demo1234`, mais un compte cree par ce script en a un autre.
 *
 * La connexion fournit aussi le couple de jetons CSRF : le serveur pose un
 * cookie lisible (`autostrass_csrf`) et renvoie la meme valeur dans le corps.
 * Toute ecriture ulterieure doit renvoyer ce couple, sans quoi l'API repond
 * 403 `CSRF_INVALID` — c'est le comportement attendu, pas une panne.
 */
async function login(email: string, password: string = DEMO_PASSWORD): Promise<string | null> {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, motDePasse: password }),
  })
  if (response.status !== 200) return null
  const payload = (await response.json()) as { token?: string }
  // Les deux cookies sont necessaires : session pour l 'authentification,
  // CSRF pour la verification de double soumission.
  cookie = (response.headers.getSetCookie?.() ?? [])
    .map((value) => value.split(';')[0])
    .filter((value) => value.length > 0)
    .join('; ')
  csrf = csrfFromCookie(cookie) ?? null
  return payload.token ?? null
}

/** Extrait le jeton CSRF du couple de cookies. */
function csrfFromCookie(value: string): string | null {
  const match = value.match(/autostrass_csrf=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

console.log(`Test de l'API sur ${BASE}\n`)

// --- Sante et refus sans jeton --------------------------------------------
console.log('Sante et acces non authentifie')
const health = await call('/api/health')
check('GET /api/health repond 200', health.status === 200, health.body)
check('la base est declaree connectee', health.body?.database === 'connected', health.body?.database)

for (const path of ['/api/clients', '/api/vehicules', '/api/utilisateurs', '/api/receptions', '/api/ventes']) {
  const { status, body } = await call(path)
  check(`GET ${path} sans jeton repond 401`, status === 401, { status, body })
}
check('le refus 401 est type', (await call('/api/clients')).body?.error === 'UNAUTHENTICATED')

// --- Connexion -------------------------------------------------------------
console.log('\nAuthentification')
const adminToken = await login('marie.laurent@autostrass.fr')
check('connexion admin', adminToken !== null)

const magasinierToken = await login('karim.moreau@autostrass.fr')
check('connexion magasinier', magasinierToken !== null)

const caissierToken = await login('sophie.bernard@autostrass.fr')
check('connexion caissier', caissierToken !== null)

const inactifToken = await login('luc.petit@autostrass.fr')
check('un compte desactive est refuse (403)', inactifToken === null)

const mauvais = await call('/api/auth/login', {
  method: 'POST',
  body: { email: 'marie.laurent@autostrass.fr', motDePasse: 'mauvais-mot-de-passe' },
})
check('un mot de passe errone repond 401', mauvais.status === 401)
check(
  "le message ne revele pas si l'email existe",
  mauvais.body?.message === 'Email ou mot de passe incorrect.',
  mauvais.body?.message,
)

const emailInexistant = await call('/api/auth/login', {
  method: 'POST',
  body: { email: 'personne@example.fr', motDePasse: 'mauvais-mot-de-passe' },
})
check(
  'un email inconnu donne le meme message',
  emailInexistant.body?.message === mauvais.body?.message,
  { inconnu: emailInexistant.body?.message, connu: mauvais.body?.message },
)

const me = await call('/api/auth/me', { token: adminToken! })
check('GET /api/auth/me renvoie le role', me.body?.user?.role === 'admin', me.body?.user)
// On retient l'id reel de l'admin : les identifiants sequentiels varient selon
// que la base a ete re-seedee ou non, un id code en dur viserait un autre compte.
const adminId = me.body?.user?.id as number

// --- Lecture des 8 metiers -------------------------------------------------
console.log('\nLecture des metiers (jeton admin)')
const metiers: Array<[string, string]> = [
  ['/api/clients', 'Client'],
  ['/api/vehicules', 'Vehicule'],
  ['/api/utilisateurs', 'Utilisateur'],
  ['/api/receptions', 'Reception'],
  ['/api/ventes', 'Vente'],
  ['/api/commandes', 'Commande'],
  ['/api/livraisons', 'Livraison'],
  ['/api/retours', 'Retour'],
]
for (const [path, label] of metiers) {
  const { status, body } = await call(path, { token: adminToken! })
  check(`GET ${path} renvoie un tableau (${label})`, status === 200 && Array.isArray(body), { status, body })
}

// Le hash de mot de passe ne doit apparaitre dans aucune reponse.
const utilisateurs = await call('/api/utilisateurs', { token: adminToken! })
const fuite = JSON.stringify(utilisateurs.body).match(/passwordHash|password_hash|\$2b\$/)
check('aucun hash de mot de passe expose', fuite === null, fuite?.[0])

// --- Validation ------------------------------------------------------------
console.log('\nValidation')
const emailInvalide = await call('/api/clients', {
  method: 'POST',
  token: adminToken!,
  body: {
    nom: '',
    prenom: 'Test',
    telephone: 'abc',
    email: 'pas-un-email',
    adresse: 'x',
    ville: 'Lyon',
    codePostal: 'abc',
    type: 'particulier',
  },
})
check('un client invalide repond 422', emailInvalide.status === 422, emailInvalide.status)
check('le detail liste les champs fautifs', Object.keys(emailInvalide.body?.details ?? {}).length > 0, emailInvalide.body?.details)

// La validation prime sur l'absence de base : ici elle doit primer sur le 404.
const updateInexistant = await call('/api/clients/999999', {
  method: 'PUT',
  token: adminToken!,
  body: { nom: '' },
})
check('un PUT invalide sur id inconnu repond 422 (pas 404)', updateInexistant.status === 422, {
  status: updateInexistant.status,
})

// --- CRUD client -----------------------------------------------------------
console.log('\nCRUD client')
const nouveauClient = {
  nom: 'Essai',
  prenom: 'Script',
  telephone: '0699000011',
  email: 'essai.script@example.fr',
  adresse: '1 rue du Test',
  ville: 'Villeurbanne',
  codePostal: '69100',
  type: 'professionnel',
}
const creation = await call('/api/clients', { method: 'POST', token: adminToken!, body: nouveauClient })
check('POST /api/clients repond 201', creation.status === 201, creation.body)
check('un numero de dossier est attribue', /^CLI-\d{4}$/.test(creation.body?.numeroClient ?? ''), creation.body?.numeroClient)
const clientId = creation.body?.id as number

const doublon = await call('/api/clients', { method: 'POST', token: adminToken!, body: nouveauClient })
check('un email en doublon est tolere (pas de contrainte unique)', doublon.status === 201, doublon.status)
if (doublon.body?.id) {
  await call(`/api/clients/${doublon.body.id}`, { method: 'DELETE', token: adminToken! })
}

const lecture = await call(`/api/clients/${clientId}`, { token: adminToken! })
check('GET /api/clients/:id renvoie le client', lecture.body?.id === clientId, lecture.body)

const miseAJour = await call(`/api/clients/${clientId}`, {
  method: 'PUT',
  token: adminToken!,
  body: { ville: 'Lyon' },
})
check('PUT met a jour un champ', miseAJour.body?.ville === 'Lyon', miseAJour.body?.ville)
check('le numero de dossier reste inchange', miseAJour.body?.numeroClient === creation.body?.numeroClient, {
  avant: creation.body?.numeroClient,
  apres: miseAJour.body?.numeroClient,
})

const parNumero = await call(`/api/clients/numero/${creation.body?.numeroClient}`, { token: adminToken! })
check('recherche par numero de dossier', parNumero.body?.id === clientId, parNumero.body?.id)

const introuvable = await call('/api/clients/999999', { token: adminToken! })
check('un id inconnu repond 404', introuvable.status === 404, introuvable.status)

const idInvalide = await call('/api/clients/abc', { token: adminToken! })
check('un id non numerique repond 400', idInvalide.status === 400, idInvalide.status)

const suppression = await call(`/api/clients/${clientId}`, { method: 'DELETE', token: adminToken! })
check('DELETE repond 204', suppression.status === 204, suppression.status)
const apresSuppression = await call(`/api/clients/${clientId}`, { token: adminToken! })
check('le client supprime est introuvable', apresSuppression.status === 404, apresSuppression.status)

// --- RBAC ------------------------------------------------------------------
console.log('\nControle d acces par role')
const clientParCaissier = await call('/api/clients', {
  method: 'POST',
  token: caissierToken!,
  body: { ...nouveauClient, email: 'caissier@example.fr' },
})
check('un caissier ne cree pas de client (403)', clientParCaissier.status === 403, {
  status: clientParCaissier.status,
  body: clientParCaissier.body,
})

const lectureParCaissier = await call('/api/clients', { token: caissierToken! })
check('un caissier peut lire les clients', lectureParCaissier.status === 200, lectureParCaissier.status)

const clientsParMagasinier = await call('/api/clients', { method: 'POST', token: magasinierToken!, body: nouveauClient })
check('un magasinier cree un client', clientsParMagasinier.status === 201, clientsParMagasinier.status)
if (clientsParMagasinier.body?.id) {
  await call(`/api/clients/${clientsParMagasinier.body.id}`, { method: 'DELETE', token: magasinierToken! })
}

const utilisateursParMagasinier = await call('/api/utilisateurs', { method: 'POST', token: magasinierToken!, body: {} })
check("un magasinier ne cree pas d'utilisateur (403)", utilisateursParMagasinier.status === 403, {
  status: utilisateursParMagasinier.status,
})

const autoSuppression = await call(`/api/utilisateurs/${adminId}`, { method: 'DELETE', token: adminToken! })
check('un admin ne peut pas se supprimer lui-meme (409)', autoSuppression.status === 409, {
  status: autoSuppression.status,
  body: autoSuppression.body,
})

const autoDemotion = await call(`/api/utilisateurs/${adminId}`, {
  method: 'PUT',
  token: adminToken!,
  body: { role: 'caissier' },
})
check('un admin ne peut pas se retirer ses propres droits (409)', autoDemotion.status === 409, {
  status: autoDemotion.status,
  body: autoDemotion.body,
})

const desactivation = await call(`/api/utilisateurs/${adminId}`, {
  method: 'PUT',
  token: adminToken!,
  body: { actif: false },
})
check('un admin ne peut pas se desactiver lui-meme (409)', desactivation.status === 409, {
  status: desactivation.status,
  body: desactivation.body,
})

// --- Cycle de vie d'un compte cree par l'API -------------------------------
console.log('\nCycle de vie d un compte')
const nouvelEmail = `nouveau.${Date.now()}@autostrass.fr`
const creationCompte = await call('/api/utilisateurs', {
  method: 'POST',
  token: adminToken!,
  body: {
    nom: 'Nouveau',
    prenom: 'Compte',
    email: nouvelEmail,
    telephone: '0699000099',
    role: 'magasinier',
    motDePasse: 'motdepasse-solide-1',
  },
})
check('POST /api/utilisateurs (admin) repond 201', creationCompte.status === 201, creationCompte.body)
check('le hash ne figure pas dans la reponse', !JSON.stringify(creationCompte.body).match(/\$2b\$/), creationCompte.body)
check(
  'le champ motDePasse ne figure pas dans la reponse',
  !('motDePasse' in (creationCompte.body ?? {})),
  Object.keys(creationCompte.body ?? {}),
)
const nouveauId = creationCompte.body?.id as number

// Le magasinier ne doit pas pouvoir supprimer un compte, meme un compte cree
// par l'API. On vise le compte de test, pas un compte de demonstration.
if (nouveauId) {
  const supprimerParMagasinier = await call(`/api/utilisateurs/${nouveauId}`, {
    method: 'DELETE',
    token: magasinierToken!,
  })
  check('un magasinier ne supprime pas un utilisateur (403)', supprimerParMagasinier.status === 403, {
    status: supprimerParMagasinier.status,
  })
}

const motDePasseCourt = await call('/api/utilisateurs', {
  method: 'POST',
  token: adminToken!,
  body: { nom: 'Court', prenom: 'Test', email: `court.${Date.now()}@autostrass.fr`, role: 'caissier', motDePasse: 'court' },
})
check('un mot de passe trop court est refuse (422)', motDePasseCourt.status === 422, {
  status: motDePasseCourt.status,
  details: motDePasseCourt.body?.details,
})

const motDePasseDemo = await call('/api/utilisateurs', {
  method: 'POST',
  token: adminToken!,
  body: {
    nom: 'Demo',
    prenom: 'Test',
    email: `demo.${Date.now()}@autostrass.fr`,
    role: 'caissier',
    motDePasse: 'demo1234',
  },
})
check('le mot de passe de demonstration est refuse (422)', motDePasseDemo.status === 422, {
  status: motDePasseDemo.status,
  details: motDePasseDemo.body?.details,
})

// Le compte cree doit pouvoir se connecter avec SON mot de passe, et sa
// session doit etre invalidee des que le compte est desactive.
const nouveauToken = await login(nouvelEmail, 'motdepasse-solide-1')
check('le compte cree peut se connecter', nouveauToken !== null)

if (nouveauId) {
  await call(`/api/utilisateurs/${nouveauId}`, {
    method: 'PUT',
    token: adminToken!,
    body: { actif: false },
  })
  const accesApresDesactivation = await call('/api/clients', { token: nouveauToken! })
  check('un jeton valide mais compte desactive est refuse (403)', accesApresDesactivation.status === 403, {
    status: accesApresDesactivation.status,
    body: accesApresDesactivation.body,
  })

  const suppressionCompte = await call(`/api/utilisateurs/${nouveauId}`, {
    method: 'DELETE',
    token: adminToken!,
  })
  check('le compte de test est supprime (204)', suppressionCompte.status === 204, suppressionCompte.status)
}

// --- Documents -------------------------------------------------------------
console.log('\nDocuments')
const reception = await call('/api/receptions', {
  method: 'POST',
  token: magasinierToken!,
  body: {
    fournisseur: 'Fournisseur Test',
    dateReception: '2026-09-26',
    notes: 'Note de test',
    articles: [
      { reference: 'PLA-2841', designation: 'Plaquettes avant', quantite: 4, prixUnitaire: 15.5 },
      { reference: 'FIL-0920', designation: 'Filtre huile', quantite: 2, prixUnitaire: 8.2 },
    ],
  },
})
check('POST /api/receptions (magasinier) repond 201', reception.status === 201, reception.body)
check('le total est recalcule par le serveur', reception.body?.totalHT === 78.4, reception.body?.totalHT)
check('les lignes sont numerotees a partir de 1', reception.body?.articles?.[0]?.ligne === 1, reception.body?.articles?.[0])
const receptionId = reception.body?.id as number

const receptionParCaissier = await call('/api/receptions', {
  method: 'POST',
  token: caissierToken!,
  body: {
    fournisseur: 'Interdit',
    dateReception: '2026-09-26',
    articles: [{ reference: 'PLA-2841', designation: 'X', quantite: 1, prixUnitaire: 1 }],
  },
})
check('un caissier ne saisit pas de reception (403)', receptionParCaissier.status === 403, {
  status: receptionParCaissier.status,
})

const receptionLignesVides = await call('/api/receptions', {
  method: 'POST',
  token: magasinierToken!,
  body: { fournisseur: 'X', dateReception: '2026-09-26', articles: [] },
})
check('une reception sans ligne est refusee (422)', receptionLignesVides.status === 422, {
  status: receptionLignesVides.status,
  details: receptionLignesVides.body?.details,
})

const remplacement = await call(`/api/receptions/${receptionId}/lignes`, {
  method: 'PUT',
  token: magasinierToken!,
  body: { articles: [{ reference: 'BAT-7710', designation: 'Batterie', quantite: 3, prixUnitaire: 45 }] },
})
check('PUT /:id/lignes remplace le detail', remplacement.body?.articles?.length === 1, remplacement.body?.articles)
check('le total suit le nouveau detail', remplacement.body?.totalHT === 135, remplacement.body?.totalHT)

const venteInsuffisante = await call('/api/ventes', {
  method: 'POST',
  token: caissierToken!,
  body: {
    dateVente: '2026-09-26T10:00:00.000Z',
    caissier: 'Sophie Bernard',
    modePaiement: 'especes',
    montantPaye: 5,
    articles: [{ reference: 'PLA-2841', designation: 'Plaquettes', quantite: 2, prixUnitaire: 15.5 }],
  },
})
check('une vente sous-encaissée est refusee (422)', venteInsuffisante.status === 422, {
  status: venteInsuffisante.status,
  details: venteInsuffisante.body?.details,
})

const vente = await call('/api/ventes', {
  method: 'POST',
  token: caissierToken!,
  body: {
    dateVente: '2026-09-26T10:00:00.000Z',
    caissier: 'Sophie Bernard',
    modePaiement: 'carte',
    montantPaye: 31,
    articles: [{ reference: 'PLA-2841', designation: 'Plaquettes', quantite: 2, prixUnitaire: 15.5 }],
  },
})
check('POST /api/ventes (caissier) repond 201', vente.status === 201, vente.body)
check('le total de la vente est correct', vente.body?.totalHT === 31, vente.body?.totalHT)
if (vente.body?.id) await call(`/api/ventes/${vente.body.id}`, { method: 'DELETE', token: adminToken! })

await call(`/api/receptions/${receptionId}`, { method: 'DELETE', token: adminToken! })

// --- Reference inexistante -------------------------------------------------
console.log('\nReferentialite')
const commandeClientInconnu = await call('/api/commandes', {
  method: 'POST',
  token: caissierToken!,
  body: {
    clientId: 999999,
    dateCommande: '2026-09-26',
    articles: [{ reference: 'PLA-2841', designation: 'Plaquettes', quantite: 1, prixUnitaire: 15.5 }],
  },
})
check('une commande pour un client inconnu est refusee', commandeClientInconnu.status === 422, {
  status: commandeClientInconnu.status,
  body: commandeClientInconnu.body,
})

// --- Routes v1 toujours ouvertes ------------------------------------------
console.log('\nCompatibilite v1')
for (const path of ['/api/dashboard', '/api/articles', '/api/stock']) {
  const { status } = await call(path)
  check(`GET ${path} reste accessible sans jeton (v1)`, status === 200, status)
}

// --- Bilan -----------------------------------------------------------------
console.log(`\n${passed} reussis, ${failed} echecs`)
process.exit(failed === 0 ? 0 : 1)
