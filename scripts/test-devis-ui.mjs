/** npm run build puis node scripts/test-devis-ui.mjs. API simulée, aucun message ni accès SQL. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = resolve('specs/captures/devis')
const checks = [], errors = [], contexts = [], states = []
const check = (condition, label) => { assert.ok(condition, label); checks.push(label) }
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
const datePrefix = today.replaceAll('-', '')
const client = {
  id: 17, numeroClient: '000017', nom: 'Client actuel', prenom: 'Camille', telephone: '0688000017',
  email: 'actuel@example.test', adresse: '17 rue des Artisans', ville: 'Strasbourg', codePostal: '67000',
  type: 'professionnel', siret: '12345678900017', secteurId: null, createdAt: today, updatedAt: today,
}
const snapshot = { ...client, nom: 'Atelier du Devis', email: 'snapshot@example.test', typeClient: client.type }
const catalogue = [
  { id: 1, reference: 'PLA-TEST', designation: 'Plaquettes de frein', prixUnitaireHT: 10, prixUnitaireTTC: 12, tvaId: 1, ean13: '1234567890128', category: 'freins', description: null, emplacement: null, delaiDisponibilite: 0, forcerSurCommande: false, createdAt: today, updatedAt: today },
  { id: 2, reference: 'FIL-TEST', designation: 'Filtre à taux réduit', prixUnitaireHT: 0.01, prixUnitaireTTC: 0.01, tvaId: 2, ean13: null, category: 'filtres', description: null, emplacement: null, delaiDisponibilite: 0, forcerSurCommande: false, createdAt: today, updatedAt: today },
]
const taxes = [{ id: 1, taux: 20 }, { id: 2, taux: 5.5 }]
function document(id, overrides = {}) {
  return {
    id, numero: `${datePrefix}-D-${['abCdEf', 'GhIjKl', 'MnOpQr', 'StUvWx'][id - 1]}`,
    clientId: client.id, clientSnapshot: structuredClone(snapshot), dateDevis: today, dateValidite: '2099-12-31',
    notes: 'Notes initiales du devis', statut: 'brouillon', version: 1, commandeId: null,
    articles: [{ ligne: 1, reference: 'PLA-TEST', designation: 'Plaquettes de frein', quantite: 2, prixUnitaire: 10, tauxTva: 20, montant: 20, montantTVA: 4, montantTTC: 24 }],
    totalHT: 20, totalTVA: 4, totalTTC: 24, createdAt: `${today}T10:00:00Z`, updatedAt: `${today}T10:00:00Z`, ...overrides,
  }
}
const initial = [document(1), document(2, { statut: 'converti', commandeId: 100 }), document(3, { dateValidite: '2000-01-02', dateDevis: '2000-01-01' }), document(4, { statut: 'annulé' })]
const pdfBody = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n')
let browser, server

try {
  await mkdir(output, { recursive: true })
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, args: ['--lang=fr-FR'] })

  async function setup(role = 'admin', nativeShare = false) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'fr-FR', reducedMotion: 'reduce', acceptDownloads: true })
    contexts.push(context)
    await context.addInitScript(({ nativeShare }) => {
      window.__devisShares = []
      window.__devisShareMode = 'success'
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => nativeShare })
      Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare ? (data) => {
        window.__devisShares.push({ title: data.title, text: data.text, active: navigator.userActivation.isActive, files: data.files.map((file) => ({ name: file.name, type: file.type, size: file.size })) })
        if (window.__devisShareMode === 'abort') return Promise.reject(new DOMException('Annulé', 'AbortError'))
        if (window.__devisShareMode === 'error') return Promise.reject(new Error('Partage indisponible'))
        if (window.__devisShareMode === 'hold') return new Promise((resolveShare) => { window.__releaseDevisShare = resolveShare })
        return Promise.resolve()
      } : undefined })
    }, { nativeShare })
    const state = {
      devis: structuredClone(initial), writes: [], reads: [], pdfRequests: [], failure: null, pdfFailure: null, hold: false, releases: [],
      besoins: [{ id: 8, commandeId: 100, commandeNumero: `${datePrefix}-C-ABCdef`, clientId: client.id, ligne: 1, reference: 'FIL-TEST', designation: 'Filtre à taux réduit', quantite: 3, fournisseurId: 5, modeLivraison: 'retrait' }],
    }
    states.push(state)
    const amounts = (body, previous) => {
      const articles = body.articles.map((line, index) => {
        const old = previous?.articles.find((item) => item.reference === line.reference)
        const meta = catalogue.find((item) => item.reference === line.reference)
        assert.ok(meta || old)
        const tauxTva = old?.tauxTva ?? taxes.find((item) => item.id === meta.tvaId).taux
        const montant = Math.round(line.quantite * line.prixUnitaire * 100) / 100
        const montantTVA = Math.round(montant * tauxTva) / 100
        return { ...line, ligne: index + 1, designation: old?.designation ?? meta.designation, tauxTva, montant, montantTVA, montantTTC: Math.round((montant + montantTVA) * 100) / 100 }
      })
      const totalHT = Math.round(articles.reduce((sum, line) => sum + line.montant, 0) * 100) / 100
      const totalTVA = Math.round(articles.reduce((sum, line) => sum + line.montantTVA, 0) * 100) / 100
      return { articles, totalHT, totalTVA, totalTTC: Math.round((totalHT + totalTVA) * 100) / 100 }
    }
    await context.route('**/api/**', async (route) => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method()
      if (method === 'GET') {
        state.reads.push(path)
        if (/^\/api\/devis\/\d+\/pdf$/.test(path)) {
          const id = Number(path.split('/')[3]), version = Number(url.searchParams.get('version'))
          state.pdfRequests.push({ id, version })
          const target = state.devis.find((item) => item.id === id)
          assert.ok(target && version > 0, 'Les PDF UI sont associés à une version chargée')
          if (version !== target.version) return route.fulfill({ status: 409, json: { error: 'DEVIS_CONFLICT', message: 'Ce devis a changé. Actualisez-le avant de partager.' } })
          if (state.pdfFailure) return route.fulfill(state.pdfFailure.contentType
            ? { status: state.pdfFailure.status, headers: { 'content-type': state.pdfFailure.contentType }, body: state.pdfFailure.body }
            : { status: state.pdfFailure.status, json: state.pdfFailure.body })
          return route.fulfill({ status: 200, headers: { 'content-type': 'application/pdf' }, body: pdfBody })
        }
        const json = path === '/api/auth/me' ? { user: { id: 1, prenom: 'Marie', nom: 'Laurent', role, email: 'marie@example.test' }, csrfToken: 'devis-ui-fixture' }
          : path === '/api/devis' ? state.devis
          : path === '/api/clients' ? [client]
          : path === '/api/articles' ? catalogue
          : path === '/api/tva' ? taxes
          : path === '/api/articles-a-commander' ? state.besoins
          : path === '/api/fournisseurs' ? [{ id: 5, nom: 'Fournisseur Recette' }]
          : path === '/api/dashboard' ? { stockValue: 0, references: 0, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
          : []
        return route.fulfill({ status: 200, json })
      }
      const body = request.postDataJSON()
      state.writes.push({ path, method, body })
      assert.equal(request.headers()['x-csrf-token'], 'devis-ui-fixture')
      if (state.hold) await new Promise((release) => { state.releases.push(release) })
      if (state.failure === 'network') return route.abort('connectionfailed')
      if (state.failure) return route.fulfill({ status: state.failure.status, json: state.failure.body })
      if (method === 'POST' && path === '/api/devis') {
        assert.deepEqual(Object.keys(body).sort(), ['articles', 'clientId', 'dateDevis', 'dateValidite', 'notes'].sort())
        const id = Math.max(...state.devis.map((item) => item.id)) + 1
        const created = { ...document(1), ...body, ...amounts(body), id, numero: `${datePrefix}-D-ZyXwVu`, clientSnapshot: { ...client, typeClient: client.type } }
        state.devis.push(created)
        return route.fulfill({ status: 201, json: created })
      }
      const id = Number(path.split('/')[3]), previous = state.devis.find((item) => item.id === id)
      assert.ok(previous)
      if (body.version !== previous.version) return route.fulfill({ status: 409, json: { error: 'DEVIS_CONFLICT', message: 'Ce devis a changé. Actualisez-le avant de réessayer.' } })
      if (method === 'PUT' && path === `/api/devis/${id}`) {
        const updated = { ...previous, ...body, ...amounts(body, previous), version: previous.version + 1 }
        state.devis = state.devis.map((item) => item.id === id ? updated : item)
        return route.fulfill({ status: 200, json: updated })
      }
      if (method === 'POST' && path === `/api/devis/${id}/convertir`) {
        const converted = { ...previous, statut: 'converti', commandeId: 101, version: previous.version + 1 }
        const missing = { id: 9, commandeId: 101, commandeNumero: `${datePrefix}-C-ZyXwVu`, clientId: previous.clientId, ligne: 1, reference: 'PLA-TEST', designation: 'Plaquettes de frein', quantite: 1, fournisseurId: null, modeLivraison: 'livraison' }
        state.devis = state.devis.map((item) => item.id === id ? converted : item)
        state.besoins.push(missing)
        return route.fulfill({ status: 200, json: { devis: converted, commande: { id: 101, numero: missing.commandeNumero, articles: previous.articles }, articlesACommander: [missing] } })
      }
      assert.fail(`Écriture inattendue : ${method} ${path}`)
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${base}/devis`)
    if (role !== 'magasinier') await page.getByRole('button', { name: initial[0].numero, exact: true }).waitFor()
    return { context, page, state }
  }

  const { page, state } = await setup()
  const table = page.getByRole('table', { name: 'Liste des devis', exact: true })
  await page.screenshot({ path: resolve(output, 'liste-desktop.png'), fullPage: true })
  check(await table.getByRole('row').count() === 5, 'Liste initiale des quatre devis')
  await page.getByLabel('Rechercher un devis', { exact: true }).fill('ABcDeF')
  check(await table.getByRole('row').count() === 2, 'Recherche du numéro sans distinction de casse')
  await page.getByLabel('Rechercher un devis', { exact: true }).fill('')
  await page.getByLabel('Filtrer les devis par statut', { exact: true }).selectOption('annulé')
  check(await table.getByRole('row').count() === 2, 'Filtre de statut')
  await page.getByLabel('Filtrer les devis par statut', { exact: true }).selectOption('')
  for (const item of initial.slice(1)) check(await page.getByRole('button', { name: `Convertir le devis ${item.numero} en commande client`, exact: true }).count() === 0, `Conversion absente pour ${item.statut}${item.id === 3 ? ' expiré' : ''}`)
  check(await page.getByRole('button', { name: `Modifier le devis ${initial[1].numero}`, exact: true }).count() === 0, 'Devis converti non modifiable')
  await page.getByRole('button', { name: initial[0].numero, exact: true }).click()
  let dialog = page.getByRole('dialog')
  check((await dialog.textContent()).includes(snapshot.nom) && (await dialog.textContent()).includes(snapshot.email), 'Détails utilisent les coordonnées figées')
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click()

  const newTrigger = page.getByRole('button', { name: 'Nouveau devis', exact: true })
  await newTrigger.click()
  dialog = page.getByRole('dialog')
  check(await dialog.locator('[name="clientId"]').evaluate((element) => element === document.activeElement), 'Focus initial sur le client')
  await dialog.getByRole('button', { name: 'Créer le devis', exact: true }).click()
  await dialog.locator('.error-summary').waitFor()
  check(state.writes.length === 0, 'Validation du formulaire avant toute requête')
  await dialog.locator('[name="clientId"]').selectOption(String(client.id))
  await dialog.locator('[name="articles.0.reference"]').fill('  pla-test  ')
  check(await dialog.locator('[name="articles.0.prixUnitaire"]').inputValue() === '10', 'Préremplissage catalogue pour référence minuscule avec espaces')
  await dialog.locator('[name="articles.0.quantite"]').fill('2')
  await dialog.locator('[name="articles.0.prixUnitaire"]').fill('10')
  await dialog.locator('[name="dateValidite"]').fill('2099-12-31')
  await dialog.locator('[name="notes"]').fill('Saisie conservée après erreur')
  check((await dialog.locator('.devis-totals').textContent()).includes('24,00'), 'Aperçu TTC des lignes avec TVA catalogue')
  await page.mouse.click(5, 5)
  check(await dialog.isVisible() && await dialog.locator('[name="notes"]').inputValue() === 'Saisie conservée après erreur', 'Clic extérieur garde le dialogue et sa saisie')
  await dialog.getByRole('button', { name: 'Ajouter un article', exact: true }).click()
  await dialog.locator('[name="articles.1.reference"]').fill('PLA-TEST')
  await dialog.getByRole('button', { name: 'Créer le devis', exact: true }).click()
  await dialog.getByText('Une référence ne peut apparaître qu’une fois dans un devis.', { exact: true }).first().waitFor()
  check(state.writes.length === 0, 'Doublon de référence normalisée refusé avant l’API')
  await dialog.getByRole('button', { name: 'Retirer l’article 2', exact: true }).click()
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1100 })
      await dialog.evaluate((element) => { element.scrollTop = 0 })
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page sans débordement ${theme}/${width}`)
      check(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth && element.getBoundingClientRect().width <= innerWidth), `Dialogue adapté ${theme}/${width}`)
      if (width !== 768) await page.screenshot({ path: resolve(output, `creation-${theme}-${width}.png`), fullPage: true })
      await dialog.getByRole('button', { name: 'Créer le devis', exact: true }).scrollIntoViewIfNeeded()
      const submitBox = await dialog.getByRole('button', { name: 'Créer le devis', exact: true }).boundingBox()
      check(submitBox && submitBox.y >= 0 && submitBox.y + submitBox.height <= 1100, `Création accessible par défilement ${theme}/${width}`)
      if (width === 375) await page.screenshot({ path: resolve(output, `creation-${theme}-${width}-actions.png`), fullPage: true })
    }
  }
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
  for (const failure of [{ status: 503, body: { error: 'DATABASE_UNAVAILABLE', message: 'Base indisponible.' } }, 'network']) {
    state.failure = failure
    await dialog.getByRole('button', { name: 'Créer le devis', exact: true }).click()
    await dialog.locator('.error-banner').waitFor()
    check(await dialog.locator('[name="notes"]').inputValue() === 'Saisie conservée après erreur', `Saisie conservée après ${failure.status ?? failure}`)
    check(state.devis.length === 4 && await page.locator('.toast-success').count() === 0, 'Aucun devis ou succès fictif après erreur')
  }
  state.failure = null
  state.hold = true
  const writesBeforeCreate = state.writes.length
  await dialog.getByRole('button', { name: 'Créer le devis', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('dialog')?.getAttribute('aria-busy') === 'true')
  await page.keyboard.press('Escape')
  await dialog.locator('form').dispatchEvent('submit', { bubbles: true, cancelable: true })
  check(await dialog.isVisible() && await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).isDisabled(), 'Échap et fermeture bloqués pendant la création')
  check(state.writes.length === writesBeforeCreate + 1, 'Double soumission de création empêchée')
  state.hold = false
  state.releases.splice(0).forEach((release) => release())
  await dialog.waitFor({ state: 'hidden' })
  check(state.devis.length === 5, 'Création confirmée par l’API')
  check(await newTrigger.evaluate((element) => element === document.activeElement), 'Focus rendu après création')

  const editTrigger = page.getByRole('button', { name: `Modifier le devis ${initial[0].numero}`, exact: true })
  await editTrigger.click()
  dialog = page.getByRole('dialog')
  check(await dialog.locator('[name="dateDevis"]').getAttribute('readonly') !== null, 'Date du devis immuable dans le formulaire')
  await dialog.locator('[name="notes"]').fill('Mon édition à conserver')
  const changed = state.devis.find((item) => item.id === 1)
  changed.version += 1
  changed.notes = 'Édition effectuée dans un autre onglet'
  await dialog.getByRole('button', { name: 'Enregistrer les modifications', exact: true }).click()
  await dialog.locator('.error-banner').waitFor()
  check(state.writes.at(-1).body.version === 1, 'Version chargée envoyée avec la modification')
  check(await dialog.locator('[name="notes"]').inputValue() === 'Mon édition à conserver', 'Conflit de version conserve la saisie')
  check((await dialog.locator('.error-banner').textContent()).includes('Actualisez'), 'Conflit expliqué à l’utilisateur')
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  check(await editTrigger.evaluate((element) => element === document.activeElement), 'Focus rendu après annulation du conflit')
  await page.locator('.page-view .page-actions').getByRole('button', { name: 'Actualiser', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('table[aria-busy="false"]') !== null)
  await editTrigger.click()
  dialog = page.getByRole('dialog')
  check(await dialog.locator('[name="notes"]').inputValue() === changed.notes, 'Actualisation explicite charge la nouvelle version')
  await dialog.locator('[name="notes"]').fill('Modification approuvée')
  await dialog.getByRole('button', { name: 'Enregistrer les modifications', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  check(state.writes.at(-1).body.version === 2, 'Nouvelle modification basée sur la version actualisée')

  const malformedDownloads = []
  const recordDownload = (download) => { malformedDownloads.push(download) }
  page.on('download', recordDownload)
  for (const malformed of [
    { status: 200, contentType: 'text/html', body: '<html>Erreur proxy</html>' },
    { status: 200, contentType: 'application/pdf', body: '' },
  ]) {
    state.pdfFailure = malformed
    await page.getByRole('button', { name: `Télécharger le PDF du devis ${initial[0].numero}`, exact: true }).click()
    await page.locator('.error-banner').waitFor()
    check(malformedDownloads.length === 0, `Réponse ${malformed.contentType}/${malformed.body.length} refusée avant téléchargement`)
  }
  page.off('download', recordDownload)

  state.pdfFailure = { status: 409, body: { error: 'DEVIS_CONFLICT', message: 'Ce devis a changé. Actualisez-le avant de partager.' } }
  await page.getByRole('button', { name: `Partager le devis ${initial[0].numero}`, exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.locator('.error-banner').waitFor()
  check(await dialog.getByRole('link').count() === 0 && await dialog.getByRole('button', { name: 'Télécharger le PDF', exact: true }).isDisabled(), 'PDF refusé : aucun destinataire ni téléchargement utilisable')
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click()
  state.pdfFailure = null
  await page.getByRole('button', { name: `Partager le devis ${initial[0].numero}`, exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('link', { name: 'Ouvrir l’email', exact: true }).waitFor()
  check(await dialog.getByRole('button', { name: 'Partager le PDF', exact: true }).count() === 0, 'Repli sans partage natif')
  check((await dialog.getByRole('link', { name: 'Ouvrir l’email', exact: true }).getAttribute('href')).startsWith('mailto:snapshot%40example.test'), 'Email préparé pour le destinataire figé')
  const whatsapp = await dialog.getByRole('link', { name: 'Ouvrir WhatsApp', exact: true }).getAttribute('href')
  check(whatsapp.startsWith('https://wa.me/33688000017?text=') && decodeURIComponent(whatsapp).includes(initial[0].numero), 'Téléphone français et numéro du devis dans WhatsApp')
  check((await dialog.textContent()).includes('joignez-le au message') && (await dialog.textContent()).includes('ne confirme pas son envoi'), 'Pièce jointe manuelle et transmission décrites clairement')
  const shareWrites = state.writes.length
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Télécharger le PDF', exact: true }).click()
  check((await download).suggestedFilename() === `devis-${initial[0].numero}.pdf`, 'PDF téléchargé sous le numéro métier')
  check(state.writes.length === shareWrites && state.devis.find((item) => item.id === 1).statut === 'brouillon', 'Préparation du partage ne marque pas le devis envoyé')
  await page.screenshot({ path: resolve(output, 'partage-desktop.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click()

  await page.getByRole('button', { name: `Convertir le devis ${initial[0].numero} en commande client`, exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.locator('[name="dateLivraisonPrevue"]').fill('2099-12-31')
  state.hold = true
  const writesBeforeConvert = state.writes.length
  await dialog.getByRole('button', { name: 'Créer la commande client', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('dialog')?.getAttribute('aria-busy') === 'true')
  await page.keyboard.press('Escape')
  await dialog.locator('form').dispatchEvent('submit', { bubbles: true, cancelable: true })
  check(await dialog.isVisible() && state.writes.length === writesBeforeConvert + 1, 'Conversion protégée contre Échap et doubles soumissions')
  check(state.writes.at(-1).body.version === 3 && state.writes.at(-1).body.dateLivraisonPrevue === '2099-12-31', 'Conversion transmet version et date de livraison')
  state.hold = false
  state.releases.splice(0).forEach((release) => release())
  await dialog.getByRole('heading', { name: 'Commande client créée', exact: true }).waitFor()
  check((await dialog.textContent()).includes('PLA-TEST') && (await dialog.textContent()).includes(`${datePrefix}-C-ZyXwVu`), 'Résultat affiche commande métier et quantité manquante')
  await page.screenshot({ path: resolve(output, 'conversion-desktop.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click()
  check(await page.getByRole('button', { name: `Modifier le devis ${initial[0].numero}`, exact: true }).count() === 0, 'Devis figé dans la liste après conversion')
  await page.getByRole('button', { name: /^Articles à commander/ }).click()
  const besoinsTable = page.getByRole('table', { name: 'Articles manquants liés aux commandes clients', exact: true })
  await besoinsTable.getByRole('cell', { name: 'PLA-TEST', exact: true }).waitFor()
  check(await besoinsTable.getByRole('row').count() === 3, 'Liste approvisionnement actualisée après conversion')
  await page.getByLabel('Filtrer par fournisseur', { exact: true }).selectOption('sans')
  check(await besoinsTable.getByRole('row').count() === 2, 'Filtre références sans fournisseur')
  await page.getByLabel('Filtrer par fournisseur', { exact: true }).selectOption('')
  await page.getByLabel('Filtrer par mode de livraison', { exact: true }).selectOption('retrait')
  check((await besoinsTable.textContent()).includes('FIL-TEST') && !(await besoinsTable.textContent()).includes('PLA-TEST'), 'Filtre mode de livraison')
  await page.getByLabel('Filtrer par mode de livraison', { exact: true }).selectOption('')
  await page.locator('.page-view .page-actions').getByRole('button', { name: 'Actualiser', exact: true }).click()
  await page.waitForFunction(() => [...document.querySelectorAll('table[aria-busy]')].every((element) => element.getAttribute('aria-busy') === 'false'))
  while (await page.locator('.toast-close').count()) await page.locator('.toast-close').first().click()
  await page.setViewportSize({ width: 375, height: 1100 })
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Liste et approvisionnement adaptés au mobile')
  await page.screenshot({ path: resolve(output, 'liste-mobile.png'), fullPage: true })

  const native = await setup('caissier', true)
  await native.page.getByRole('button', { name: `Partager le devis ${initial[0].numero}`, exact: true }).click()
  const nativeDialog = native.page.getByRole('dialog')
  await nativeDialog.getByRole('button', { name: 'Partager le PDF', exact: true }).waitFor()
  await native.page.evaluate(() => { window.__devisShareMode = 'abort' })
  await nativeDialog.getByRole('button', { name: 'Partager le PDF', exact: true }).click()
  await native.page.waitForFunction(() => document.querySelector('dialog')?.getAttribute('aria-busy') === 'false')
  check(await nativeDialog.locator('.error-banner').count() === 0 && await nativeDialog.isVisible(), 'Annulation du partage natif conserve la fenêtre sans erreur')
  const shared = await native.page.evaluate(() => window.__devisShares[0])
  check(shared.active && shared.files[0].name === `devis-${initial[0].numero}.pdf` && shared.files[0].type === 'application/pdf' && shared.files[0].size === pdfBody.length, 'Partage natif reçoit le PDF préparé avec activation utilisateur')
  await native.page.evaluate(() => { window.__devisShareMode = 'hold' })
  await nativeDialog.getByRole('button', { name: 'Partager le PDF', exact: true }).click()
  await native.page.waitForFunction(() => document.querySelector('dialog')?.getAttribute('aria-busy') === 'true')
  await native.page.keyboard.press('Escape')
  await nativeDialog.getByRole('button', { name: 'Partage en cours…', exact: true }).dispatchEvent('click')
  check(await nativeDialog.isVisible() && await nativeDialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).isDisabled(), 'Partage natif en cours protège la fermeture')
  check(await native.page.evaluate(() => window.__devisShares.length) === 2, 'Double partage natif empêché')
  await native.page.evaluate(() => window.__releaseDevisShare())
  await native.page.waitForFunction(() => document.querySelector('dialog')?.getAttribute('aria-busy') === 'false')
  check(native.state.writes.length === 0, 'Aucun envoi ou changement de statut automatique pendant le partage')
  await nativeDialog.getByRole('button', { name: 'Fermer', exact: true }).click()

  const stale = await setup()
  stale.state.devis[0].version += 1
  stale.state.devis[0].clientSnapshot = { ...stale.state.devis[0].clientSnapshot, nom: 'Nouveau destinataire', email: 'nouveau@example.test' }
  await stale.page.getByRole('button', { name: `Partager le devis ${initial[0].numero}`, exact: true }).click()
  const staleDialog = stale.page.getByRole('dialog')
  await staleDialog.locator('.error-banner').waitFor()
  check(stale.state.pdfRequests.at(-1).version === 1 && stale.state.devis[0].version === 2, 'Partage exige la version des coordonnées affichées')
  check(await staleDialog.getByRole('link').count() === 0 && await staleDialog.getByRole('button', { name: 'Télécharger le PDF', exact: true }).isDisabled(), 'Client changé dans un autre onglet : PDF et messages refusés ensemble')
  await staleDialog.getByRole('button', { name: 'Fermer', exact: true }).click()

  const forbidden = await setup('magasinier')
  await forbidden.page.getByText('Les devis sont réservés aux administrateurs et aux caissiers.', { exact: true }).waitFor()
  check(!forbidden.state.reads.some((path) => path.startsWith('/api/devis')), 'Magasinier exclu avant toute lecture devis')
  check(await forbidden.page.getByRole('link', { name: 'Devis', exact: true }).count() === 0, 'Navigation devis masquée au magasinier')
  check(errors.length === 0, 'Aucune erreur JavaScript')
  await writeFile(resolve(output, 'resultats.json'), JSON.stringify({ scenarios: checks.length, checks, errors, api: 'simulée', messagesEnvoyes: 0 }, null, 2) + '\n', 'utf8')
  console.log(`${checks.length} contrôles Chromium devis réussis ; captures sous specs/captures/devis/.`)
} finally {
  states.forEach((state) => state.releases.splice(0).forEach((release) => release()))
  await Promise.allSettled(contexts.map((context) => context.close()))
  await browser?.close()
  if (server) await new Promise((resolveClose, reject) => server.httpServer.close((error) => error ? reject(error) : resolveClose()))
}
