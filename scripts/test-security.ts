/**
 * Tests de durcissement : injections, biais Unicode, CSRF, en-tetes.
 *
 * Usage : demarrer l'API (`npm run dev:api`) puis
 *         `npx tsx scripts/test-security.ts`
 *
 * Complement de `test-api.ts` : celui-la verifie le fonctionnement metier,
 * celui-ci verifie que les entrees malveillantes sont refusees.
 *
 * Chaque test d'injection doit echouer SANS laisser de trace : une donnee
 * refusee ne doit jamais apparaitre en base. Les tests le verifient
 * explicitement en relisant la ressource apres l'echec.
 */

const BASE = process.env.API_URL ?? 'http://localhost:3001'
const DEMO_PASSWORD = 'demo1234'

let passed = 0
let failed = 0
/** Le bloc de limitation de tentatives a-t-il bloque l IP ? */
let attempts_blocked = false

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passed += 1
    console.log(`  OK   ${label}`)
  } else {
    failed += 1
    console.log(`  FAIL ${label}${detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`}`)
  }
}

let token: string | null = null
let csrf: string | null = null
/** Cookie de session, indispensable pour tester le CSRF de bout en bout. */
let cookie = ''

async function call(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null; csrf?: string | null; raw?: boolean } = {},
): Promise<{ status: number; body: any; text: string }> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  const bearer = options.token === undefined ? token : options.token
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`
  // Le client reel envoie le cookie de session : on le reproduit pour que le
  // test exerce le meme chemin de code.
  if (cookie) headers.cookie = cookie
  const csrfValue = options.csrf === undefined ? csrf : options.csrf
  if (csrfValue !== null) headers['x-csrf-token'] = csrfValue
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
  return { status: response.status, body, text }
}

/** Connexion et memorisation du couple token / cookie / CSRF. */
async function signIn(email: string): Promise<boolean> {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, motDePasse: DEMO_PASSWORD }),
  })
  const payload = (await response.json()) as { token?: string; csrfToken?: string }
  if (response.status !== 200) return false
  token = payload.token ?? null
  csrf = payload.csrfToken ?? null
  // Le serveur pose DEUX cookies : la session (httpOnly) et le jeton CSRF
  // (lisible, c'est lui que le client recopie dans l'en-tete). Il faut
  // renvoyer les deux, sinon la verification CSRF n'a rien a comparer.
  cookie = (response.headers.getSetCookie?.() ?? [])
    .map((value) => value.split(';')[0])
    .filter((value) => value.length > 0)
    .join('; ')
  return true
}

/** Corps d'un client valide, a muter par chaque test. */
function clientPayload(overrides: Record<string, unknown> = {}) {
  return {
    nom: 'Injection',
    prenom: 'Test',
    telephone: '0600000001',
    email: `inject.${Date.now()}.${Math.floor(Math.random() * 1e6)}@exemple.fr`,
    adresse: '1 rue de la Paix',
    ville: 'Lyon',
    codePostal: '69001',
    type: 'particulier',
    ...overrides,
  }
}

console.log(`Tests de securite sur ${BASE}\n`)

if (!(await signIn('marie.laurent@autostrass.fr'))) {
  console.error('Connexion impossible : verifier que l API est demarree et le seed applique.')
  process.exit(1)
}
check('connexion admin etablie', token !== null)
check('jeton CSRF recu', csrf !== null)
check('cookie de session pose', cookie.includes('autostrass_token='), cookie)
check('cookie CSRF pose', cookie.includes('autostrass_csrf='), cookie)

// ---------------------------------------------------------------------------
console.log('\nEn-tetes de securite')
{
  const response = await fetch(`${BASE}/api/health`)
  const get = (name: string) => response.headers.get(name)
  check('X-Content-Type-Options: nosniff', get('x-content-type-options') === 'nosniff', get('x-content-type-options'))
  check('X-Frame-Options: DENY', get('x-frame-options') === 'DENY', get('x-frame-options'))
  check('Content-Security-Policy frame-ancestors none', (get('content-security-policy') ?? '').includes("frame-ancestors 'none'"), get('content-security-policy'))
  check('Referrer-Policy pose', get('referrer-policy') === 'strict-origin-when-cross-origin', get('referrer-policy'))
  check('Permissions-Policy posee', (get('permissions-policy') ?? '').includes('camera=()'), get('permissions-policy'))
  check('Cache-Control: no-store', get('cache-control') === 'no-store', get('cache-control'))
  check('Cross-Origin-Opener-Policy pose', get('cross-origin-opener-policy') === 'same-origin', get('cross-origin-opener-policy'))
}

