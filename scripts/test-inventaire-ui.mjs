/** npm run build, puis node --import tsx scripts/test-inventaire-ui.mjs.
 * Playwright/Chromium requis ; PLAYWRIGHT_MODULE peut désigner un module externe.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'
import { createTestEnvironment } from './lib/test-environment.ts'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const environment = await createTestEnvironment()
let server, browser
const output = resolve('specs/screenshots/inventaire')
await mkdir(output, { recursive: true })
const checks = []
const errors = []
function check(condition, label) { assert.ok(condition, label); checks.push(label) }
const reference = 'UI-INVENTAIRE'
const endpoint = `**/api/inventaires/${reference}`
try {
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
  const [article] = await environment.connection.execute("INSERT INTO articles (reference, designation, ean13) VALUES (?, 'Plaquettes de frein — contrôle physique', '1234567890123')", [reference])
  await environment.connection.execute('INSERT INTO stock_balances (reference_id, quantity) VALUES (?, 10)', [article.insertId])
  const locations = []
  for (const code of ['INV-A', 'INV-B', 'INV-C']) {
    const [location] = await environment.connection.execute("INSERT INTO emplacements (niveau, code) VALUES ('allee', ?)", [code])
    locations.push(location.insertId)
  }
  for (const [index, quantity] of [[0, 6], [1, 2]]) await environment.connection.execute('INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite) VALUES (?, ?, ?)', [article.insertId, locations[index], quantity])
  async function setup(role = 'Admin') {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' })
    await context.route('**/api/**', async (route) => {
      const url = new URL(route.request().url())
      try { await route.fulfill({ response: await route.fetch({ url: environment.baseUrl + url.pathname + url.search }) }) }
      catch { await route.abort().catch(() => {}) }
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('dialog', (dialog) => dialog.accept())
    await page.goto(base)
    await page.getByRole('button', { name: new RegExp(`^${role}`) }).click()
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await page.getByRole('heading', { name: /Bonjour/ }).waitFor()
    return { context, page }
  }
  const { context, page } = await setup()
  await page.goto(`${base}/stock`)
  await page.getByRole('link', { name: `Compter ${reference}`, exact: true }).click()
  await page.locator('#count-reference').waitFor()
  await page.locator(`#count-reference option[value="${reference}"]`).waitFor({ state: 'attached' })
  check(await page.locator('#count-reference').inputValue() === reference, 'Accès depuis la ligne Stock avec référence présélectionnée')
  await page.locator('#count-search').fill('1234567890123')
  check(await page.locator('#count-reference option').count() === 2, 'Recherche EAN13')
  await page.getByRole('button', { name: 'Commencer le comptage', exact: true }).click()
  await page.locator('#count-0').waitFor()
  check(await page.locator('.inventaire-line').count() === 3, 'Tous les emplacements et le stock non affecté sont présentés')
  check(await page.locator('#count-0').inputValue() === '', 'Aucune quantité théorique préremplie comme comptée')
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1100 })
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Aucun débordement horizontal ${theme} ${width}`)
      check(await page.locator('h1').count() === 1, `Un titre principal ${theme} ${width}`)
      for (const input of await page.locator('.inventaire-count input').all()) {
        const box = await input.boundingBox()
        check(box && box.width > 100 && box.x >= 0 && box.x + box.width <= width + 1, `Champ visible ${theme} ${width}`)
      }
      if (width === 375 || width === 1440) await page.screenshot({ path: resolve(output, `comptage-${theme}-${width}.png`), fullPage: true })
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
  await page.setViewportSize({ width: 1440, height: 1100 })
  const review = page.getByRole('button', { name: 'Vérifier et valider le comptage', exact: true })
  await review.click()
  await page.locator('.error-summary').waitFor()
  await page.waitForFunction(() => document.activeElement?.classList.contains('error-summary'))
  check(await page.locator('.error-summary').evaluate((element) => element === document.activeElement), 'Focus sur les erreurs du formulaire vide')
  check(await page.locator('#count-0').getAttribute('aria-invalid') === 'true', 'Quantité manquante signalée')
  await page.locator('.error-summary a').filter({ hasText: 'Stock non affecté' }).click()
  check(await page.locator('#count-0').evaluate((element) => element === document.activeElement), 'Lien d’erreur vers le champ')
  for (const [index, value] of ['1', '5', '0'].entries()) await page.locator(`#count-${index}`).fill(value)
  await page.locator('#motif').fill('Contrôle physique du rayon freinage')
  await page.getByRole('link', { name: 'Retour au stock', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  check((await page.getByRole('dialog').textContent()).includes('Quitter le comptage'), 'Navigation protégée pendant une saisie')
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler', exact: true }).click()
  check(await page.locator('#count-1').inputValue() === '5', 'Annulation de navigation conserve le comptage')
  await page.locator('#count-1').fill('1.5')
  await review.click()
  check(await page.locator('#count-1').getAttribute('aria-invalid') === 'true', 'Fraction refusée')
  await page.locator('#count-1').fill('5')
  await page.locator('#count-location').selectOption(String(locations[2]))
  await page.getByRole('button', { name: 'Ajouter au comptage', exact: true }).click()
  await page.locator('#count-3').fill('3')
  check((await page.locator('.inventaire-total').textContent()).includes('Écart : -1'), 'Total et écart calculés avec le nouvel emplacement')
  await review.click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  check((await dialog.textContent()).includes('9 unités'), 'Confirmation du total physique')
  check(await dialog.getByRole('button', { name: 'Annuler', exact: true }).evaluate((element) => element === document.activeElement), 'Focus initial sur Annuler')
  await page.keyboard.press('Shift+Tab')
  check(await dialog.getByRole('button', { name: 'Confirmer', exact: true }).evaluate((element) => element === document.activeElement), 'Focus contenu dans la confirmation')
  await page.screenshot({ path: resolve(output, 'confirmation.png'), fullPage: true })
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  check(await review.evaluate((element) => element === document.activeElement), 'Échap ferme la confirmation et restitue le focus')
  check(await page.locator('#count-3').inputValue() === '3', 'Annulation de confirmation conserve les valeurs')

  let posts = 0
  const failing = async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    posts++
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'DATABASE_UNAVAILABLE', message: 'Base indisponible' }) })
  }
  await page.route(endpoint, failing)
  await review.click()
  await dialog.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'injoignable' }).waitFor()
  check(await page.locator('#count-3').inputValue() === '3', 'Erreur API conserve les quantités')
  check(posts === 1, 'Un seul envoi lors du refus API')
  await page.unroute(endpoint, failing)

  let release
  const gate = new Promise((resolveGate) => { release = resolveGate })
  const slow = async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    posts++
    const payload = route.request().postDataJSON()
    check(payload.lignes.every((line) => typeof line.quantiteComptee === 'number'), 'Quantités numériques envoyées au serveur')
    await gate
    await route.fallback()
  }
  await page.route(endpoint, slow)
  try {
    await review.click()
    await dialog.getByRole('button', { name: 'Confirmer', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Enregistrement du comptage' }).waitFor()
    check(await page.locator('#count-0').isDisabled(), 'Saisie bloquée pendant la sauvegarde')
    check(await page.getByRole('button', { name: 'Annuler le comptage', exact: true }).isDisabled(), 'Annulation bloquée pendant la sauvegarde')
    check(await review.isDisabled(), 'Double envoi bloqué pendant la sauvegarde')
    check(posts === 2, 'Une seule nouvelle tentative')
  } finally { release() }
  await page.getByRole('status').filter({ hasText: /Comptage #.* enregistré pour UI-INVENTAIRE/ }).waitFor()
  await page.unroute(endpoint, slow)
  const [balance] = await environment.connection.query('SELECT quantity FROM stock_balances WHERE reference_id = ?', [article.insertId])
  check(balance[0].quantity === 9, 'Stock réellement ajusté dans MariaDB')
  await page.reload()
  await page.locator('.inventaire-record summary').first().click()
  check((await page.locator('.inventaire-record').first().textContent()).includes('Contrôle physique du rayon freinage'), 'Historique et motif persistants après rechargement')
  await page.screenshot({ path: resolve(output, 'historique.png'), fullPage: true })

  await page.locator('#count-reference').selectOption(reference)
  await page.getByRole('button', { name: 'Commencer le comptage', exact: true }).click()
  await page.locator('#count-0').waitFor()
  for (const [index, value] of ['1', '5', '3'].entries()) await page.locator(`#count-${index}`).fill(value)
  await page.locator('#motif').fill('Comptage devenu obsolète')
  await environment.connection.execute('UPDATE stock_balances SET quantity = quantity + 1 WHERE reference_id = ?', [article.insertId])
  await review.click()
  await dialog.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Le stock a changé' }).waitFor()
  check(await review.isDisabled(), 'Comptage obsolète bloqué')
  check(await page.locator('#count-1').inputValue() === '5', 'Valeurs obsolètes conservées pour consultation')
  await page.getByRole('button', { name: 'Recommencer avec le stock actualisé', exact: true }).click()
  await dialog.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await page.locator('#count-0').waitFor()
  check(await page.locator('#count-0').inputValue() === '', 'Nouveau comptage exige une nouvelle saisie')
  await page.locator('#count-0').fill('2')
  await page.getByRole('button', { name: 'Annuler le comptage', exact: true }).click()
  await dialog.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await page.getByRole('heading', { name: 'Commencer un comptage', exact: true }).waitFor()
  check(true, 'Abandon du comptage sans écriture')

  const unavailable = async (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'DATABASE_UNAVAILABLE' }) })
  await page.route(endpoint, unavailable)
  await page.getByRole('button', { name: 'Commencer le comptage', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'injoignable' }).waitFor()
  check(await page.locator('.inventaire-line').count() === 0, 'Aucun stock fictif proposé si l’API est indisponible')
  await page.unroute(endpoint, unavailable)
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await page.locator('#count-0').waitFor()
  check(true, 'Reprise du chargement après panne API')
  await context.close()

  for (const [role, allowed] of [['Magasinier', true], ['Caissier', false]]) {
    const { context: roleContext, page: rolePage } = await setup(role)
    let inventoryRequests = 0
    rolePage.on('request', (request) => { if (request.url().includes('/api/inventaires')) inventoryRequests++ })
    await rolePage.goto(`${base}/stock/inventaire`)
    if (allowed) {
      await rolePage.locator('#count-reference').waitFor()
      check(true, 'Magasinier autorisé dans l’interface')
    } else {
      await rolePage.getByText('L’inventaire est réservé aux magasiniers et aux administrateurs.').waitFor()
      check(await rolePage.locator('#count-reference').count() === 0, 'Accès direct caissier refusé')
      check(inventoryRequests === 0, 'Aucune requête inventaire émise par la vue refusée')
      await rolePage.goto(`${base}/stock`)
      await rolePage.getByRole('heading', { name: 'Gestion du stock', exact: true }).waitFor()
      check(await rolePage.getByRole('link', { name: 'Inventaire physique', exact: true }).count() === 0, 'Entrée inventaire masquée au caissier')
    }
    await roleContext.close()
  }
  check(errors.length === 0, `Aucune erreur JavaScript : ${errors.join(', ')}`)
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ date: '2026-11-06', checks: checks.length, results: checks, errors, backend: 'MariaDB jetable réelle ; panne et latence simulées pour les cas dédiés' }, null, 2) + '\n')
  console.log(`${checks.length} contrôles navigateur réussis.`)
} finally {
  await browser?.close()
  if (server) await new Promise((resolveClose) => server.httpServer.close(resolveClose))
  await environment.close()
}
