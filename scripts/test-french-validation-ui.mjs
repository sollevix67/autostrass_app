/** npm run build puis node scripts/test-french-validation-ui.mjs.
 * Chromium en anglais ; API simulée. PLAYWRIGHT_MODULE accepte un module externe.
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = resolve('specs/screenshots/validation-fr')
const checks = [], errors = [], writes = []
const rows = [{ id: 1, code: 'A', libelle: 'Allée principale', niveau: 'allee', parentId: null, capacite: 0, actif: true, chemin: 'A', quantite: 0 }]
let server, browser
function check(condition, label) { assert.ok(condition, label); checks.push(label) }

try {
  await mkdir(output, { recursive: true })
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, args: ['--lang=en-US'] })
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'GET') {
      const json = path === '/api/auth/me' ? { user: { id: 1, prenom: 'Marie', nom: 'Test', role: 'admin', email: 'test@example.test' }, csrfToken: 'validation-fixture' }
        : path === '/api/emplacements' ? rows
        : path === '/api/dashboard' ? { stockValue: 0, references: 0, lowStock: 0, pendingOrders: 0, lowStockItems: [], activity: [] }
        : []
      return route.fulfill({ status: 200, json })
    }
    const body = request.postDataJSON()
    assert.equal(request.headers()['x-csrf-token'], 'validation-fixture')
    assert.ok(path.startsWith('/api/emplacements'))
    writes.push({ method: request.method(), body })
    if (request.method() === 'POST') {
      const row = { ...body, id: rows.length + 1, parentId: body.parent_id, chemin: `A / ${body.code}`, quantite: 0 }
      rows.push(row)
      return route.fulfill({ status: 201, json: row })
    }
    assert.equal(request.method(), 'PUT')
    return route.fulfill({ status: 200, json: { ...rows[0], ...body } })
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}/parametres/emplacements`)
  const create = page.getByRole('button', { name: 'Nouvel emplacement', exact: true })
  await create.click()
  const dialog = page.locator('dialog.emplacement-dialog')
  const submit = dialog.getByRole('button', { name: 'Enregistrer', exact: true })
  const code = page.locator('#emplacement-code')
  const parent = page.locator('#emplacement-parent')
  const capacity = page.locator('#emplacement-capacite')
  const message = (field) => field.evaluate((control) => control.validationMessage)
  check(await page.evaluate(() => navigator.language === 'en-US'), 'Navigateur configuré en anglais')
  check(await page.locator('html').getAttribute('lang') === 'fr', 'Document déclaré en français')
  await submit.click()
  check(await message(code) === 'Veuillez renseigner ce champ.', 'Code obligatoire en français')
  check(await code.evaluate((control) => document.activeElement === control), 'Focus natif sur le premier champ invalide')
  await code.fill('RECEP')
  await page.locator('#emplacement-libelle').fill('Étagère réception')
  await page.locator('#emplacement-niveau').selectOption('etagere')
  await submit.click()
  check(await message(parent) === 'Veuillez sélectionner un élément dans la liste.', 'Bulle du signalement traduite en français')
  check(writes.length === 0, 'Aucun enregistrement sans parent')
  await code.focus()
  await code.press('Enter')
  check(await message(parent) === 'Veuillez sélectionner un élément dans la liste.', 'Validation en français également à la touche Entrée')
  check(await parent.evaluate((control) => document.activeElement === control), 'Focus sur le parent après soumission au clavier')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(output, 'emplacement-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 375, height: 900 })
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
  await submit.click()
  check(await message(parent) === 'Veuillez sélectionner un élément dans la liste.', 'Même message sur mobile en thème sombre')
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Aucun débordement horizontal mobile')
  await page.screenshot({ path: resolve(output, 'emplacement-mobile-dark.png'), fullPage: true })
  await parent.selectOption('1')
  check(await parent.evaluate((control) => control.validity.valid), 'Choisir le parent efface l’erreur personnalisée')
  await capacity.fill('-1')
  await submit.click()
  check(await message(capacity) === 'Veuillez saisir une valeur supérieure ou égale à 0.', 'Capacité négative refusée en français')
  await capacity.fill('1.5')
  await submit.click()
  check(await message(capacity) === 'Veuillez saisir une valeur respectant le pas de 1.', 'Capacité fractionnaire refusée en français')
  check(writes.length === 0, 'Aucune écriture pour les capacités invalides')
  await capacity.fill('10')
  await submit.click()
  await dialog.waitFor({ state: 'hidden' })
  check(writes.length === 1 && writes[0].body.parent_id === 1 && writes[0].body.capacite === 10, 'Enregistrement réussi dès la correction des champs')
  await create.click()
  await code.fill('X'.repeat(33))
  await submit.click()
  const schemaMessage = await dialog.locator('[role="alert"]').innerText()
  check(/Trop grand/.test(schemaMessage) && !/Too big|expected|string/.test(schemaMessage), 'Message de longueur Zod par défaut en français')
  await code.fill('')
  await submit.click()
  await dialog.getByRole('button', { name: 'Annuler', exact: true }).click()
  await page.getByRole('button', { name: 'Modifier A', exact: true }).click()
  await submit.click()
  await dialog.waitFor({ state: 'hidden' })
  check(writes.length === 2 && writes[1].method === 'PUT', 'Annuler puis modifier ne conserve aucune erreur bloquante')

  // Contrôles HTML réels dans le document de l’application, avec ses écouteurs globaux.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.evaluate(() => {
    const form = document.createElement('form')
    form.id = 'native-validation-fixture'
    form.addEventListener('submit', (event) => { event.preventDefault(); form.dataset.submitted = 'yes' })
    document.body.append(form)
  })
  async function fixture(html) {
    await page.locator('#native-validation-fixture').evaluate((form, markup) => { form.innerHTML = markup; form.removeAttribute('data-submitted'); form.noValidate = false }, html)
    return page.locator('#native-validation-fixture').locator('input, select, textarea').first()
  }
  async function invalid(field, expected, label) {
    check(!await field.evaluate((control) => control.checkValidity()), `${label} : valeur refusée`)
    check(await message(field) === expected, `${label} : message français`)
  }
  const cases = [
    ['<input required>', '', 'Veuillez renseigner ce champ.', 'Texte obligatoire'],
    ['<textarea required></textarea>', '', 'Veuillez renseigner ce champ.', 'Zone de texte obligatoire'],
    ['<input type="email">', 'invalide', 'Veuillez saisir une adresse e-mail valide.', 'Adresse e-mail'],
    ['<input type="url">', 'invalide', 'Veuillez saisir une adresse URL valide.', 'Adresse URL'],
    ['<input pattern="[0-9]{3}">', 'abc', 'Veuillez respecter le format demandé.', 'Format imposé'],
    ['<input type="number" max="10">', '11', 'Veuillez saisir une valeur inférieure ou égale à 10.', 'Borne supérieure'],
    ['<input type="number" step="0.5">', '0.3', 'Veuillez saisir une valeur respectant le pas de 0.5.', 'Pas décimal'],
    ['<input minlength="4">', 'abc', 'Veuillez saisir au moins 4 caractères.', 'Longueur minimale'],
  ]
  for (const [html, value, expected, label] of cases) {
    const field = await fixture(html)
    await field.fill(value)
    await invalid(field, expected, label)
  }
  let field = await fixture('<input>')
  await field.fill('abcdef')
  await field.evaluate((control) => { control.maxLength = 3 })
  await invalid(field, 'Veuillez saisir au maximum 3 caractères.', 'Longueur maximale')
  field = await fixture('<input type="number">')
  await field.pressSequentially('e')
  await invalid(field, 'Veuillez saisir un nombre valide.', 'Saisie numérique incomplète')
  field = await fixture('<input type="checkbox" required>')
  await invalid(field, 'Veuillez cocher cette case.', 'Case obligatoire')
  await field.check()
  check(await field.evaluate((control) => control.checkValidity()), 'Case cochée immédiatement valide')
  field = await fixture('<input type="file" required>')
  await invalid(field, 'Veuillez sélectionner un fichier.', 'Fichier obligatoire')
  await field.setInputFiles({ name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('test') })
  check(await field.evaluate((control) => control.checkValidity()), 'Fichier sélectionné immédiatement valide')
  field = await fixture('<input type="radio" name="choice" required><input type="radio" name="choice" required>')
  check(!await page.locator('#native-validation-fixture').evaluate((form) => form.checkValidity()), 'Groupe radio obligatoire refusé')
  check(await message(field) === 'Veuillez sélectionner une option.', 'Groupe radio en français')
  await page.locator('#native-validation-fixture input').nth(1).check()
  check(await page.locator('#native-validation-fixture').evaluate((form) => form.checkValidity()), 'Choisir un autre bouton radio libère tout le groupe')
  field = await fixture('<input required value="Valeur initiale">')
  await field.fill('')
  await invalid(field, 'Veuillez renseigner ce champ.', 'Avant réinitialisation')
  await page.locator('#native-validation-fixture').evaluate((form) => form.reset())
  check(await field.evaluate((control) => control.checkValidity()), 'Réinitialiser le formulaire efface les traductions obsolètes')
  await field.evaluate((control) => control.setCustomValidity('Erreur métier existante.'))
  check(!await field.evaluate((control) => control.checkValidity()) && await message(field) === 'Erreur métier existante.', 'Une erreur métier existante reste prioritaire')
  await field.fill('Autre saisie')
  check(await message(field) === 'Erreur métier existante.', 'La saisie ne supprime pas une erreur métier externe')
  field = await fixture('<input required>')
  await field.evaluate((control) => control.checkValidity())
  await field.evaluate((control) => control.setCustomValidity('Nouvelle erreur métier.'))
  await field.fill('Autre saisie')
  check(await message(field) === 'Nouvelle erreur métier.', 'Une erreur métier remplaçant une traduction reste intacte')
  await fixture('<input required>')
  await page.locator('#native-validation-fixture').evaluate((form) => { form.noValidate = true; form.requestSubmit() })
  check(await page.locator('#native-validation-fixture').getAttribute('data-submitted') === 'yes', 'Les formulaires noValidate gardent leur validation applicative')
  check(errors.length === 0, 'Aucune erreur JavaScript')
  const report = { locale: 'en-US', checks, writes: writes.length, schemaMessage, errors, api: 'simulée, aucune écriture MariaDB' }
  await writeFile(resolve(output, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`${checks.length} contrôles réussis ; navigateur anglais, messages français ; aucune écriture MariaDB.`)
} finally {
  await browser?.close()
  await new Promise((done, reject) => server ? server.httpServer.close((error) => error ? reject(error) : done()) : done())
}
