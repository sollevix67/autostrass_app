/** Génération réelle et accès aux ressources PDF, sans API ni base de données. */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import pdfmake from 'pdfmake'
import { generateVentePdf, type VenteForPdf } from '../server/services/pdfInvoice.js'
import { assertCommercialPages, assertLabeledPdfValue, capturePdfDefinitions, renderedPdfPages, visiblePdfDefinition } from './lib/pdf-assertions.js'

const vente: VenteForPdf = {
  id: 42,
  clientId: null,
  dateVente: '2026-11-07',
  caissier: 'Caissier de recette',
  articles: [{ reference: 'BRK-0428', designation: 'Plaquettes de frein', quantite: 2, prixUnitaire: 12.5, tauxTva: 20 }],
  totalHT: 25,
  totalTVA: 5,
  totalTTC: 30,
  montantPaye: 30,
  monnaie: 0,
  modePaiement: 'carte',
}

function verifyPdf(buffer: Buffer) {
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-')
  assert.match(buffer.subarray(-32).toString(), /%%EOF/)
  assert.match(buffer.toString('latin1'), /\/BaseFont \/[A-Z]+\+Roboto/)
}

const warnings: unknown[][] = []
const originalWarn = console.warn
const capture = capturePdfDefinitions()
let downloads = 0
const server = createServer((_request, response) => {
  downloads += 1
  response.writeHead(500).end()
})

try {
  console.warn = (...args) => { warnings.push(args) }
  const source = structuredClone(vente)
  verifyPdf(await generateVentePdf(vente, null))
  const baseDefinition = capture.latest().definition
  const baseText = visiblePdfDefinition(baseDefinition)
  for (const value of ['FACTURE', '000042', 'Client de passage', '07/11/2026', vente.caissier, 'Mode de paiement : carte', 'Montant reçu : 30,00 EUR', 'Monnaie rendue : 0,00 EUR']) assert.ok(baseText.includes(value), `La facture doit conserver ${value}`)
  assertLabeledPdfValue(baseDefinition, 'Total HT', '25,00 EUR')
  assertLabeledPdfValue(baseDefinition, 'TVA', '5,00 EUR')
  assertLabeledPdfValue(baseDefinition, 'Total TTC', '30,00 EUR')
  assert.deepEqual(vente, source, 'La présentation ne modifie pas la vente source')
  const mixed = { ...vente, articles: [...vente.articles, { reference: 'TVA-055', designation: 'Taux réduit', quantite: 1, prixUnitaire: 10, tauxTva: 5.5 }], totalHT: 35, totalTVA: 5.55, totalTTC: 40.55, montantPaye: 40.55 }
  verifyPdf(await generateVentePdf(mixed, null))
  const mixedDefinition = visiblePdfDefinition(capture.latest().definition)
  assert.ok(mixedDefinition.includes('5,55 EUR') && mixedDefinition.includes('40,55 EUR'), 'La facture doit conserver la TVA et le TTC figés de taux mixtes')
  assert.ok(!mixedDefinition.includes('TVA (20%)'), 'La facture ne doit pas imposer un taux uniforme')
  verifyPdf(await generateVentePdf({ ...vente, totalTVA: null, totalTTC: null, articles: vente.articles.map((line) => ({ ...line, tauxTva: null })) }, null))
  assertLabeledPdfValue(capture.latest().definition, 'TVA', 'Non figée (historique)')
  assertLabeledPdfValue(capture.latest().definition, 'Total TTC', 'Non figé (historique)')
  verifyPdf(await generateVentePdf({ ...vente, totalTVA: null, totalTTC: null }, null))
  const incompleteHistory = visiblePdfDefinition(capture.latest().definition)
  assert.ok(incompleteHistory.includes('TTC non figé') && incompleteHistory.includes('Non figée (historique)'), 'Un taux fourni sans totaux fiscaux connus ne permet pas de reconstruire la taxe historique')
  verifyPdf(await generateVentePdf({ ...vente, totalHT: 77.77, totalTVA: 0.01, totalTTC: 77.78 }, null))
  assertLabeledPdfValue(capture.latest().definition, 'Total HT', '77,77 EUR')
  assertLabeledPdfValue(capture.latest().definition, 'TVA', '0,01 EUR')
  assertLabeledPdfValue(capture.latest().definition, 'Total TTC', '77,78 EUR')
  const manyLines = Array.from({ length: 80 }, (_, index) => ({ ...vente.articles[0], reference: `REF-${index}` }))
  const multipage = await generateVentePdf({ ...vente, clientId: 1, articles: manyLines, totalHT: 2000, totalTVA: 400, totalTTC: 2400, montantPaye: 2400 }, {
    numeroClient: '000001', nom: 'Client', prenom: 'Recette', adresse: '1 rue du Test', ville: 'Strasbourg', codePostal: '67000',
  })
  verifyPdf(multipage)
  const pageCount = Number(multipage.toString('latin1').match(/\/Count (\d+)/)?.[1])
  assert.ok(pageCount > 1, 'Une facture de 80 lignes doit rester générable sur plusieurs pages')
  const pages = await renderedPdfPages(capture.latest().output)
  assert.equal(pages.length, pageCount)
  assertCommercialPages(pages, '000042')

  verifyPdf(await pdfmake.createPdf({
    content: [
      { text: 'Normal' },
      { text: 'Gras', bold: true },
      { text: 'Italique', italics: true },
      { text: 'Gras italique', bold: true, italics: true },
    ],
    defaultStyle: { font: 'Roboto' },
  }).getBuffer())

  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  for (const protocol of ['http', 'https']) {
    await assert.rejects(
      pdfmake.createPdf({
        content: [{ image: 'external' }],
        images: { external: `${protocol}://127.0.0.1:${address.port}/image.png` },
      }).getBuffer(),
      /Access to URL denied by resource access policy/,
      `Une image ${protocol} doit être refusée avant tout téléchargement`,
    )
  }
  assert.equal(downloads, 0, 'Aucune requête réseau ne doit atteindre le serveur')

  for (const filePath of [resolve('package.json'), resolve('public', 'fichier-inexistant.png')]) {
    await assert.rejects(
      pdfmake.createPdf({ content: [{ image: filePath }] }).getBuffer(),
      /Access to local file denied by resource access policy/,
      'Un fichier hors des polices autorisées doit être refusé avant sa lecture',
    )
  }
  // Un refus de ressource ne doit pas empêcher les factures suivantes.
  verifyPdf(await generateVentePdf(vente, null))
  assert.deepEqual(warnings, [], 'La génération PDF ne doit plus émettre les avertissements de politique d’accès')
} finally {
  console.warn = originalWarn
  capture.restore()
  if (server.listening) await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
}

console.log('Facture PDF : identité, montants figés, taux mixtes, historique, pagination et accès aux ressources conformes.')
