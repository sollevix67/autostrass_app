/** Revue WCAG du build courant : Chrome installé, axe-core fourni par AXE_SOURCE,
 * ou .a11y-review.local/axe.min.js. Toutes les routes API sont simulées.
 * Les constats sont des observations, pas une certification de conformité.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { preview } from 'vite'
import { chromium } from 'playwright'

const axeSource = await readFile(process.env.AXE_SOURCE ?? '.a11y-review.local/axe.min.js', 'utf8')
const output = resolve('specs/screenshots/accessibility-review')
const onlyDialogs = process.env.A11Y_ONLY_DIALOGS?.split(',')
const report = onlyDialogs
  ? JSON.parse(await readFile('.a11y-review.local/raw-results.json', 'utf8'))
  : { date: '2026-11-13', sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), tool: 'axe-core', axeVersion: null, browser: null, api: 'simulated', scans: [], manual: {}, javascriptErrors: [], writes: [] }
report.sourceCommit ??= execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const user = { id: 7, nom: 'Test', prenom: 'Camille', email: 'camille@example.test', telephone: null, role: 'admin', actif: true }
const article = { id: 1, reference: 'DLG-1', designation: 'Article de contrôle', category: 'freins', categorieId: 1, sousCategorieId: null, prixUnitaireHT: 12.5, prixUnitaireTTC: 15, quantite: 10, minimum: 2, emplacement: null, description: null, tvaId: 1, ean13: null, delaiDisponibilite: 0, forcerSurCommande: false }
const client = { id: 1, numeroClient: '000001', nom: 'Test', prenom: 'Camille', type: 'particulier', adresse: '1 rue du Dépôt', ville: 'Strasbourg', codePostal: '67000', secteurId: null, email: 'client@example.test', telephone: '0300000000', siret: null }
const line = { reference: 'DLG-1', designation: 'Article de contrôle', quantite: 2, prixUnitaire: 12.5, montant: 25 }
const commande = { id: 1, clientId: 1, dateCommande: '2026-11-13', articles: [line], statut: 'en attente', dateLivraisonPrevue: null }
const category = { id: 1, code: 'freins', libelle: 'Freins', actif: true }
const supplier = { id: 1, nom: 'Fournisseur de contrôle', email: 'supplier@example.test', telephone: null, adresse: null, codePostal: null, ville: null, siret: null }
const emplacement = { id: 1, code: 'A', libelle: 'Allée', chemin: 'A', actif: true, niveau: 'allee', parentId: null, capacite: 0, quantite: 4 }
const settings = { api: { maxRequests: 100, windowSeconds: 900 }, login: { maxAttempts: 10, windowSeconds: 900, blockSeconds: 900 }, caisse: { maxFondsCaisse: 10000 }, database: { host: 'localhost', port: 3306, database: 'fixture', user: 'fixture', passwordConfigured: true, restartRequired: false }, https: { enabled: false, port: 3443, httpMode: 'serve', publicOrigin: '', active: false, restartRequired: false }, turnstile: { enabled: false, siteKey: '', hostnames: [], secretConfigured: true }, updatedAt: '2026-11-13T08:00:00Z' }
const collections = {
  '/api/clients': [client], '/api/fournisseurs': [supplier], '/api/commandes': [commande],
  '/api/vehicules': [{ id: 1, immatriculation: 'AA-001-BB', marque: 'Renault', modele: 'Clio', proprietaire: 'Dépôt', statut: 'disponible' }],
  '/api/utilisateurs': [user], '/api/livraisons': [], '/api/retours': [], '/api/ventes': [],
  '/api/receptions': [], '/api/categories': [category], '/api/sous-categories': [], '/api/secteurs': [],
  '/api/tva': [{ id: 1, taux: 20, libelle: '20 %' }],
}
const routes = ['/', '/catalogue', '/stock', '/stock/inventaire', '/receptions', '/ventes-comptoir', '/caisse', '/commandes-clients', '/livraisons', '/retours', '/clients', '/fournisseurs', '/vehicules', '/utilisateurs', '/parametres', '/parametres/base-de-donnees', '/parametres/limites-api', '/parametres/connexion', '/parametres/caisse', '/parametres/emplacements', '/parametres/secteurs', '/parametres/categories', '/parametres/https', '/parametres/turnstile']
const dialogs = [
  { key: 'client', path: '/clients', trigger: 'Nouveau client' },
  { key: 'fournisseur', path: '/fournisseurs', trigger: 'Nouveau fournisseur' },
  { key: 'catalogue', path: '/catalogue', trigger: 'Nouvel article' },
  { key: 'reception', path: '/receptions', trigger: 'Nouvelle réception' },
  { key: 'vehicule', path: '/vehicules', trigger: 'Nouveau vehicule' },
  { key: 'utilisateur', path: '/utilisateurs', trigger: 'Nouvel utilisateur' },
  { key: 'commande', path: '/commandes-clients', trigger: 'Nouvelle commande' },
  { key: 'livraison', path: '/livraisons', trigger: 'Nouvelle livraison' },
  { key: 'retour', path: '/retours', trigger: 'Nouveau retour' },
  { key: 'vente', path: '/ventes-comptoir', trigger: 'Nouvelle vente' },
  { key: 'caisse', path: '/caisse', trigger: 'Ouvrir la caisse' },
  { key: 'stock', path: '/stock', trigger: 'Modifier DLG-1' },
  { key: 'inventaire', path: '/stock/inventaire', trigger: 'Commencer le comptage' },
  { key: 'database', path: '/parametres/base-de-donnees', trigger: 'Modifier les paramètres' },
  { key: 'api', path: '/parametres/limites-api', trigger: 'Modifier les paramètres' },
  { key: 'connexion', path: '/parametres/connexion', trigger: 'Modifier les paramètres' },
  { key: 'plafond', path: '/parametres/caisse', trigger: 'Modifier les paramètres' },
  { key: 'https', path: '/parametres/https', trigger: 'Modifier HTTPS' },
  { key: 'turnstile', path: '/parametres/turnstile', trigger: 'Modifier Turnstile' },
  { key: 'categories', path: '/parametres/categories', trigger: 'Ajouter : Catégories' },
  { key: 'sous-categories', path: '/parametres/categories', trigger: 'Ajouter : Sous-catégories' },
  { key: 'secteurs', path: '/parametres/secteurs', trigger: 'Ajouter : Secteurs' },
]
let server, browser
try {
  await mkdir(output, { recursive: true })
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  report.browser = browser.version()
  async function setup({ anonymous = false, width = 1440, role = 'admin', caisseOpen = false } = {}) {
    const context = await browser.newContext({ locale: 'fr-FR', viewport: { width, height: 1000 }, reducedMotion: 'reduce' })
    await context.route('**/api/**', async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (request.method() !== 'GET') {
        report.writes.push({ path, method: request.method() })
        return route.fulfill({ status: 503, json: { error: 'DATABASE_UNAVAILABLE', message: 'Erreur simulée pour la revue.' } })
      }
      if (path === '/api/auth/me' && anonymous) return route.fulfill({ status: 401, json: { error: 'UNAUTHENTICATED' } })
      const json = path === '/api/auth/me' ? { user: { ...user, role }, csrfToken: 'a11y-fixture' }
        : path === '/api/auth/configuration' ? { enabled: false, siteKey: '' }
        : path === '/api/dashboard' ? { stockValue: 0, references: 1, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
        : path === '/api/parametres' ? settings
        : path === '/api/caisse/configuration' ? settings.caisse
        : path === '/api/caisse/actuelle' ? caisseOpen ? { id: 17, utilisateurId: 7, fondsCaisse: 150, totalEspeces: 0, nombreVentes: 0, caissier: 'Camille Test', statut: 'ouverte', openedAt: '2026-11-13T08:00:00Z' } : null
        : path === '/api/articles' || path === '/api/stock' ? [article, { ...article, id: 2, reference: 'DLG-2', designation: 'Deuxième article' }]
        : path === '/api/emplacements' ? [emplacement]
        : path === '/api/articles/DLG-1/emplacements' ? { reference: 'DLG-1', quantiteTotale: 10, quantiteNonAffectee: 6, emplacements: [{ emplacementId: 1, chemin: 'A', quantite: 4 }] }
        : path === '/api/inventaires/DLG-1' ? { reference: 'DLG-1', designation: 'Article de contrôle', quantiteTotale: 10, incoherent: false, version: 'a'.repeat(64), lignes: [{ emplacementId: null, chemin: 'Stock non affecté', quantiteAvant: 10 }] }
        : path === '/api/inventaires' ? []
        : collections[path] ?? []
      return route.fulfill({ status: 200, json })
    })
    const page = await context.newPage()
    page.setDefaultTimeout(5000)
    page.on('pageerror', (error) => report.javascriptErrors.push(error.message))
    return { context, page }
  }
  async function visit(page, path) {
    await page.goto(base + path)
    await page.waitForFunction(() => !document.querySelector('.boot-screen'))
    await page.locator('h1').first().waitFor()
    await page.waitForTimeout(120)
  }
  async function scan(page, path, state, theme, width = 1440) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, theme)
    await page.addScriptTag({ content: axeSource })
    const result = await page.evaluate(async () => {
      const a = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })
      const simplify = (rules) => rules.map((v) => ({ id: v.id, impact: v.impact, description: v.description, help: v.help, tags: v.tags, nodes: v.nodes.map((n) => ({ target: n.target, html: n.html, failureSummary: n.failureSummary, checks: [...n.any, ...n.all, ...n.none].filter((c) => c.result === false || c.data).map((c) => ({ id: c.id, data: c.data, message: c.message })) })) }))
      return { version: a.testEngine.version, violations: simplify(a.violations), incomplete: simplify(a.incomplete), passes: a.passes.map((v) => v.id), title: document.title, h1: document.querySelector('h1')?.textContent, horizontalOverflow: document.documentElement.scrollWidth > innerWidth }
    })
    report.axeVersion = result.version
    report.scans.push({ path, state, theme, width, ...result })
    console.log(`SCAN ${report.scans.length} ${path} ${state} ${theme} ${width}: ${result.violations.map((v) => v.id).join(',') || 'aucune violation axe'}`)
  }
  // Écrans complets, thèmes clair et sombre, puis largeur de reflow.
  if (!onlyDialogs) {
    const normal = await setup()
    for (const path of routes) {
      await visit(normal.page, path)
      await scan(normal.page, path, 'page', 'light')
      await scan(normal.page, path, 'page', 'dark')
    }
    for (const path of ['/stock', '/clients', '/caisse', '/parametres/emplacements']) {
      await visit(normal.page, path)
      await scan(normal.page, path, 'page', 'light', 320)
    }
    await normal.context.close()
    const login = await setup({ anonymous: true })
    await visit(login.page, '/')
    for (const theme of ['light', 'dark']) await scan(login.page, '/', 'login', theme)
    await login.page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    report.manual.loginValidation = await login.page.evaluate(() => ({ inlineErrors: document.querySelectorAll('.form-error-text').length, summaryVisible: !!document.querySelector('.error-summary'), focused: document.activeElement?.outerHTML }))
    await scan(login.page, '/', 'login-errors', 'light')
    await login.context.close()
  }
  // Formulaires natifs composés et erreurs ; aucune requête API réelle possible.
  for (const scenario of dialogs.filter((item) => !onlyDialogs || onlyDialogs.includes(item.key))) {
    const { context, page } = await setup({ caisseOpen: scenario.key === 'vente' })
    try {
      await visit(page, scenario.path)
      if (scenario.key === 'inventaire') await page.locator('#count-reference').selectOption('DLG-1')
      const trigger = page.getByRole('button', { name: scenario.trigger, exact: true })
      if (await trigger.count() !== 1) {
        report.manual[`trigger-${scenario.key}`] = { expected: scenario.trigger, buttons: await page.getByRole('button').allTextContents() }
        continue
      }
      await trigger.click()
      const dialog = page.locator('dialog:not(.confirm-modal)')
      await dialog.waitFor({ state: 'visible' })
      if (scenario.key === 'inventaire') await page.locator('#count-0').waitFor()
      for (const theme of ['light', 'dark']) await scan(page, scenario.path, `dialog-${scenario.key}`, theme)
      if (scenario.key === 'inventaire') {
        await dialog.getByRole('button', { name: 'Vérifier et valider le comptage', exact: true }).click()
        await page.locator('.error-summary').waitFor()
        await page.locator('#count-0').focus()
        await page.keyboard.type('10', { delay: 70 })
        report.manual.inventoryFocus = await page.evaluate(() => ({ attempted: '10', value: document.querySelector('#count-0').value, activeId: document.activeElement?.id, activeClass: document.activeElement?.className, errorLinks: [...document.querySelectorAll('.error-summary a')].map((a) => ({ text: a.textContent, href: a.getAttribute('href'), targetExists: !!document.getElementById(a.getAttribute('href').slice(1)) })) }))
        await page.screenshot({ path: resolve(output, 'inventaire-focus.png') })
        await scan(page, scenario.path, 'dialog-inventory-errors', 'light')
      }
      if (scenario.key === 'commande') {
        await dialog.getByRole('button', { name: 'Creer la commande', exact: true }).click()
        await page.waitForTimeout(120)
        report.manual.orderErrors = await page.evaluate(() => [...document.querySelectorAll('.error-summary a')].map((a) => ({ text: a.textContent, href: a.getAttribute('href'), targetExists: !!document.getElementById(a.getAttribute('href').slice(1)) })))
        await scan(page, scenario.path, 'dialog-order-errors', 'light')
      }
      if (scenario.key === 'stock') {
        await dialog.locator('#quantite').fill('')
        await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
        await page.waitForTimeout(150)
        const cdp = await context.newCDPSession(page)
        const { root } = await cdp.send('DOM.getDocument')
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.toast-viewport' })
        const tree = nodeId ? await cdp.send('Accessibility.getPartialAXTree', { nodeId }) : { nodes: [] }
        report.manual.modalToast = { dom: await page.locator('.toast-viewport').textContent(), modalOpen: await dialog.evaluate((n) => n.matches(':modal')), accessibility: tree.nodes.map((n) => ({ role: n.role, name: n.name, ignored: n.ignored, ignoredReasons: n.ignoredReasons })), dialogText: await dialog.textContent() }
        await page.screenshot({ path: resolve(output, 'stock-erreur-toast.png') })
      }
      if (scenario.key === 'categories') {
        await dialog.locator('#categories-code').fill('a'.repeat(65))
        await dialog.locator('#categories-libelle').fill('Catégorie valide')
        await dialog.getByRole('button', { name: 'Ajouter', exact: true }).click()
        await dialog.getByRole('alert').waitFor()
        report.manual.categoryValidation = await dialog.evaluate((n) => ({ alert: n.querySelector('[role="alert"]')?.textContent, fields: [...n.querySelectorAll('input')].map((i) => ({ id: i.id, invalid: i.getAttribute('aria-invalid'), describedBy: i.getAttribute('aria-describedby'), maxLength: i.maxLength })) }))
        await page.screenshot({ path: resolve(output, 'categories-erreur.png') })
      }
      if (scenario.key === 'utilisateur') {
        await page.keyboard.press('Escape')
        await page.getByRole('button', { name: 'Modifier le compte camille@example.test', exact: true }).click()
        await dialog.waitFor({ state: 'visible' })
        report.manual.selfEditPurpose = await dialog.locator('input').evaluateAll((nodes) => nodes.map((i) => ({ name: i.name, type: i.type, autoComplete: i.getAttribute('autocomplete'), value: i.type === 'password' ? '' : i.value })))
      }
      delete report.manual[`scenario-error-${scenario.key}`]
    } catch (error) {
      report.manual[`scenario-error-${scenario.key}`] = error.message
      console.log(`SCENARIO_ERROR ${scenario.key}: ${error.message}`)
    } finally { await context.close() }
  }
  // Les observations de navigation ne dépendent pas d'axe.
  if (!onlyDialogs) {
    const mobile = await setup({ width: 375 })
    await visit(mobile.page, '/stock')
    const menu = mobile.page.getByRole('button', { name: 'Ouvrir le menu', exact: true })
    await menu.focus()
    await mobile.page.keyboard.press('Enter')
    await mobile.page.waitForTimeout(200)
    report.manual.mobileMenu = await mobile.page.evaluate(() => {
      const active = document.activeElement, box = active.getBoundingClientRect()
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      const focusedRect = { x: box.x, y: box.y, width: box.width, height: box.height }
      return { active: active.outerHTML, focusedRect, topElement: top?.outerHTML, coveredAtCenter: top !== active && !active.contains(top), navOpen: !!document.querySelector('.sidebar-open') }
    })
    await mobile.page.screenshot({ path: resolve(output, 'menu-mobile-focus.png') })
    await mobile.page.keyboard.press('Tab')
    report.manual.mobileMenu.afterTab = await mobile.page.evaluate(() => ({ active: document.activeElement?.outerHTML, insideNavigation: !!document.querySelector('#main-navigation')?.contains(document.activeElement) }))
    await mobile.page.keyboard.press('Escape')
    report.manual.mobileMenu.afterEscape = await menu.evaluate((node) => ({ restored: node === document.activeElement, expanded: node.getAttribute('aria-expanded') }))
    await mobile.context.close()
    const table = await setup()
    await visit(table.page, '/clients')
    report.manual.tableSort = await table.page.locator('th.sortable').evaluateAll((nodes) => nodes.map((n) => ({ text: n.textContent, tabIndex: n.tabIndex, role: n.getAttribute('role'), sort: n.getAttribute('aria-sort'), nativeControl: !!n.querySelector('button,a,input,[tabindex]') })))
    const heading = table.page.locator('th.sortable').first()
    const before = await heading.getAttribute('aria-sort')
    await heading.click()
    report.manual.tableMouseSort = { before, after: await heading.getAttribute('aria-sort') }
    const tabStops = []
    await table.page.evaluate(() => document.activeElement?.blur())
    for (let i = 0; i < 35; i += 1) {
      await table.page.keyboard.press('Tab')
      tabStops.push(await table.page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent?.trim().slice(0, 90), inSortableHeader: !!document.activeElement.closest('th.sortable') })))
    }
    report.manual.tableTabStops = tabStops
    await table.page.setViewportSize({ width: 1440, height: 1000 })
    await table.page.emulateMedia({ forcedColors: 'active' })
    report.manual.forcedColors = await table.page.evaluate(() => ({ active: matchMedia('(forced-colors: active)').matches, controls: [...document.querySelectorAll('button')].slice(0, 4).map((n) => ({ text: n.textContent, color: getComputedStyle(n).color, background: getComputedStyle(n).backgroundColor, border: getComputedStyle(n).borderColor })) }))
    await table.context.close()
  }
} finally {
  report.scans = [...new Map(report.scans.map((scan) => [[scan.path, scan.state, scan.theme, scan.width].join('|'), scan])).values()]
  await mkdir('.a11y-review.local', { recursive: true })
  await writeFile('.a11y-review.local/raw-results.json', JSON.stringify(report, null, 2) + '\n')
  const rules = {}
  for (const scan of report.scans) for (const rule of [...scan.violations, ...scan.incomplete]) {
    rules[rule.id] ??= { impact: rule.impact, help: rule.help, tags: rule.tags, examples: [] }
    for (const node of rule.nodes) {
      if (rules[rule.id].examples.length < 6 && !rules[rule.id].examples.some((example) => example.html === node.html)) rules[rule.id].examples.push(node)
    }
  }
  const compact = { ...report, rawResultsPath: '.a11y-review.local/raw-results.json', rules, scans: report.scans.map(({ violations, incomplete, passes, ...scan }) => ({ ...scan, violations: violations.map((rule) => rule.id), incomplete: incomplete.map((rule) => rule.id), passedRules: passes.length })) }
  await writeFile(resolve(output, 'verification.json'), JSON.stringify(compact, null, 2) + '\n')
  await browser?.close()
  await new Promise((done) => server?.httpServer ? server.httpServer.close(done) : done())
  console.log(`REPORT ${report.scans.length} scans, ${report.javascriptErrors.length} erreurs JavaScript, ${report.writes.length} écritures simulées`)
}
