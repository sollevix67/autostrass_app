/** Deux documents et un logo procédural entièrement fictifs ; aucune base/configuration applicative. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { generateVentePdf, type VenteForPdf } from '../server/services/pdfInvoice.js'
import { generateDevisPdf } from '../server/services/pdfDevis.js'
import { prepareDocumentsPdfLogo } from '../server/services/documentsPdfSettings.js'
import type { DevisRow } from '../server/repositories/devisRepository.js'
import type { DocumentsPdfSettings } from '../src/schemas/parametres.js'
import { makePalettePng } from './lib/image-fixtures.js'
import { rgbaImagesFromPdf } from './lib/pdf-buffer-images.js'
import { assertCommercialPages, capturePdfDefinitions, renderedPdfPages, verifyPdf } from './lib/pdf-assertions.js'

const output = resolve('specs/captures/documents-pdf')
const palette = makePalettePng()
const settings: DocumentsPdfSettings = {
  nomEmetteur: 'Atelier de démonstration', activite: 'Pièces et services — Exemple fictif',
  coordonnees: '10 rue de l’Exemple\n67000 Strasbourg\ncontact@example.test\nIdentité et coordonnées fictives',
  piedCommun: 'Présentation personnalisée de démonstration\nDocument fictif, sans valeur commerciale', logo: palette.logo,
}
const client: DevisRow['clientSnapshot'] = { nom: 'Client de démonstration', prenom: 'Camille', email: 'client@example.test', telephone: '0100000000', adresse: '20 rue de l’Exemple', ville: 'Strasbourg', codePostal: '67000', numeroClient: '000017', siret: null, typeClient: 'particulier' }
const vente: VenteForPdf = {
  id: 42, clientId: 17, dateVente: '2026-11-21T10:00:00Z', caissier: 'Auteur fictif',
  articles: [{ reference: 'REF-001', designation: 'Article de démonstration', quantite: 2, prixUnitaire: 12.5, tauxTva: 20 }],
  totalHT: 25, totalTVA: 5, totalTTC: 30, montantPaye: 40, monnaie: 10, modePaiement: 'espèces',
}
const devis: DevisRow = {
  id: 7, numero: '20261121-D-AbCdEf', clientId: 17, clientSnapshot: client,
  dateDevis: '2026-11-21', dateValidite: '2026-12-21', statut: 'brouillon', version: 1, commandeId: null,
  notes: 'Exemple de devis sur plusieurs pages. Les réglages communs complètent les mentions propres au devis.',
  articles: Array.from({ length: 18 }, (_, index) => ({
    ligne: index + 1, reference: `REF-${String(index + 1).padStart(3, '0')}`, designation: `Article de démonstration ${String(index + 1).padStart(2, '0')}`,
    quantite: 2, prixUnitaire: 12.5, tauxTva: 20, montant: 25, montantTVA: 5, montantTTC: 30,
  })),
  totalHT: 450, totalTVA: 90, totalTTC: 540, createdAt: '2026-11-21T10:00:00Z', updatedAt: '2026-11-21T10:00:00Z',
}
const capture = capturePdfDefinitions()
const reports = []
try {
  await mkdir(output, { recursive: true })
  for (const example of [
    { file: 'facture-personnalisee.pdf', numero: '000042', generate: () => generateVentePdf(vente, client, settings) },
    { file: 'devis-personnalise.pdf', numero: devis.numero, generate: () => generateDevisPdf(devis, settings) },
  ]) {
    const buffer = await example.generate()
    verifyPdf(buffer)
    const pages = await renderedPdfPages(capture.latest().output)
    assertCommercialPages(pages, example.numero)
    const images = rgbaImagesFromPdf(buffer)
    assert.ok(images.length > 0)
    for (const image of images) assert.deepEqual(image, { width: 8, height: 1, rgba: palette.rgba })
    assert.ok(pages.every((page) => page.images.length === 1))
    if (example.file.startsWith('devis-')) assert.ok(pages.length > 1, 'Le devis illustre le pied et l’en-tête répétés')
    await writeFile(resolve(output, example.file), buffer)
    reports.push({ fichier: example.file, pages: pages.length, sha256: createHash('sha256').update(buffer).digest('hex') })
  }
  const prepared = Buffer.from(prepareDocumentsPdfLogo(palette.logo).dataUri.split(',')[1], 'base64')
  await writeFile(resolve(output, 'logo-palette-source.png'), palette.bytes)
  await writeFile(resolve(output, 'logo-palette-prepare.png'), prepared)
  await writeFile(resolve(output, 'exemples.json'), JSON.stringify({ donnees: 'entièrement fictives, sans accès SQL', configuration: settings, logoRegression: { formatSource: 'PNG palette 1 bit + tRNS', largeur: 8, hauteur: 1, pixelsOpaques: 8, normalisation: 'RGBA8 non entrelacé', pixelsPdfVerifies: true }, exemples: reports }, null, 2) + '\n')
  console.log(`Deux PDF personnalisés fictifs et ${reports.reduce((sum, item) => sum + item.pages, 0)} pages vérifiées ; logo transparent compact opaque après préparation et incorporation PDF.`)
} finally { capture.restore() }