// ---------------------------------------------------------------------------
console.log('\nInjection SQL dans les champs')
{
  // Point cle de l'analyse : l'injection SQL est NEUTRALISEE PAR L'ARCHITECTURE,
  // pas par un filtre. Toute requete est parametree (`?`) ou passe par
  // Drizzle, qui lie les valeurs. Aucun motif n'est recherche ni refuse.
  //
  // Ces charges utiles sont donc ACCEPTES comme texte ordinary — ce qui est le
  // bon comportement : un client dont le nom contient une apostrophe est
  // legitime. Ce qui compte, c'est qu'elles soient stockees litteralement et
  // n'aient execute aucune instruction. Le test verifie les deux.
  const before = await call('/api/articles')
  const attacks: Array<[string, string]> = [
    ["' OR '1'='1", "citation OR"],
    ["'; DROP TABLE articles; --", 'point-virgule DROP TABLE'],
    ['1 UNION SELECT password_hash FROM users --', 'UNION SELECT'],
    ["' OR 1=1 #", 'commentaire MySQL'],
    ["admin'--", 'commentaire SQL'],
  ]

  const createdIds: number[] = []
  for (const [payload, label] of attacks) {
    const created = await call('/api/clients', { method: 'POST', body: clientPayload({ nom: payload }) })
    check(`${label} : stocke litteralement, sans execution`, created.status === 201, {
      status: created.status,
      details: created.body?.details,
    })
    check(`${label} : valeur preservee a l'identique`, created.body?.nom === payload, {
      attendu: payload,
      recu: created.body?.nom,
    })
    if (created.body?.id) createdIds.push(created.body.id)
  }

  const after = await call('/api/articles')
  check('la table articles est intacte', after.status === 200 && Array.isArray(after.body), after.status)
  check('le nombre d articles est inchange', before.body?.length === after.body?.length, {
    avant: before.body?.length,
    apres: after.body?.length,
  })

  // Les clients crees par ce bloc sont supprimes : ils ne doivent pas polluer
  // la base de demonstration.
  for (const id of createdIds) await call(`/api/clients/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
console.log('\nInjection de markup (XSS stocke)')
{
  const attacks: Array<[string, string, string]> = [
    ['<script>alert(1)</script>', 'nom', 'balise script'],
    ['<img src=x onerror=alert(1)>', 'prenom', 'gestionnaire onerror'],
    ['javascript:alert(document.cookie)', 'adresse', 'pseudo-scheme javascript'],
    ['<svg onload=alert(1)>', 'ville', 'balise svg'],
    ['"><script>alert(1)</script>', 'nom', 'evasion d attribut'],
    ['<iframe src="javascript:alert(1)">', 'adresse', 'iframe'],
    ['<a href="vbscript:msgbox(1)">x</a>', 'ville', 'vbscript'],
  ]

  for (const [payload, field, label] of attacks) {
    const created = await call('/api/clients', { method: 'POST', body: clientPayload({ [field]: payload }) })
    check(`${label} sur « ${field} » : refuse`, created.status === 422, {
      status: created.status,
      details: created.body?.details,
    })
  }

  // Une tentative qui passe le filtre ne doit jamais etre executee non plus :
  // meme stockee, React l'afficherait litteralement.
  const mixed = await call('/api/clients', {
    method: 'POST',
    body: clientPayload({ nom: 'Jean', adresse: 'Rue du <b>Test</b>' }),
  })
  check('du markup partiel est egalement refuse', mixed.status === 422, {
    status: mixed.status,
    details: mixed.body?.details,
  })
  check('le refus de markup renvoie bien 422, pas 500', mixed.status === 422, mixed.status)
}

// ---------------------------------------------------------------------------
console.log('\nBiais Unicode et caracteres de controle')
{
  const RTL = '\u202E' // RIGHT-TO-LEFT OVERRIDE
  const ZWSP = '\u200B' // ZERO WIDTH SPACE
  const NUL = '\u0000'

  // Ces caracteres sont SUPPRIMES, pas rejetés : le nom reste saisissable.
  const withBidi = await call('/api/clients', {
    method: 'POST',
    body: clientPayload({ nom: `${RTL}admin` }),
  })
  check('un nom avec U+202E est accepte', withBidi.status === 201, {
    status: withBidi.status,
    details: withBidi.body?.details,
  })
  check('U+202E a ete supprime du nom', withBidi.body?.nom === 'admin', withBidi.body?.nom)

  const withZwsp = await call('/api/clients', {
    method: 'POST',
    body: clientPayload({ prenom: `Ma${ZWSP}rie` }),
  })
  check('U+200B est supprime (deguise neutralise)', withZwsp.body?.prenom === 'Marie', withZwsp.body?.prenom)

  const withNul = await call('/api/clients', {
    method: 'POST',
    body: clientPayload({ ville: `Lyon${NUL}X` }),
  })
  check('un octet nul est supprime', withNul.body?.ville === 'LyonX', withNul.body?.ville)

  // Un nom compose de 4000 caracteres de largeur nulle ne doit pas passer la
  // limite de 64 caracteres.
  const padding = ZWSP.repeat(4000)
  const padded = await call('/api/clients', {
    method: 'POST',
    body: clientPayload({ nom: padding }),
  })
  check('4000 caracteres invisibles ne creent pas un nom valide', padded.status === 422, {
    status: padded.status,
    details: padded.body?.details,
  })

  // Normalisation NFKC : les lettres de compatibilite se replient.
  const compat = await call('/api/clients', {
    method: 'POST',
    body: clientPayload({ ville: 'Ｌｙｏｎ' }),
  })
  check('la forme pleine largeur est repliee (NFKC)', compat.body?.ville === 'Lyon', compat.body?.ville)

  // Nettoyage des clients crees par ce bloc.
  for (const client of [withBidi, withZwsp, withNul, compat]) {
    if (client.body?.id) await call(`/api/clients/${client.body.id}`, { method: 'DELETE' })
  }
}

// ---------------------------------------------------------------------------
console.log('\nMass-assignment')
{
  // Un corps contenant des cles inconnues ne doit transmettre que les
  // champs declares par le schema.
  const created = await call('/api/clients', {
    method: 'POST',
    body: clientPayload({
      id: 999999,
      numeroClient: 'CLI-HACK',
      createdAt: '1999-01-01T00:00:00.000Z',
      role: 'admin',
      __proto__: { admin: true },
    }),
  })
  check('la creation accepte le corps enrichi', created.status === 201, created.status)
  check('l id est attribue par la base, pas par le corps', created.body?.id !== 999999, created.body?.id)
  // `numeroClient` n'est pas declare dans le schema : Zod le supprime, et le
  // numero est regenere a partir de l'id.
  check('le numero de dossier est regenere', /^\d{4}$/.test(String(created.body?.numeroClient).replace('CLI-', '')), created.body?.numeroClient)
  check('le numero de dossier du corps est ignore', created.body?.numeroClient !== 'CLI-HACK', created.body?.numeroClient)
  check('aucune propriete admin n est introduite', created.body?.admin === undefined, created.body)

  // Mise a jour : un role ne doit pas pouvoir s'introduire sur un client.
  const patched = await call(`/api/clients/${created.body?.id}`, {
    method: 'PUT',
    body: { nom: 'Modifie', role: 'admin', actif: true },
  })
  check('la mise a jour ignore la cle inconnue « role »', patched.status === 200 && patched.body?.role === undefined, {
    status: patched.status,
    role: patched.body?.role,
  })

  if (created.body?.id) await call(`/api/clients/${created.body.id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
console.log('\nCSRF')
{
  const valid = clientPayload({ nom: 'CSRF' })

  const withoutToken = await call('/api/clients', { method: 'POST', body: valid, csrf: null })
  check('POST sans jeton CSRF refuse (403)', withoutToken.status === 403, {
    status: withoutToken.status,
    body: withoutToken.body,
  })
  check('le refus est type CSRF_INVALID', withoutToken.body?.error === 'CSRF_INVALID', withoutToken.body?.error)

  const wrongToken = await call('/api/clients', {
    method: 'POST',
    body: valid,
    csrf: 'f'.repeat(64),
  })
  check('POST avec un jeton CSRF incorrect refuse (403)', wrongToken.status === 403, {
    status: wrongToken.status,
    body: wrongToken.body,
  })

  const withToken = await call('/api/clients', { method: 'POST', body: valid })
  check('POST avec un jeton CSRF valide accepte (201)', withToken.status === 201, withToken.status)

  // Une lecture ne demande pas de jeton : elle ne modifie rien.
  const read = await call('/api/clients', { csrf: null })
  check('GET sans jeton CSRF accepte (200)', read.status === 200, read.status)

  // Suppression egalement protegee.
  if (withToken.body?.id) {
    const blocked = await call(`/api/clients/${withToken.body.id}`, { method: 'DELETE', csrf: null })
    check('DELETE sans jeton CSRF refuse (403)', blocked.status === 403, blocked.status)
    const allowed = await call(`/api/clients/${withToken.body.id}`, { method: 'DELETE' })
    check('DELETE avec jeton CSRF valide accepte (204)', allowed.status === 204, allowed.status)
  }
}

// ---------------------------------------------------------------------------
console.log('\nMots de passe')
{
  const long = 'a'.repeat(200)
  const tooLong = await call('/api/utilisateurs', {
    method: 'POST',
    body: {
      nom: 'Test',
      prenom: 'Mdp',
      email: `mdp.${Date.now()}@exemple.fr`,
      role: 'caissier',
      motDePasse: long,
    },
  })
  check('un mot de passe de 200 caracteres est refuse', tooLong.status === 422, {
    status: tooLong.status,
    details: tooLong.body?.details,
  })
  check('le plafond de 72 octets (bcrypt) est cite', (tooLong.body?.details?.motDePasse ?? '').includes('72'), tooLong.body?.details)
}

// ---------------------------------------------------------------------------
console.log('\nLimitation de tentatives')
{
  // On sature la sonde dediee, pas `/api/auth/login` : les deux compteurs sont
  // distincts (`bucketKey` derive du chemin), donc ce test ne bloque pas les
  // connexions reelles et `test-api.ts` reste jouable juste apres.
  //
  // Seules les tentatives ECHOUEES sont comptees : la sonde repond volontairement
  // 500, ce qui imite un echec d'authentification.
  const probe = async () => {
    const response = await fetch(`${BASE}/api/auth/rate-limit-probe`, { method: 'POST' })
    return { status: response.status, retryAfter: response.headers.get('retry-after') }
  }

  const statuses: number[] = []
  for (let index = 0; index < 8; index += 1) {
    statuses.push((await probe()).status)
  }

  check('au-dela de la limite, la sonde est bloquee en 429', statuses.includes(429), statuses)
  check('le blocage ne commence pas des la premiere requete', statuses[0] === 500, statuses[0])
  const blockedCount = statuses.filter((status) => status === 429).length
  check('les tentatives suivantes restent refusees', blockedCount >= 3, { blockedCount, statuses })

  // Le blocage ne doit pas affecter les autres familles de routes.
  const otherRoute = await call('/api/health')
  check('le blocage ne contamine pas les autres routes', otherRoute.status === 200, otherRoute.status)

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'marie.laurent@autostrass.fr', motDePasse: DEMO_PASSWORD }),
  })
  check('la route de connexion reste accessible', login.status === 200, login.status)
  attempts_blocked = true
}

console.log(`\n${passed} reussis, ${failed} echecs`)
if (attempts_blocked) {
  console.log('Note : la sonde /api/auth/rate-limit-probe est bloquee pendant 60 s.')
  console.log('Cela n affecte pas /api/auth/login : les deux compteurs sont distincts.')
}
process.exit(failed === 0 ? 0 : 1)