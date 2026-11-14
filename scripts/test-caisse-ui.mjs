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
const openingOutput = resolve('specs/screenshots/caisse-ouverture')
const settingsOutput = resolve('specs/screenshots/parametres-caisse')
const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01]
const checks = [], errors = [], writes = []
const openingWrites = []
const settingsWrites = []
let maxFondsCaisse = 10000, settingsReads = 0, configurationReads = 0
let configurationGate, configurationFailed = false, settingsGate, failSettingsNext = false
let updatedAt = '2026-11-10T08:00:00.000Z'
let server, browser, session, role = 'caissier', failNext = false, responseGate, nextVariance

const settings = () => ({
  caisse: { maxFondsCaisse }, api: { maxRequests: 100, windowSeconds: 900 },
  login: { maxAttempts: 10, windowSeconds: 900, blockSeconds: 900 },
  database: { host: 'localhost', port: 3306, database: 'fixture', user: 'fixture', passwordConfigured: false, restartRequired: false },
  turnstile: { enabled: false, siteKey: '', hostnames: [], secretConfigured: false },
  https: { enabled: false, port: 3443, httpMode: 'serve', publicOrigin: '', restartRequired: false }, updatedAt,
})

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
      if (path === '/api/caisse/configuration') {
        configurationReads++
        if (configurationGate) await configurationGate
        return configurationFailed
          ? route.fulfill({ status: 503, json: { error: 'CONFIGURATION_UNAVAILABLE', message: 'Configuration de caisse indisponible.' } })
          : route.fulfill({ status: 200, json: { maxFondsCaisse } })
      }
      if (path === '/api/parametres') {
        settingsReads++
        return route.fulfill({ status: role === 'admin' ? 200 : 403, json: role === 'admin' ? settings() : { error: 'FORBIDDEN' } })
      }
      const json = path === '/api/auth/me' ? { user: { id: 7, prenom: 'Camille', nom: 'Test', role, email: 'caisse@example.test' }, csrfToken: 'caisse-fixture' }
        : path === '/api/caisse/actuelle' ? session
        : path === '/api/dashboard' ? { stockValue: 0, references: 0, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
        : []
      return route.fulfill({ status: 200, json })
    }
    assert.equal(request.headers()['x-csrf-token'], 'caisse-fixture')
    const body = request.postDataJSON()
    if (path === '/api/parametres/caisse') {
      assert.equal(request.method(), 'PUT')
      assert.equal(role, 'admin')
      assert.deepEqual(Object.keys(body), ['maxFondsCaisse'])
      settingsWrites.push(body)
      if (settingsGate) await settingsGate
      if (failSettingsNext) {
        failSettingsNext = false
        return route.fulfill({ status: 503, json: { error: 'SETTINGS_WRITE_FAILED', message: 'Sauvegarde des paramètres indisponible.' } })
      }
      maxFondsCaisse = body.maxFondsCaisse
      updatedAt = new Date().toISOString()
      return route.fulfill({ status: 200, json: settings() })
    }
    assert.equal(request.method(), 'POST')
    if (path === '/api/caisse/ouvrir') {
      assert.ok(Object.keys(body).every((key) => key === 'fondsCaisse' || key === 'notes'))
      assert.ok(Number.isFinite(body.fondsCaisse) && body.fondsCaisse >= 0)
      openingWrites.push(body)
      if (body.fondsCaisse > maxFondsCaisse) return route.fulfill({ status: 422, json: { error: 'VALIDATION_ERROR', message: 'Données invalides.', details: { fondsCaisse: `Le fond de caisse ne peut pas dépasser ${euros(maxFondsCaisse)}.` } } })
      if (responseGate) await responseGate
      if (failNext) {
        failNext = false
        return route.fulfill({ status: 503, json: { error: 'DATABASE_UNAVAILABLE', message: 'Base indisponible.' } })
      }
      session = { id: 17, caissier: 'Camille Test', utilisateurId: 7, statut: 'ouverte', fondsCaisse: body.fondsCaisse, totalEspeces: 0, nombreVentes: 0, openedAt: '2026-11-10T08:00:00.000Z', notes: body.notes ?? null, comptage: [] }
      return route.fulfill({ status: 201, json: session })
    }
    assert.equal(path, '/api/caisse/17/cloturer')
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
  await page.locator('.page-actions').getByRole('button', { name: 'Ouvrir la caisse', exact: true }).waitFor({ state: 'visible' })
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
  await quantity(0.1).fill('3')
  const beforeBackdrop = writes.length
  await page.mouse.click(1, 1)
  check(await dialog.isVisible() && await quantity(0.1).inputValue() === '3' && writes.length === beforeBackdrop, 'Clic sur le fond conserve le formulaire et le comptage sans écriture')
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
  const closingChecks = checks.length

  await mkdir(openingOutput, { recursive: true })
  const openingForm = page.locator('form.caisse-opening-form')
  const openingQuantity = (denomination) => openingForm.locator(`input[name="comptage.${denominations.indexOf(denomination)}.quantite"]`)
  const openingSubmit = () => openingForm.getByRole('button', { name: 'Ouvrir la caisse', exact: true })
  const refreshCash = () => page.locator('dialog.caisse-opening-modal[open]').count().then((count) => count ? page.getByRole('button', { name: 'Actualiser le plafond', exact: true }) : page.locator('.page-actions').getByRole('button', { name: 'Actualiser', exact: true }))
  async function openingScenario() {
    session = null
    role = 'caissier'
    await page.goto(`${base}/caisse`)
    await page.locator('.page-actions').getByRole('button', { name: 'Ouvrir la caisse', exact: true }).click()
    await openingForm.waitFor({ state: 'visible' })
    await page.waitForFunction(() => !document.querySelector('.caisse-opening-form fieldset')?.disabled)
  }
  async function expectOpeningTotal(expected) {
    await page.waitForFunction((expected) => document.querySelector('.caisse-opening-form .reception-total')?.textContent.includes(expected), expected)
  }

  await openingScenario()
  check(await openingForm.locator('input[type="number"]').count() === 15, 'Ouverture : quinze coupures disponibles')
  check(await openingForm.locator('input').evaluateAll((nodes) => nodes.every((node) => node.value === '0')), 'Ouverture : comptage initial à zéro')
  check(await openingForm.locator('input[name="fondsCaisse"]').count() === 0, 'Ouverture : fond calculé depuis les quantités')
  for (const value of ['', '-1', '1.5', '10001']) {
    await openingQuantity(20).fill(value)
    await expectOpeningTotal('Comptage à compléter')
    await openingQuantity(20).press('Enter')
    await openingForm.locator('input[aria-invalid="true"]').waitFor({ state: 'visible' })
    check(openingWrites.length === 0 && await openingForm.isVisible(), `Ouverture : quantité ${value || 'vide'} refusée sans écriture`)
    check(!(await text(openingForm)).includes('NaN'), `Ouverture : aucun NaN avec ${value || 'une quantité vide'}`)
    await openingQuantity(20).fill('0')
  }
  for (const denomination of denominations) await openingQuantity(denomination).fill('1')
  await expectOpeningTotal(euros(888.88))
  check(true, 'Ouverture : toutes les coupures totalisent 888,88 €')
  for (const denomination of denominations) await openingQuantity(denomination).fill('0')
  await openingQuantity(500).fill('20')
  await openingQuantity(0.01).fill('1')
  await openingSubmit().click()
  await openingForm.getByRole('alert').filter({ hasText: euros(10000) }).first().waitFor({ state: 'visible' })
  check(openingWrites.length === 0, 'Ouverture : plafond de 10 000 € contrôlé avant écriture')

  await openingScenario()
  await openingQuantity(100).fill('1')
  await openingQuantity(50).fill('1')
  await openingQuantity(0.2).fill('1')
  await openingQuantity(0.1).fill('1')
  await expectOpeningTotal(euros(150.3))
  check(true, 'Ouverture : calcul exact de 150,30 € avec les centimes')
  await openingForm.locator('textarea[name="notes"]').fill('Fond vérifié à la prise de poste.')
  for (const width of [375, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 })
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
      check(await openingForm.evaluate((node) => node.scrollWidth <= node.clientWidth && document.documentElement.scrollWidth <= innerWidth), `Ouverture sans débordement à ${width}px, thème ${theme}`)
      if (width === 375 || width === 1440) {
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({ path: resolve(openingOutput, `ouverture-${width === 375 ? 'mobile' : 'desktop'}-${theme}.png`), fullPage: true })
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  let releaseOpening
  responseGate = new Promise((resolve) => { releaseOpening = resolve })
  failNext = true
  await openingQuantity(100).press('Enter')
  await openingForm.getByRole('button', { name: 'Ouverture en cours…' }).waitFor({ state: 'visible' })
  check(openingWrites.length === 1 && openingWrites[0].fondsCaisse === 150.3, 'Ouverture : Entrée transmet le fond calculé à l’API')
  check(await openingQuantity(100).isDisabled() && await openingForm.locator('textarea').isDisabled(), 'Ouverture : saisie bloquée pendant l’enregistrement')
  await openingForm.dispatchEvent('submit')
  check(openingWrites.length === 1, 'Ouverture : double envoi bloqué')
  releaseOpening()
  responseGate = undefined
  await page.getByRole('alert').filter({ hasText: 'MariaDB' }).waitFor({ state: 'visible' })
  await openingSubmit().waitFor({ state: 'visible' })
  check(await openingQuantity(100).inputValue() === '1' && await openingForm.locator('textarea').inputValue() === 'Fond vérifié à la prise de poste.', 'Ouverture : erreur API conserve comptage et notes')
  await openingSubmit().click()
  await openingForm.waitFor({ state: 'hidden' })
  check(openingWrites.length === 2 && openingWrites[1].notes === 'Fond vérifié à la prise de poste.', 'Ouverture : nouvelle tentative transmet les notes')
  check((await text(page.locator('.caisse-summary'))).includes(euros(150.3)), 'Ouverture : fond enregistré affiché dans la session')
  await trigger.click()
  check(await quantity(100).inputValue() === '0' && await quantity(50).inputValue() === '0', 'Ouverture et clôture : comptages indépendants')
  await quantity(100).fill('1')
  await quantity(50).fill('1')
  await quantity(0.1).fill('3')
  await expectSummary('Comptage conforme')
  check(true, 'Ouverture : fond de 150,30 € repris dans le théorique de clôture')
  await page.keyboard.press('Escape')

  await openingScenario()
  await openingSubmit().click()
  await openingForm.waitFor({ state: 'hidden' })
  check(openingWrites.at(-1).fondsCaisse === 0, 'Ouverture : fond nul accepté conformément au contrat existant')
  await openingScenario()
  await openingQuantity(500).fill('20')
  await openingSubmit().click()
  await openingForm.waitFor({ state: 'hidden' })
  check(openingWrites.at(-1).fondsCaisse === 10000, 'Ouverture : plafond exact de 10 000 € accepté')
  role = 'magasinier'
  session = null
  await page.reload()
  await page.getByText('Aucune caisse ouverte.', { exact: true }).waitFor({ state: 'visible' })
  check(await openingForm.count() === 0, 'Ouverture : formulaire absent en lecture seule')
  check(errors.length === 0, `Ouverture : aucune erreur JavaScript : ${errors.join(', ')}`)
  await writeFile(resolve(openingOutput, 'verification.json'), JSON.stringify({ checks: checks.slice(closingChecks), errors, writes: openingWrites.length, api: 'simulée, aucune écriture MariaDB' }, null, 2) + '\n')
  const originalChecks = checks.length
  const originalOpeningWrites = openingWrites.length
  await mkdir(settingsOutput, { recursive: true })
  role = 'admin'
  await page.goto(`${base}/parametres`)
  await page.locator('.parametre-card[href="/parametres/caisse"]').click()
  await page.getByRole('button', { name: 'Modifier les paramètres', exact: true }).click()
  const settingsForm = page.locator('form.parametre-detail')
  const ceiling = settingsForm.getByLabel('Plafond du fond de caisse à l’ouverture (€)')
  const saveSettings = () => settingsForm.getByRole('button', { name: 'Enregistrer', exact: true })
  await ceiling.waitFor({ state: 'visible' })
  check(await ceiling.inputValue() === '10000', 'Paramètres Caisse : valeur par défaut chargée depuis le serveur')
  check(await page.getByRole('navigation', { name: 'Rubriques des paramètres' }).getByRole('link', { name: 'Caisse', exact: true }).count() === 1, 'Paramètres Caisse : rubrique présente dans la navigation admin')
  for (const value of ['', '-1', '0.001', '10000000000']) {
    await ceiling.fill(value)
    await settingsForm.dispatchEvent('submit')
    await settingsForm.getByRole('alert').waitFor({ state: 'visible' })
    check(settingsWrites.length === 0 && maxFondsCaisse === 10000, `Paramètres Caisse : plafond ${value || 'vide'} refusé sans sauvegarde`)
  }
  await ceiling.fill('12000.50')
  let releaseSettings
  settingsGate = new Promise((resolve) => { releaseSettings = resolve })
  failSettingsNext = true
  await saveSettings().click()
  await settingsForm.getByRole('button', { name: 'Traitement…' }).waitFor({ state: 'visible' })
  check(await ceiling.isDisabled(), 'Paramètres Caisse : saisie bloquée pendant la sauvegarde')
  await settingsForm.dispatchEvent('submit')
  check(settingsWrites.length === 1, 'Paramètres Caisse : double sauvegarde bloquée')
  releaseSettings()
  settingsGate = undefined
  await settingsForm.getByRole('alert').filter({ hasText: 'Sauvegarde des paramètres indisponible.' }).waitFor({ state: 'visible' })
  check(await ceiling.inputValue() === '12000.50' && maxFondsCaisse === 10000, 'Paramètres Caisse : erreur visible, saisie conservée et plafond précédent maintenu')
  await saveSettings().click()
  await page.getByText('Paramètres enregistrés et appliqués.', { exact: true }).waitFor({ state: 'visible' })
  check(settingsWrites.at(-1).maxFondsCaisse === 12000.5 && maxFondsCaisse === 12000.5, 'Paramètres Caisse : sauvegarde en euros et centimes, plafond supérieur à 10 000 €')
  await page.reload()
  await page.getByRole('button', { name: 'Modifier les paramètres', exact: true }).click()
  await ceiling.waitFor({ state: 'visible' })
  check(await ceiling.inputValue() === '12000.5', 'Paramètres Caisse : valeur sauvegardée relue après rechargement')
  for (const width of [375, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 })
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
      check(await settingsForm.evaluate((node) => node.scrollWidth <= node.clientWidth && document.documentElement.scrollWidth <= innerWidth), `Paramètres Caisse sans débordement à ${width}px, thème ${theme}`)
      if (width === 375 || width === 1440) {
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({ path: resolve(settingsOutput, `caisse-${width === 375 ? 'mobile' : 'desktop'}-${theme}.png`), fullPage: true })
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  for (const deniedRole of ['caissier', 'magasinier']) {
    const previousReads = settingsReads
    role = deniedRole
    await page.goto(`${base}/parametres/caisse`)
    await page.getByRole('heading', { name: 'Accès réservé', exact: true }).waitFor({ state: 'visible' })
    check(await settingsForm.count() === 0 && settingsReads === previousReads, `Paramètres Caisse : accès ${deniedRole} refusé avant lecture des paramètres`)
  }

  await openingScenario()
  await expectOpeningTotal(euros(12000.5))
  check(true, 'Ouverture : plafond administré chargé sans redémarrage')
  await openingQuantity(500).fill('24')
  await openingQuantity(0.5).fill('1')
  await openingQuantity(0.01).fill('1')
  const beforeAboveLimit = openingWrites.length
  await openingSubmit().click()
  await openingForm.getByRole('alert').filter({ hasText: euros(12000.5) }).first().waitFor({ state: 'visible' })
  check(openingWrites.length === beforeAboveLimit, 'Ouverture : plafond administré dépassé d’un centime refusé avant écriture')
  await openingQuantity(0.01).fill('0')
  await openingSubmit().click()
  await openingForm.waitFor({ state: 'hidden' })
  check(openingWrites.at(-1).fondsCaisse === 12000.5, 'Ouverture : nouveau plafond exact accepté au-dessus de 10 000 €')
  maxFondsCaisse = 100.25
  await (await refreshCash()).click()
  await page.waitForFunction(() => !document.querySelector('.page-actions button')?.disabled)
  check((await text(page.locator('.caisse-summary'))).includes(euros(12000.5)), 'Plafond abaissé : fond de la session ouverte conservé')
  await trigger.click()
  await quantity(500).fill('24')
  await quantity(0.5).fill('1')
  await expectSummary('Comptage conforme')
  check(true, 'Plafond abaissé : clôture indépendante du plafond d’ouverture')
  await page.keyboard.press('Escape')

  await openingScenario()
  await expectOpeningTotal('100,25 €')
  await openingQuantity(100).fill('1')
  await openingQuantity(0.2).fill('1')
  await openingQuantity(0.05).fill('1')
  await openingForm.locator('textarea').fill('Comptage conservé après actualisation.')
  maxFondsCaisse = 80
  const beforeRefresh = configurationReads
  await (await refreshCash()).click()
  await expectOpeningTotal(`Plafond autorisé : ${euros(80)}`)
  await page.waitForFunction(() => !document.querySelector('.caisse-opening-form fieldset')?.disabled)
  check(configurationReads > beforeRefresh && await openingQuantity(100).inputValue() === '1' && await openingForm.locator('textarea').inputValue() === 'Comptage conservé après actualisation.', 'Actualiser recharge le plafond et conserve quantités et notes')
  const beforeLowerLimit = openingWrites.length
  await openingSubmit().click()
  await openingForm.getByRole('alert').filter({ hasText: euros(80) }).first().waitFor({ state: 'visible' })
  check(openingWrites.length === beforeLowerLimit, 'Actualiser applique le plafond abaissé à la validation du comptage en cours')
  // Le serveur relit aussi son plafond si un autre poste le modifie entre lecture et envoi.
  maxFondsCaisse = 200
  await (await refreshCash()).click()
  await expectOpeningTotal(`Plafond autorisé : ${euros(200)}`)
  await page.waitForFunction(() => !document.querySelector('.caisse-opening-form fieldset')?.disabled)
  maxFondsCaisse = 80
  await openingSubmit().click()
  await page.getByRole('alert').filter({ hasText: '80,00 €' }).first().waitFor({ state: 'visible' })
  check(await openingQuantity(100).inputValue() === '1' && await openingForm.isVisible(), 'Changement concurrent de plafond : refus API visible et comptage conservé')

  configurationFailed = true
  await (await refreshCash()).click()
  await page.getByRole('alert').filter({ hasText: 'Configuration de caisse indisponible.' }).waitFor({ state: 'visible' })
  check(await openingSubmit().isDisabled() && await openingQuantity(100).inputValue() === '1', 'Configuration indisponible : ouverture bloquée et comptage conservé')
  const beforeUnavailable = openingWrites.length
  await openingForm.dispatchEvent('submit')
  check(openingWrites.length === beforeUnavailable, 'Configuration indisponible : aucun envoi même par soumission du formulaire')
  configurationFailed = false
  maxFondsCaisse = 200
  await (await refreshCash()).click()
  await expectOpeningTotal(`Plafond autorisé : ${euros(200)}`)
  await page.waitForFunction(() => !document.querySelector('.caisse-opening-form fieldset')?.disabled)
  check(await openingQuantity(100).inputValue() === '1', 'Configuration rétablie : saisie précédente utilisable sans rechargement de page')

  let releaseConfiguration
  configurationGate = new Promise((resolve) => { releaseConfiguration = resolve })
  await page.goto(`${base}/caisse`)
  await page.locator('.page-actions').getByRole('button', { name: 'Ouvrir la caisse', exact: true }).click()
  await openingForm.waitFor({ state: 'visible' })
  check(await openingSubmit().isDisabled(), 'Configuration en cours de chargement : ouverture bloquée')
  await openingForm.dispatchEvent('submit')
  check(openingWrites.length === beforeUnavailable, 'Configuration en cours de chargement : aucun envoi')
  releaseConfiguration()
  configurationGate = undefined
  await page.waitForFunction(() => !document.querySelector('.caisse-opening-form fieldset')?.disabled)
  check(errors.length === 0, `Paramètres Caisse : aucune erreur JavaScript : ${errors.join(', ')}`)
  await writeFile(resolve(settingsOutput, 'verification.json'), JSON.stringify({ checks: checks.slice(originalChecks), errors, settingsWrites: settingsWrites.length, openingWrites: openingWrites.length - originalOpeningWrites, api: 'simulée, aucune écriture MariaDB' }, null, 2) + '\n')
  console.log(`${checks.length} contrôles réussis (${closingChecks} clôture, ${originalChecks - closingChecks} ouverture, ${checks.length - originalChecks} paramètres et plafond dynamique) ; API simulée.`)
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server ? server.httpServer.close((error) => error ? reject(error) : resolve()) : resolve())
}
