/** npm run build puis node scripts/test-pdf-reader-ui.mjs. API simulée, PDF commerciaux réels. */
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer, preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const directory = 'specs/captures/documents-pdf'
const [invoice, quote, examples] = await Promise.all([
  readFile(join(directory, 'facture-personnalisee.pdf')),
  readFile(join(directory, 'devis-personnalise.pdf')),
  readFile(join(directory, 'exemples.json'), 'utf8'),
])
const settings = JSON.parse(examples).configuration
const numero = '20261121-D-AbCdEf'
const devis = {
  id: 7, numero, version: 3, statut: 'brouillon', dateDevis: '2026-11-21', dateValidite: '2026-12-21',
  clientId: 17, clientSnapshot: { numeroClient: '000017', prenom: 'Camille', nom: 'Client de démonstration' },
  commandeId: null, articles: [], totalHT: 450, totalTVA: 90, totalTTC: 540,
}
const sale = { id: 42, dateVente: '2026-11-21T10:00:00Z', caissier: 'Auteur fictif', modePaiement: 'espèces', totalHT: 25, totalTTC: 30, articles: [] }
const quotePath = '/api/devis/7/pdf'
const invoicePath = '/api/ventes/42/facture'
const previewPath = '/api/parametres/documents-pdf/apercu'
const output = process.env.PDF_READER_UI_OUTPUT

async function renderedPage(dialog, number, count, marker) {
  await dialog.getByText('Page ' + number + ' sur ' + count, { exact: true }).waitFor()
  await dialog.locator('.pdf-reader-text').filter({ hasText: marker }).waitFor({ state: 'attached' })
  const canvas = dialog.locator('.pdf-reader canvas')
  assert.ok(await canvas.isVisible(), 'Le canevas est visible')
  // Échantillonne la page elle-même pour distinguer des glyphes peints d’un canevas blanc.
  const darkPixels = await canvas.evaluate((node) => {
    const { data } = node.getContext('2d').getImageData(0, 0, node.width, node.height)
    const step = Math.max(1, Math.floor(node.width * node.height / 65000))
    let dark = 0
    for (let i = 0; i < data.length; i += 4 * step) {
      if (data[i] < 180 && data[i + 1] < 180 && data[i + 2] < 180 && data[i + 3] > 180) dark++
    }
    return dark
  })
  assert.ok(darkPixels > 40, 'Les mots et traits du document doivent être peints')
  assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().width <= innerWidth + 1), 'Le dialogue tient dans la fenêtre')
  return darkPixels
}

async function verifyDownload(page, dialog, label, filename, expected) {
  const pending = page.waitForEvent('download')
  await dialog.getByRole('link', { name: label, exact: true }).click()
  const download = await pending
  assert.equal(download.suggestedFilename(), filename)
  assert.deepEqual(await readFile(await download.path()), expected, 'Le téléchargement conserve les octets du PDF affiché')
}

