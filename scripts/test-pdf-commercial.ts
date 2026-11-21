/** Présentation commerciale et exemples entièrement fictifs, sans API ni base. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { APP_NAME, APP_SIGNATURE } from '../src/branding.js'
import { generateVentePdf, type VenteForPdf, type ClientForPdf } from '../server/services/pdfInvoice.js'
import { generateDevisPdf } from '../server/services/pdfDevis.js'
import { buildCommercialDefinition, generateCommercialPdf, type CommercialPdfDocument } from '../server/services/pdfCommercial.js'
import type { DevisRow } from '../server/repositories/devisRepository.js'
import {
  assertCommercialPages, assertLabeledPdfValue, capturePdfDefinitions, pdfText,
  renderedPdfPages, tableByHeaders, verifyPdf, visiblePdfDefinition,
} from './lib/pdf-assertions.js'

const output = resolve('specs/captures/documents')
const writeExamples = process.argv.includes('--examples')
const checks: string[] = []
const reports: Array<{ fichier: string; pages: number; sha256: string; lignesTexte: number[] }> = []
const memoryReports: Array<{ cas: string; pages: number; lignes: number; marqueur: string }> = []
const passed = (label: string) => { checks.push(label); console.log(`OK ${label}`) }
const capture = capturePdfDefinitions()
assert.equal(APP_NAME, 'OpenStrass')
assert.equal(APP_SIGNATURE, 'OpenStrass - Gestion commerciale et logistique open source')
const client: ClientForPdf = {
  numeroClient: '000017', nom: 'Atelier Exemple', prenom: 'Camille',
  adresse: '10 rue de la Démonstration', ville: 'Strasbourg', codePostal: '67000',
  email: 'client@example.test', telephone: '0100000000', siret: '12345678900011',
}
const vente: VenteForPdf = {
  id: 42, clientId: 17, dateVente: '2026-11-21T13:06:58.000Z', caissier: 'Alice Exemple',
  articles: [{ reference: 'PLA-EXEMPLE', designation: 'Plaquettes de frein de démonstration', quantite: 2, prixUnitaire: 12.5, tauxTva: 20 }],
  totalHT: 25, totalTVA: 5, totalTTC: 30, montantPaye: 40, monnaie: 10, modePaiement: 'espèces',
}
const devis: DevisRow = {
  id: 7, numero: '20261121-D-aBcXyZ', clientId: 17,
  clientSnapshot: { ...client, email: client.email!, telephone: client.telephone!, siret: client.siret!, typeClient: 'professionnel' },
  dateDevis: '2026-11-21', dateValidite: '2026-12-21', notes: 'Exemple de devis : données entièrement fictives.',
  statut: 'brouillon', version: 1, commandeId: null,
  articles: [{ ligne: 1, reference: 'KIT-EXEMPLE', designation: 'Équipement de démonstration', quantite: 1, prixUnitaire: 114.17, tauxTva: 20, montant: 114.17, montantTVA: 22.83, montantTTC: 137 }],
  totalHT: 114.17, totalTVA: 22.83, totalTTC: 137,
  createdAt: '2026-11-21T13:00:00.000Z', updatedAt: '2026-11-21T13:00:00.000Z',
}

async function example(name: string, numero: string, generate: () => Promise<Buffer>) {
  const buffer = await generate()
  verifyPdf(buffer)
  const pages = await renderedPdfPages(capture.latest().output)
  assertCommercialPages(pages, numero)
  for (const [index, page] of pages.entries()) {
    assert.ok(page.texts.some((text) => text.text === APP_NAME), `Marque absente de la page ${index + 1}`)
    assert.ok(page.texts.some((text) => text.text === APP_SIGNATURE), `Signature absente de la page ${index + 1}`)
    assert.ok(!page.texts.some((text) => /Autostrass/i.test(text.text)), `Ancienne marque présente page ${index + 1}`)
  }
  if (writeExamples) await writeFile(resolve(output, `${name}.pdf`), buffer)
  reports.push({ fichier: `${name}.pdf`, pages: pages.length, sha256: createHash('sha256').update(buffer).digest('hex'), lignesTexte: pages.map((page) => page.texts.length) })
  return { definition: capture.latest().definition, pages }
}

try {
  if (writeExamples) await mkdir(output, { recursive: true })
  const originals = structuredClone({ client, vente, devis })
  const normal = await example('facture-normale', '000042', () => generateVentePdf(vente, client))
  const normalText = visiblePdfDefinition(normal.definition)
  for (const value of [APP_NAME, APP_SIGNATURE, 'FACTURE', 'Alice Exemple', '21/11/2026', '14:06', '000017', 'client@example.test', '12345678900011', 'Montant reçu : 40,00 EUR', 'Monnaie rendue : 10,00 EUR']) {
    assert.ok(normalText.includes(value), `Information facture absente : ${value}`)
  }
  assertLabeledPdfValue(normal.definition, 'Total TTC', '30,00 EUR')
  const companyNames = normal.pages[0].texts.filter((text) => text.text === APP_NAME).sort((a, b) => a.y - b.y)
  assert.equal(companyNames.length, 2, 'Le nom connu figure dans la marque centrée et dans le bloc émetteur')
  assert.ok(companyNames[1].x < normal.pages[0].width / 2 && companyNames[1].y > companyNames[0].y)
  for (const invented of ['123 rue', '01 23 45 67 89', '30 jours', 'NF525', 'IBAN']) assert.ok(!normalText.includes(invented), `Information sans source interdite : ${invented}`)
  assert.equal(normal.pages.length, 1)
  passed('Facture A4 : identité/client/date Paris, reçu 40/rendu 10/TTC 30 distincts, informations absentes non inventées')

  const dated = await example('facture-date-seule', '000044', () => generateVentePdf({ ...vente, id: 44, dateVente: '2026-11-21' }, null))
  const dateText = visiblePdfDefinition(dated.definition)
  assert.ok(dateText.includes('21/11/2026') && dateText.includes('Client de passage'))
  assert.ok(!/\b\d{2}:\d{2}\b/.test(dateText), 'Une date sans heure ne permet pas d’inventer une heure d’émission')
  passed('Date seule et client de passage : aucune heure ni coordonnée déduite')

  const historique = { ...vente, id: 41, dateVente: '2026-11-13', totalHT: 114.17, totalTVA: null, totalTTC: null, montantPaye: 137, monnaie: 0,
    articles: [{ reference: 'HIST-EXEMPLE', designation: 'Article historique fictif', quantite: 1, prixUnitaire: 114.17, tauxTva: 20 }] }
  const history = await example('facture-historique', '000041', () => generateVentePdf(historique, client))
  assertLabeledPdfValue(history.definition, 'TVA', 'Non figée (historique)')
  assertLabeledPdfValue(history.definition, 'Total TTC', 'Non figé (historique)')
  const historyText = visiblePdfDefinition(history.definition)
  assert.ok(historyText.includes('Montant reçu : 137,00 EUR') && historyText.includes('TTC non figé'))
  assert.ok(!historyText.includes('22,83 EUR'), 'Le paiement historique ne permet pas de reconstruire une taxe inconnue')
  passed('Historique : TVA/TTC inconnus conservés même avec un taux fourni et un règlement de 137 EUR')

  const mixed: VenteForPdf = { ...vente, id: 43, articles: [
    { reference: 'ARR-01', designation: 'Arrondi par ligne A', quantite: 1, prixUnitaire: 0.05, tauxTva: 10 },
    { reference: 'ARR-02', designation: 'Arrondi par ligne B', quantite: 1, prixUnitaire: 0.05, tauxTva: 10 },
    { reference: 'TVA-20', designation: 'Taux normal', quantite: 1, prixUnitaire: 10, tauxTva: 20 },
    { reference: 'TVA-55', designation: 'Taux réduit', quantite: 1, prixUnitaire: 10, tauxTva: 5.5 },
  ], totalHT: 20.1, totalTVA: 2.57, totalTTC: 22.67, montantPaye: 22.67, monnaie: 0, modePaiement: 'carte' }
  const rounding = await example('facture-taux-mixtes', '000043', () => generateVentePdf(mixed, client))
  const taxTable = tableByHeaders(rounding.definition, ['Code', 'Base HT', 'Taux', 'TVA'])
  assert.ok(taxTable.body.some((row) => row.some((cell) => pdfText(cell) === '10 %') && row.some((cell) => pdfText(cell) === '0,02 EUR')))
  assertLabeledPdfValue(rounding.definition, 'TVA', '2,57 EUR')
  assertLabeledPdfValue(rounding.definition, 'Total TTC', '22,67 EUR')
  passed('Ventilation des taux mixtes : deux lignes de 0,05 EUR à 10 % conservent 0,02 EUR de TVA')

  const normalDevis = await example('devis-normal', devis.numero, () => generateDevisPdf(devis))
  assertLabeledPdfValue(normalDevis.definition, 'Total HT', '114,17 EUR')
  assertLabeledPdfValue(normalDevis.definition, 'TVA', '22,83 EUR')
  assertLabeledPdfValue(normalDevis.definition, 'Total TTC', '137,00 EUR')
  const devisText = visiblePdfDefinition(normalDevis.definition)
  for (const value of [devis.numero, 'Atelier Exemple', '21/12/2026', 'Brouillon', 'TTC 137,00 EUR']) assert.ok(devisText.includes(value))
  assert.ok(!devisText.includes('Montant reçu') && !devisText.includes('FACTURE'))
  passed('Devis : instantané client, numéro sensible à la casse, validité et HT/TVA/TTC de ligne conservés')

  const longDesignation = 'Article de démonstration avec désignation détaillée, compatibilité et caractéristiques fictives. '.repeat(2).slice(0, 240)
  const longLines = Array.from({ length: 80 }, (_, index) => ({ reference: `REF-${String(index + 1).padStart(3, '0')}`, designation: longDesignation, quantite: 2, prixUnitaire: 12.5, tauxTva: 20 }))
  const longClient = { ...client, adresse: Array.from({ length: 8 }, (_, index) => `Adresse fictive, ligne ${index + 1}`).join('\n') }
  const longInvoice = await example('facture-longue', '000080', () => generateVentePdf({ ...vente, id: 80, articles: longLines, totalHT: 2000, totalTVA: 400, totalTTC: 2400, montantPaye: 2500, monnaie: 100 }, longClient))
  assert.ok(longInvoice.pages.length > 1)
  passed('Facture longue et adresse multiligne : tableau/identification répétés, aucun texte superposé ou hors page, totaux uniquement à la fin')

  const longDevis: DevisRow = { ...devis, numero: '20261121-D-ZyXwVu', clientSnapshot: { ...devis.clientSnapshot, adresse: longClient.adresse },
    articles: longLines.map((line, index) => ({ ...line, ligne: index + 1, montant: 25, montantTVA: 5, montantTTC: 30 })),
    totalHT: 2000, totalTVA: 400, totalTTC: 2400, notes: Array.from({ length: 24 }, (_, index) => `Précision fictive ${index + 1} : exemple de note longue pour le contrôle de pagination.`).join('\n') + '\nFIN_NOTES_LONG',
  }
  assert.ok(longDevis.notes!.length <= 2000)
  const longQuote = await example('devis-long', longDevis.numero, () => generateDevisPdf(longDevis))
  assert.ok(longQuote.pages.length > 1)
  assert.ok(longQuote.pages.flatMap((page) => page.texts).some((text) => text.text === 'FIN_NOTES_LONG'))
  passed('Devis long et notes : mêmes invariants de présentation, chiffres figés et récapitulatif final')

  const notesMarker = 'FIN_NOTES_017'
  const notes = 'Note\n'.repeat(397) + notesMarker
  assert.equal(notes.length, 1998)
  const notesQuote = await example('devis-notes-longues', '20261121-D-NoteAb', () => generateDevisPdf({ ...devis, numero: '20261121-D-NoteAb', notes }))
  assert.equal(notesQuote.pages.flatMap((page) => page.texts).filter((text) => text.text === 'Note').length, 397, 'Toutes les lignes de notes doivent être conservées')
  const finalMarker = notesQuote.pages.at(-1)!.texts.find((text) => text.text === notesMarker)
  assert.ok(finalMarker, 'Le marqueur de fin des notes doit être visible sur la dernière page')
  const firstTotal = notesQuote.pages.at(-1)!.texts.find((text) => text.text === 'Total HT')!
  assert.ok(finalMarker.y < firstTotal.y, 'Les totaux doivent suivre la fin réelle des notes')
  passed('Régression notes de 1 998 caractères : 397 lignes intactes, marqueur final et trois totaux globaux sur la dernière page')

  const tallDesignation = 'X\n'.repeat(120) + 'FIN_LIGNE'
  assert.equal(tallDesignation.length, 249)
  const tallCases = [
    { cas: 'facture-ligne-haute', numero: '000042', generate: () => generateVentePdf({ ...vente, articles: [{ ...vente.articles[0], designation: tallDesignation }] }, client) },
    { cas: 'devis-ligne-haute', numero: devis.numero, generate: () => generateDevisPdf({ ...devis, articles: [{ ...devis.articles[0], designation: tallDesignation }], notes: null }) },
  ]
  for (const tallCase of tallCases) {
    const buffer = await tallCase.generate()
    verifyPdf(buffer)
    const pages = await renderedPdfPages(capture.latest().output)
    assertCommercialPages(pages, tallCase.numero)
    const texts = pages.flatMap((page) => page.texts)
    assert.equal(texts.filter((text) => text.text === 'X').length, 120, `Toutes les lignes de ${tallCase.cas} doivent être conservées`)
    assert.equal(texts.filter((text) => text.text === 'FIN_LIGNE').length, 1, `La fin de ${tallCase.cas} doit rester visible`)
    for (const page of pages.filter((item) => item.texts.some((text) => text.text === 'X'))) {
      for (const header of ['Qté', 'Référence', 'Désignation', 'Remise']) assert.ok(page.texts.some((text) => text.text === header), `En-tête ${header} absent sur une continuation de ${tallCase.cas}`)
    }
    memoryReports.push({ cas: tallCase.cas, pages: pages.length, lignes: 120, marqueur: 'FIN_LIGNE' })
  }
  passed('Désignation admissible de 249 caractères : 120 lignes et FIN_LIGNE conservés dans facture/devis, continuations paginées et totaux à la fin')

  const commercial: CommercialPdfDocument = {
    title: 'BON DE LIVRAISON', numero: '20261121-L-AbCdEf', date: '2026-11-21', heure: '14:06', auteur: 'Alice Exemple', reference: 'Dossier fictif EX-017',
    company: { nom: APP_NAME, activite: APP_SIGNATURE, lines: ['Société fictive pour démonstration', '10 rue de l’Exemple', '67000 Strasbourg', 'societe@example.test'] },
    client: { numero: client.numeroClient, lines: [client.nom, client.adresse, `${client.codePostal} ${client.ville}`] },
    lines: [{ reference: 'KIT-EXEMPLE', designation: 'Équipement de démonstration', quantite: 2, prixBrutHT: 30, remise: '10 %', prixNetHT: 27, montantHT: 54, codeTva: 'A1', tauxTva: 20, montantTVA: 10.8, montantTTC: 64.8, emplacement: 'A / E-01 / P-02', note: 'Consigne de démonstration, sans règle métier.' }],
    totals: { totalHT: 54, totalTVA: 10.8, totalTTC: 64.8 }, footerLines: ['Exemple de gabarit uniquement — données fictives.'],
  }
  const commercialBefore = structuredClone(commercial)
  const pure = buildCommercialDefinition(commercial)
  assert.deepEqual(commercial, commercialBefore)
  const articleTable = tableByHeaders(pure, ['Qté', 'Référence', 'Désignation', 'Prix brut HT', 'Remise', 'Prix net HT', 'Montant HT / TTC', 'TVA Code / taux'])
  assert.equal(articleTable.headerRows, 1)
  const prototype = await example('gabarit-bl-fictif', commercial.numero, () => generateCommercialPdf(commercial))
  for (const value of ['30,00 EUR', '10 %', '27,00 EUR', '54,00 EUR', 'A1', '20 %', 'A / E-01 / P-02', 'Dossier fictif EX-017']) assert.ok(visiblePdfDefinition(prototype.definition).includes(value))
  assert.deepEqual(commercial, commercialBefore)
  passed('Gabarit BL fictif : colonnes brut/remise/net/code, emplacement, référence et identité entreprise sont uniquement les valeurs fournies')

  const multipleTaxes: CommercialPdfDocument = { ...commercial, title: 'DEVIS', numero: '20261121-D-TvAbCd',
    lines: Array.from({ length: 200 }, (_, index) => ({ reference: `REF-${String(index + 1).padStart(3, '0')}`, designation: `Article fictif au taux ${index + 1}`, quantite: 1, prixNetHT: 100, montantHT: 100, codeTva: `T${index + 1}`, tauxTva: (index + 1) / 100, montantTVA: (index + 1) / 100, montantTTC: 100 + (index + 1) / 100 })),
    totals: { totalHT: 20000, totalTVA: 201, totalTTC: 20201 },
  }
  const multiTax = await example('gabarit-tva-multiples', multipleTaxes.numero, () => generateCommercialPdf(multipleTaxes))
  const multiText = multiTax.pages.flatMap((page) => page.texts)
  for (let index = 1; index <= 200; index += 1) assert.equal(multiText.filter((text) => text.text === `T${index}`).length, 2, `Le code T${index} doit exister sur l’article et dans la ventilation`)
  assertLabeledPdfValue(multiTax.definition, 'TVA', '201,00 EUR')
  assertLabeledPdfValue(multiTax.definition, 'Total TTC', '20201,00 EUR')
  passed('Deux cents taux fictifs : chaque ligne et groupe reste lisible, ventilation paginée sans perte et totaux sur la dernière page')

  assert.deepEqual({ client, vente, devis }, originals)
  passed('Génération et builder purs : aucune mutation des entrées ou des invariants métier')
  if (writeExamples) {
    await writeFile(resolve(output, 'resultats.json'), JSON.stringify({ application: APP_NAME, signature: APP_SIGNATURE, groupes: checks.length, checks, exemples: reports, casEnMemoire: memoryReports, donnees: 'entièrement fictives' }, null, 2) + '\n', 'utf8')
    await writeFile(resolve(output, 'README.md'), '# Exemples PDF commerciaux — ' + APP_NAME + '\n\n' + APP_SIGNATURE + '\n\nCes documents utilisent des données entièrement fictives. Ils vérifient le gabarit commun de la facture et du devis, ses taux de TVA, son historique et sa pagination. `gabarit-bl-fictif.pdf` montre les champs facultatifs du modèle de bon de livraison ; il ne constitue pas une émission métier de BL.\n\nRégénération des PDF : `node --import tsx scripts/test-pdf-commercial.ts --examples`. Les PNG sont ensuite produits localement avec Windows PowerShell 5.1 et `scripts/render-pdf-examples.ps1`. La validation courante sans `--examples` conserve les fichiers générés.\n\n[RAPPORT.md](RAPPORT.md) récapitule les groupes et les pages ; `resultats.json` contient les contrôles et les empreintes des PDF, `rendus.json` les captures natives.\n', 'utf8')
    const rows = reports.map((report) => `| [${report.fichier}](${report.fichier}) | ${report.pages} |`).join('\n')
    const pages = reports.reduce((sum, report) => sum + report.pages, 0)
    await writeFile(resolve(output, 'RAPPORT.md'), `# Validation des documents commerciaux — ${APP_NAME}\n\n${APP_SIGNATURE}\n\n**${checks.length} groupes réussis**, **${reports.length} exemples PDF fictifs**, **${pages} pages d’exemples** composées et contrôlées, plus **${memoryReports.length} PDF vérifiés en mémoire** pour les lignes très hautes. Facture et devis utilisent le même modèle A4 noir/gris. Les suites facture et devis conservent leurs contrôles de ressources URL/fichiers, de polices et de montants figés.\n\nLes contrôles sémantiques préservent client fourni à la facture, instantané du devis, auteur, date Paris, reçu/rendu, taux mixtes et données historiques inconnues. Les contrôles des pages vérifient les marges, l’absence de texte superposé, les en-têtes répétés et les trois totaux globaux uniquement sur la dernière page. La régression de 1 998 caractères conserve ses 397 lignes et son marqueur final ; la désignation admissible de 249 caractères conserve ses 120 lignes et FIN_LIGNE dans les deux types de documents ; les 200 taux conservent toutes leurs lignes et ventilations.\n\n| Exemple | Pages |\n|---|---:|\n${rows}\n\nLes coordonnées et identités des exemples sont fictives. Le BL illustré est un prototype du gabarit, sans émission métier ni nouvelle règle de livraison. Les noms de fichiers permettent de retrouver les PNG de chaque page.\n`, 'utf8')
  }
  console.log(`${checks.length} groupes PDF commerciaux réussis ; ${reports.length + memoryReports.length} PDF réels vérifiés, dont ${reports.length} exemples${writeExamples ? ' fictifs enregistrés' : ''}.`)
} finally {
  capture.restore()
}
