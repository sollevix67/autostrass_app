/** npm run build puis npm run test:caisse:ui.
 * Chromium et API simulée ; aucune écriture MariaDB.
 * PLAYWRIGHT_MODULE permet d'utiliser une installation externe de Playwright.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = resolve('specs/screenshots/caisse-cloture')
const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01]
const checks = [], errors = [], writes = []
let server, browser, session, role = 'caissier', failNext = false, responseGate, nextVariance

function check(condition, label) { assert.ok(condition, label); checks.push(label) }
const euros = (value) => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} €`

try {
  await mkdir(output, { recursive: true })
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'GET') {
      const json = path === '/api/auth/me' ? { user: { id: 7, prenom: 'Camille', nom: 'Test', role, email: 'caisse@example.test' }, csrfToken: 'caisse-fixture' }
        : path === '/api/caisse/actuelle' ? session
        : path === '/api/dashboard' ? { stockValue: 0, references: 0, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
        : []
      return route.fulfill({ status: 200, json })
    }
    assert.equal(request.method(), 'POST')
    assert.equal(path, '/api/caisse/17/cloturer')
    assert.equal(request.headers()['x-csrf-token'], 'caisse-fixture')
    const body = request.postDataJSON()
    assert.ok(Array.isArray(body.comptage))
    assert.ok(Object.keys(body).every((key) => key === 'comptage' || key === 'notes'))
    assert.ok(body.comptage.every((line) => denominations.includes(line.denomination) && Number.isInteger(line.quantite) && line.quantite > 0 && line.quantite <= 10000))
    writes.push(body)
    if (responseGate) await responseGate
    if (failNext) {
      failNext = false
      return route.fulfill({ status: 503, json: { error: 'DATABASE_UNAVAILABLE', message: 'Base indisponible.' } })
    }
    const totalReel = Number(body.comptage.reduce((sum, line) => sum + line.denomination * line.quantite, 0).toFixed(2))
    const totalTheorique = Number((session.fondsCaisse + session.totalEspeces).toFixed(2))
    const ecart = nextVariance ?? Number((totalReel - totalTheorique).toFixed(2))
    nextVariance = undefined
    const closed = { ...session, statut: 'clôturée', totalReel, totalTheorique, ecart, comptage: body.comptage, notes: body.notes }
    session = null
    return route.fulfill({ status: 200, json: closed })
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  const dialog = page.locator('dialog.caisse-modal')
  const trigger = page.getByRole('button', { name: 'Clôturer la caisse', exact: true })
  const quantity = (denomination) => dialog.locator(`input[name="comptage.${denominations.indexOf(denomination)}.quantite"]`)
  const verify = () => dialog.getByRole('button', { name: 'Vérifier la clôture', exact: true })
  const confirm = () => dialog.getByRole('button', { name: 'Confirmer la clôture', exact: true })
  const summary = dialog.locator('.reception-total')
  const text = (locator) => locator.innerText()

  async function scenario(fondsCaisse = 150, totalEspeces = 12.88) {
    role = 'caissier'
    session = { id: 17, caissier: 'Camille Test', utilisateurId: 7, statut: 'ouverte', fondsCaisse, totalEspeces, nombreVentes: 2, openedAt: '2026-11-10T08:00:00.000Z', comptage: [] }
    await page.goto(`${base}/caisse`)
    await trigger.waitFor({ state: 'visible' })
  }
  async function expectSummary(expected) {
    try {
      await page.waitForFunction((expected) => document.querySelector('dialog .reception-total')?.textContent.includes(expected), expected, { timeout: 10000 })
    } catch (error) {
      console.error(JSON.stringify({ expected, actual: await summary.textContent(), quantities: await dialog.locator('input').evaluateAll((nodes) => nodes.map((node) => node.value)) }))
      throw error
    }
  }

  await scenario()
  check(!(await dialog.isVisible()), 'Formulaire absent de la page avant ouverture')
  await trigger.click()
  await dialog.waitFor({ state: 'visible' })
  check(await dialog.evaluate((node) => node.matches(':modal')), 'Fenêtre contextuelle native modale')
  check(await quantity(500).evaluate((node) => document.activeElement === node), 'Focus initial dans le comptage')
  check(await dialog.locator('input[type="number"]').count() === 15, 'Toutes les coupures de 500 € à 0,01 € présentes')
  check(await dialog.locator('input[type="number"]').evaluateAll((nodes) => nodes.every((node) => node.value === '0')), 'Comptage initial à zéro, indépendant du théorique')
  await dialog.getByRole('button', { name: 'Fermer la fenêtre' }).focus()
  await page.keyboard.press('Shift+Tab')
  check(await verify().evaluate((node) => document.activeElement === node), 'Focus contenu à la limite précédente du dialogue')
  await page.keyboard.press('Tab')
  check(await dialog.getByRole('button', { name: 'Fermer la fenêtre' }).evaluate((node) => document.activeElement === node), 'Focus contenu à la limite suivante du dialogue')

  for (const value of ['', '-1', '1.5', '10001']) {
    await quantity(20).fill(value)
    await expectSummary('Comptage à compléter')
    await quantity(20).press('Enter')
    await dialog.locator('input[aria-invalid="true"]').waitFor({ state: 'visible' })
    check(!(await confirm().isVisible()) && writes.length === 0, `Quantité ${value || 'vide'} refusée avant confirmation`)
    check(!(await text(dialog)).includes('NaN'), `Aucun NaN pour la quantité ${value || 'vide'}`)
    await quantity(20).fill('0')
  }
  await quantity(50).fill('3')
  for (const denomination of [10, 2, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01]) await quantity(denomination).fill('1')
  await expectSummary('Comptage conforme')
  check((await text(summary)).includes(euros(162.88)), 'Billets et toutes les pièces totalisent exactement 162,88 €')
  check(await text(dialog.getByLabel('Montant en 50 €', { exact: true })) === euros(150), 'Sous-total de trois billets de 50 €')
  await quantity(0.01).fill('0')
  await expectSummary(`Déficit de ${euros(0.01)}`)
  check(true, 'Déficit d’un centime affiché correctement')
  await quantity(0.01).fill('2')
  await expectSummary(`Excédent de ${euros(0.01)}`)
  check(true, 'Excédent d’un centime affiché correctement')
  await quantity(0.01).fill('1')
  await dialog.locator('textarea[name="notes"]').fill('Comptage vérifié avec le fond.')
  await quantity(50).press('Enter')
  await confirm().waitFor({ state: 'visible' })
  check(writes.length === 0, 'Entrée affiche la confirmation sans enregistrer')
  check((await text(dialog)).includes('Comptage vérifié avec le fond.'), 'Commentaire présent dans la confirmation')
  check(await dialog.getByRole('button', { name: 'Revenir au comptage' }).evaluate((node) => document.activeElement === node), 'Focus sur le retour lors de la confirmation')
  await page.keyboard.press('Escape')
  await verify().waitFor({ state: 'visible' })
  check(await quantity(50).inputValue() === '3', 'Échap depuis la confirmation conserve le comptage')
  check(await dialog.locator('textarea').inputValue() === 'Comptage vérifié avec le fond.', 'Retour conserve le commentaire')

  for (const width of [375, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 })
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
      check(await dialog.evaluate((node) => {
        const bounds = node.getBoundingClientRect()
        return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight && node.scrollWidth <= node.clientWidth
      }), `Fenêtre sans débordement à ${width}px, thème ${theme}`)
      if (width === 375 || width === 1440) {
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({ path: resolve(output, `cloture-${width === 375 ? 'mobile' : 'desktop'}-${theme}.png`) })
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await verify().click()
  await confirm().waitFor({ state: 'visible' })
  let releaseClose
  responseGate = new Promise((resolve) => { releaseClose = resolve })
  failNext = true
  await confirm().click()
  await dialog.getByRole('button', { name: 'Clôture en cours…' }).waitFor({ state: 'visible' })
  check(writes.length === 1, 'Une requête après confirmation explicite')
  check(await dialog.getByRole('button', { name: 'Fermer la fenêtre' }).isDisabled(), 'Croix bloquée pendant la sauvegarde')
  check(await dialog.getByRole('button', { name: 'Revenir au comptage' }).isDisabled(), 'Retour bloqué pendant la sauvegarde')
  await dialog.getByRole('button', { name: 'Clôture en cours…' }).dispatchEvent('click')
  await page.keyboard.press('Escape')
  await page.mouse.click(1, 1)
  check(await dialog.isVisible() && writes.length === 1, 'Échap, fond et double clic ne ferment ni ne renvoient pendant l’écriture')
  releaseClose()
  responseGate = undefined
  await verify().waitFor({ state: 'visible' })
  await dialog.getByRole('alert').filter({ hasText: 'MariaDB' }).waitFor({ state: 'visible' })
  check(await quantity(50).inputValue() === '3' && await dialog.locator('textarea').inputValue() === 'Comptage vérifié avec le fond.', 'Erreur API visible et saisie conservée')
  await verify().click()
  await confirm().click()
  await dialog.waitFor({ state: 'hidden' })
  check(writes.length === 2, 'Nouvelle tentative uniquement après nouvelle confirmation')
  check(writes[1].comptage.length === 9 && writes[1].comptage.every((line) => line.quantite > 0), 'Seules les coupures réellement comptées sont envoyées')
  check(writes[1].notes === 'Comptage vérifié avec le fond.', 'Commentaire transmis à l’API')
  await page.getByRole('heading', { name: 'Ouvrir la caisse' }).waitFor({ state: 'visible' })
  check(true, 'Clôture réussie retire la session ouverte')

  await scenario(0.1, 0.2)
  await trigger.click()
  await quantity(0.1).fill('3')
  await expectSummary('Comptage conforme')
  check((await text(summary)).includes(euros(0.3)) && !(await text(summary)).includes('Excédent'), '0,10 + 0,20 € et trois pièces de 0,10 € ne produisent aucun faux écart')
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  check(await trigger.evaluate((node) => document.activeElement === node), 'Annulation restitue le focus au bouton déclencheur')
  await trigger.click()
  check(await quantity(0.1).inputValue() === '0', 'Réouverture remet le comptage à zéro')
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  check(true, 'Échap ferme le formulaire de comptage')
  await trigger.click()
  await page.mouse.click(1, 1)
  await dialog.waitFor({ state: 'hidden' })
  check(true, 'Clic sur le fond ferme le formulaire')
  await trigger.click()
  await dialog.getByRole('button', { name: 'Fermer la fenêtre' }).click()
  await dialog.waitFor({ state: 'hidden' })
  check(true, 'Croix ferme le formulaire')

  await scenario(888.88, 0)
  await trigger.click()
  for (const denomination of denominations) await quantity(denomination).fill('1')
  await expectSummary('Comptage conforme')
  check((await text(summary)).includes(euros(888.88)), 'Une unité de chacune des quinze coupures totalise 888,88 €')
  await verify().click()
  nextVariance = -0.01
  await confirm().click()
  await dialog.waitFor({ state: 'hidden' })
  await page.getByText(/Caisse clôturée avec un écart.*déficit de 0,01/).waitFor({ state: 'visible' })
  check(writes.at(-1).comptage.length === 15, 'Toutes les coupures peuvent être transmises')
  check(true, 'Résultat final utilise l’écart retourné par le serveur')

  await scenario(0, 0)
  await trigger.click()
  await verify().click()
  await confirm().click()
  await dialog.waitFor({ state: 'hidden' })
  check(writes.at(-1).comptage.length === 0, 'Comptage vide légitime transmis comme tableau vide')

  await scenario()
  role = 'magasinier'
  await page.reload()
  await page.getByText(/gestion de caisse est reservee/).waitFor({ state: 'visible' })
  check(await trigger.count() === 0 && await dialog.count() === 0, 'Lecture seule sans bouton ni formulaire de clôture')
  check(errors.length === 0, `Aucune erreur JavaScript : ${errors.join(', ')}`)
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ checks, errors, writes: writes.length, api: 'simulée, aucune écriture MariaDB' }, null, 2) + '\n')
  console.log(`${checks.length} contrôles Caisse réussis ; ${writes.length} requêtes simulées.`)
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server ? server.httpServer.close((error) => error ? reject(error) : resolve()) : resolve())
}
