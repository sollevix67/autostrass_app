/** npm run build, puis node scripts/test-clients-ui.mjs.
 * Playwright/Chromium requis ; PLAYWRIGHT_MODULE accepte un module externe.
 * API entièrement simulée : aucune écriture sur une base MariaDB.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = resolve('specs/screenshots/client-edit')
const checks = []
const errors = []
const initial = [
  { id: 17, numeroClient: 'CLI-0017', nom: 'Dupont', prenom: 'Camille', telephone: '0388000017', email: 'camille@example.test', adresse: '17 rue des Artisans', ville: 'Strasbourg', codePostal: '67000', type: 'particulier', secteurId: 4, createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z' },
  { id: 29, numeroClient: 'CLI-0029', nom: 'Moreau', prenom: 'Alex', telephone: '0388000029', email: 'alex@example.test', adresse: '29 rue du Dépôt', ville: 'Colmar', codePostal: '68000', type: 'professionnel', secteurId: null, createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z' },
]
const fields = ['numeroClient', 'nom', 'prenom', 'telephone', 'email', 'adresse', 'ville', 'codePostal', 'type']
let browser, server, releaseWrite
function check(condition, label) { assert.ok(condition, label); checks.push(label) }

try {
  await mkdir(output, { recursive: true })
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
  async function setup(role) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
    const state = { clients: structuredClone(initial), writes: [], failure: null, slow: false }
    await context.route('**/api/**', async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      const method = request.method()
      if (method === 'GET') {
        const json = path === '/api/auth/me' ? { user: { id: 1, prenom: 'Marie', nom: 'Laurent', role, email: 'marie@example.test' }, csrfToken: 'client-ui-fixture' }
          : path === '/api/clients' ? state.clients
          : path === '/api/dashboard' ? { stockValue: 0, references: 0, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
          : []
        return route.fulfill({ status: 200, json })
      }
      const body = request.postDataJSON()
      state.writes.push({ method, path, body })
      assert.equal(request.headers()['x-csrf-token'], 'client-ui-fixture')
      if (state.slow) await new Promise((resolveWrite) => { releaseWrite = resolveWrite })
      if (state.failure === 'network') return route.abort('connectionfailed')
      if (state.failure) return route.fulfill({ status: state.failure.status, json: state.failure.body })
      if (method === 'PUT') {
        const id = Number(path.split('/').at(-1))
        assert.equal(path, `/api/clients/${id}`)
        assert.deepEqual(Object.keys(body).sort(), [...fields].sort(), 'Seuls le numéro et les coordonnées sont transmis')
        const previous = state.clients.find((client) => client.id === id)
        assert.ok(previous)
        const updated = { ...previous, ...body, updatedAt: '2026-11-06T12:00:00Z' }
        state.clients = state.clients.map((client) => client.id === id ? updated : client)
        return route.fulfill({ status: 200, json: updated })
      }
      if (method === 'POST' && path === '/api/clients') {
        const id = Math.max(...state.clients.map((client) => client.id)) + 1
        const created = { ...body, id, numeroClient: body.numeroClient || `CLI-${String(id).padStart(4, '0')}`, secteurId: null }
        state.clients.push(created)
        return route.fulfill({ status: 201, json: created })
      }
      assert.fail(`Écriture inattendue : ${method} ${path}`)
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${base}/clients`)
    await page.getByRole('cell', { name: 'CLI-0017', exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    return { context, page, state }
  }

  const { context, page, state } = await setup('admin')
  const table = page.getByRole('table', { name: 'Liste des clients' })
  const trigger = page.getByRole('button', { name: 'Modifier Camille Dupont (CLI-0017)', exact: true })
  const dialog = page.locator('dialog.client-modal')
  const save = dialog.getByRole('button', { name: 'Enregistrer les modifications', exact: true })
  await page.screenshot({ path: resolve(output, 'liste-desktop.png'), fullPage: true })
  await trigger.click()
  for (const field of fields) check(await dialog.locator(`#${field}`).inputValue() === initial[0][field], `Préremplissage ${field}`)
  check((await dialog.textContent()).includes('CLI-0017'), 'Numéro client affiché')
  check(await dialog.locator('#nom').evaluate((element) => element === document.activeElement), 'Focus initial sur Nom')
  await dialog.getByRole('button', { name: 'Fermer la fenêtre' }).focus()
  await page.keyboard.press('Shift+Tab')
  check(await save.evaluate((element) => element === document.activeElement), 'Focus contenu dans le dialogue')
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(250)
      await dialog.evaluate((element) => { element.scrollTop = 0 })
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page sans débordement ${theme} ${width}`)
      check(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth && element.getBoundingClientRect().width <= innerWidth), `Dialogue adapté ${theme} ${width}`)
      if (width === 375 || width === 1440) await page.screenshot({ path: resolve(output, `modification-${theme}-${width}.png`), fullPage: true })
      await save.scrollIntoViewIfNeeded()
      const button = await save.boundingBox()
      check(button && button.y >= 0 && button.y + button.height <= 1000, `Enregistrement accessible par défilement ${theme} ${width}`)
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
  await page.setViewportSize({ width: 1440, height: 1100 })
  await dialog.locator('#nom').fill('Modification annulée')
  await dialog.getByRole('button', { name: 'Rétablir', exact: true }).click()
  check(await dialog.locator('#nom').inputValue() === initial[0].nom, 'Rétablir restaure les valeurs initiales')
  for (const close of ['Annuler', 'Fermer la fenêtre', 'Escape', 'keydown relayé', 'fond']) {
    await dialog.locator('#nom').fill('Modification annulée')
    if (close === 'Escape') await page.keyboard.press('Escape')
    else if (close === 'keydown relayé') await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    else if (close === 'fond') await page.mouse.click(5, 5)
    else await dialog.getByRole('button', { name: close, exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    check(await trigger.evaluate((element) => element === document.activeElement), `Focus restitué après ${close}`)
    check(state.writes.length === 0, `Aucune écriture après ${close}`)
    await trigger.click()
    check(await dialog.locator('#nom').inputValue() === 'Dupont', `Annulation respectée après ${close}`)
  }

  await dialog.locator('#email').fill('email-invalide')
  await save.click()
  await dialog.locator('.error-summary').waitFor()
  check(state.writes.length === 0, 'Validation avant toute requête')
  await dialog.getByRole('button', { name: 'Rétablir', exact: true }).click()
  for (const invalid of ['', 'X'.repeat(33), 'NUM AVEC ESPACE']) {
    await dialog.locator('#numeroClient').fill(invalid)
    await save.click()
    await dialog.locator('.error-summary').waitFor()
    check(await dialog.locator('#numeroClient').getAttribute('aria-invalid') === 'true', `Numéro invalide signalé : longueur ${invalid.length}`)
    check(state.writes.length === 0, 'Aucun envoi de numéro invalide')
  }
  await dialog.getByRole('button', { name: 'Rétablir', exact: true }).click()
  await dialog.locator('#ville').fill('Haguenau')
  for (const failure of [
    { status: 422, body: { error: 'VALIDATION_ERROR', message: 'Coordonnées refusées.' } },
    { status: 409, body: { error: 'CLIENT_NUMBER_EXISTS', message: 'Ce numéro de client est déjà utilisé.' } },
    { status: 403, body: { error: 'FORBIDDEN' } },
    { status: 404, body: { error: 'NOT_FOUND' } },
    { status: 503, body: { error: 'DATABASE_UNAVAILABLE' } },
    'network',
  ]) {
    state.failure = failure
    await save.click()
    await dialog.locator('.error-banner').waitFor()
    if (failure.status === 409) check((await dialog.locator('.error-banner').textContent()).includes('Ce numéro de client est déjà utilisé.'), 'Message explicite pour un numéro déjà utilisé')
    check(await dialog.locator('#ville').inputValue() === 'Haguenau', `Saisie conservée après ${failure.status ?? failure}`)
    check((await table.textContent()).includes('Strasbourg'), `Liste intacte après ${failure.status ?? failure}`)
    check(await page.locator('.toast-success').count() === 0, `Aucun faux succès après ${failure.status ?? failure}`)
  }
  state.failure = null
  state.slow = true
  const updated = { numeroClient: 'PRO/2026-0042', nom: 'Zimmermann', prenom: 'Claude', telephone: '0388901234', email: 'claude@example.test', adresse: '8 avenue de la Gare', ville: 'Haguenau', codePostal: '67500', type: 'professionnel' }
  for (const field of fields) {
    if (field === 'type') await dialog.locator('#type').selectOption(updated.type)
    else await dialog.locator(`#${field}`).fill(updated[field])
  }
  const writesBefore = state.writes.length
  await save.click()
  await page.waitForFunction(() => document.querySelector('.client-form-fields')?.disabled)
  await page.keyboard.press('Escape')
  await dialog.locator('form').dispatchEvent('submit', { bubbles: true, cancelable: true })
  check(await dialog.isVisible(), 'Fermeture bloquée pendant la sauvegarde')
  check(state.writes.length === writesBefore + 1, 'Un seul PUT pendant la sauvegarde')
  releaseWrite()
  releaseWrite = undefined
  state.slow = false
  await dialog.waitFor({ state: 'hidden' })
  await page.getByText(`Client ${updated.numeroClient} modifié.`, { exact: true }).waitFor()
  check(await table.locator('tbody tr').count() === 2, 'La modification ne crée aucun doublon')
  check(state.writes.every((write) => write.method === 'PUT' && write.path === '/api/clients/17'), 'Modification ciblée sur le bon client')
  check(state.clients[0].numeroClient === updated.numeroClient && state.clients[0].id === 17 && state.clients[0].secteurId === 4, 'Numéro changé, identifiant interne et secteur préservés')
  check(await table.locator('tbody tr').last().locator('td').first().textContent() === updated.numeroClient, 'Tri de la liste après changement du nom')
  await page.reload()
  const updatedTrigger = page.getByRole('button', { name: `Modifier Claude Zimmermann (${updated.numeroClient})`, exact: true })
  await updatedTrigger.click()
  for (const field of fields) check(await dialog.locator(`#${field}`).inputValue() === updated[field], `Relecture API après rechargement ${field}`)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Modifier Alex Moreau (CLI-0029)', exact: true }).click()
  check(await dialog.locator('#nom').inputValue() === 'Moreau', 'Passage à un autre client sans mélange des valeurs')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Nouveau client', exact: true }).click()
  for (const field of fields.filter((field) => field !== 'type')) check(await dialog.locator(`#${field}`).inputValue() === '', `Création réinitialisée ${field}`)
  for (const field of fields.filter((field) => field !== 'type' && field !== 'numeroClient')) await dialog.locator(`#${field}`).fill(initial[1][field])
  state.failure = { status: 503, body: { error: 'DATABASE_UNAVAILABLE' } }
  await dialog.getByRole('button', { name: 'Ajouter le client', exact: true }).click()
  await dialog.locator('.error-banner').waitFor()
  check(await table.locator('tbody tr').count() === 2, 'Création sans faux client local en cas de panne')
  state.failure = null
  await dialog.getByRole('button', { name: 'Ajouter le client', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  check(await table.locator('tbody tr').count() === 3, 'Création toujours fonctionnelle après édition')
  check(state.clients.at(-1).numeroClient === 'CLI-0030', 'Numéro automatique accepté à la création si champ vide')
  await page.getByRole('button', { name: 'Nouveau client', exact: true }).click()
  for (const field of fields.filter((field) => field !== 'type')) await dialog.locator(`#${field}`).fill(field === 'numeroClient' ? '000030' : initial[1][field])
  await page.screenshot({ path: resolve(output, 'creation-numero-personnalise.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Ajouter le client', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  check(state.clients.at(-1).numeroClient === '000030', 'Création avec numéro personnalisé et zéros initiaux')
  state.failure = { status: 503, body: { error: 'DATABASE_UNAVAILABLE' } }
  await page.getByRole('button', { name: 'Supprimer Claude Zimmermann', exact: true }).click()
  await page.getByRole('dialog', { name: 'Supprimer ce client ?' }).getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.locator('.error-banner').waitFor()
  check(await table.getByRole('cell', { name: updated.numeroClient, exact: true }).isVisible(), 'Suppression refusée sans disparition locale')
  await context.close()

  for (const role of ['magasinier', 'caissier']) {
    const session = await setup(role)
    const modify = session.page.getByRole('button', { name: 'Modifier Camille Dupont (CLI-0017)', exact: true })
    if (role === 'magasinier') {
      await modify.click()
      await session.page.locator('#ville').fill('Sélestat')
      await session.page.getByRole('button', { name: 'Enregistrer les modifications', exact: true }).click()
      await session.page.locator('dialog.client-modal').waitFor({ state: 'hidden' })
      check(session.state.clients[0].ville === 'Sélestat', 'Modification disponible pour le magasinier')
    } else {
      check(await modify.isDisabled(), 'Modification désactivée pour le caissier')
      check(await session.page.getByRole('button', { name: 'Nouveau client', exact: true }).isDisabled(), 'Création désactivée pour le caissier')
      check(await session.page.getByRole('button', { name: 'Supprimer Camille Dupont', exact: true }).isDisabled(), 'Suppression désactivée pour le caissier')
      check(await session.page.locator('dialog.client-modal').count() === 0 && session.state.writes.length === 0, 'Caissier en lecture seule')
    }
    await session.context.close()
  }
  check(errors.length === 0, 'Aucune erreur JavaScript')
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ scope: 'Chromium et build de production ; API simulée, y compris mises à jour et rechargements ; aucune écriture MariaDB', checks, errors }, null, 2) + '\n')
  console.log(`${checks.length} contrôles Clients réussis ; captures dans ${output}`)
} finally {
  releaseWrite?.()
  await browser?.close()
  if (server) await new Promise((resolveClose) => server.httpServer.close(resolveClose))
}
