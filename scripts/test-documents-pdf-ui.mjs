/** npm run build puis node --import tsx scripts/test-documents-pdf-ui.mjs ; API entièrement simulée. */
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { preview } from 'vite'
import { DEFAULT_DOCUMENTS_PDF_SETTINGS, DOCUMENTS_PDF_LIMITS, documentsPdfSettingsSchema } from '../src/schemas/parametres.ts'
import { generateDocumentsPdfPreview } from '../server/services/pdfPreview.ts'
import { makePng, makePngLogo, makeJpegLogo } from './lib/image-fixtures.ts'
import { textFromPdf } from './lib/pdf-buffer-text.ts'
import { verifyPdf } from './lib/pdf-assertions.ts'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = resolve(process.env.DOCUMENTS_PDF_UI_OUTPUT ?? 'specs/captures/documents-pdf')
const downloads = await mkdtemp(join(tmpdir(), 'openstrass-documents-ui-'))
const checks = [], errors = [], contexts = [], states = [], captures = []
const check = (condition, message) => { assert.ok(condition, message); checks.push(message) }
const original = {
  ...DEFAULT_DOCUMENTS_PDF_SETTINGS, nomEmetteur: 'Atelier de démonstration', activite: 'Pièces et services fictifs',
  coordonnees: '10 rue de l’Exemple\n67000 Strasbourg\ncontact@example.test', piedCommun: 'Présentation fictive de recette', logo: makePngLogo(),
}
const draft = {
  ...original, nomEmetteur: 'EMETTEUR_UI_BROUILLON', activite: 'ACTIVITE_UI_BROUILLON',
  coordonnees: 'COORDONNEE_UI_1\nCOORDONNEE_UI_2', piedCommun: 'PIED_UI_1\nPIED_UI_2',
}
let browser, server

async function until(condition, message) {
  const deadline = Date.now() + 5000
  while (!condition() && Date.now() < deadline) await delay(10)
  assert.ok(condition(), message)
}

async function fillDraft(dialog) {
  for (const field of ['nomEmetteur', 'activite', 'coordonnees', 'piedCommun']) await dialog.locator(`#${field}`).fill(draft[field])
}

async function screenshot(page, name) {
  await page.screenshot({ path: resolve(output, name), fullPage: true })
  captures.push(name)
}

