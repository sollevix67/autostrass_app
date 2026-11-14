/** Régressions R07/R10/R11, Chromium et API simulée, sans accès MariaDB.
 * npm run build puis node scripts/test-review-frontend-ui.mjs
 * --development teste seulement Vite/StrictMode ; --production teste le build.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer, preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = resolve('specs/screenshots/revue-correctifs-frontend')
const checks = [], errors = []
const modes = process.argv.includes('--development') ? ['development']
  : process.argv.includes('--production') ? ['production'] : ['development', 'production']
let browser, server, mode, base
const check = (condition, label) => { assert.ok(condition, label); checks.push(`${mode} : ${label}`) }
const waitFor = async (condition) => {
  const deadline = Date.now() + 10000
  while (!condition()) {
    assert.ok(Date.now() < deadline, 'La condition attendue doit être remplie en dix secondes')
    await new Promise((done) => setTimeout(done, 20))
  }
}
const snapshot = (dialog) => dialog.locator('input, select, textarea').evaluateAll((nodes) => nodes.map((node) => [node.name || node.id, node.value, node.checked]))

async function setup(path, overrides = {}) {
  const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const article = { reference: 'REV-1', designation: 'Article initial', category: 'freins', sousCategorieId: null, prixUnitaireHT: 12.5, prixUnitaireTTC: 15, quantite: 10, minimum: 2, emplacement: null, description: null, tvaId: 1, ean13: null, delaiDisponibilite: 0, forcerSurCommande: false }
  const client = { id: 1, numeroClient: '000001', nom: 'Client', prenom: 'Revue', type: 'particulier', adresse: '1 rue du Dépôt', ville: 'Strasbourg', codePostal: '67000', secteurId: null }
  const state = {
    article, receptions: [], writes: [], clientReads: 0, clientResponses: [], movementReads: 0,
    clientsGate: null, failClients: false, failMovements: false, failWrite: true,
    movements: [], session: { id: 17, utilisateurId: 7, caissier: 'Camille Test', statut: 'ouverte', fondsCaisse: 100, totalEspeces: 0, totalCartes: 0, totalCheques: 0, nombreVentes: 0, openedAt: '2026-11-14T08:00:00Z' }, ...overrides,
  }
  await context.route('**/api/**', async (route) => {
    const request = route.request(), url = new URL(request.url()), requestPath = url.pathname
    if (request.method() === 'GET') {
      if (requestPath === '/api/clients') {
        state.clientReads++
        if (state.clientsGate) await state.clientsGate
        if (state.failClients) return route.fulfill({ status: 503, json: { error: 'DATABASE_UNAVAILABLE' } })
      }
      if (requestPath === '/api/caisse/17/mouvements') {
        state.movementReads++
        if (state.failMovements) return route.fulfill({ status: 503, json: { error: 'DATABASE_UNAVAILABLE' } })
      }
      const json = requestPath === '/api/auth/me' ? { user: { id: 7, prenom: 'Camille', nom: 'Test', role: 'admin', email: 'revue@example.test' }, csrfToken: 'revue-fixture' }
        : requestPath === '/api/dashboard' ? { stockValue: 0, references: 1, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
        : requestPath === '/api/clients' ? [client]
        : requestPath === '/api/articles' ? [article]
        : requestPath === '/api/categories' ? [{ id: 1, code: 'freins', libelle: 'Freins', actif: true }]
        : requestPath === '/api/tva' ? [{ id: 1, taux: 20, libelle: '20 %', actif: true }]
        : requestPath === '/api/receptions' ? state.receptions
        : requestPath === '/api/caisse/actuelle' ? state.session
        : requestPath === '/api/caisse/configuration' ? { maxFondsCaisse: 10000 }
        : requestPath === '/api/caisse/17/mouvements' ? state.movements : []
      return route.fulfill({ status: 200, json })
    }
    assert.equal(request.headers()['x-csrf-token'], 'revue-fixture')
    const body = request.method() === 'DELETE' ? null : request.postDataJSON()
    state.writes.push({ path: requestPath, method: request.method(), body })
    if (state.failWrite) return route.fulfill({ status: 503, json: { error: 'DATABASE_UNAVAILABLE', message: 'Base indisponible.' } })
    if (requestPath === '/api/receptions') {
      const articles = body.articles.map((line) => ({ ...line, montant: line.quantite * line.prixUnitaire }))
      const result = { id: 25, ...body, articles, totalHT: articles.reduce((sum, line) => sum + line.montant, 0) }
      state.receptions.push(result)
      return route.fulfill({ status: 201, json: result })
    }
    Object.assign(article, body)
    return route.fulfill({ status: 200, json: article })
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (new URL(response.url()).pathname === '/api/clients') state.clientResponses.push(response)
  })
  await page.goto(base + path)
  return { context, page, state }
}

try {
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ headless: true })
  for (mode of modes) {
    if (mode === 'development') {
      server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } })
      await server.listen()
    } else server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
    base = `http://127.0.0.1:${server.httpServer.address().port}`

    {
      const { context, page, state } = await setup('/receptions')
      await page.getByRole('button', { name: 'Nouvelle réception', exact: true }).click()
      const dialog = page.locator('dialog.reception-modal')
      await dialog.locator('[name="fournisseur"]').selectOption('Auto Pieces Nord')
      await dialog.locator('[name="dateReception"]').fill('2026-11-14')
      await dialog.locator('[name="articles.0.reference"]').fill('REV-1')
      await dialog.locator('[name="articles.0.designation"]').fill('Réception conservée')
      await dialog.locator('[name="articles.0.quantite"]').fill('2')
      await dialog.locator('[name="articles.0.prixUnitaire"]').fill('12.50')
      const before = await snapshot(dialog)
      await dialog.getByRole('button', { name: 'Enregistrer la réception', exact: true }).click()
      await dialog.getByRole('alert').waitFor()
      check(await dialog.isVisible(), 'R07 réception refusée : dialogue conservé')
      check(JSON.stringify(before) === JSON.stringify(await snapshot(dialog)), 'R07 réception refusée : toute la saisie conservée')
      check(await page.locator('.toast-success').count() === 0 && await page.locator('tbody').getByText('Auto Pieces Nord').count() === 0, 'R07 réception refusée : aucun faux succès ni ligne locale')
      await page.screenshot({ path: resolve(output, `reception-refus-${mode}.png`) })
      state.failWrite = false
      await dialog.getByRole('button', { name: 'Enregistrer la réception', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      await page.locator('.toast-success').waitFor()
      check(state.writes.length === 2 && state.receptions.length === 1 && state.receptions[0].totalHT === 25, 'R07 réception : nouvelle tentative confirmée par API et total serveur')
      await page.locator('.toast-success .toast-close').click()
      state.failWrite = true
      await page.getByRole('button', { name: 'Supprimer la reception du 2026-11-14', exact: true }).click()
      await page.locator('dialog.confirm-modal').getByRole('button', { name: 'Supprimer', exact: true }).click()
      await page.getByRole('alert').waitFor()
      check(await page.locator('tbody').getByText('Auto Pieces Nord').count() === 1 && await page.locator('.toast-success').count() === 0, 'R07 suppression réception refusée : historique conservé')
      await context.close()
    }

    {
      const { context, page, state } = await setup('/catalogue')
      await page.getByRole('button', { name: 'Modifier REV-1', exact: true }).click()
      const dialog = page.locator('dialog.article-modal')
      await dialog.locator('[name="designation"]').fill('Article modifié')
      const before = await snapshot(dialog)
      await dialog.getByRole('button', { name: "Enregistrer l'article", exact: true }).click()
      await dialog.getByRole('alert').waitFor()
      check(await dialog.isVisible() && JSON.stringify(before) === JSON.stringify(await snapshot(dialog)), 'R07 catalogue PUT refusé : dialogue et saisie conservés')
      check(await page.locator('.toast-success').count() === 0 && await page.locator('tbody').getByText('Article initial', { exact: true }).count() === 1, 'R07 catalogue PUT refusé : article serveur intact, aucun faux succès')
      await page.screenshot({ path: resolve(output, `catalogue-refus-${mode}.png`) })
      state.failWrite = false
      await dialog.getByRole('button', { name: 'Actualiser la connexion', exact: true }).click()
      const submit = dialog.getByRole('button', { name: "Enregistrer l'article", exact: true })
      await submit.waitFor()
      await page.waitForFunction(() => !document.querySelector('dialog.article-modal button[type="submit"]').disabled)
      check(JSON.stringify(before) === JSON.stringify(await snapshot(dialog)), 'R07 catalogue : actualisation sans perte de saisie')
      await submit.click()
      await dialog.waitFor({ state: 'hidden' })
      check(state.writes.length === 2 && state.article.designation === 'Article modifié', 'R07 catalogue : nouvelle tentative confirmée par API')
      await page.locator('.toast-success .toast-close').click()
      state.failWrite = true
      await page.getByRole('button', { name: 'Supprimer REV-1', exact: true }).click()
      await page.locator('dialog.confirm-modal').getByRole('button', { name: 'Supprimer', exact: true }).click()
      await page.getByRole('alert').waitFor()
      check(await page.getByRole('button', { name: 'Modifier REV-1', exact: true }).count() === 1 && await page.locator('.toast-success').count() === 0, 'R07 suppression catalogue refusée : article conservé')
      await context.close()
    }

    {
      const { context, page, state } = await setup('/catalogue')
      await page.getByRole('button', { name: 'Nouvel article', exact: true }).click()
      const dialog = page.locator('dialog.article-modal')
      await dialog.locator('[name="reference"]').fill('NEW-REV')
      await dialog.locator('[name="designation"]').fill('Nouvel article conservé')
      await dialog.locator('[name="category"]').selectOption('freins')
      await dialog.locator('[name="prixUnitaireHT"]').fill('10')
      const before = await snapshot(dialog)
      await dialog.getByRole('button', { name: "Créer l'article", exact: true }).click()
      await dialog.getByRole('alert').waitFor()
      check(await dialog.isVisible() && JSON.stringify(before) === JSON.stringify(await snapshot(dialog)), 'R07 catalogue POST refusé : dialogue et saisie conservés')
      check(state.writes.length === 1 && state.writes[0].method === 'POST' && await page.locator('.toast-success').count() === 0 && await page.locator('tbody').getByText('NEW-REV', { exact: true }).count() === 0, 'R07 catalogue POST refusé : aucun article local ni faux succès')
      await context.close()
    }

    {
      let releaseClients
      const clientsGate = new Promise((resolve) => { releaseClients = resolve })
      const { context, page, state } = await setup('/commandes-clients', { clientsGate })
      await page.getByRole('button', { name: 'Nouvelle commande', exact: true }).waitFor()
      await waitFor(() => state.clientReads > 0)
      await page.getByRole('link', { name: 'Retours', exact: true }).click()
      await page.getByRole('button', { name: 'Nouveau retour', exact: true }).click()
      releaseClients()
      await page.locator('dialog [name="clientId"] option[value="1"]').waitFor({ state: 'attached' })
      check(state.clientReads === 1, 'R10 StrictMode et navigation pendant chargement : une requête partagée, client disponible')
      await page.keyboard.press('Escape')
      await page.getByRole('link', { name: 'Commandes clients', exact: true }).click()
      await page.getByRole('button', { name: 'Nouvelle commande', exact: true }).click()
      await page.locator('dialog [name="clientId"] option[value="1"]').waitFor({ state: 'attached' })
      check(state.clientReads === 1, 'R10 référentiel valide réutilisé au remontage')
      await context.close()
    }

    {
      const { context, page, state } = await setup('/commandes-clients', { failClients: true })
      await page.getByRole('button', { name: 'Nouvelle commande', exact: true }).waitFor()
      await waitFor(() => state.clientResponses.length > 0)
      // Attendre que l'échec ait réellement été traité avant le remontage.
      await state.clientResponses[0].finished()
      await page.evaluate(() => new Promise(requestAnimationFrame))
      state.failClients = false
      await page.getByRole('link', { name: 'Retours', exact: true }).click()
      await page.getByRole('button', { name: 'Nouveau retour', exact: true }).click()
      await page.locator('dialog [name="clientId"] option[value="1"]').waitFor({ state: 'attached' })
      check(state.clientReads === 2, 'R10 échec de référentiel : aucune liste vide mise en cache, nouvelle tentative au remontage')
      await context.close()
    }

    {
      const { context, page, state } = await setup('/caisse')
      const refresh = page.getByRole('button', { name: 'Actualiser', exact: true }).and(page.locator('.secondary-button'))
      await page.getByText('Aucun mouvement enregistré.', { exact: true }).waitFor()
      await page.waitForFunction(() => ![...document.querySelectorAll('button.secondary-button')].find((node) => node.textContent.trim() === 'Actualiser').disabled)
      const initialReads = state.movementReads
      state.movements.push({ id: 1, sessionId: 17, type: 'encaissement', montant: 10, venteId: 1, libelle: 'Vente après chargement', createdAt: '2026-11-14T10:00:00Z' })
      state.session.totalEspeces = 10
      await refresh.click()
      await page.getByText('Vente après chargement', { exact: true }).waitFor()
      check(state.movementReads === initialReads + 1, 'R11 Actualiser recharge le journal de la même session')
      state.failMovements = true
      await refresh.click()
      await page.getByRole('alert').waitFor()
      check(await page.getByText('Vente après chargement', { exact: true }).isVisible(), 'R11 panne journal signalée et dernière lecture conservée')
      state.failMovements = false
      await refresh.click()
      await page.getByRole('alert').waitFor({ state: 'hidden' })
      check(state.movementReads === initialReads + 3, 'R11 journal rechargeable après panne')
      await context.close()
    }
    await server.close()
    server = null
  }
  check(errors.length === 0, 'aucune erreur JavaScript')
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ date: '2026-11-14', api: 'simulated', modes, checks, errors }, null, 2) + '\n')
  console.log(`${checks.length} contrôles frontend R07/R10/R11 réussis (${modes.join(', ')}).`)
} finally {
  if (browser) await browser.close()
  if (server) await server.close()
}
