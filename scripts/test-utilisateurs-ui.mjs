/** npm run build puis npm run test:utilisateurs:ui. Chromium et MariaDB jetable. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'
import { createTestEnvironment } from './lib/test-environment.ts'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const environment = await createTestEnvironment()
const output = resolve('specs/screenshots/utilisateurs')
const checks = [], errors = []
const check = (condition, label) => { assert.ok(condition, label); checks.push(label) }
const initialPassword = 'Compte-initial-2026!'
const newPassword = 'Compte-modifie-2026!'
let server, browser

async function login(email, motDePasse = 'demo1234') {
  const response = await fetch(`${environment.baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, motDePasse }),
  })
  const body = await response.json()
  const cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
  return { status: response.status, cookie, csrf: body.csrfToken, body }
}

async function call(session, method, path, body, csrf = true) {
  const response = await fetch(`${environment.baseUrl}/api${path}`, {
    method, headers: { 'content-type': 'application/json', ...(session ? { cookie: session.cookie, ...(csrf ? { 'x-csrf-token': session.csrf } : {}) } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
  })
  return { status: response.status, body: await response.json() }
}

try {
  await mkdir(output, { recursive: true })
  const admin = await login('marie.laurent@autostrass.fr')
  assert.equal(admin.status, 200)
  const created = await call(admin, 'POST', '/utilisateurs', { nom: 'Martin', prenom: 'Alice', email: 'alice@example.test', telephone: '0388000011', role: 'magasinier', motDePasse: initialPassword })
  assert.equal(created.status, 201)
  const id = created.body.id, path = `/utilisateurs/${id}`
  const oldSession = await login('alice@example.test', initialPassword)
  assert.equal(oldSession.status, 200)
  const readAccount = async (accountId = id) => (await environment.connection.execute('SELECT nom, prenom, email, telephone, role, actif, password_hash FROM users WHERE id = ?', [accountId]))[0][0]
  const original = await readAccount()
  assert.equal((await call(admin, 'PUT', path, { prenom: 'Alice' })).status, 200)
  check((await readAccount()).telephone === original.telephone, 'Mise à jour partielle : téléphone absent conservé')
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })

  async function setup(role = 'Admin') {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'fr-FR', reducedMotion: 'reduce' })
    const state = { writes: [], hold: null, failNext: false, refreshes: 0 }
    await context.route('**/api/**', async (route) => {
      const request = route.request(), url = new URL(request.url())
      if (url.pathname === '/api/auth/me') state.refreshes++
      if (url.pathname.startsWith('/api/utilisateurs') && request.method() !== 'GET') {
        assert.ok(request.headers()['x-csrf-token'])
        state.writes.push({ path: url.pathname, method: request.method(), body: request.postDataJSON() })
        if (state.hold) await state.hold
        if (state.failNext) {
          state.failNext = false
          return route.fulfill({ status: 503, json: { error: 'DATABASE_UNAVAILABLE', message: 'Base indisponible.' } })
        }
      }
      try { await route.fulfill({ response: await route.fetch({ url: environment.baseUrl + url.pathname + url.search }) }) }
      catch { await route.abort().catch(() => {}) }
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(base)
    await page.getByRole('button', { name: new RegExp(`^${role}`) }).click()
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await page.getByRole('heading', { name: /Bonjour/ }).waitFor()
    await page.goto(`${base}/utilisateurs`)
    await page.getByRole('heading', { name: 'Utilisateurs et droits', exact: true }).waitFor()
    return { context, page, state }
  }

  const { context, page, state } = await setup()
  const dialog = page.getByRole('dialog', { name: 'Modifier l’utilisateur', exact: true })
  const edit = (email) => page.getByRole('button', { name: `Modifier le compte ${email}`, exact: true })
  const save = () => dialog.getByRole('button', { name: 'Enregistrer les modifications', exact: true }).click()
  const fill = async (values) => {
    for (const [name, value] of Object.entries(values)) {
      const field = dialog.locator(`[name="${name}"]`)
      if (name === 'role') await field.selectOption(value)
      else await field.fill(value)
    }
  }
  const snapshot = () => dialog.locator('input, select').evaluateAll((nodes) => nodes.map((node) => [node.name, node.value]))
  await edit('alice@example.test').click()
  check(await dialog.evaluate((node) => node.matches(':modal')), 'Modification depuis la liste dans un dialogue natif')
  for (const [name, value] of Object.entries({ nom: 'Martin', prenom: 'Alice', email: 'alice@example.test', telephone: '0388000011', role: 'magasinier', motDePasse: '' })) {
    check(await dialog.locator(`[name="${name}"]`).inputValue() === value, `Préremplissage : ${name}`)
  }
  check(!await dialog.locator('[name="motDePasse"]').evaluate((node) => node.required), 'Mot de passe facultatif en modification')
  check(await page.evaluate(() => document.activeElement?.id === 'nom'), 'Focus initial sur le nom')
  await fill({ motDePasse: newPassword })
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  check(state.writes.length === 0 && await edit('alice@example.test').evaluate((node) => node === document.activeElement), 'Échap sans écriture et retour du focus')
  await edit('alice@example.test').click()
  check(await dialog.locator('[name="motDePasse"]').inputValue() === '', 'Mot de passe effacé à la fermeture')
  for (const width of [375, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 })
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
      check(await dialog.evaluate((node) => { const box = node.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight && node.scrollWidth <= node.clientWidth }), `Dialogue sans débordement : ${width}px ${theme}`)
      if (width === 375 || width === 1440) await page.screenshot({ path: resolve(output, `modification-${width}-${theme}.png`) })
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await fill({ nom: 'Durand', prenom: 'Alicia', email: 'alicia@example.test', telephone: '', role: 'caissier' })
  const before = await snapshot()
  let release
  state.hold = new Promise((resolve) => { release = resolve })
  state.failNext = true
  await save()
  await page.waitForFunction(() => document.querySelector('dialog.form-dialog')?.getAttribute('aria-busy') === 'true')
  check(state.writes.length === 1 && state.writes[0].method === 'PUT' && state.writes[0].path === `/api${path}`, 'PUT sur l’identifiant existant avec CSRF')
  check(!('motDePasse' in state.writes[0].body) && !('actif' in state.writes[0].body), 'Mot de passe vide et activation exclus du PUT')
  check(await dialog.locator('input, select, button').evaluateAll((nodes) => nodes.every((node) => node.matches(':disabled'))), 'Champs, actions et fermeture bloqués pendant l’écriture')
  await dialog.locator('form').dispatchEvent('submit')
  await page.keyboard.press('Escape')
  await page.mouse.click(1, 1)
  check(state.writes.length === 1 && await dialog.isVisible(), 'Double envoi, Échap et fond bloqués pendant l’écriture')
  release()
  state.hold = null
  await dialog.getByRole('alert').waitFor()
  check(JSON.stringify(before) === JSON.stringify(await snapshot()), 'Panne API : toutes les saisies conservées')
  check((await readAccount()).email === original.email, 'Panne API sans modification en base')
  await save()
  await dialog.waitFor({ state: 'hidden' })
  await edit('alicia@example.test').waitFor()
  const modified = await readAccount()
  for (const [name, value] of Object.entries({ nom: 'Durand', prenom: 'Alicia', email: 'alicia@example.test', telephone: null, role: 'caissier' })) check(modified[name] === value, `Enregistrement réel : ${name}`)
  check(modified.password_hash === original.password_hash && modified.actif === original.actif, 'Mot de passe et activation conservés en base')
  console.log('OK coordonnées, rôle, téléphone effacé et reprise après panne')
  check((await login('alicia@example.test', initialPassword)).status === 200, 'Connexion avec le mot de passe conservé et le nouvel email')
  check((await call(oldSession, 'GET', '/clients')).status === 401, 'Changement de rôle : ancien jeton refusé par l’API')
  check((await call(oldSession, 'GET', '/auth/me')).status === 401, 'Restauration de session refusée après changement de rôle')
  await page.reload()
  await edit('alicia@example.test').click()
  check(await dialog.locator('[name="nom"]').inputValue() === 'Durand', 'Modification conservée après rechargement')
  await fill({ motDePasse: 'court' })
  await save()
  await dialog.locator('[name="motDePasse"][aria-invalid="true"]').waitFor()
  check(state.writes.length === 2, 'Mot de passe court refusé avant écriture')
  await fill({ motDePasse: newPassword, email: 'marie.laurent@autostrass.fr' })
  await save()
  await dialog.getByRole('alert').filter({ hasText: /existe deja/i }).first().waitFor()
  check(await dialog.locator('[name="motDePasse"]').inputValue() === newPassword, 'Email déjà utilisé : mot de passe saisi conservé pour réessayer')
  check((await readAccount()).password_hash === original.password_hash, 'Email en doublon : aucune modification partielle du mot de passe')
  await fill({ email: 'alicia@example.test' })
  await save()
  await dialog.waitFor({ state: 'hidden' })
  check(state.writes.at(-1).body.motDePasse === newPassword && (await readAccount()).password_hash !== original.password_hash, 'Remplacement explicite du mot de passe enregistré')
  check((await login('alicia@example.test', initialPassword)).status === 401 && (await login('alicia@example.test', newPassword)).status === 200, 'Ancien mot de passe refusé et nouveau accepté')
  const response = await call(admin, 'GET', path)
  check(!/motDePasse|password_hash|passwordHash/.test(JSON.stringify(response.body)), 'Aucun mot de passe ou hash renvoyé par l’API')
  console.log('OK conservation et remplacement du mot de passe, refus des doublons')

  const ownPath = `/utilisateurs/${admin.body.user.id}`
  check((await call(admin, 'PUT', ownPath, { role: 'magasinier' })).status === 409 && (await call(admin, 'PUT', ownPath, { actif: false })).status === 409, 'API : auto-rétrogradation et auto-désactivation refusées')
  await edit('marie.laurent@autostrass.fr').click()
  check(JSON.stringify(await dialog.locator('[name="role"] option').evaluateAll((nodes) => nodes.map((node) => node.value))) === JSON.stringify(['admin']), 'Compte connecté : rôle administrateur protégé dans le dialogue')
  check(await page.locator('[aria-label="Supprimer le compte marie.laurent@autostrass.fr"]').count() === 0, 'Compte connecté : suppression indisponible')
  const refreshes = state.refreshes
  await fill({ nom: 'Administratrice', prenom: 'Mélanie' })
  await save()
  await dialog.waitFor({ state: 'hidden' })
  await page.locator('.topbar-profile').getByText('Mélanie Administratrice', { exact: true }).waitFor()
  check(state.refreshes === refreshes + 1, 'Compte connecté : nom et prénom actualisés dans la session')
  await page.reload()
  await page.locator('.topbar-profile').getByText('Mélanie Administratrice', { exact: true }).waitFor()
  check((await call(admin, 'GET', '/auth/me')).body.user.prenom === 'Mélanie', 'Identité actuelle conservée après rechargement, malgré les anciens claims du jeton')

  const inactive = await call(admin, 'POST', '/utilisateurs', { nom: 'Inactif', prenom: 'Test', email: 'inactif@example.test', role: 'magasinier', motDePasse: initialPassword, actif: false })
  assert.equal(inactive.status, 201)
  await page.locator('.page-actions').getByRole('button', { name: 'Actualiser', exact: true }).click()
  await edit('inactif@example.test').click()
  await fill({ nom: 'Inactif modifié' })
  await save()
  await dialog.waitFor({ state: 'hidden' })
  check(!(await readAccount(inactive.body.id)).actif, 'Modification d’un compte désactivé sans le réactiver')
  await page.getByRole('button', { name: 'Nouvel utilisateur', exact: true }).click()
  const creation = page.getByRole('dialog', { name: 'Nouvel utilisateur', exact: true })
  check(await creation.locator('[name="nom"]').inputValue() === '' && await creation.locator('[name="motDePasse"]').evaluate((node) => node.required), 'Retour à la création : champs vides et mot de passe obligatoire')
  const written = state.writes.length
  await creation.getByRole('button', { name: 'Creer le compte', exact: true }).click()
  await creation.getByRole('alert').first().waitFor()
  check(state.writes.length === written, 'Création incomplète refusée sans écriture')
  for (const [name, value] of Object.entries({ nom: 'Nouveau', prenom: 'Test', email: 'nouveau@example.test', motDePasse: initialPassword })) await creation.locator(`[name="${name}"]`).fill(value)
  await creation.getByRole('button', { name: 'Creer le compte', exact: true }).click()
  await creation.waitFor({ state: 'hidden' })
  check(state.writes.at(-1).method === 'POST' && state.writes.at(-1).path === '/api/utilisateurs', 'Création toujours fonctionnelle après une modification')
  console.log('OK compte connecté, compte inactif et retour à la création')
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
  await page.screenshot({ path: resolve(output, 'liste-1440-light.png') })
  await context.close()

  for (const [role, email] of [['Magasinier', 'karim.moreau@autostrass.fr'], ['Caissier', 'sophie.bernard@autostrass.fr']]) {
    const session = await login(email)
    const denied = await call(session, 'PUT', path, { nom: 'Interdit' })
    check(denied.status === 403, `API : modification interdite au ${role.toLowerCase()}`)
    const { context, page, state } = await setup(role)
    check(await page.getByRole('button', { name: /^Modifier le compte/ }).count() === 0 && await page.getByRole('button', { name: 'Nouvel utilisateur', exact: true }).count() === 0, `Interface : gestion indisponible au ${role.toLowerCase()}`)
    check(await page.locator('dialog').count() === 0 && state.writes.length === 0, `${role} : aucun dialogue ni écriture`)
    await context.close()
  }
  check((await call(admin, 'PUT', path, { nom: 'Sans CSRF' }, false)).status === 403, 'Modification sans CSRF refusée')
  check((await call(null, 'PUT', path, { nom: 'Anonyme' })).status === 401, 'Modification sans authentification refusée')
  check((await call(admin, 'PUT', path, { telephone: 'invalide' })).status === 422, 'Téléphone invalide refusé par l’API')
  check((await readAccount()).nom === 'Durand', 'Refus d’accès sans modification du compte')
  const activeSession = await login('alicia@example.test', newPassword)
  assert.equal(activeSession.status, 200)
  assert.equal((await call(admin, 'PUT', path, { actif: false })).status, 200)
  check((await call(activeSession, 'GET', '/auth/me')).status === 403, 'Restauration de session refusée pour un compte désactivé')
  assert.equal((await call(admin, 'PUT', path, { actif: true })).status, 200)
  check(errors.length === 0, `Aucune erreur JavaScript : ${errors.join(', ')}`)
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ checks, errors, scope: 'Chromium et build de production ; API réelle et MariaDB jetable ; latence/panne simulées pour les cas dédiés' }, null, 2) + '\n')
  console.log(`${checks.length} contrôles réussis : modification des utilisateurs, création et droits.`)
  if (process.argv.includes('--all')) {
    await environment.runScript('scripts/test-api.ts')
    await environment.runScript('scripts/test-security.ts')
  }
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server ? server.httpServer.close((error) => error ? reject(error) : resolve()) : resolve())
  await environment.close()
}