async function run(browser, base, mobile, mode) {
  const context = await browser.newContext({
    locale: 'fr-FR', viewport: mobile ? { width: 375, height: 812 } : { width: 1280, height: 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, reducedMotion: 'reduce', acceptDownloads: true,
  })
  const page = await context.newPage()
  const downloads = [], popups = [], errors = [], documents = [], writes = []
  let errorQuote = false
  page.on('download', (download) => downloads.push(download))
  context.on('page', (opened) => popups.push(opened))
  page.on('pageerror', (error) => errors.push(error.message))
  const dialog = (name) => page.getByRole('dialog', { name, exact: true })
  const close = (viewer) => viewer.getByRole('button', { name: 'Fermer l’aperçu', exact: true }).click()
  const assertReadingOnly = (count) => {
    assert.equal(downloads.length, count, 'La consultation ne déclenche aucun téléchargement supplémentaire')
    assert.equal(popups.length, 0, 'La consultation reste dans l’onglet de l’application')
    assert.deepEqual(writes, [], 'Aucune consultation ne modifie les données')
  }
  async function capture(viewer, name) {
    if (output && mode === 'production') await viewer.screenshot({ path: join(output, name + (mobile ? '-mobile.png' : '-desktop.png')) })
  }
  try {
    await context.route('**/api/**', async (route) => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname
      if ([quotePath, invoicePath, previewPath].includes(path)) {
        documents.push({ path, version: url.searchParams.get('version') })
        assert.equal(request.headers().accept, 'application/pdf')
        assert.equal(request.method(), path === previewPath ? 'POST' : 'GET')
        if (path === previewPath) {
          assert.equal(request.headers()['x-csrf-token'], 'lecture-pdf')
          assert.equal(request.postDataJSON().nomEmetteur, settings.nomEmetteur)
        }
        if (path === quotePath && (errorQuote || url.searchParams.get('version') !== String(devis.version))) {
          return route.fulfill({ status: 409, json: { error: 'DEVIS_CONFLICT', message: 'Ce devis a changé.' } })
        }
        return route.fulfill({ status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment', 'cache-control': 'no-store' }, body: path === quotePath ? quote : invoice })
      }
      if (request.method() !== 'GET') writes.push([request.method(), path])
      const responses = {
        '/api/auth/me': { user: { id: 1, prenom: 'Camille', nom: 'Recette', email: 'lecture@example.test', role: 'admin' }, csrfToken: 'lecture-pdf' },
        '/api/dashboard': { stockValue: 0, references: 0, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] },
        '/api/caisse/actuelle': null, '/api/devis': [devis], '/api/ventes': [sale], '/api/parametres': { documentsPdf: settings },
      }
      return route.fulfill({ json: Object.hasOwn(responses, path) ? responses[path] : [] })
    })
    await page.goto(base + '/ventes-comptoir')
    const viewInvoice = page.getByRole('button', { name: 'Voir la facture 000042', exact: true })
    await viewInvoice.waitFor()
    assert.deepEqual(documents, [], 'Aucun PDF chargé avant la sélection')
    await viewInvoice.click()
    const invoiceDialog = dialog('Facture n° 000042')
    await renderedPage(invoiceDialog, 1, 1, '000042')
    assert.ok(await invoiceDialog.getByRole('button', { name: 'Page suivante', exact: true }).isDisabled())
    const canvas = invoiceDialog.locator('.pdf-reader canvas')
    const fitted = await canvas.boundingBox()
    const zoom = invoiceDialog.getByRole('combobox', { name: 'Zoom du PDF' })
    await zoom.selectOption('2')
    await renderedPage(invoiceDialog, 1, 1, '000042')
    assert.ok(Math.abs((await canvas.boundingBox()).width - fitted.width * 2) <= 2, 'La feuille et ses caractères doublent de largeur au zoom 200 %')
    await zoom.selectOption('1')
    await renderedPage(invoiceDialog, 1, 1, '000042')
    assertReadingOnly(0)
    await capture(invoiceDialog, 'facture')
    await verifyDownload(page, invoiceDialog, 'Télécharger le PDF', 'facture-42.pdf', invoice)
    await close(invoiceDialog)
    await invoiceDialog.waitFor({ state: 'hidden' })

    await page.goto(base + '/devis')
    const viewQuote = page.getByRole('button', { name: 'Voir le PDF du devis ' + numero, exact: true })
    await viewQuote.click()
    const quoteDialog = dialog('Devis ' + numero).filter({ has: page.getByRole('button', { name: 'Fermer l’aperçu', exact: true }) })
    const firstPixels = await renderedPage(quoteDialog, 1, 2, 'REF-001')
    assert.ok(await quoteDialog.getByRole('button', { name: 'Page précédente', exact: true }).isDisabled())
    const requestsBeforePaging = documents.length
    await quoteDialog.getByRole('button', { name: 'Page suivante', exact: true }).click()
    const lastPixels = await renderedPage(quoteDialog, 2, 2, '540,00 EUR')
    assert.notEqual(firstPixels, lastPixels, 'La dernière page remplace la première à l’écran')
    assert.ok(await quoteDialog.getByRole('button', { name: 'Page suivante', exact: true }).isDisabled())
    await capture(quoteDialog, 'devis-page-2')
    await quoteDialog.getByRole('button', { name: 'Page précédente', exact: true }).click()
    await renderedPage(quoteDialog, 1, 2, 'REF-001')
    assertReadingOnly(1)
    await verifyDownload(page, quoteDialog, 'Télécharger le PDF', 'devis-' + numero + '.pdf', quote)
    assert.equal(documents.length, requestsBeforePaging, 'Les pages et le téléchargement réutilisent le document ouvert')
    assert.ok(documents.filter((doc) => doc.path === quotePath).every((doc) => doc.version === String(devis.version)))
    await page.keyboard.press('Escape')
    await quoteDialog.waitFor({ state: 'hidden' })

    errorQuote = true
    await viewQuote.click()
    await quoteDialog.getByRole('alert').filter({ hasText: 'Ce devis a changé.' }).waitFor()
    assert.equal(await quoteDialog.locator('canvas, a[download]').count(), 0, 'Une version refusée ne publie aucun fichier')
    errorQuote = false
    await quoteDialog.getByRole('button', { name: 'Réessayer', exact: true }).click()
    await renderedPage(quoteDialog, 1, 2, 'REF-001')
    await close(quoteDialog)

    if (!mobile) {
      const release = Promise.withResolvers(), finished = Promise.withResolvers()
      const path = '**/api/devis/7/pdf?*'
      await page.route(path, async (route) => {
        try {
          await release.promise
          await route.fulfill({ contentType: 'application/pdf', body: invoice })
        } finally { finished.resolve() }
      }, { times: 1 })
      try {
        const request = page.waitForRequest((req) => new URL(req.url()).pathname === quotePath)
        await viewQuote.click()
        await request
        await close(quoteDialog)
        await quoteDialog.waitFor({ state: 'hidden' })
        await viewQuote.click()
        await renderedPage(quoteDialog, 1, 2, 'REF-001')
      } finally { release.resolve() }
      await finished.promise
      await renderedPage(quoteDialog, 1, 2, 'REF-001')
      assert.equal(await quoteDialog.locator('.pdf-reader-text').filter({ hasText: '000042' }).count(), 0, 'La réponse tardive de la fenêtre fermée ne remplace pas le devis courant')
      await close(quoteDialog)

      await page.route(path, (route) => route.fulfill({ contentType: 'application/pdf', body: 'Fichier illisible' }), { times: 1 })
      await viewQuote.click()
      await quoteDialog.getByRole('alert').filter({ hasText: 'Impossible de lire ce PDF' }).waitFor()
      assert.equal(await quoteDialog.locator('canvas').count(), 0)
      await close(quoteDialog)
    }

    await page.getByRole('button', { name: numero, exact: true }).click()
    const detailTrigger = page.getByRole('button', { name: 'Voir le PDF', exact: true })
    await detailTrigger.click()
    await renderedPage(quoteDialog, 1, 2, 'REF-001')
    await close(quoteDialog)
    await detailTrigger.waitFor()
    assert.ok(await detailTrigger.evaluate((el) => el === document.activeElement), 'La fermeture rend le focus à la fiche du devis')
    await page.keyboard.press('Escape')

    await page.goto(base + '/parametres/documents-pdf')
    await page.getByRole('button', { name: 'Modifier les documents', exact: true }).click()
    const editor = dialog('Personnaliser les documents PDF')
    await editor.getByRole('button', { name: 'Aperçu fictif', exact: true }).click()
    const previewDialog = dialog('Aperçu fictif des documents PDF')
    await renderedPage(previewDialog, 1, 1, settings.nomEmetteur)
    assertReadingOnly(2)
    await capture(previewDialog, 'parametres')
    await verifyDownload(page, previewDialog, 'Télécharger l’aperçu', 'apercu-documents.pdf', invoice)
    await close(previewDialog)
    await previewDialog.waitFor({ state: 'hidden' })
    assert.equal(await editor.getByLabel('Nom de l’émetteur', { exact: false }).inputValue(), settings.nomEmetteur)
    assertReadingOnly(3)
    assert.deepEqual(errors, [])
    console.log(mode + ' ' + (mobile ? 'mobile' : 'bureau') + ' : facture, devis sur deux pages depuis la liste et la fiche, aperçu, zoom, reprise après conflit et trois téléchargements volontaires conformes.')
  } finally { await context.close() }
}

if (output) await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  for (const mode of ['development', 'production']) {
    const options = { host: '127.0.0.1', port: 0, open: false }
    const server = mode === 'development' ? await createServer({ server: options }) : await preview({ preview: options })
    try {
      if (mode === 'development') await server.listen()
      const base = 'http://127.0.0.1:' + server.httpServer.address().port
      for (const mobile of [false, true]) await run(browser, base, mobile, mode)
    } finally { await server.close() }
  }
} finally { await browser.close() }
