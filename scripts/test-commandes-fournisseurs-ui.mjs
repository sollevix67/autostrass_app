/** Recette Chromium sur API simulée, après npm run build (ou avec --dev). */
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createServer, preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = process.env.COMMANDES_FOURNISSEURS_UI_OUTPUT
const pathname = '/commandes-fournisseurs'
const suppliers = [
  { id: 5, nom: 'Pièces du Rhin', modeLivraison: 'express', actif: true },
  { id: 6, nom: 'Atelier fermé', modeLivraison: 'retrait', actif: false },
]
const initialNeeds = [
  { id: 11, reference: 'FIL-17', designation: 'Filtre à huile', quantite: 5, commandeId: 61, commandeNumero: '20261128-C-FrGhAb', fournisseurId: null, modeLivraison: 'livraison' },
  { id: 12, reference: 'PLA-22', designation: 'Plaquettes avant', quantite: 2, commandeId: 62, commandeNumero: '20261128-C-GyNhAz', fournisseurId: 5, modeLivraison: 'express' },
]
const historical = {
  id: 9, fournisseurId: 6, fournisseur: 'Atelier fermé', modeLivraison: 'retrait', statut: 'partielle',
  dateCommande: '2025-10-21', reliquatInconnu: true,
  articles: [{ ligne: 1, besoinId: null, reference: 'KIT-09', designation: 'Kit de montage', commandeClientId: null,
    commandeClientNumero: null, quantite: 6, quantiteRecue: 0, quantiteAttribuee: 0, prixUnitaire: 10 }],
}
const csrf = 'achat-ui'
const needsPath = '/articles-a-commander'
const horairesPath = pathname + '/horaires'
const commandPath = pathname + '/81/receptions'
const idFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function setup(browser, base, role, mobile = false) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 375, height: 812 } : { width: 1365, height: 900 },
    isMobile: mobile, hasTouch: mobile, locale: 'fr-FR', reducedMotion: 'reduce',
  })
  // Le PDA peut accéder au dépôt en HTTP sur le réseau local.
  if (mobile) await context.addInitScript(() => Object.defineProperty(crypto, 'randomUUID', { value: undefined }))
  const state = {
    besoins: structuredClone(initialNeeds), commandes: [], writes: [], reads: [], errors: [],
    orderReplies: new Map(), receiptReplies: new Map(), ordersLost: true, receiptLost: true,
    hour: { fournisseurId: 5, heureBlocage: null, dureeBlocageMinutes: null, bloque: false },
    failAssignment: true, posted: Promise.withResolvers(), respond: Promise.withResolvers(),
  }
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.slice(4)
    if (request.method() === 'GET') {
      state.reads.push(path)
      const data = {
        '/auth/me': { user: { id: 1, nom: 'Recette', prenom: 'Camille', role }, csrfToken: csrf },
        '/dashboard': { stockValue: 0, references: 0, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] },
        '/fournisseurs': suppliers, [needsPath]: state.besoins.filter((b) => b.quantite > 0),
        [pathname]: [...state.commandes, historical], [horairesPath]: [state.hour],
      }
      return route.fulfill({ json: data[path] ?? [] })
    }
    const body = request.postDataJSON()
    state.writes.push({ path, body })
    assert.equal(request.headers()['x-csrf-token'], csrf)
    if (request.method() === 'PUT' && path === needsPath + '/11') {
      if (state.failAssignment) {
        state.failAssignment = false
        return route.fulfill({ status: 409, json: { error: 'CHANGED', message: 'L’affectation a changé.' } })
      }
      Object.assign(state.besoins[0], body)
      return route.fulfill({ json: state.besoins[0] })
    }
    if (request.method() === 'PUT' && path === horairesPath + '/5') {
      Object.assign(state.hour, body, { bloque: body.heureBlocage !== null })
      return route.fulfill({ json: state.hour })
    }
    if (request.method() === 'POST' && path === pathname) {
      assert.match(body.cleCommande, idFormat)
      if (!state.orderReplies.has(body.cleCommande)) {
        assert.equal(state.commandes.length, 0, 'Une seule création commerciale')
        const order = { id: 81, fournisseurId: body.fournisseurId, fournisseur: suppliers[0].nom, modeLivraison: body.modeLivraison,
          statut: 'envoyée', reliquatInconnu: false, dateCommande: '2026-11-28', articles: body.articles.map(({ besoinId, quantite, prixUnitaire }, index) => {
            const besoin = state.besoins.find((b) => b.id === besoinId)
            besoin.quantite -= quantite
            return { ligne: index + 1, besoinId, reference: besoin.reference, designation: besoin.designation,
              commandeClientId: besoin.commandeId, commandeClientNumero: besoin.commandeNumero, quantite, quantiteRecue: 0, quantiteAttribuee: 0, prixUnitaire }
          }),
        }
        state.commandes.push(order)
        state.orderReplies.set(body.cleCommande, order)
      }
      if (state.ordersLost) {
        state.ordersLost = false
        state.posted.resolve()
        await state.respond.promise
        return route.abort('failed')
      }
      return route.fulfill({ json: state.orderReplies.get(body.cleCommande) })
    }
    if (request.method() === 'POST' && path === commandPath) {
      assert.match(body.cleOperation, idFormat)
      if (!state.receiptReplies.has(body.cleOperation)) {
        const order = state.commandes[0]
        for (const item of body.articles) {
          const line = order.articles.find((l) => l.ligne === item.ligne)
          line.quantiteRecue += item.quantite
          line.quantiteAttribuee += item.quantite
          assert.ok(line.quantiteRecue <= line.quantite)
        }
        order.statut = order.articles.every((l) => l.quantiteRecue === l.quantite) ? 'reçue' : 'partielle'
        state.receiptReplies.set(body.cleOperation, { receptionId: state.receiptReplies.size + 91 })
      }
      if (state.receiptLost) { state.receiptLost = false; return route.abort('failed') }
      return route.fulfill({ json: state.receiptReplies.get(body.cleOperation) })
    }
    throw new Error('Écriture inattendue ' + request.method() + ' ' + path)
  })
  const page = await context.newPage()
  page.on('pageerror', (event) => state.errors.push(event.message))
  await page.goto(base + pathname)
  return { page, context, state }
}

