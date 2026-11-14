/** Recette R01/R02 du comptoir, Chromium avec API simulée, sans MariaDB.
 * npm run build puis node scripts/test-vente-totals-ui.mjs
 * Vérifie Vite/StrictMode et le build de production.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer, preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = resolve('specs/screenshots/revue-correctifs-ventes')
const checks = [], errors = [], writes = []
const euro = (value) => `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} €`
let server, browser, base, mode
const check = (condition, label) => { assert.ok(condition, label); checks.push(`${mode} : ${label}`) }

async function setup() {
  const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const articles = [
    { reference: 'TVA-20', designation: 'Article à TVA normale', prixUnitaireHT: 31, prixUnitaireTTC: 37.2, tvaId: 1 },
    { reference: 'TVA-55', designation: 'Article à TVA réduite', prixUnitaireHT: 10, prixUnitaireTTC: 10.55, tvaId: 2 },
    { reference: 'TVA-LIMITE', designation: 'Article au prix maximal', prixUnitaireHT: 1_000_000, prixUnitaireTTC: 1_200_000, tvaId: 1 },
  ].map((article) => ({ ...article, category: 'freins', quantite: 10, minimum: 0, sousCategorieId: null, emplacement: null, description: null, ean13: null, delaiDisponibilite: 0, forcerSurCommande: false }))
  const sales = [], scenarioWrites = []
  await context.route('**/api/**', async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (request.method() === 'GET') {
      const json = path === '/api/auth/me' ? { user: { id: 7, prenom: 'Camille', nom: 'Test', role: 'caissier', email: 'ventes@example.test' }, csrfToken: 'ventes-fixture' }
        : path === '/api/dashboard' ? { stockValue: 0, references: 2, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
        : path === '/api/articles' ? articles
        : path === '/api/tva' ? [{ id: 1, taux: 20 }, { id: 2, taux: 5.5 }]
        : path === '/api/ventes' ? sales
        : path === '/api/caisse/actuelle' ? { id: 17, utilisateurId: 7, caissier: 'Camille Test', statut: 'ouverte', fondsCaisse: 100, totalEspeces: 0, totalCartes: 0, totalCheques: 0, nombreVentes: 0, openedAt: '2026-11-14T08:00:00Z' }
        : []
      return route.fulfill({ status: 200, json })
    }
    assert.equal(path, '/api/ventes')
    assert.equal(request.method(), 'POST')
    assert.equal(request.headers()['x-csrf-token'], 'ventes-fixture')
    const body = request.postDataJSON()
    scenarioWrites.push(body)
    writes.push({ mode, body })
    // Fixture indépendante du helper applicatif : montants connus pour ces
    // deux références, aucune reprise des totaux ou taux envoyés par le client.
    const lines = body.articles.map((line) => {
      const normal = line.reference === 'TVA-20'
      const ht = (normal ? 3100 : 1000) * line.quantite
      const tva = (normal ? 620 : 55) * line.quantite
      return { ...line, tauxTva: normal ? 20 : 5.5, montant: ht / 100, montantTva: tva / 100, montantTTC: (ht + tva) / 100 }
    })
    const totalHT = lines.reduce((sum, line) => sum + Math.round(line.montant * 100), 0) / 100
    const totalTVA = lines.reduce((sum, line) => sum + Math.round(line.montantTva * 100), 0) / 100
    const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100
    const sale = { id: sales.length + 1, ...body, sessionId: 17, articles: lines, totalHT, totalTVA, totalTTC, monnaie: body.modePaiement === 'espèces' ? Math.round((body.montantPaye - totalTTC) * 100) / 100 : 0, fingerprintVersion: 2, createdAt: '2026-11-14T10:00:00Z' }
    sales.push(sale)
    return route.fulfill({ status: 201, json: sale })
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  const taxesResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/tva')
  await page.goto(base + '/ventes-comptoir')
  await (await taxesResponse).finished()
  await page.evaluate(() => new Promise(requestAnimationFrame))
  await page.getByRole('button', { name: 'Nouvelle vente', exact: true }).click()
  const dialog = page.locator('dialog.form-dialog')
  await dialog.locator('[name="catalogueSelection"] option[value="TVA-20"]').waitFor({ state: 'attached' })
  return { context, page, dialog, scenarioWrites }
}

async function totals(dialog, ht, tva, ttc, label) {
  await dialog.locator('.vente-total').getByText(`Total TTC : ${euro(ttc)}`, { exact: true }).waitFor()
  check(await dialog.locator('.vente-total').getByText(`Total HT : ${euro(ht)}`, { exact: true }).isVisible()
    && await dialog.locator('.vente-total').getByText(`TVA : ${euro(tva)}`, { exact: true }).isVisible(), label)
  check(await dialog.locator('#montantPaye').getAttribute('placeholder') === ttc.toFixed(2), `${label} : paiement proposé en TTC`)
}

try {
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ headless: true })
  for (mode of ['development', 'production']) {
    if (mode === 'development') {
      server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } })
      await server.listen()
    } else server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
    base = `http://127.0.0.1:${server.httpServer.address().port}`

    {
      const { context, page, dialog, scenarioWrites } = await setup()
      await dialog.locator('[name="catalogueSelection"]').selectOption('TVA-20')
      await totals(dialog, 31, 6.2, 37.2, 'R01 prix 31 € HT, TVA 20 %, total 37,20 € TTC')
      await dialog.locator('#montantPaye').fill('31')
      await dialog.getByRole('button', { name: 'Valider la vente', exact: true }).click()
      await dialog.locator('#montantPaye-error').getByText(/inférieur au total TTC de 37.20/).waitFor()
      check(scenarioWrites.length === 0 && await dialog.isVisible() && await dialog.locator('#montantPaye').inputValue() === '31', 'R01 sous-paiement 31 € refusé, panier et paiement conservés')
      await page.screenshot({ path: resolve(output, `sous-paiement-${mode}.png`) })
      await dialog.locator('#montantPaye').fill('50')
      await dialog.locator('.vente-total').getByText(`Monnaie : ${euro(12.8)}`, { exact: true }).waitFor()
      check(true, 'R02 paiement espèces 50 € : monnaie proposée 12,80 €')
      await dialog.locator('[name="modePaiement"]').selectOption('carte')
      check(await dialog.locator('.vente-total').getByText(/Monnaie :/).count() === 0, 'R02 aucun rendu proposé pour une carte')
      await dialog.getByRole('button', { name: 'Valider la vente', exact: true }).click()
      await dialog.locator('#montantPaye-error').getByText('Le paiement par carte ou chèque doit être égal au total TTC.', { exact: true }).waitFor()
      check(scenarioWrites.length === 0, 'R02 carte 50 € refusée pour une vente 37,20 € TTC')
      await dialog.locator('#montantPaye').fill('37.20')
      await dialog.getByRole('button', { name: 'Valider la vente', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      check(scenarioWrites.length === 1 && scenarioWrites[0].montantPaye === 37.2 && scenarioWrites[0].monnaie === 0 && scenarioWrites[0].modePaiement === 'carte', 'R01/R02 carte exacte 37,20 € transmise sans monnaie')
      check(scenarioWrites[0].articles[0].prixUnitaire === 31 && scenarioWrites[0].articles[0].tauxTva === 20, 'R01 prix HT et taux de TVA transmis pour être figés')
      await page.locator('.toast-success').getByText(`Vente enregistrée : ${euro(37.2)} TTC.`, { exact: true }).waitFor()
      check(await page.locator('thead').getByText('TOTAL TTC', { exact: true }).isVisible() && await page.locator('tbody').getByText(euro(37.2), { exact: true }).isVisible(), 'R01 succès et journal affichent le total TTC confirmé par API')
      await context.close()
    }

    {
      const { context, page, dialog, scenarioWrites } = await setup()
      await dialog.locator('[name="catalogueSelection"]').selectOption('TVA-20')
      await totals(dialog, 31, 6.2, 37.2, 'R01 vente espèces avec TVA normale')
      await dialog.locator('#montantPaye').fill('50')
      await dialog.locator('.vente-total').getByText(`Monnaie : ${euro(12.8)}`, { exact: true }).waitFor()
      await page.screenshot({ path: resolve(output, `rendu-especes-${mode}.png`) })
      await dialog.getByRole('button', { name: 'Valider la vente', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      check(scenarioWrites.length === 1 && scenarioWrites[0].montantPaye === 50 && scenarioWrites[0].monnaie === 12.8 && scenarioWrites[0].modePaiement === 'espèces', 'R02 rendu espèces 50 € → 12,80 € transmis à l’API')
      await context.close()
    }

    {
      const { context, page, dialog, scenarioWrites } = await setup()
      await dialog.locator('[name="catalogueSelection"]').selectOption('TVA-20')
      await dialog.locator('[name="catalogueSelection"]').selectOption('TVA-55')
      await totals(dialog, 41, 6.75, 47.75, 'R01 panier mixte : TVA 20 % et 5,5 %')
      check(await dialog.getByText('Montant TTC (TVA 5.5 %)', { exact: true }).isVisible() && await dialog.locator('.reception-article').getByText(euro(10.55), { exact: true }).isVisible(), 'R01 TVA réduite : 10 € HT donnent 10,55 € TTC dans la ligne')
      await dialog.locator('.reception-article').filter({ hasText: 'TVA-55' }).getByRole('spinbutton').fill('2')
      await totals(dialog, 51, 7.3, 58.3, 'R01 changement quantité : TVA et TTC recalculés')
      await dialog.locator('[name="modePaiement"]').selectOption('carte')
      await dialog.locator('#montantPaye').fill('58.30')
      await page.screenshot({ path: resolve(output, `panier-mixte-${mode}.png`) })
      await dialog.getByRole('button', { name: 'Valider la vente', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      check(scenarioWrites.length === 1 && scenarioWrites[0].montantPaye === 58.3 && scenarioWrites[0].articles[1].quantite === 2 && scenarioWrites[0].articles[1].tauxTva === 5.5, 'R01 panier mixte : paiement TTC et taux réduits transmis')
      check(!Object.hasOwn(scenarioWrites[0], 'totalHT') && !Object.hasOwn(scenarioWrites[0], 'totalTTC'), 'R01 les totaux sont laissés au calcul serveur')
      await context.close()
    }

    {
      const { context, page, dialog, scenarioWrites } = await setup()
      await dialog.locator('[name="catalogueSelection"]').selectOption('TVA-LIMITE')
      await dialog.locator('#montantPaye').fill('50')
      const quantity = dialog.locator('.reception-article').getByRole('spinbutton')
      await quantity.fill('9999')
      await dialog.getByText('Limite dépassée', { exact: true }).waitFor()
      check(await dialog.isVisible() && await quantity.inputValue() === '9999' && await dialog.locator('#montantPaye').inputValue() === '50', 'R01 limite DECIMAL : prix HT maximal × 9999, dialogue et saisie conservés')
      check(await dialog.getByRole('button', { name: 'Valider la vente', exact: true }).isDisabled(), 'R01 limite DECIMAL : validation désactivée sans plantage de rendu')
      await dialog.locator('form').evaluate((form) => form.requestSubmit())
      await page.evaluate(() => new Promise(requestAnimationFrame))
      check(scenarioWrites.length === 0 && await dialog.isVisible(), 'R01 limite DECIMAL : soumission programmatique refusée sans POST')
      await page.screenshot({ path: resolve(output, `limite-decimal-${mode}.png`) })
      await dialog.getByRole('button', { name: 'Fermer et garder le panier', exact: true }).click()
      await page.getByRole('button', { name: 'Reprendre la vente', exact: true }).click()
      check(await quantity.inputValue() === '9999' && await dialog.locator('#montantPaye').inputValue() === '50', 'R01 limite DECIMAL : fermeture et reprise conservent la saisie')
      await quantity.fill('1')
      await totals(dialog, 1_000_000, 200_000, 1_200_000, 'R01 correction du panier hors limite : montants de nouveau calculables')
      check(await dialog.getByRole('button', { name: 'Valider la vente', exact: true }).isEnabled() && scenarioWrites.length === 0, 'R01 correction du panier hors limite : validation de nouveau disponible, aucune écriture automatique')
      await context.close()
    }
    await server.close()
    server = null
  }
  check(errors.length === 0, 'aucune erreur JavaScript')
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ date: '2026-11-14', api: 'simulated', modes: ['development', 'production'], checks, errors, writes }, null, 2) + '\n')
  console.log(`${checks.length} contrôles comptoir TTC réussis (development, production).`)
} finally {
  if (browser) await browser.close()
  if (server) await server.close()
}
