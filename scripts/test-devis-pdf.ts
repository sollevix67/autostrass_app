/** Génération réelle du devis PDF, snapshots et politiques d'accès ; aucune base. */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import pdfmake from 'pdfmake'
import type { DevisRow } from '../server/repositories/devisRepository.js'
import { generateDevisPdf } from '../server/services/pdfDevis.js'
import { assertCommercialPages, assertLabeledPdfValue, capturePdfDefinitions, evaluatePdfCallback, pdfText, renderedPdfPages, tableByHeaders, visiblePdfDefinition } from './lib/pdf-assertions.js'

const devis: DevisRow = {
  id: 7,
  numero: '20261121-D-aBcXyZ',
  clientId: 1,
  clientSnapshot: {
    numeroClient: '000001', nom: 'Atelier du Test', prenom: '',
    email: 'devis@example.test', telephone: '0388000001',
    adresse: '1 rue du Test', ville: 'Strasbourg', codePostal: '67000',
    siret: '12345678900011', typeClient: 'professionnel',
  },
  dateDevis: '2026-11-21',
  dateValidite: '2026-12-21',
  notes: 'Coordonnées et tarifs figés. Texte <script> conservé comme texte.',
  statut: 'brouillon',
  version: 1,
  commandeId: null,
  articles: [
    { ligne: 1, reference: 'TVA-055', designation: 'Article à taux réduit', quantite: 3, prixUnitaire: 0.01, tauxTva: 5.5, montant: 0.03, montantTVA: 0, montantTTC: 0.03 },
    { ligne: 2, reference: 'TVA-200', designation: 'Article à taux normal', quantite: 1, prixUnitaire: 0.1, tauxTva: 20, montant: 0.1, montantTVA: 0.02, montantTTC: 0.12 },
  ],
  totalHT: 0.13,
  totalTVA: 0.02,
  totalTTC: 0.15,
  createdAt: '2026-11-21T10:00:00.000Z',
  updatedAt: '2026-11-21T10:00:00.000Z',
}

function verifyPdf(buffer: Buffer) {
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-')
  assert.match(buffer.subarray(-32).toString(), /%%EOF/)
  assert.match(buffer.toString('latin1'), /\/BaseFont \/[A-Z]+\+Roboto/)
}

const capture = capturePdfDefinitions()
let downloads = 0
const server = createServer((_request, response) => {
  downloads += 1
  response.writeHead(500).end()
})

try {
  const source = structuredClone(devis)
  verifyPdf(await generateDevisPdf(devis))
  const definition = capture.latest().definition
  const contents = visiblePdfDefinition(definition)
  for (const expected of [
    devis.numero, 'Atelier du Test', '000001', '12345678900011', 'devis@example.test',
    '21/11/2026', '21/12/2026', 'Brouillon', '0,13 EUR', '0,02 EUR', '0,15 EUR',
    '0,03 EUR', '0,12 EUR', '5,5', '<script>',
  ]) assert.ok(contents.includes(expected), `Le PDF doit conserver ${expected}`)
  assert.equal(typeof definition.footer, 'function')
  assert.ok(pdfText(evaluatePdfCallback(definition.footer, 2, 4)).includes('Page n° 2/4'))
  assert.ok(!/\bfacture\b/i.test(contents) && !contents.includes('NF525'), 'Un devis doit rester présenté comme un devis')
  assertLabeledPdfValue(definition, 'Total HT', '0,13 EUR')
  assertLabeledPdfValue(definition, 'TVA', '0,02 EUR')
  assertLabeledPdfValue(definition, 'Total TTC', '0,15 EUR')
  const table = tableByHeaders(definition, ['Qté', 'Référence', 'Prix brut HT', 'Remise', 'Prix net HT', 'Montant HT / TTC', 'TVA Code / taux'])
  const headers = table.body[0].map(pdfText)
  const first = table.body.find((row) => row.some((cell) => pdfText(cell) === 'TVA-055'))!
  assert.equal(pdfText(first[headers.indexOf('Prix brut HT')]), '—', 'Aucun prix brut reconstruit depuis le prix net')
  assert.equal(pdfText(first[headers.indexOf('Remise')]), '—', 'Aucune remise inventée')
  assert.deepEqual(devis, source, 'L’instantané du devis reste intact')

  for (const [statut, label] of [['envoyé', 'Envoyé'], ['converti', 'Converti en commande'], ['annulé', 'Annulé']] as const) {
    verifyPdf(await generateDevisPdf({ ...devis, statut }))
    assert.ok(visiblePdfDefinition(capture.latest().definition).includes(label))
  }
  verifyPdf(await generateDevisPdf({ ...devis, notes: null, dateValidite: null }))
  const noValidity = visiblePdfDefinition(capture.latest().definition)
  assert.ok(noValidity.includes('Validité : Non précisée') && !noValidity.includes('21/12/2026'))

  const manyLines = Array.from({ length: 80 }, (_, index) => ({
    ligne: index + 1, reference: `REF-${index}`, designation: `Article de recette ${index + 1}`,
    quantite: 2, prixUnitaire: 12.5, tauxTva: 20, montant: 25, montantTVA: 5, montantTTC: 30,
  }))
  const multipage = await generateDevisPdf({ ...devis, articles: manyLines, totalHT: 2000, totalTVA: 400, totalTTC: 2400 })
  verifyPdf(multipage)
  assert.ok(Number(multipage.toString('latin1').match(/\/Count (\d+)/)?.[1]) > 1)
  assertCommercialPages(await renderedPdfPages(capture.latest().output), devis.numero)

  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  for (const protocol of ['http', 'https']) {
    await assert.rejects(pdfmake.createPdf({
      content: [{ image: 'external' }],
      images: { external: `${protocol}://127.0.0.1:${address.port}/image.png` },
    }).getBuffer(), /Access to URL denied by resource access policy/)
  }
  assert.equal(downloads, 0)
  await assert.rejects(pdfmake.createPdf({ content: [{ image: resolve('package.json') }] }).getBuffer(), /Access to local file denied by resource access policy/)
  verifyPdf(await generateDevisPdf(devis))
} finally {
  capture.restore()
  if (server.listening) await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
}

console.log('PDF devis : snapshots, montants mixtes, pagination et politiques d’accès conformes.')
