/** Paramètres/PDF purs et stockage temporaire ; aucune API ni base métier. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, writeFile, rename, mkdir, rmdir, readdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import pdfmake from 'pdfmake'
import {
  DEFAULT_DOCUMENTS_PDF_SETTINGS, DOCUMENTS_PDF_LIMITS, documentsPdfSettingsSchema,
  type DocumentsPdfSettings, type DocumentsPdfLogo,
} from '../src/schemas/parametres.js'
import { validateDocumentsPdfSettings, prepareDocumentsPdfLogo } from '../server/services/documentsPdfSettings.js'
import { generateVentePdf, type VenteForPdf } from '../server/services/pdfInvoice.js'
import { generateDevisPdf } from '../server/services/pdfDevis.js'
import { createDocumentsPdfPreviewDocument, generateDocumentsPdfPreview } from '../server/services/pdfPreview.js'
import type { DevisRow } from '../server/repositories/devisRepository.js'
import { assertCommercialPages, assertLabeledPdfValue, capturePdfDefinitions, renderedPdfPages, verifyPdf } from './lib/pdf-assertions.js'
import { makePng, makePngLogo, makeJpegLogo, makePalettePng, pngAtByteLength } from './lib/image-fixtures.js'
import { textFromPdf } from './lib/pdf-buffer-text.js'
import { rgbaFromPng, rgbaImagesFromPdf } from './lib/pdf-buffer-images.js'

const directory = await mkdtemp(join(tmpdir(), 'openstrass-documents-unit-'))
const settingsPath = join(directory, 'settings.json')
process.env.AUTOSTRASS_SETTINGS_FILE = settingsPath
process.env.DB_HOST = '127.0.0.1'
process.env.DB_PORT = '1'
process.env.DB_USER = 'unit'
process.env.DB_PASSWORD = 'unit'
process.env.DB_NAME = 'unit'
await writeFile(settingsPath, '{}')
const { getSettings, updateSettings, settingsFile, publicSettings } = await import('../server/services/settingsStore.js')
const capture = capturePdfDefinitions()
let groups = 0
const passed = (label: string) => { groups += 1; console.log(`OK ${label}`) }
const custom: DocumentsPdfSettings = {
  ...DEFAULT_DOCUMENTS_PDF_SETTINGS, nomEmetteur: 'EMETTEUR_TEST', activite: 'ACTIVITE_TEST',
  coordonnees: 'COORDONNEE_TEST_1\nCOORDONNEE_TEST_2', piedCommun: 'PIED_TEST_1\nPIED_TEST_2', logo: makePngLogo(),
}
const vente: VenteForPdf = {
  id: 42, clientId: null, dateVente: '2026-11-21T10:00:00Z', caissier: 'Auteur fictif',
  articles: [{ reference: 'REF-001', designation: 'Article de recette', quantite: 2, prixUnitaire: 12.5, tauxTva: 20 }],
  totalHT: 25, totalTVA: 5, totalTTC: 30, montantPaye: 40, monnaie: 10, modePaiement: 'espèces',
}
const devis: DevisRow = {
  id: 7, numero: '20261121-D-abcDEF', clientId: 1, dateDevis: '2026-11-21', dateValidite: '2026-12-21',
  clientSnapshot: { nom: 'Client fictif', prenom: 'Camille', email: 'client@example.test', telephone: '0100000000', adresse: '10 rue de l’Exemple', ville: 'Strasbourg', codePostal: '67000', numeroClient: '000017', siret: null, typeClient: 'particulier' },
  notes: null, statut: 'brouillon', version: 1, commandeId: null,
  articles: [{ ligne: 1, reference: 'REF-001', designation: 'Article de recette', quantite: 2, prixUnitaire: 12.5, tauxTva: 20, montant: 25, montantTVA: 5, montantTTC: 30 }],
  totalHT: 25, totalTVA: 5, totalTTC: 30, createdAt: '2026-11-21T10:00:00Z', updatedAt: '2026-11-21T10:00:00Z',
}

async function inspect(buffer: Buffer, numero: string) {
  verifyPdf(buffer)
  const record = capture.latest()
  const pages = await renderedPdfPages(record.output)
  assertCommercialPages(pages, numero)
  return { ...record, pages, text: textFromPdf(buffer).join('\n') }
}

try {
  assert.deepEqual(getSettings().documentsPdf, DEFAULT_DOCUMENTS_PDF_SETTINGS)
  assert.equal(await readFile(settingsPath, 'utf8'), '{}', 'La lecture historique ne réécrit pas la configuration')
  assert.deepEqual(publicSettings().documentsPdf, DEFAULT_DOCUMENTS_PDF_SETTINGS)
  const absentPath = join(directory, 'absent.json')
  const probe = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "import {existsSync} from 'node:fs'; const {getSettings,settingsFile}=await import('./server/services/settingsStore.ts'); console.log(JSON.stringify({documents:getSettings().documentsPdf,file:existsSync(settingsFile)}))"], {
    cwd: resolve('.'), env: { ...process.env, AUTOSTRASS_SETTINGS_FILE: absentPath }, windowsHide: true, encoding: 'utf8',
  })
  assert.equal(probe.status, 0, probe.stderr)
  const absence = JSON.parse(probe.stdout)
  assert.deepEqual(absence.documents, DEFAULT_DOCUMENTS_PDF_SETTINGS)
  assert.equal(absence.file, false)
  assert.equal(existsSync(absentPath), false)
  passed('Defaults compatibles avec fichier absent et ancien JSON, sans migration ni écriture automatique')

  const normalized = validateDocumentsPdfSettings({ ...custom, nomEmetteur: '  Émetteur  ', activite: 'Activite\tde test', coordonnees: 'Ligne 1\r\nLigne 2', piedCommun: 'Pied 1\u2028Pied 2' })
  assert.equal(normalized.nomEmetteur, 'Émetteur')
  assert.equal(normalized.activite, 'Activite de test')
  assert.equal(normalized.coordonnees, 'Ligne 1\nLigne 2')
  assert.equal(normalized.piedCommun, 'Pied 1\nPied 2')
  for (const input of [
    { ...custom, nomEmetteur: '' }, { ...custom, nomEmetteur: 'A'.repeat(81) },
    { ...custom, activite: 'A'.repeat(181) }, { ...custom, nomEmetteur: 'A\nB' },
    { ...custom, coordonnees: Array(9).fill('Ligne').join('\n') }, { ...custom, piedCommun: Array(7).fill('Pied').join('\n') },
    { ...custom, coordonnees: 'A'.repeat(121) }, { ...custom, piedCommun: 'A'.repeat(101) },
    { ...custom, activite: 'A\u202eB' }, { ...custom, piedCommun: 'A\u0000B' }, { ...custom, inattendu: true },
  ]) assert.throws(() => validateDocumentsPdfSettings(input))
  passed('Normalisation des textes et refus des limites, contrôles invisibles, lignes excédentaires et clés inconnues')

  const jpeg = await makeJpegLogo()
  for (const logo of [custom.logo!, jpeg, makePngLogo(1024, 1), makePngLogo(1, 1024)]) {
    validateDocumentsPdfSettings({ ...custom, logo })
    const prepared = prepareDocumentsPdfLogo(logo)
    assert.ok(prepared.width > 0 && prepared.height > 0 && prepared.width <= 1024 && prepared.height <= 1024)
  }
  const exact = pngAtByteLength(DOCUMENTS_PDF_LIMITS.logoOctets)
  assert.equal(exact.length, DOCUMENTS_PDF_LIMITS.logoOctets)
  const prepared = prepareDocumentsPdfLogo({ mimeType: 'image/png', data: exact.toString('base64') })
  assert.ok(Buffer.from(prepared.dataUri.split(',')[1], 'base64').length < exact.length, 'Les annexes PNG ne sont pas transmises au PDF')
  passed('PNG/JPEG réels, dimensions limites et 256 KiB acceptés ; annexes PNG retirées du rendu')

  for (const depth of [1, 2, 4] as const) {
    for (const fixture of [makePalettePng(depth), makePalettePng(depth, 9, 9, true, true)]) {
      const preparedPalette = prepareDocumentsPdfLogo(fixture.logo)
      const decoded = rgbaFromPng(Buffer.from(preparedPalette.dataUri.split(',')[1], 'base64'))
      assert.deepEqual(decoded, { width: fixture.width, height: fixture.height, rgba: fixture.rgba })
      const buffer = await generateDocumentsPdfPreview({ ...custom, logo: fixture.logo })
      verifyPdf(buffer)
      const images = rgbaImagesFromPdf(buffer)
      assert.equal(images.length, 1)
      assert.deepEqual(images[0], decoded, 'Pixels et alpha du PNG conservés dans le vrai PDF')
    }
  }
  passed('Palettes PNG 1/2/4 bits + tRNS, dont Adam7 : pixels/alpha exacts dans l’image préparée et le PDF réel, huit pixels opaques préservés')

  const corrupt = makePng(); corrupt[corrupt.length - 2] ^= 255
  const invalidLogos = [
    { mimeType: 'image/png', data: corrupt.toString('base64') },
    { mimeType: 'image/png', data: makePng().subarray(0, 30).toString('base64') },
    { mimeType: 'image/png', data: Buffer.from('not-an-image').toString('base64') },
    { mimeType: 'image/png', data: jpeg.data },
    { mimeType: 'image/jpeg', data: makePng().toString('base64') },
    { mimeType: 'image/png', data: makePng(1025, 1).toString('base64') },
    { mimeType: 'image/png', data: pngAtByteLength(DOCUMENTS_PDF_LIMITS.logoOctets + 1).toString('base64') },
    { mimeType: 'image/svg+xml', data: Buffer.from('<svg/>').toString('base64') },
    { mimeType: 'image/png', data: Buffer.from('<svg><image href="file:///x"/></svg>').toString('base64') },
    { mimeType: 'image/png', data: 'https://example.test/logo.png' },
    { mimeType: 'image/png', data: makePng().toString('base64'), filePath: 'package.json' },
  ]
  for (const logo of invalidLogos) assert.throws(() => validateDocumentsPdfSettings({ ...custom, logo: logo as DocumentsPdfLogo }))
  passed('Corruption, troncature, type usurpé, dépassements, URL, fichier et SVG refusés')

  const sources = structuredClone({ vente, devis, custom })
  const invoice = await inspect(await generateVentePdf(vente, null, custom), '000042')
  const quote = await inspect(await generateDevisPdf(devis, custom), devis.numero)
  for (const result of [invoice, quote]) {
    for (const marker of ['EMETTEUR_TEST', 'ACTIVITE_TEST', 'COORDONNEE_TEST_1', 'COORDONNEE_TEST_2', 'PIED_TEST_1', 'PIED_TEST_2']) assert.ok(result.text.includes(marker))
    assertLabeledPdfValue(result.definition, 'Total HT', '25,00 EUR')
    assertLabeledPdfValue(result.definition, 'TVA', '5,00 EUR')
    assertLabeledPdfValue(result.definition, 'Total TTC', '30,00 EUR')
    assert.ok(result.pages.every((page) => page.images.length === 1 && page.images[0].width <= 120.5 && page.images[0].height <= 48.5))
  }
  assert.ok(invoice.text.includes('Montant reçu : 40,00 EUR') && invoice.text.includes('Monnaie rendue : 10,00 EUR') && invoice.text.includes('Auteur fictif'))
  assert.ok(quote.text.includes('Client fictif') && quote.text.includes('000017'))
  assert.deepEqual({ vente, devis, custom }, sources)
  passed('Facture/devis personnalisés : textes/logo présents, montants/source/client/auteur/reçu/rendu intacts')

  const previewSource = createDocumentsPdfPreviewDocument()
  const previewBefore = structuredClone(previewSource)
  const preview = await inspect(await generateDocumentsPdfPreview(custom), 'APERÇU')
  assert.ok(preview.text.includes('Client de démonstration') && preview.text.includes('EXEMPLE-001'))
  assertLabeledPdfValue(preview.definition, 'Total TTC', '40,55 EUR')
  assert.deepEqual(createDocumentsPdfPreviewDocument(), previewBefore)
  assert.equal(await readFile(settingsPath, 'utf8'), '{}')
  passed('Aperçu fictif sans base disponible, mutation de paramètres ni création de document métier')

  const maximum: DocumentsPdfSettings = {
    nomEmetteur: 'W'.repeat(80), activite: 'M'.repeat(180), logo: makePngLogo(),
    coordonnees: Array.from({ length: 8 }, (_, index) => `COORD_${String(index + 1).padStart(2, '0')}_` + 'W'.repeat(111)).join('\n'),
    piedCommun: Array.from({ length: 6 }, (_, index) => `FOOT_${String(index + 1).padStart(2, '0')}_` + 'W'.repeat(92)).join('\n'),
  }
  assert.ok(documentsPdfSettingsSchema.safeParse(maximum).success)
  const long = { ...vente, articles: Array.from({ length: 80 }, (_, index) => ({ ...vente.articles[0], reference: `REF-${String(index).padStart(3, '0')}` })), totalHT: 2000, totalTVA: 400, totalTTC: 2400 }
  const heavy = await inspect(await generateVentePdf(long, null, maximum), '000042')
  assert.ok(heavy.pages.length > 1)
  const margins = heavy.definition.pageMargins as number[]
  for (const page of heavy.pages) {
    const headerText = page.texts.filter((text) => text.y < margins[1]).map((text) => text.text).join('')
    const footerText = page.texts.filter((text) => text.y >= page.height - margins[3]).map((text) => text.text).join('')
    assert.equal((headerText.match(/W/g) ?? []).length, 80)
    assert.equal((headerText.match(/M/g) ?? []).length, 180)
    assert.equal((footerText.match(/W/g) ?? []).length, 552)
    for (let index = 1; index <= 6; index += 1) assert.ok(footerText.includes(`FOOT_${String(index).padStart(2, '0')}_`))
  }
  const allText = heavy.pages.flatMap((page) => page.texts).map((text) => text.text).join('')
  assert.equal((allText.match(/W/g) ?? []).length, 888 + 80 + heavy.pages.length * (80 + 552))
  passed('Maximum de textes larges + logo et 80 lignes : aucun caractère perdu, en-tête/pied complets sur chaque page et marges sûres')

  await Promise.all([
    updateSettings((value) => ({ ...value, documentsPdf: custom }), 1),
    updateSettings((value) => ({ ...value, api: { maxRequests: 400, windowSeconds: 900 } }), 2),
  ])
  assert.deepEqual(getSettings().documentsPdf, custom)
  assert.equal(getSettings().api.maxRequests, 400)
  assert.deepEqual(JSON.parse(await readFile(settingsFile, 'utf8')), getSettings())
  const immediate = await inspect(await generateDevisPdf(devis, getSettings().documentsPdf), devis.numero)
  assert.ok(immediate.text.includes('EMETTEUR_TEST'))
  const next = { ...custom, nomEmetteur: 'EMETTEUR_APRES_SAVE', logo: jpeg }
  await updateSettings((value) => ({ ...value, documentsPdf: next }), 3)
  const changed = await inspect(await generateDevisPdf(devis, getSettings().documentsPdf), devis.numero)
  assert.ok(changed.text.includes('EMETTEUR_APRES_SAVE') && !changed.text.includes('EMETTEUR_TEST'))
  passed('Stockage concurrent préservé, lecture à chaud sans redémarrage et changement de logo appliqué')

  const beforeInvalid = getSettings()
  for (const logo of invalidLogos.slice(0, 7)) {
    await assert.rejects(updateSettings((value) => ({ ...value, documentsPdf: { ...next, logo: logo as DocumentsPdfLogo } }), 1))
    assert.deepEqual(getSettings(), beforeInvalid)
    assert.deepEqual(JSON.parse(await readFile(settingsFile, 'utf8')), beforeInvalid)
  }
  passed('Réglages invalides : aucun changement partiel en mémoire ni sur disque')

  const savedBytes = await readFile(settingsPath)
  await rename(settingsPath, `${settingsPath}.backup`)
  await mkdir(settingsPath)
  try {
    await assert.rejects(updateSettings((value) => ({ ...value, documentsPdf: custom }), 4), /Impossible de sauvegarder/)
    assert.deepEqual(getSettings(), beforeInvalid)
  } finally {
    await rmdir(settingsPath)
    await rename(`${settingsPath}.backup`, settingsPath)
  }
  assert.deepEqual(await readFile(settingsPath), savedBytes)
  assert.ok(!(await readdir(directory)).some((name) => name.endsWith('.tmp')))
  passed('Échec de sauvegarde : état antérieur conservé et fichiers temporaires nettoyés')

  let downloads = 0
  const server = createServer((_request, response) => { downloads += 1; response.writeHead(500).end() })
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  const address = server.address(); assert.ok(address && typeof address !== 'string')
  try {
    await assert.rejects(pdfmake.createPdf({ content: [{ image: 'external' }], images: { external: `http://127.0.0.1:${address.port}/logo.png` } }).getBuffer(), /Access to URL denied/)
    await assert.rejects(pdfmake.createPdf({ content: [{ image: resolve('package.json') }] }).getBuffer(), /Access to local file denied/)
    assert.equal(downloads, 0)
    verifyPdf(await generateVentePdf(vente, null, next))
  } finally { await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose())) }
  passed('Après personnalisation/logo : URL et fichiers arbitraires toujours refusés avant accès')
  console.log(`${groups} groupes unitaires Documents PDF réussis, configuration exclusivement temporaire.`)
} finally {
  capture.restore()
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await rmdir(path)
    else await unlink(path)
  }
  assert.ok(basename(directory).startsWith('openstrass-documents-unit-'))
  await rmdir(directory)
}