async function parcours(browser, base, mobile) {
  const { context, page, state } = await setup(browser, base, mobile ? 'magasinier' : 'admin', mobile)
  const button = (label) => page.getByRole('button', { name: label, exact: true })
  const dialog = page.getByRole('dialog')
  const action = (label) => dialog.getByRole('button', { name: label, exact: true })
  try {
    await button('Affecter FIL-17 à un fournisseur').waitFor()
    await page.getByLabel('Filtrer par fournisseur').selectOption('sans')
    await button('Affecter PLA-22 à un fournisseur').waitFor({ state: 'detached' })
    assert.equal(await page.getByRole('row').count(), 2)
    await page.getByLabel('Filtrer par fournisseur').selectOption('')
    await page.getByLabel('Filtrer par mode de livraison').selectOption('express')
    await button('Affecter FIL-17 à un fournisseur').waitFor({ state: 'detached' })
    assert.equal(await button('Affecter FIL-17 à un fournisseur').count(), 0)
    await page.getByLabel('Filtrer par mode de livraison').selectOption('')
    await button('Affecter FIL-17 à un fournisseur').click()
    const select = dialog.getByRole('combobox', { name: 'Fournisseur actif', exact: true })
    assert.equal(await select.getByText('Atelier fermé').count(), 0)
    await select.selectOption('5')
    assert.equal(await dialog.getByLabel('Mode de livraison', { exact: true }).inputValue(), 'express')
    await action('Enregistrer l’affectation').click()
    await dialog.getByText('L’affectation a changé.').waitFor()
    assert.equal(await select.inputValue(), '5')
    await action('Enregistrer l’affectation').click()

    if (output && !mobile) {
      await button('Commander FIL-17').waitFor()
      await page.getByRole('table', { name: 'Articles à commander' }).screenshot({ path: join(output, 'articles-a-commander.png') })
    }
    await button('Horaires de commande').click()
    await page.getByRole('table', { name: 'Horaires de commande par fournisseur' }).getByText('Aucun blocage').waitFor()
    const edit = button('Modifier les horaires de Pièces du Rhin')
    if (!mobile) {
      await edit.click()
      await dialog.getByRole('checkbox').check()
      await dialog.getByLabel('Début du blocage', { exact: false }).fill('23:30')
      await dialog.getByLabel('Durée du blocage', { exact: false }).fill('120')
      await action('Enregistrer les horaires').click()
      await page.getByText('Commandes suspendues', { exact: true }).waitFor()
      await button('Articles à commander').click()
      assert.ok(await button('Commander FIL-17').isDisabled())
      await button('Horaires de commande').click()
      await edit.click()
      await dialog.getByRole('checkbox').uncheck()
      await action('Enregistrer les horaires').click()
      await page.getByRole('table').getByText('Aucun blocage').waitFor()
    } else {
      assert.equal(await edit.count(), 0, 'Horaires en lecture pour le magasinier')
    }
    await button('Articles à commander').click()
    await button('Commander FIL-17').click()
    assert.equal(await dialog.locator('#quantite-11').inputValue(), '5')
    assert.equal(await dialog.locator('#quantite-12').inputValue(), '0')
    assert.equal(await dialog.locator('#prix-11').inputValue(), '')
    await action('Passer la commande').click()
    assert.equal(state.writes.filter((w) => w.path === pathname).length, 0, 'Le prix d’achat est obligatoire')
    await dialog.locator('#quantite-11').fill('3')
    await dialog.locator('#prix-11').fill('12.30')
    await dialog.locator('#quantite-12').fill('2')
    await dialog.locator('#prix-12').fill('0')
    assert.match(await dialog.locator('.reception-total').innerText(), /36,90/)
    await action('Passer la commande').click()
    await state.posted.promise
    await dialog.locator('form').evaluate((form) => form.requestSubmit())
    await page.keyboard.press('Escape')
    assert.ok(await dialog.isVisible())
    assert.equal(state.writes.filter((w) => w.path === pathname).length, 1)
    state.respond.resolve()
    await action('Réessayer').waitFor()
    assert.equal(await dialog.locator('#prix-11').inputValue(), '12.30')
    assert.ok(await dialog.locator('#prix-11').isDisabled())
    await action('Réessayer').click()
    await dialog.waitFor({ state: 'hidden' })
    const orders = state.writes.filter((w) => w.path === pathname)
    assert.deepEqual(orders[0], orders[1], 'Le rejeu de commande conserve son corps entier')
    assert.deepEqual(orders[0].body.articles, [{ besoinId: 11, quantite: 3, prixUnitaire: 12.3 }, { besoinId: 12, quantite: 2, prixUnitaire: 0 }])

    await button('Commandes passées').click()
    await page.getByRole('table').getByText('Reliquat à rapprocher', { exact: true }).waitFor()
    assert.equal(await button('Réceptionner la commande n° 9').count(), 0)
    await button('Consulter la commande n° 9').click()
    const historique = dialog.getByRole('row').nth(1).getByRole('cell')
    assert.deepEqual(await historique.allTextContents(), ['KIT-09Kit de montage', '—', '10,00 €', '6', '—', '—'])
    await action('Fermer').click()
    await button('Consulter la commande n° 81').click()
    await dialog.getByText(initialNeeds[0].commandeNumero).waitFor()
    await action('Fermer').click()
    await button('Réceptionner la commande n° 81').click()
    const received = dialog.locator('#recu-1')
    await received.fill('4')
    await action('Enregistrer la réception').click()
    assert.equal(state.writes.filter((w) => w.path === commandPath).length, 0)
    await received.fill('1')
    if (output && mobile) await dialog.screenshot({ path: join(output, 'reception-mobile.png') })
    assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    await action('Enregistrer la réception').click()
    await action('Réessayer').waitFor()
    await page.reload()
    await button('Réessayer').waitFor()
    assert.ok(await button('Réceptionner la commande n° 81').isDisabled())
    await button('Réessayer').click()
    await page.getByRole('row').filter({ has: button('Consulter la commande n° 81') }).getByText('partielle', { exact: true }).waitFor()
    const receipts = state.writes.filter((w) => w.path === commandPath)
    assert.deepEqual(receipts[0], receipts[1], 'Le rejeu après rechargement récupère la réception envoyée')
    assert.deepEqual(receipts[0].body.articles, [{ ligne: 1, quantite: 1 }])
    await button('Réceptionner la commande n° 81').click()
    await action('Tout réceptionner').click()
    assert.equal(await dialog.locator('#recu-1').inputValue(), '2')
    assert.equal(await dialog.locator('#recu-2').inputValue(), '2')
    await action('Enregistrer la réception').click()
    await page.getByRole('table').getByText('reçue', { exact: true }).waitFor()
    assert.equal(await button('Réceptionner la commande n° 81').count(), 0)
    assert.equal(state.receiptReplies.size, 2)
    await button('Consulter la commande n° 81').click()
    assert.equal(await dialog.getByRole('row').nth(1).getByRole('cell').last().innerText(), '3')
    if (output && !mobile) await dialog.screenshot({ path: join(output, 'attributions.png') })
    assert.deepEqual(state.errors, [])
    console.log((mobile ? 'Magasinier, 375 px' : 'Administrateur, 1365 px') + ' — affectation, filtres, horaires, commande et réceptions avec perte de réponse et attribution vérifiés.')
  } finally { state.respond.resolve(); await context.close() }
}

