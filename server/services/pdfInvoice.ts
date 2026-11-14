import * as pdfmakeModule from 'pdfmake'
// En ESM, l'instance CJS de pdfmake est à `.default` ; sinon `createPdf`/`setFonts`
// sont des fonctions natives Node mais `setFonts` n'existe pas sur le module.
const pdfmake = (pdfmakeModule as any).default ?? pdfmakeModule
import { createRequire } from 'node:module'

// Les polices standard de pdfmake (Roboto) sont chargees via le fichier CJS
// fourni par le paquet : `pdfmake/fonts/Roboto.js` contient les chemins TTF.
const require_ = createRequire(import.meta.url)
const fontsDef: Record<string, Record<string, string>> = require_('pdfmake/fonts/Roboto.js')
const allowedFontFiles = new Set(Object.values(fontsDef).flatMap((family) => Object.values(family)))
// Les factures n'utilisent aucune ressource distante ni aucun autre fichier local.
pdfmake.setUrlAccessPolicy(() => false)
pdfmake.setLocalAccessPolicy((filePath: string) => allowedFontFiles.has(filePath))
pdfmake.setFonts(fontsDef)

export type VenteForPdf = {
  id: number
  clientId: number | null
  dateVente: string
  caissier: string
  articles: Array<{
    reference: string
    designation: string
    quantite: number
    prixUnitaire: number
    tauxTva?: number | null
  }>
  totalHT: number
  totalTVA?: number | null
  totalTTC?: number | null
  montantPaye: number
  monnaie: number
  modePaiement: string
}

export type ClientForPdf = {
  numeroClient: string
  nom: string
  prenom: string
  adresse: string
  ville: string
  codePostal: string
}

function formatEuros(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  const formatted = Math.round(num * 100) / 100
  return `${formatted.toFixed(2).replace('.', ',')} EUR`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

/**
 * Génère une facture PDF pour une vente donnée.
 *
 * @param vente  - L'objet vente avec ses lignes
 * @param client - Les informations du client (null si client de passage)
 * @returns      - Promise du Buffer PDF
 */
export async function generateVentePdf(vente: VenteForPdf, client: ClientForPdf | null): Promise<Buffer> {
  const clientText = client
    ? [
        `Client n° ${client.numeroClient}`,
        `${client.nom} ${client.prenom}`,
        client.adresse,
        `${client.codePostal} ${client.ville}`,
      ]
    : 'Client de passage'

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 50],
    header: {
      table: {
        widths: ['*', 120],
        body: [
          [
            { text: 'AUTOSTRASS', fontSize: 20, bold: true, margin: [0, 0, 0, 4] },
            {
              text: [
                { text: 'Facture n° ', fontSize: 10 },
                { text: vente.id.toString().padStart(6, '0'), bold: true, fontSize: 10 },
              ],
              alignment: 'right',
              margin: [0, 0, 0, 4],
            },
          ],
          [
            {
              text: 'Gestion de depot automobile\n123 rue de l\'Atelier\n75012 Paris\nTel : 01 23 45 67 89',
              fontSize: 9,
              color: '#555',
            },
            {
              text: clientText,
              fontSize: 9,
              color: '#555',
              alignment: 'right',
            },
          ],
        ],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
    },
    footer: {
      text: 'Page [page] sur [total-pages]',
      alignment: 'center',
      fontSize: 8,
      color: '#888',
    },
    content: [
      {
        text: 'FACTURE',
        fontSize: 22,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ['*', 200],
          body: [
            [
              {
                text: [
                  { text: 'Date de vente : ', bold: true },
                  { text: formatDate(vente.dateVente) },
                  { text: '   Caissier : ', bold: true },
                  { text: vente.caissier },
                ],
              },
              {
                text: [
                  { text: 'Montant paye : ', bold: true },
                  { text: formatEuros(vente.montantPaye) },
                  { text: '   Monnaie : ', bold: true },
                  { text: formatEuros(vente.monnaie) },
                ],
                alignment: 'right',
              },
            ],
          ],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 65, 35, 65, 45, 70],
          body: [
            [
              { text: 'Designation', style: 'th' },
              { text: 'Ref.', style: 'th' },
              { text: 'Qte', style: 'th', alignment: 'right' },
              { text: 'PU HT', style: 'th', alignment: 'right' },
              { text: 'TVA %', style: 'th', alignment: 'right' },
              { text: 'Total HT', style: 'th', alignment: 'right' },
            ],
            ...vente.articles.map(
              (line) =>
                [
                  { text: line.designation },
                  { text: line.reference },
                  { text: line.quantite.toString(), alignment: 'right' },
                  { text: formatEuros(line.prixUnitaire), alignment: 'right' },
                  { text: line.tauxTva == null ? 'N/D' : String(line.tauxTva), alignment: 'right' },
                  { text: formatEuros(line.quantite * line.prixUnitaire), alignment: 'right' },
                ] as any[],
            ),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0,
          hLineColor: (i: number, node: any) =>
            i === 0 || i === node.table.body.length ? '#444' : '#ccc',
        },
        margin: [0, 0, 0, 20],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'Conditions de reglement : 30 jours fin de mois',
                fontSize: 8,
                color: '#555',
              },
              {
                text: `Vente scellee (NF525) : n${vente.id} - ${vente.modePaiement}`,
                fontSize: 7,
                color: '#888',
                margin: [0, 4, 0, 0],
              },
            ],
          },
          {
            width: 200,
            table: {
              widths: [100, 100],
              body: [
                [
                  { text: 'Total HT', style: 'tl' },
                  { text: formatEuros(vente.totalHT), style: 'tv' },
                ],
                [
                  { text: 'TVA', style: 'tl' },
                  { text: vente.totalTVA == null ? 'Non figée (historique)' : formatEuros(vente.totalTVA), style: 'tv' },
                ],
                [
                  { text: 'Total TTC', style: 'tt' },
                  { text: vente.totalTTC == null ? 'Non figé (historique)' : formatEuros(vente.totalTTC), style: 'tv' },
                ],
              ],
            },
            layout: {
              hLineWidth: (i: number) => (i === 0 ? 0.5 : 1),
              vLineWidth: () => 0,
              hLineColor: (i: number) => (i === 0 ? '#ccc' : '#333'),
            },
          },
        ],
      },
    ],
    styles: {
      th: { bold: true, fontSize: 9, color: '#444', margin: [0, 4, 0, 4] },
      tl: { bold: true, fontSize: 9, alignment: 'right', margin: [0, 3, 0, 3] },
      tv: { bold: true, fontSize: 9, alignment: 'right', margin: [0, 3, 0, 3] },
      tt: { bold: true, fontSize: 10, alignment: 'right', margin: [0, 3, 0, 3] },
    },
    defaultStyle: { fontSize: 10, font: 'Roboto' },
  }

  const doc = pdfmake.createPdf(docDefinition)
  return doc.getBuffer()
}
