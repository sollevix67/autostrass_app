/** npm run build puis npm run test:forms:ui. Chromium, API simulée, aucune écriture MariaDB. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = resolve('specs/screenshots/formulaires-modaux')
const checks = [], errors = []
const check = (condition, label) => { assert.ok(condition, label); checks.push(label) }
const fill = async (dialog, values) => {
  for (const [name, value] of Object.entries(values)) {
    const field = dialog.locator(`[name="${name}"], [id="${name}"]`).first()
    if (await field.evaluate((node) => node.tagName === 'SELECT')) await field.selectOption(value)
    else await field.fill(value)
  }
}
const scenarios = [
  { key: 'vehicules', page: '/vehicules', trigger: 'Nouveau vehicule', submit: 'Ajouter le vehicule', values: { immatriculation: 'AA-001-BB', marque: 'Renault', modele: 'Clio', proprietaire: 'Autostrass' }, path: '/api/vehicules' },
  { key: 'utilisateurs', page: '/utilisateurs', trigger: 'Nouvel utilisateur', submit: 'Creer le compte', values: { nom: 'Test', prenom: 'Camille', email: 'camille@example.test', motDePasse: 'demo-password' }, path: '/api/utilisateurs' },
  { key: 'commandes', page: '/commandes-clients', trigger: 'Nouvelle commande', submit: 'Creer la commande', values: { clientId: '1', 'articles.0.reference': 'DLG-1', 'articles.0.designation': 'Article test', 'articles.0.quantite': '2', 'articles.0.prixUnitaire': '12.50' }, path: '/api/commandes' },
  { key: 'livraisons', page: '/livraisons', trigger: 'Nouvelle livraison', submit: 'Enregistrer', values: { commandeId: '1', transporteur: 'GLS', dateLivraisonPrevue: '2026-11-15', adresseLivraison: '1 rue du Dépôt' }, path: '/api/livraisons' },
  { key: 'retours', page: '/retours', trigger: 'Nouveau retour', submit: 'Enregistrer le retour', values: { clientId: '1', motif: 'Article défectueux', 'articles.0.reference': 'DLG-1', 'articles.0.designation': 'Article test', 'articles.0.quantite': '2', 'articles.0.prixUnitaire': '12.50' }, path: '/api/retours' },
  { key: 'ventes', page: '/ventes-comptoir', trigger: 'Nouvelle vente', submit: 'Valider la vente', values: { catalogueSelection: 'DLG-1', montantPaye: '20' }, path: '/api/ventes' },
  { key: 'ouverture', page: '/caisse', trigger: 'Ouvrir la caisse', submit: 'Ouvrir la caisse', values: { 'comptage.3.quantite': '3', notes: 'Fond vérifié.' }, path: '/api/caisse/ouvrir' },
  { key: 'stock', page: '/stock', trigger: 'Modifier DLG-1', submit: 'Enregistrer', values: { quantite: '12', minimum: '4' }, path: '/api/articles/DLG-1', method: 'PUT' },
  { key: 'transfert', page: '/stock', trigger: "Transfert d'article", submit: 'Effectuer le transfert', values: { 'transfert-reference': 'DLG-1', source_emplacement_id: 'non-affecte', 'transfert-quantite': '2', emplacement_id: '1' }, path: '/api/articles/DLG-1/transfert' },
  { key: 'base-de-donnees', page: '/parametres/base-de-donnees', trigger: 'Modifier les paramètres', submit: 'Enregistrer', values: { host: 'db.example.test' }, path: '/api/parametres/base-de-donnees', method: 'PUT' },
  { key: 'limites-api', page: '/parametres/limites-api', trigger: 'Modifier les paramètres', submit: 'Enregistrer', values: { maxRequests: '500' }, path: '/api/parametres/api', method: 'PUT' },
  { key: 'connexion', page: '/parametres/connexion', trigger: 'Modifier les paramètres', submit: 'Enregistrer', values: { maxAttempts: '20' }, path: '/api/parametres/connexion', method: 'PUT' },
  { key: 'plafond-caisse', page: '/parametres/caisse', trigger: 'Modifier les paramètres', submit: 'Enregistrer', values: { maxFondsCaisse: '12000.50' }, path: '/api/parametres/caisse', method: 'PUT' },
  { key: 'https', page: '/parametres/https', trigger: 'Modifier HTTPS', submit: 'Enregistrer', values: { port: '3444' }, path: '/api/parametres/https', method: 'PUT' },
  { key: 'turnstile', page: '/parametres/turnstile', trigger: 'Modifier Turnstile', submit: 'Enregistrer', values: { siteKey: 'public-fixture', hostnames: 'depot.example.test' }, path: '/api/parametres/turnstile', method: 'PUT' },
  { key: 'categories', page: '/parametres/categories', trigger: 'Ajouter : Catégories', submit: 'Ajouter', values: { 'categories-code': 'test-modal', 'categories-libelle': 'Catégorie modale' }, path: '/api/categories', edit: true },
  { key: 'sous-categories', page: '/parametres/categories', trigger: 'Ajouter : Sous-catégories', submit: 'Ajouter', values: { 'sous-categories-code': 'test-modal', 'sous-categories-parent': '1', 'sous-categories-libelle': 'Sous-catégorie modale' }, path: '/api/sous-categories', edit: true },
  { key: 'secteurs', page: '/parametres/secteurs', trigger: 'Ajouter : Secteurs', submit: 'Ajouter', values: { 'secteurs-code': 'test-modal', 'secteurs-libelle': 'Secteur modal' }, path: '/api/secteurs', edit: true },
  { key: 'inventaire', page: '/stock/inventaire', trigger: 'Commencer le comptage', submit: 'Vérifier et valider le comptage', values: { 'count-0': '10', motif: 'Contrôle physique du rayon.' }, path: '/api/inventaires/DLG-1', confirmation: true },
]

let server, browser
try {
  await mkdir(output, { recursive: true })
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
  async function setup(scenario, role = 'admin') {
    const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
    const state = { writes: [], failNext: false, hold: null, inventoryConflict: false }
    const article = { id: 1, reference: 'DLG-1', designation: 'Article test', category: 'freins', prixUnitaireHT: 12.5, prixUnitaireTTC: 15, quantite: 10, minimum: 2, emplacement: null, description: null, tvaId: 1, ean13: null, delaiDisponibilite: 0, forcerSurCommande: false }
    const client = { id: 1, numeroClient: '000001', nom: 'Test', prenom: 'Camille', type: 'particulier', adresse: '1 rue du Dépôt', ville: 'Strasbourg', codePostal: '67000', secteurId: null }
    const line = { reference: 'DLG-1', designation: 'Article test', quantite: 2, prixUnitaire: 12.5, montant: 25 }
    const commande = { id: 1, clientId: 1, dateCommande: '2026-11-10', articles: [line], statut: 'en attente', dateLivraisonPrevue: null }
    const category = { id: 1, code: 'freins', libelle: 'Freins', actif: true }
    const collections = { '/api/clients': [client], '/api/commandes': [commande], '/api/vehicules': [], '/api/utilisateurs': [], '/api/livraisons': [], '/api/retours': [], '/api/ventes': [], '/api/categories': [category], '/api/sous-categories': [], '/api/secteurs': [], '/api/tva': [{ id: 1, taux: 20 }] }
    const settings = { api: { maxRequests: 100, windowSeconds: 900 }, login: { maxAttempts: 10, windowSeconds: 900, blockSeconds: 900 }, caisse: { maxFondsCaisse: 10000 }, database: { host: 'localhost', port: 3306, database: 'fixture', user: 'fixture', passwordConfigured: true, restartRequired: false }, https: { enabled: false, port: 3443, httpMode: 'serve', publicOrigin: '', active: false, restartRequired: false }, turnstile: { enabled: false, siteKey: '', hostnames: [], secretConfigured: true }, updatedAt: '2026-11-10T08:00:00Z' }
    const stock = { reference: 'DLG-1', designation: 'Article test', quantiteTotale: 10, incoherent: false, version: 'a'.repeat(64), lignes: [{ emplacementId: null, chemin: 'Stock non affecté', quantiteAvant: 10 }] }
    await context.route('**/api/**', async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname
      if (request.method() === 'GET') {
        const json = path === '/api/auth/me' ? { user: { id: 7, prenom: 'Camille', nom: 'Test', role, email: 'modal@example.test' }, csrfToken: 'modal-fixture' }
          : path === '/api/dashboard' ? { stockValue: 0, references: 1, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
          : path === '/api/parametres' ? settings
          : path === '/api/caisse/configuration' ? settings.caisse
          : path === '/api/caisse/actuelle' ? scenario.key === 'ventes' ? { id: 17, utilisateurId: 7, fondsCaisse: 150, totalEspeces: 0, nombreVentes: 0, caissier: 'Camille Test', statut: 'ouverte', openedAt: '2026-11-10T08:00:00Z' } : null
          : path === '/api/articles' || path === '/api/stock' ? [article]
          : path === '/api/emplacements' ? [{ id: 1, code: 'A', libelle: 'Allée', chemin: 'A', actif: true, niveau: 'allee', parentId: null, capacite: 0, quantite: 4 }]
          : path === '/api/articles/DLG-1/emplacements' ? { reference: 'DLG-1', quantiteTotale: 10, quantiteNonAffectee: 6, emplacements: [{ emplacementId: 1, chemin: 'A', quantite: 4 }] }
          : path === '/api/inventaires/DLG-1' ? stock
          : collections[path] ?? []
        return route.fulfill({ status: 200, json })
      }
      assert.equal(request.headers()['x-csrf-token'], 'modal-fixture')
      const body = request.postDataJSON()
      state.writes.push({ path, method: request.method(), body })
      if (state.hold) await state.hold
      if (state.inventoryConflict) {
        state.inventoryConflict = false
        stock.version = 'b'.repeat(64)
        return route.fulfill({ status: 409, json: { error: 'STOCK_CHANGED', message: 'Le stock a changé. Recommencez le comptage.' } })
      }
      if (state.failNext) { state.failNext = false; return route.fulfill({ status: 503, json: { error: 'DATABASE_UNAVAILABLE', message: 'Base indisponible.' } }) }
      if (path.startsWith('/api/parametres/')) {
        settings[path.endsWith('/connexion') ? 'login' : path.endsWith('/base-de-donnees') ? 'database' : path.split('/').at(-1)] = body
        settings.updatedAt = new Date().toISOString()
        return route.fulfill({ status: 200, json: settings })
      }
      const result = { id: 25, ...body, articles: body.articles?.map((line) => ({ ...line, montant: line.quantite * line.prixUnitaire })), totalHT: 25, montantRembourse: 25, createdAt: '2026-11-10T10:00:00Z', updatedAt: '2026-11-10T10:00:00Z' }
      if (path === '/api/caisse/ouvrir') Object.assign(result, { utilisateurId: 7, caissier: 'Camille Test', statut: 'ouverte', totalEspeces: 0, nombreVentes: 0, openedAt: result.createdAt })
      if (path === '/api/articles/DLG-1') Object.assign(article, body)
      if (path === '/api/inventaires/DLG-1') Object.assign(result, { reference: 'DLG-1', designation: 'Article test', auteur: 'Camille Test', utilisateurId: 7, quantiteAvant: 10, quantiteComptee: body.lignes.reduce((sum, line) => sum + line.quantiteComptee, 0), lignes: body.lignes.map((line) => ({ ...line, chemin: 'Stock non affecté', quantiteAvant: 10 })) })
      if (collections[path]) collections[path].push(result)
      if (scenario.edit && request.method() === 'PUT') {
        const collection = collections[path.slice(0, path.lastIndexOf('/'))]
        const existing = collection.find((item) => item.id === Number(path.split('/').at(-1)))
        Object.assign(existing, body)
      }
      return route.fulfill({ status: request.method() === 'PUT' ? 200 : 201, json: result })
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(base + scenario.page)
    if (scenario.confirmation && role === 'admin') await page.locator('#count-reference').selectOption('DLG-1')
    return { context, page, state }
  }

  for (const scenario of scenarios) {
    const { context, page, state } = await setup(scenario)
    const trigger = page.getByRole('button', { name: scenario.trigger, exact: true })
    const dialog = page.locator('dialog.form-dialog:not(.confirm-modal)')
    await trigger.waitFor({ state: 'visible' })
    check(await dialog.count() === 0, `${scenario.key} : formulaire absent avant ouverture`)
    await trigger.click()
    await dialog.waitFor({ state: 'visible' })
    if (scenario.confirmation) await dialog.locator('#count-0').waitFor({ state: 'visible' })
    check(await dialog.evaluate((node) => node.matches(':modal')), `${scenario.key} : dialogue natif modal`)
    check(await dialog.evaluate((node) => node.contains(document.activeElement)), `${scenario.key} : focus dans le dialogue`)
    check(await page.evaluate(() => document.body.style.overflow === 'hidden'), `${scenario.key} : arrière-plan immobilisé`)
    check(state.writes.length === 0, `${scenario.key} : ouverture sans écriture`)
    if (!scenario.confirmation) check(await page.locator('form').evaluateAll((forms) => forms.every((form) => form.closest('dialog'))), `${scenario.key} : formulaires placés dans les dialogues`)
    const close = dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true })
    await close.focus()
    await page.keyboard.press('Shift+Tab')
    check(await dialog.evaluate((node) => node.contains(document.activeElement) && document.activeElement !== node.querySelector('[aria-label="Fermer la fenêtre"]')), `${scenario.key} : Shift+Tab reste dans le dialogue`)
    await page.keyboard.press('Tab')
    check(await close.evaluate((node) => document.activeElement === node), `${scenario.key} : Tab revient au premier contrôle`)
    if (['vehicules', 'utilisateurs', 'commandes', 'livraisons', 'retours', 'inventaire'].includes(scenario.key)) {
      await dialog.getByRole('button', { name: scenario.submit, exact: true }).click()
      await dialog.getByRole('alert').first().waitFor({ state: 'visible' })
      check(state.writes.length === 0, `${scenario.key} : formulaire incomplet refusé dans le dialogue`)
    }
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    check(await trigger.evaluate((node) => document.activeElement === node), `${scenario.key} : Échap rend le focus au déclencheur`)
    check(await page.evaluate(() => document.body.style.overflow !== 'hidden'), `${scenario.key} : défilement rétabli`)
    await trigger.click()
    await dialog.waitFor({ state: 'visible' })
    if (scenario.confirmation) await dialog.locator('#count-0').waitFor({ state: 'visible' })
    for (const width of [375, 768, 1024, 1440]) {
      for (const theme of ['light', 'dark']) {
        await page.setViewportSize({ width, height: 1000 })
        await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
        check(await dialog.evaluate((node) => { const box = node.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight && node.scrollWidth <= node.clientWidth }), `${scenario.key} : aucun débordement ${width}px ${theme}`)
        if (width === 375 && theme === 'dark' || width === 1440 && theme === 'light') await page.screenshot({ path: resolve(output, `${scenario.key}-${width}-${theme}.png`) })
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await fill(dialog, scenario.values)
    const snapshot = () => dialog.locator('input, select, textarea').evaluateAll((nodes) => nodes.map((node) => [node.name || node.id, node.value, node.checked]))
    const before = await snapshot()
    await page.mouse.click(1, 1)
    check(await dialog.isVisible() && JSON.stringify(before) === JSON.stringify(await snapshot()) && state.writes.length === 0, `${scenario.key} : clic extérieur conserve la fenêtre et la saisie sans écriture`)
    if (scenario.key === 'ventes') {
      await dialog.getByRole('button', { name: 'Fermer et garder le panier', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: 'Reprendre la vente', exact: true }).click()
      check(JSON.stringify(before) === JSON.stringify(await snapshot()), 'Ventes : fermeture et reprise conservent le panier et le règlement')
    }
    if (scenario.confirmation) {
      await page.keyboard.press('Escape')
      const confirmation = page.locator('dialog.confirm-modal')
      await confirmation.waitFor({ state: 'visible' })
      check(await dialog.isVisible() && await confirmation.evaluate((node) => node.matches(':modal')), 'Inventaire : abandon confirmé au-dessus du comptage')
      await page.mouse.click(1, 1)
      check(await confirmation.isVisible() && await dialog.isVisible() && JSON.stringify(before) === JSON.stringify(await snapshot()) && state.writes.length === 0, 'Inventaire : clic extérieur conserve les deux fenêtres et la saisie sans écriture')
      await page.keyboard.press('Escape')
      await confirmation.waitFor({ state: 'hidden' })
      check(await dialog.isVisible() && JSON.stringify(before) === JSON.stringify(await snapshot()), 'Inventaire : Échap ferme seulement la confirmation et conserve les quantités')
    }
    const submit = async () => {
      await dialog.getByRole('button', { name: scenario.submit, exact: true }).click()
      if (scenario.confirmation) {
        const confirmation = page.locator('dialog.confirm-modal')
        await confirmation.waitFor({ state: 'visible' })
        await confirmation.getByRole('button', { name: 'Confirmer', exact: true }).click()
      }
    }
    let release
    state.hold = new Promise((resolve) => { release = resolve })
    state.failNext = true
    await submit()
    try {
      await page.waitForFunction(() => document.querySelector('dialog.form-dialog:not(.confirm-modal)')?.getAttribute('aria-busy') === 'true', null, { timeout: 5000 })
    } catch (error) {
      console.error(scenario.key, await dialog.getByRole('alert').allTextContents(), JSON.stringify(state.writes), JSON.stringify(await snapshot()))
      throw error
    }
    check(state.writes.length === 1 && state.writes[0].path === scenario.path && state.writes[0].method === (scenario.method ?? 'POST'), `${scenario.key} : requête attendue et jeton CSRF`)
    check(await dialog.locator('input, select, textarea').evaluateAll((nodes) => nodes.every((node) => node.matches(':disabled'))), `${scenario.key} : tous les champs bloqués pendant l’écriture`)
    check(await close.isDisabled(), `${scenario.key} : fermeture bloquée pendant l’écriture`)
    await dialog.locator('form').dispatchEvent('submit')
    await page.keyboard.press('Escape')
    await page.mouse.click(1, 1)
    check(await dialog.isVisible() && state.writes.length === 1, `${scenario.key} : Échap, fond et double envoi sans effet pendant l’écriture`)
    release()
    state.hold = null
    await dialog.getByRole('alert').filter({ hasText: 'MariaDB' }).first().waitFor({ state: 'visible' })
    check(await dialog.isVisible() && JSON.stringify(before) === JSON.stringify(await snapshot()), `${scenario.key} : erreur API visible et saisie intacte`)
    await submit()
    await dialog.waitFor({ state: 'hidden' })
    check(state.writes.length === 2, `${scenario.key} : nouvelle tentative explicite et fermeture après succès API`)
    check(await page.evaluate(() => document.body.style.overflow !== 'hidden'), `${scenario.key} : défilement rétabli après sauvegarde`)
    if (scenario.key === 'ventes') check(state.writes[1].body.caissier === 'Camille Test' && state.writes[1].body.articles[0].reference === 'DLG-1', 'Ventes : auteur connecté et panier transmis')
    if (scenario.key === 'ouverture') check(state.writes[1].body.fondsCaisse === 150, 'Caisse : fond calculé depuis le comptage modal')
    if (scenario.key === 'commandes' || scenario.key === 'retours') check(state.writes[1].body.articles[0].quantite === 2, `${scenario.key} : lignes du document conservées`)
    if (scenario.edit) {
      const label = scenario.values[`${scenario.key}-libelle`]
      await page.getByRole('button', { name: `Modifier ${label}`, exact: true }).click()
      await dialog.waitFor({ state: 'visible' })
      check(await dialog.locator(`#${scenario.key}-code`).isDisabled(), `${scenario.key} : code immuable en modification`)
      if (scenario.key === 'sous-categories') check(await dialog.locator('#sous-categories-parent').isDisabled(), 'Sous-catégories : parent immuable en modification')
      await dialog.locator(`#${scenario.key}-libelle`).fill(`${label} modifié`)
      await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      check(state.writes.at(-1).method === 'PUT' && state.writes.at(-1).path === `${scenario.path}/25`, `${scenario.key} : modification envoyée sur l’identifiant existant`)
    }
    if (scenario.confirmation) {
      await trigger.click()
      await dialog.locator('#count-0').waitFor({ state: 'visible' })
      await fill(dialog, scenario.values)
      state.inventoryConflict = true
      await submit()
      await dialog.getByRole('alert').filter({ hasText: 'Le stock a changé' }).waitFor({ state: 'visible' })
      check(await dialog.getByRole('button', { name: scenario.submit, exact: true }).isDisabled() && await dialog.locator('#count-0').inputValue() === '10', 'Inventaire : conflit bloque l’enregistrement et conserve les quantités')
      await dialog.getByRole('button', { name: 'Recommencer avec le stock actualisé', exact: true }).click()
      await page.locator('dialog.confirm-modal').getByRole('button', { name: 'Confirmer', exact: true }).click()
      await dialog.locator('#count-0').waitFor({ state: 'visible' })
      check(await dialog.locator('#count-0').inputValue() === '', 'Inventaire : redémarrage confirmé recharge le stock et exige un nouveau comptage')
      await dialog.locator('#count-0').fill('8')
      await close.click()
      await page.locator('dialog.confirm-modal').getByRole('button', { name: 'Confirmer', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      check(await page.evaluate(() => document.body.style.overflow !== 'hidden'), 'Inventaire : abandon confirmé ferme les deux dialogues et rétablit le défilement')
    }
    await context.close()
    console.log(`OK ${scenario.key}`)
  }

  for (const [key, role] of [['vehicules', 'caissier'], ['utilisateurs', 'magasinier'], ['commandes', 'magasinier'], ['livraisons', 'magasinier'], ['retours', 'magasinier'], ['ventes', 'magasinier'], ['ouverture', 'magasinier'], ['stock', 'caissier'], ['plafond-caisse', 'caissier'], ['https', 'magasinier'], ['turnstile', 'magasinier'], ['categories', 'magasinier'], ['inventaire', 'caissier']]) {
    const scenario = scenarios.find((item) => item.key === key)
    const { context, page, state } = await setup(scenario, role)
    if (scenario.page.startsWith('/parametres')) await page.getByRole('heading', { name: 'Accès réservé', exact: true }).waitFor()
    else await page.locator('h1').waitFor()
    const trigger = page.getByRole('button', { name: scenario.trigger, exact: true })
    check(await trigger.count() === 0 || await trigger.isDisabled(), `${key} : création/modification indisponible pour ${role}`)
    check(await page.locator('dialog.form-dialog').count() === 0 && state.writes.length === 0, `${key} : aucun formulaire ni écriture pour ${role}`)
    await context.close()
  }
  check(errors.length === 0, `Aucune erreur JavaScript : ${errors.join(', ')}`)
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ checks, errors, scenarios: scenarios.length, api: 'simulée, aucune écriture MariaDB' }, null, 2) + '\n')
  console.log(`${checks.length} contrôles réussis sur ${scenarios.length} formulaires migrés.`)
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server ? server.httpServer.close((error) => error ? reject(error) : resolve()) : resolve())
}