const dev = process.argv.includes('--dev')
const options = { host: '127.0.0.1', port: 0, open: false }
if (output) await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const server = dev ? await createServer({ server: options }) : await preview({ preview: options })
  try {
    if (dev) await server.listen()
    const base = 'http://127.0.0.1:' + server.httpServer.address().port
    for (const mobile of [false, true]) await parcours(browser, base, mobile)
    const { context, state, page } = await setup(browser, base, 'caissier')
    try {
      await page.getByText('Les commandes fournisseurs sont réservées aux administrateurs et aux magasiniers.').waitFor()
      assert.equal(await page.getByRole('link', { name: 'Commandes fournisseurs', exact: true }).count(), 0)
      assert.ok(!state.reads.includes(pathname) && !state.reads.includes(needsPath) && !state.reads.includes(horairesPath))
      await page.goto(base + '/devis')
      await page.getByRole('button', { name: /Articles à commander/ }).click()
      assert.equal(await page.getByRole('link', { name: 'Gérer les commandes fournisseurs' }).count(), 0)
      assert.equal(state.writes.length, 0)
      assert.deepEqual(state.errors, [])
      console.log('Caissier — accès Devis préservé, aucune lecture ni écriture sur la route des commandes fournisseurs.')
    } finally { await context.close() }
  } finally { await server.close() }
} finally { await browser.close() }