try {
  await mkdir(output, { recursive: true })
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, args: ['--lang=fr-FR'] })

  async function setup(role = 'admin') {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'fr-FR', reducedMotion: 'reduce', acceptDownloads: true })
    contexts.push(context)
    await context.addInitScript(() => {
      window.__documentUrls = []
      window.__revokedDocumentUrls = []
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
      URL.createObjectURL = (file) => { const url = create(file); window.__documentUrls.push({ url, type: file.type, size: file.size }); return url }
      URL.revokeObjectURL = (url) => { window.__revokedDocumentUrls.push(url); revoke(url) }
    })
    const state = {
      settings: {
        api: { maxRequests: 100, windowSeconds: 900 }, login: { maxAttempts: 10, windowSeconds: 900, blockSeconds: 900 },
        caisse: { maxFondsCaisse: 10000 }, documentsPdf: structuredClone(original),
        database: { host: '127.0.0.1', port: 3306, database: 'ui_fictive', user: 'ui', passwordConfigured: false, restartRequired: false },
        turnstile: { enabled: false, siteKey: '', hostnames: [], secretConfigured: false },
        https: { enabled: false, active: false, restartRequired: false, port: 3443, httpMode: 'serve', publicOrigin: '' }, updatedAt: null,
      },
      reads: [], previews: [], saves: [], otherWrites: [], successfulSaves: 0, previewsCompleted: 0,
      holdPreview: false, holdSave: false, previewReleases: [], saveReleases: [], previewMode: null, saveMode: null,
    }
    states.push(state)
    await context.route('**/api/**', async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname, method = request.method()
      if (method === 'GET') {
        state.reads.push(path)
        const json = path === '/api/auth/me' ? { user: { id: 1, prenom: 'Camille', nom: 'Recette', role, email: 'ui@example.test' }, csrfToken: 'documents-ui-csrf' }
          : path === '/api/parametres' ? state.settings
          : path === '/api/dashboard' ? { stockValue: 0, references: 0, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
          : []
        return route.fulfill({ status: 200, json })
      }
      const body = request.postDataJSON()
      assert.equal(request.headers()['x-csrf-token'], 'documents-ui-csrf')
      const respond = async (mode) => {
        if (mode === 'network') { await route.abort('connectionfailed'); return true }
        if (mode) { await route.fulfill(mode); return true }
        return false
      }
      if (method === 'POST' && path === '/api/parametres/documents-pdf/apercu') {
        assert.equal(request.headers().accept, 'application/pdf')
        state.previews.push(structuredClone(body))
        const mode = state.previewMode
        try {
          if (state.holdPreview) await new Promise((release) => state.previewReleases.push(release))
          if (await respond(mode)) return
          const buffer = await generateDocumentsPdfPreview(documentsPdfSettingsSchema.parse(body))
          await route.fulfill({ status: 200, headers: { 'content-type': 'application/pdf', 'cache-control': 'no-store' }, body: buffer })
        } finally { state.previewsCompleted += 1 }
        return
      }
      if (method === 'PUT' && path === '/api/parametres/documents-pdf') {
        state.saves.push(structuredClone(body))
        const mode = state.saveMode
        if (state.holdSave) await new Promise((release) => state.saveReleases.push(release))
        if (await respond(mode)) return
        state.settings = { ...state.settings, documentsPdf: documentsPdfSettingsSchema.parse(body), updatedAt: '2026-11-21T10:00:00Z' }
        state.successfulSaves += 1
        return route.fulfill({ status: 200, json: state.settings })
      }
      state.otherWrites.push({ method, path })
      assert.fail(`Écriture UI inattendue : ${method} ${path}`)
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${base}/parametres/documents-pdf`)
    await page.getByRole('heading', { name: role === 'admin' ? 'Documents PDF' : 'Accès réservé', exact: true }).waitFor()
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
    return { page, state, context }
  }

  for (const role of ['caissier', 'magasinier']) {
    const restricted = await setup(role)
    check(await restricted.page.getByRole('button', { name: 'Modifier les documents', exact: true }).count() === 0, `Éditeur inaccessible au rôle ${role}`)
    check(!restricted.state.reads.includes('/api/parametres'), `Aucune lecture des réglages pour ${role}`)
  }
  const { page, state } = await setup()
  const trigger = page.getByRole('button', { name: 'Modifier les documents', exact: true })
  const editor = () => page.getByRole('dialog', { name: 'Personnaliser les documents PDF', exact: true })
  const viewer = () => page.getByRole('dialog', { name: 'Aperçu fictif des documents PDF', exact: true })
  await trigger.click()
  let dialog = editor()
  const previewButton = () => editor().locator('.documents-pdf-actions button').nth(0)
  const saveButton = () => editor().locator('form button[type="submit"]')
  check(await dialog.locator('#nomEmetteur').evaluate((element) => element === document.activeElement), 'Focus initial sur l’identité')
  await dialog.locator('#nomEmetteur').fill('')
  await previewButton().click()
  await dialog.locator('.error-summary').waitFor()
  check(state.previews.length === 0 && state.saves.length === 0, 'Identité vide refusée avant toute requête')
  await fillDraft(dialog)
  await dialog.locator('#coordonnees').fill(Array(9).fill('Ligne').join('\n'))
  await previewButton().click()
  await dialog.locator('#coordonnees[aria-invalid="true"]').waitFor()
  check(state.previews.length === 0 && state.saves.length === 0, 'Coordonnées au-delà de huit lignes refusées avant toute requête')
  await fillDraft(dialog)

  const invalidLogos = [
    { name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') },
    { name: 'vide.png', mimeType: 'image/png', buffer: Buffer.alloc(0) },
    { name: 'volumineux.png', mimeType: 'image/png', buffer: Buffer.alloc(DOCUMENTS_PDF_LIMITS.logoOctets + 1) },
    { name: 'dimensions.png', mimeType: 'image/png', buffer: makePng(1025, 1) },
    { name: 'tronque.png', mimeType: 'image/png', buffer: makePng().subarray(0, 30) },
  ]
  for (const logo of invalidLogos) {
    await dialog.locator('#logo').setInputFiles(logo)
    await dialog.locator('#documents-logo-error').waitFor()
    check(await previewButton().isDisabled() && await saveButton().isDisabled(), `Logo ${logo.name} bloque aperçu/sauvegarde`)
    check(state.previews.length === 0 && state.saves.length === 0, `Logo ${logo.name} reste local`)
  }
  await dialog.getByRole('button', { name: 'Retirer le logo', exact: true }).click()
  check(await previewButton().isEnabled() && await saveButton().isEnabled(), 'Retrait du logo invalide rend les actions disponibles')
  check(await dialog.getByRole('img', { name: 'Logo du brouillon', exact: true }).count() === 0 && state.settings.documentsPdf.logo !== null, 'Retrait du brouillon ne modifie pas le logo enregistré')
  await dialog.locator('#logo').setInputFiles(invalidLogos[0])
  await dialog.locator('#documents-logo-error').waitFor()
  await dialog.getByRole('button', { name: 'Valeurs par défaut', exact: true }).click()
  check(await previewButton().isEnabled() && await dialog.locator('#nomEmetteur').inputValue() === DEFAULT_DOCUMENTS_PDF_SETTINGS.nomEmetteur, 'Defaults corrigent un logo invalide et remplissent le brouillon')
  check(state.saves.length === 0 && state.settings.documentsPdf.nomEmetteur === original.nomEmetteur, 'Defaults sans persistance automatique')
  await fillDraft(dialog)
  const jpeg = await makeJpegLogo()
  await dialog.locator('#logo').setInputFiles({ name: 'logo-fictif.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg.data, 'base64') })
  await page.waitForFunction(() => document.querySelector('.documents-pdf-logo-sample img')?.src.startsWith('data:image/jpeg'))
  check(await previewButton().isEnabled(), 'JPEG réel sélectionné et décodé localement')
  await dialog.locator('#logo').setInputFiles({ name: 'logo-fictif.png', mimeType: 'image/png', buffer: makePng() })
  await page.waitForFunction(() => document.querySelector('.documents-pdf-logo-sample img')?.src.startsWith('data:image/png'))
  check(await previewButton().isEnabled(), 'PNG réel remplace le JPEG dans le brouillon')

  await previewButton().click()
  await viewer().waitFor()
  await viewer().locator('.pdf-reader-text').filter({ hasText: draft.nomEmetteur }).waitFor({ state: 'attached' })
  check(await viewer().locator('canvas').isVisible(), 'Le lecteur affiche la page du brouillon et expose son texte')
  const downloadLink = viewer().getByRole('link', { name: 'Télécharger l’aperçu', exact: true })
  const previewUrl = await downloadLink.getAttribute('href')
  check(previewUrl.startsWith('blob:'), 'Le fichier de l’aperçu reste disponible dans la session')
  check(state.previews.at(-1).nomEmetteur === draft.nomEmetteur && state.saves.length === 0, 'Aperçu construit depuis la saisie sans PUT')
  check(state.settings.documentsPdf.nomEmetteur === original.nomEmetteur, 'Aperçu laisse les valeurs enregistrées intactes')
  const downloadPromise = page.waitForEvent('download')
  await downloadLink.click()
  const download = await downloadPromise
  const downloadPath = join(downloads, 'apercu.pdf')
  await download.saveAs(downloadPath)
  const downloadedPdf = await readFile(downloadPath)
  verifyPdf(downloadedPdf)
  check(textFromPdf(downloadedPdf).join(' ').includes(draft.nomEmetteur), 'Téléchargement contient le vrai PDF du brouillon')
  check(download.suggestedFilename() === 'apercu-documents.pdf', 'Nom du téléchargement fictif conservé')
  check(await viewer().getByRole('link', { name: 'Ouvrir dans un onglet', exact: true }).getAttribute('rel') === 'noopener noreferrer', 'Ouverture séparée sans accès à l’onglet source')
  await screenshot(page, 'apercu-desktop.png')
  await viewer().getByRole('button', { name: 'Fermer l’aperçu', exact: true }).click()
  await viewer().waitFor({ state: 'hidden' })
  await page.waitForFunction(() => document.activeElement === document.querySelector('.documents-pdf-actions button'))
  check(await page.evaluate((url) => window.__revokedDocumentUrls.includes(url), previewUrl), 'Blob de l’aperçu révoqué à la fermeture')
  check(await dialog.isVisible(), 'Fermeture de l’aperçu conserve l’éditeur et la saisie')

  state.holdPreview = true
  let previewCount = state.previews.length, completed = state.previewsCompleted
  await previewButton().click()
  await until(() => state.previewReleases.length === 1, 'Aperçu retenu reçu par le mock')
  await previewButton().dispatchEvent('click')
  check(state.previews.length === previewCount + 1 && await saveButton().isDisabled(), 'Double aperçu empêché et sauvegarde indisponible pendant la préparation')
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  check(await trigger.evaluate((element) => element === document.activeElement), 'Échap pendant préparation ferme l’éditeur et rend le focus')
  state.holdPreview = false
  state.previewReleases.splice(0).forEach((release) => release())
  await until(() => state.previewsCompleted === completed + 1, 'Réponse tardive de l’aperçu terminée')
  await trigger.click()
  dialog = editor()
  check(await viewer().count() === 0 && await dialog.locator('#nomEmetteur').inputValue() === original.nomEmetteur, 'Réponse après fermeture ne rouvre aucun lecteur et le brouillon est abandonné')
  await fillDraft(dialog)

  state.holdPreview = true
  previewCount = state.previews.length; completed = state.previewsCompleted
  await previewButton().click()
  await until(() => state.previewReleases.length === 1, 'Deuxième aperçu retenu')
  await dialog.locator('#activite').fill('ACTIVITE_UI_CORRIGEE')
  await previewButton().waitFor({ state: 'visible' })
  await page.waitForFunction(() => !document.querySelector('.documents-pdf-actions button')?.disabled)
  state.holdPreview = false
  state.previewReleases.splice(0).forEach((release) => release())
  await until(() => state.previewsCompleted === completed + 1, 'Réponse de l’aperçu édité terminée')
  check(state.previews.length === previewCount + 1 && await viewer().count() === 0, 'Édition du texte annule l’aperçu et ignore sa réponse tardive')
  check(await dialog.locator('#activite').inputValue() === 'ACTIVITE_UI_CORRIGEE', 'Annulation de l’aperçu conserve la nouvelle saisie')
  await fillDraft(dialog)

  for (const mode of [
    { status: 503, json: { error: 'DATABASE_UNAVAILABLE', message: 'Service fictif indisponible.' } },
    { status: 422, json: { error: 'VALIDATION_ERROR', message: 'Logo refusé pour la recette.', details: { logo: 'Image refusée pour la recette.' } } },
    { status: 200, contentType: 'text/html', body: '<html>Fichier invalide</html>' },
    { status: 200, contentType: 'application/pdf', body: Buffer.alloc(0) },
    { status: 200, contentType: 'application/pdf', body: Buffer.alloc(10 * 1024 * 1024 + 1) },
    'network',
  ]) {
    state.previewMode = mode
    previewCount = state.previews.length
    await previewButton().click()
    await until(() => state.previews.length === previewCount + 1, 'Requête d’aperçu en erreur reçue')
    await dialog.locator('.error-banner').waitFor()
    await page.waitForFunction(() => !document.querySelector('.documents-pdf-actions button')?.disabled)
    check(await viewer().count() === 0 && await dialog.locator('#nomEmetteur').inputValue() === draft.nomEmetteur, `Erreur d’aperçu ${mode.status ?? mode} conserve le brouillon sans ouvrir de lecteur`)
    check(state.successfulSaves === 0, 'Erreur d’aperçu sans succès ni sauvegarde fictifs')
  }
  state.previewMode = null
  const timeoutSession = await setup()
  await timeoutSession.page.getByRole('button', { name: 'Modifier les documents', exact: true }).click()
  await timeoutSession.page.clock.install()
  timeoutSession.state.holdPreview = true
  await timeoutSession.page.getByRole('button', { name: 'Aperçu fictif', exact: true }).click()
  await until(() => timeoutSession.state.previewReleases.length === 1, 'Aperçu timeout reçu')
  await timeoutSession.page.clock.fastForward(15001)
  await timeoutSession.page.locator('.error-banner').waitFor()
  check((await timeoutSession.page.locator('.error-banner').textContent()).includes('trop de temps'), 'Délai d’aperçu expliqué et action libérée après quinze secondes simulées')
  timeoutSession.state.holdPreview = false
  timeoutSession.state.previewReleases.splice(0).forEach((release) => release())
  await until(() => timeoutSession.state.previewsCompleted === 1, 'Réponse tardive après timeout terminée')
  check(await timeoutSession.page.getByRole('dialog', { name: 'Aperçu fictif des documents PDF', exact: true }).count() === 0, 'Réponse après timeout ignorée')

  await dialog.locator('#logo').setInputFiles({ name: 'logo-fictif.png', mimeType: 'image/png', buffer: makePng() })
  await page.waitForFunction(() => document.querySelector('.documents-pdf-logo-sample img')?.src.startsWith('data:image/png'))
  await page.waitForFunction(() => !document.querySelector('.documents-pdf-actions button')?.disabled)
  await fillDraft(dialog)
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
    await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).focus()
    await dialog.evaluate((element) => { element.scrollTop = 0 })
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page sans débordement mobile ${theme}`)
    check(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth && element.getBoundingClientRect().width <= innerWidth), `Éditeur sans débordement mobile ${theme}`)
    await screenshot(page, `edition-mobile-${theme}.png`)
    await previewButton().scrollIntoViewIfNeeded()
    check(await previewButton().isVisible() && await saveButton().isVisible(), `Actions de brouillon accessibles au défilement mobile ${theme}`)
    await previewButton().click()
    await viewer().waitFor()
    await viewer().locator('.pdf-reader-text').filter({ hasText: draft.nomEmetteur }).waitFor({ state: 'attached' })
    check(await viewer().evaluate((element) => element.scrollWidth <= element.clientWidth && element.getBoundingClientRect().width <= innerWidth), `Lecteur sans débordement mobile ${theme}`)
    check(await viewer().getByRole('button', { name: 'Fermer l’aperçu', exact: true }).isVisible(), `Fermeture du lecteur accessible mobile ${theme}`)
    await screenshot(page, `apercu-mobile-${theme}.png`)
    await viewer().getByRole('button', { name: 'Fermer l’aperçu', exact: true }).click()
    await viewer().waitFor({ state: 'hidden' })
    await page.waitForFunction(() => document.activeElement === document.querySelector('.documents-pdf-actions button'))
  }
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
  for (const mode of [
    { status: 503, json: { error: 'SETTINGS_UNAVAILABLE', message: 'Sauvegarde fictive indisponible.' } },
    'network',
    { status: 422, json: { error: 'VALIDATION_ERROR', message: 'Identité refusée pour la recette.', details: { nomEmetteur: 'Identité refusée pour la recette.' } } },
  ]) {
    state.saveMode = mode
    const before = state.saves.length
    await saveButton().click()
    await until(() => state.saves.length === before + 1, 'Requête de sauvegarde en erreur reçue')
    await dialog.locator('.error-banner').waitFor()
    check(await dialog.locator('#nomEmetteur').inputValue() === draft.nomEmetteur && state.successfulSaves === 0, `Erreur de sauvegarde ${mode.status ?? mode} conserve la saisie et les valeurs enregistrées`)
  }
  check(await dialog.locator('#nomEmetteur').getAttribute('aria-invalid') === 'true', 'Erreur serveur rattachée au champ concerné')
  state.saveMode = null
  state.holdSave = true
  const beforeSave = state.saves.length
  await saveButton().click()
  await until(() => state.saveReleases.length === 1, 'Sauvegarde retenue reçue')
  await page.keyboard.press('Escape')
  await dialog.locator('form').dispatchEvent('submit', { bubbles: true, cancelable: true })
  check(await dialog.isVisible() && await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).isDisabled(), 'Échap et fermeture bloqués pendant l’enregistrement')
  check(await dialog.locator('#nomEmetteur').isDisabled() && await previewButton().isDisabled() && await dialog.getByRole('button', { name: 'Valeurs par défaut', exact: true }).isDisabled(), 'Saisie, aperçu et defaults gelés pendant la sauvegarde')
  check(state.saves.length === beforeSave + 1, 'Double sauvegarde empêchée')
  state.holdSave = false
  state.saveReleases.splice(0).forEach((release) => release())
  await dialog.waitFor({ state: 'hidden' })
  check(state.successfulSaves === 1 && state.settings.documentsPdf.nomEmetteur === draft.nomEmetteur, 'Seul le succès API publie le brouillon dans la présentation enregistrée')
  check(await trigger.evaluate((element) => element === document.activeElement), 'Focus rendu au déclencheur après sauvegarde')
  check((await page.locator('.documents-pdf-summary').textContent()).includes(draft.nomEmetteur), 'Résumé mis à jour depuis la réponse de sauvegarde')
  await screenshot(page, 'presentation-enregistree-desktop.png')
  await trigger.click()
  dialog = editor()
  await dialog.getByRole('button', { name: 'Valeurs par défaut', exact: true }).click()
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  check(state.successfulSaves === 1 && state.settings.documentsPdf.nomEmetteur === draft.nomEmetteur, 'Annulation des defaults laisse la présentation enregistrée intacte')
  await trigger.click()
  dialog = editor()
  await dialog.getByRole('button', { name: 'Valeurs par défaut', exact: true }).click()
  await saveButton().click()
  await dialog.waitFor({ state: 'hidden' })
  check(state.successfulSaves === 2 && state.settings.documentsPdf.logo === null && state.settings.documentsPdf.nomEmetteur === DEFAULT_DOCUMENTS_PDF_SETTINGS.nomEmetteur, 'Defaults persistés uniquement par un enregistrement explicite')
  check(errors.length === 0, `Aucune erreur JavaScript : ${errors.join('; ')}`)
  check(states.every((item) => item.otherWrites.length === 0), 'Aucune écriture métier : seulement aperçus et sauvegardes simulés')
  await writeFile(resolve(output, 'observations-ui.json'), JSON.stringify({ contexte: 'Chromium, API simulée, PDF fictifs réels, aucune base SQL', controles: checks, erreursJavaScript: errors, captures, apercus: state.previews.length, sauvegardesConfirmees: state.successfulSaves }, null, 2) + '\n')
  console.log(`${checks.length} contrôles UI Documents PDF réussis ; ${captures.length} captures fictives, API entièrement simulée.`)
} finally {
  for (const state of states) {
    state.previewReleases.splice(0).forEach((release) => release())
    state.saveReleases.splice(0).forEach((release) => release())
  }
  for (const context of contexts) await context.close()
  await browser?.close()
  await server?.close()
  await unlink(join(downloads, 'apercu.pdf')).catch((error) => { if (error.code !== 'ENOENT') throw error })
  await rmdir(downloads)
}
