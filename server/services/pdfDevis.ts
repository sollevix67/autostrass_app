import * as pdfmakeModule from 'pdfmake'
import { createRequire } from 'node:module'
import type { DevisRow } from '../repositories/devisRepository.js'

const pdfmake = (pdfmakeModule as any).default ?? pdfmakeModule
const require_ = createRequire(import.meta.url)
const fonts: Record<string, Record<string, string>> = require_('pdfmake/fonts/Roboto.js')
const allowedFontFiles = new Set(Object.values(fonts).flatMap((family) => Object.values(family)))
pdfmake.setUrlAccessPolicy(() => false)
pdfmake.setLocalAccessPolicy((filePath: string) => allowedFontFiles.has(filePath))
pdfmake.setFonts(fonts)

const statusLabels = {
  brouillon: 'Brouillon',
  envoyé: 'Envoyé',
  converti: 'Converti en commande',
  annulé: 'Annulé',
}

function euros(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} EUR`
}

function dateFr(value: string): string {
  return new Date(value).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
}

/** Rend exclusivement les coordonnées et montants figés dans le devis. */
export async function generateDevisPdf(devis: DevisRow): Promise<Buffer> {
  const client = devis.clientSnapshot
  const clientText = [
    `Client n° ${client.numeroClient}`,
    [client.prenom, client.nom].filter(Boolean).join(' '),
    client.adresse,
    [client.codePostal, client.ville].filter(Boolean).join(' '),
    client.email,
    client.telephone,
    client.siret ? `SIRET : ${client.siret}` : null,
  ].filter(Boolean)

  const definition = {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 45],
    header: {
      text: `AUTOSTRASS · Devis ${devis.numero}`,
      margin: [40, 18, 40, 0],
      fontSize: 9,
      color: '#526277',
    },
    footer: (page: number, pages: number) => ({
      text: `Page ${page} sur ${pages}`,
      alignment: 'center',
      margin: [0, 12, 0, 0],
      fontSize: 8,
      color: '#526277',
    }),
    content: [
      { text: 'AUTOSTRASS', fontSize: 22, bold: true, color: '#1E40AF', margin: [0, 0, 0, 8] },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'DEVIS', fontSize: 18, bold: true, margin: [0, 0, 0, 6] },
              { text: devis.numero, fontSize: 11, bold: true, margin: [0, 0, 0, 6] },
              { text: `Date : ${dateFr(devis.dateDevis)}` },
              { text: devis.dateValidite ? `Valable jusqu'au ${dateFr(devis.dateValidite)}` : 'Validité : non précisée' },
              { text: `Statut : ${statusLabels[devis.statut]}`, margin: [0, 6, 0, 0] },
            ],
          },
          { width: 235, text: clientText.join('\n'), alignment: 'right' },
        ],
        margin: [0, 0, 0, 22],
      },
      {
        table: {
          headerRows: 1,
          widths: [56, '*', 26, 50, 32, 53, 58],
          body: [
            [
              { text: 'Référence', style: 'th' },
              { text: 'Désignation', style: 'th' },
              { text: 'Qté', style: 'th', alignment: 'right' },
              { text: 'PU HT', style: 'th', alignment: 'right' },
              { text: 'TVA %', style: 'th', alignment: 'right' },
              { text: 'Total HT', style: 'th', alignment: 'right' },
              { text: 'Total TTC', style: 'th', alignment: 'right' },
            ],
            ...devis.articles.map((line) => [
              { text: line.reference },
              { text: line.designation },
              { text: String(line.quantite), alignment: 'right' },
              { text: euros(line.prixUnitaire), alignment: 'right' },
              { text: String(line.tauxTva).replace('.', ','), alignment: 'right' },
              { text: euros(line.montant), alignment: 'right' },
              { text: euros(line.montantTTC), alignment: 'right' },
            ]),
          ],
        },
        layout: {
          hLineWidth: (index: number) => index === 1 ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#DBE3EF',
          fillColor: (index: number) => index === 0 ? '#E9EEF6' : null,
        },
        fontSize: 9,
        margin: [0, 0, 0, 18],
      },
      {
        columns: [
          { width: '*', text: devis.notes ? [{ text: 'Notes\n', bold: true }, { text: devis.notes }] : '' },
          {
            width: 185,
            table: {
              widths: ['*', 85],
              body: [
                [{ text: 'Total HT', style: 'totalLabel' }, { text: euros(devis.totalHT), style: 'totalValue' }],
                [{ text: 'TVA', style: 'totalLabel' }, { text: euros(devis.totalTVA), style: 'totalValue' }],
                [{ text: 'Total TTC', style: 'totalLabel', bold: true }, { text: euros(devis.totalTTC), style: 'totalValue', bold: true }],
              ],
            },
            layout: {
              hLineWidth: (index: number) => index === 2 ? 1 : 0,
              vLineWidth: () => 0,
              hLineColor: () => '#1E40AF',
            },
          },
        ],
        columnGap: 16,
      },
    ],
    styles: {
      th: { bold: true, fontSize: 9, color: '#172B4D', margin: [0, 5, 0, 5] },
      totalLabel: { alignment: 'right', margin: [0, 4, 0, 4] },
      totalValue: { alignment: 'right', margin: [0, 4, 0, 4] },
    },
    defaultStyle: { fontSize: 10, font: 'Roboto', color: '#172B4D' },
  }

  return pdfmake.createPdf(definition).getBuffer()
}
