/** npm run build puis node scripts/test-fournisseurs-ui.mjs.
 * Chromium ; API simulée. PLAYWRIGHT_MODULE peut désigner un module externe.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = resolve('specs/screenshots/fournisseurs')
const checks = [], errors = []
const fields = ['code', 'siret', 'email', 'telephone', 'adresse', 'ville', 'codePostal']
const full = { nom: 'Fournisseur complet', code: 'FOUR/01', siret: '01234567890123', email: 'contact@example.test', telephone: '+33 (0)3 88 00 00 00', adresse: '1 rue du Test', ville: 'Strasbourg', codePostal: '67000' }
let browser, server, releaseWrite
function check(condition, label) { assert.ok(condition, label); checks.push(label) }

try {
  await mkdir(output, { recursive: true })
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
  async function setup(role) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
    const state = { rows: [{ ...full, id: 1, nom: 'Existant', delaiLivraison: 0, modeLivraison: 'livraison', actif: true }], writes: [], failure: null, slow: false }
    await context.route('**/api/**', async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      const method = request.method()
      if (method === 'GET') {
        const json = path === '/api/auth/me' ? { user: { id: 1, prenom: 'Marie', nom: 'Laurent', role, email: 'marie@example.test' }, csrfToken: 'supplier-fixture' }
          : path === '/api/fournisseurs' ? state.rows
          : path === '/api/dashboard' ? { stockValue: 0, references: 0, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
          : []
        return route.fulfill({ status: 200, json })
      }
      const body = request.postDataJSON()
      state.writes.push({ path, method, body })
      assert.equal(request.headers()['x-csrf-token'], 'supplier-fixture')
      if (state.slow) await new Promise((resolveWrite) => { releaseWrite = resolveWrite })
      if (state.failure === 'network') return route.abort('connectionfailed')
      if (state.failure) return route.fulfill({ status: state.failure.status, json: state.failure.body })
      if (method === 'POST') {
        assert.equal(path, '/api/fournisseurs')
        const created = { ...body, id: Math.max(...state.rows.map(row => row.id)) + 1 }
        state.rows.push(created)
        return route.fulfill({ status: 201, json: created })
      }
      if (method === 'PUT') {
        const id = Number(path.split('/').at(-1))
        const updated = { ...state.rows.find(row => row.id === id), ...body }
        state.rows = state.rows.map(row => row.id === id ? updated : row)
        return route.fulfill({ status: 200, json: updated })
      }
      assert.fail(`Écriture inattendue : ${method} ${path}`)
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/fournisseurs`)
    await page.getByRole('cell', { name: 'Existant', exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    return { context, page, state }
  }

  const { context, page, state } = await setup('admin')
  const dialog = page.locator('dialog.supplier-modal')
  const createButton = page.getByRole('button', { name: 'Nouveau fournisseur', exact: true })
  const submit = dialog.locator('button[type="submit"]')
  check(!await dialog.isVisible(), 'Formulaire fermé à l’arrivée dans le module')
  check(await page.locator('form.form-card').count() === 0, 'Liste affichée sans formulaire intégré à la page')
  await page.screenshot({ path: resolve(output, 'liste-desktop.png'), fullPage: true })
  await createButton.click()
  check(await dialog.isVisible(), 'Nouveau fournisseur ouvre le dialogue')
  check(await page.locator('#nom').evaluate(input => input === document.activeElement), 'Focus initial sur le nom')
  check(await page.evaluate(() => document.body.style.overflow === 'hidden'), 'Défilement de la page bloqué sous le dialogue')
  check(await page.locator('#actif').isChecked(), 'Nouveau fournisseur actif par défaut')
  await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).focus()
  await page.keyboard.press('Shift+Tab')
  check(await submit.evaluate(button => button === document.activeElement), 'Focus contenu dans le dialogue')
  await page.keyboard.press('Tab')
  check(await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).evaluate(button => button === document.activeElement), 'Tabulation revient au premier contrôle')
  await dialog.locator('#nom').fill('Modification conservée')
  await page.mouse.click(5, 5)
  check(await dialog.isVisible() && await dialog.locator('#nom').inputValue() === 'Modification conservée' && state.writes.length === 0, 'Clic extérieur conserve la fenêtre et la saisie sans écriture')
  for (const close of ['Annuler', 'Fermer la fenêtre', 'Escape', 'keydown relayé']) {
    await page.locator('#nom').fill('Saisie annulée')
    if (close === 'Escape') await page.keyboard.press('Escape')
    else if (close === 'keydown relayé') await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    else await dialog.getByRole('button', { name: close, exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    check(await createButton.evaluate(button => button === document.activeElement), `Focus restitué après ${close}`)
    check(state.writes.length === 0, `Aucune écriture après ${close}`)
    check(await page.evaluate(() => document.body.style.overflow !== 'hidden'), `Défilement rétabli après ${close}`)
    await createButton.click()
    check(await page.locator('#nom').inputValue() === '', `Saisie annulée non réutilisée après ${close}`)
  }
  await page.keyboard.press('Escape')
  const editExisting = page.getByRole('button', { name: 'Modifier Existant', exact: true })
  await editExisting.click()
  for (const field of fields) check(await page.locator(`#${field}`).inputValue() === full[field], `Modification préremplie : ${field}`)
  check(await page.locator('#nom').inputValue() === 'Existant', 'Nom existant prérempli')
  check(await page.locator('#delaiLivraison').inputValue() === '0' && await page.locator('#modeLivraison').inputValue() === 'livraison', 'Livraison préremplie')
  await page.locator('#nom').fill('Brouillon')
  await page.locator('#actif').uncheck()
  await dialog.getByRole('button', { name: 'Rétablir', exact: true }).click()
  check(await page.locator('#nom').inputValue() === 'Existant' && await page.locator('#actif').isChecked(), 'Rétablir restaure les champs et le statut')
  await page.screenshot({ path: resolve(output, 'modification-light-1440.png'), fullPage: true })
  await page.keyboard.press('Escape')
  check(await editExisting.evaluate(button => button === document.activeElement), 'Focus restitué au bouton Modifier')
  await createButton.click()
  await submit.click()
  await dialog.locator('.error-summary').waitFor()
  check(await dialog.isVisible() && state.writes.length === 0, 'Nom obligatoire vérifié dans le dialogue avant API')
  await dialog.getByRole('button', { name: 'Effacer', exact: true }).click()
  check(await page.getByLabel('SIRET', { exact: true }).getAttribute('inputmode') === 'numeric', 'Clavier numérique pour le SIRET')
  await page.locator('#siret').fill('012345678901234')
  check(await page.locator('#siret').inputValue() === full.siret, 'SIRET limité à 14 caractères dans le navigateur')
  await page.locator('#siret').fill('')
  await page.locator('#nom').fill('Fournisseur minimal')
  await submit.click()
  await dialog.waitFor({ state: 'hidden' })
  await page.getByRole('cell', { name: 'Fournisseur minimal', exact: true }).waitFor()
  check(state.writes.length === 1, 'Création avec uniquement le nom')
  for (const field of fields) check(state.writes[0].body[field] === null, `Champ facultatif vide transmis : ${field}`)
  check(await page.locator('#nom').inputValue() === '', 'Formulaire réinitialisé après confirmation API')
  await page.reload()
  await page.getByRole('cell', { name: 'Fournisseur minimal', exact: true }).waitFor()
  check(await page.getByRole('cell', { name: 'Fournisseur minimal', exact: true }).count() === 1, 'Création relue sans doublon')

  await createButton.click()
  for (const [name, value] of Object.entries(full)) await page.locator(`#${name}`).fill(value)
  await page.locator('#actif').uncheck()
  await page.locator('#code').fill('  FOUR/01  ')
  await submit.click()
  await dialog.waitFor({ state: 'hidden' })
  await page.getByRole('cell', { name: full.nom, exact: true }).waitFor()
  check(state.rows.at(-1).telephone === full.telephone, 'Téléphone avec préfixe, espaces et parenthèses conservé')
  check(state.rows.at(-1).code === 'FOUR/01', 'Code normalisé avant création')
  check(state.rows.at(-1).siret === full.siret, 'SIRET transmis comme texte avec son zéro initial')
  check(state.rows.at(-1).actif === false, 'Statut inactif conservé à la création')
  check(await page.getByRole('cell', { name: full.siret, exact: true }).count() === 2, 'SIRET visible dans la liste')
  await page.getByRole('button', { name: `Modifier ${full.nom}`, exact: true }).click()
  check(await page.locator('#email').inputValue() === full.email, 'Coordonnées préremplies en modification')
  check(await page.locator('#siret').inputValue() === full.siret, 'SIRET prérempli en modification')
  check(!await page.locator('#actif').isChecked(), 'Statut inactif prérempli en modification')
  await page.locator('#siret').fill('00123456789012')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  await page.reload()
  await page.getByRole('button', { name: `Modifier ${full.nom}`, exact: true }).click()
  check(await page.locator('#siret').inputValue() === '00123456789012', 'SIRET modifié et relu sans perdre ses zéros initiaux')
  for (const field of fields) await page.locator(`#${field}`).fill('')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  for (const field of fields) check(state.rows.at(-1)[field] === null, `Champ effacé en modification : ${field}`)
  check(await page.locator('#nom').inputValue() === '', 'Création vide après modification')
  await page.reload()
  await page.getByRole('button', { name: `Modifier ${full.nom}`, exact: true }).click()
  check((await Promise.all(fields.map(field => page.locator(`#${field}`).inputValue()))).every(value => value === ''), 'Effacement conservé après relecture')
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()

  await createButton.click()
  check(await page.locator('#actif').isChecked(), 'Nouvelle création réinitialise le statut actif')
  await page.locator('#nom').fill('Saisie conservée')
  const writesBefore = state.writes.length
  for (const [field, value] of [['siret', '0123456789012'], ['siret', '0123456789012A'], ['email', 'invalide'], ['telephone', 'abc123'], ['code', 'CODE AVEC ESPACE'], ['codePostal', 'ABC'], ['delaiLivraison', '1.5']]) {
    await page.locator(`#${field}`).fill(value)
    await submit.click()
    await page.locator('.error-summary').waitFor()
    check(await page.locator(`#${field}`).getAttribute('aria-invalid') === 'true', `Erreur reliée au champ ${field}`)
    check(state.writes.length === writesBefore, `Format invalide bloqué avant API : ${field}`)
    await page.locator(`#${field}`).fill(field === 'delaiLivraison' ? '0' : '')
  }
  await page.locator('#siret').evaluate(input => input.removeAttribute('maxlength'))
  await page.locator('#siret').fill('012345678901234')
  await submit.click()
  check(await page.locator('#siret').getAttribute('aria-invalid') === 'true' && state.writes.length === writesBefore, 'SIRET trop long refusé même sans limite HTML')
  await page.locator('#siret').fill('')
  await page.locator('#siret').evaluate(input => input.setAttribute('maxlength', '14'))

  for (const failure of [
    { status: 422, body: { error: 'VALIDATION_ERROR', message: 'Donnees invalides.', details: { email: "Format d'email invalide.", code: 'Le code fournisseur contient des caracteres interdits.' } } },
    { status: 409, body: { error: 'ALREADY_EXISTS', message: 'Déjà présent' } },
    { status: 403, body: { error: 'FORBIDDEN', message: 'Refus' } },
    { status: 503, body: { error: 'DATABASE_UNAVAILABLE', message: 'Indisponible' } },
    'network',
  ]) {
    state.failure = failure
    const count = state.rows.length
    await submit.click()
    await page.locator('.error-banner').waitFor()
    await page.waitForFunction(() => !document.querySelector('.supplier-form-fields').disabled)
    check(await dialog.isVisible(), `Dialogue conservé après ${failure.status ?? failure}`)
    check(await page.locator('#nom').inputValue() === 'Saisie conservée', `Saisie conservée après ${failure.status ?? failure}`)
    check(state.rows.length === count && await page.getByRole('cell', { name: 'Saisie conservée', exact: true }).count() === 0, `Aucun faux succès après ${failure.status ?? failure}`)
    if (failure.status === 422) {
      const message = await page.locator('.error-banner').textContent()
      check(message.includes("Format d'email invalide.") && message.includes('code fournisseur'), 'Détails de validation serveur affichés')
      check(!message.includes('Donnees invalides.'), 'Message générique remplacé par les causes précises')
      await page.screenshot({ path: resolve(output, 'erreur-detaillee.png'), fullPage: true })
    }
  }
  state.failure = null
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await createButton.click()
  check(await dialog.locator('.error-banner').count() === 0, 'Ancienne erreur non réaffichée à la réouverture')
  await page.locator('#nom').fill('Saisie conservée')
  state.slow = true
  const beforeSlow = state.writes.length
  await submit.click()
  await page.waitForFunction(() => document.querySelector('.supplier-form-fields').disabled)
  check(await submit.isDisabled(), 'Bouton Ajouter bloqué pendant la sauvegarde')
  check(await page.getByRole('button', { name: 'Effacer', exact: true }).isDisabled(), 'Effacement bloqué pendant la sauvegarde')
  check(await page.locator('#nom').isDisabled(), 'Champs bloqués pendant la sauvegarde')
  check(await dialog.getByRole('button', { name: 'Annuler', exact: true }).isDisabled(), 'Annulation bloquée pendant la sauvegarde')
  check(await dialog.getByRole('button', { name: 'Fermer la fenêtre', exact: true }).isDisabled(), 'Croix bloquée pendant la sauvegarde')
  await page.keyboard.press('Escape')
  await page.mouse.click(5, 5)
  await dialog.locator('form').dispatchEvent('submit', { bubbles: true, cancelable: true })
  check(await dialog.isVisible() && state.writes.length === beforeSlow + 1, 'Échap, fond et double envoi sans effet pendant la sauvegarde')
  assert.ok(releaseWrite)
  state.slow = false
  releaseWrite()
  await dialog.waitFor({ state: 'hidden' })
  await page.getByRole('cell', { name: 'Saisie conservée', exact: true }).waitFor()
  check(state.writes.length === beforeSlow + 1, 'Une requête pour la sauvegarde lente')
  for (const notification of await page.getByRole('button', { name: 'Fermer la notification', exact: true }).all()) await notification.click()

  await createButton.click()
  for (const theme of ['light', 'dark']) {
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1100 })
      await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme)
      await page.evaluate(() => Promise.all(document.getAnimations()
        .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map(animation => animation.finished.catch(() => {}))))
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Aucun débordement global ${theme} ${width}`)
      check(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth && element.getBoundingClientRect().width <= innerWidth), `Dialogue adapté ${theme} ${width}`)
      await submit.scrollIntoViewIfNeeded()
      const button = await submit.boundingBox()
      check(button && button.y >= 0 && button.y + button.height <= 1100, `Ajout accessible ${theme} ${width}`)
      if (width === 375 || width === 1440) {
        if (width === 1440) await dialog.evaluate(element => { element.scrollTop = 0 })
        await page.screenshot({ path: resolve(output, `creation-${theme}-${width}.png`), fullPage: true })
      }
    }
  }
  await page.keyboard.press('Escape')
  state.rows[0].nom = 'F'.repeat(128)
  await page.reload()
  await page.setViewportSize({ width: 375, height: 1100 })
  await page.getByRole('button', { name: `Modifier ${state.rows[0].nom}`, exact: true }).click()
  check(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), 'Nom fournisseur long sans débordement du dialogue')
  await page.keyboard.press('Escape')
  await context.close()
  for (const role of ['magasinier', 'caissier']) {
    const session = await setup(role)
    const edit = session.page.getByRole('button', { name: 'Modifier Existant', exact: true })
    if (role === 'magasinier') {
      await session.page.getByRole('button', { name: 'Nouveau fournisseur', exact: true }).click()
      await session.page.locator('#nom').fill('Création magasinier')
      await session.page.getByRole('button', { name: 'Ajouter le fournisseur', exact: true }).click()
      await session.page.getByRole('cell', { name: 'Création magasinier', exact: true }).waitFor()
      check(session.state.writes.length === 1, 'Création disponible pour le magasinier')
    } else {
      check(await session.page.locator('dialog.supplier-modal').count() === 0, 'Dialogue absent pour le caissier')
      check(await session.page.getByRole('button', { name: 'Nouveau fournisseur', exact: true }).isDisabled(), 'Création désactivée pour le caissier')
      check(await edit.isDisabled(), 'Modification désactivée pour le caissier')
      check(await session.page.getByRole('button', { name: 'Supprimer Existant', exact: true }).isDisabled(), 'Suppression désactivée pour le caissier')
    }
    await session.context.close()
  }
  check(errors.length === 0, 'Aucune erreur JavaScript')
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ scope: 'Chromium et build de production ; API simulée ; aucune écriture MariaDB', checks, errors }, null, 2) + '\n')
  console.log(`${checks.length} contrôles Chromium fournisseurs réussis.`)
} finally {
  releaseWrite?.()
  await browser?.close()
  await new Promise(resolveClose => server ? server.httpServer.close(resolveClose) : resolveClose())
}
