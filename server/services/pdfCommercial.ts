import * as pdfmakeModule from 'pdfmake'
import { createRequire } from 'node:module'

const pdfmake = (pdfmakeModule as any).default ?? pdfmakeModule
const require_ = createRequire(import.meta.url)
const fonts: Record<string, Record<string, string>> = require_('pdfmake/fonts/Roboto.js')
const allowedFontFiles = new Set(Object.values(fonts).flatMap((family) => Object.values(family)))
pdfmake.setUrlAccessPolicy(() => false)
pdfmake.setLocalAccessPolicy((filePath: string) => allowedFontFiles.has(filePath))
pdfmake.setFonts(fonts)

export const AUTOSTRASS_PDF_COMPANY = Object.freeze({
  nom: 'AUTOSTRASS',
  activite: 'ÉQUIPEMENT ET PIÈCES AUTO',
})

export type CommercialPdfLine = {
  quantite: number
  reference: string
  designation: string
  prixNetHT: number
  montantHT: number
  tauxTva: number | null
  montantTVA: number | null
  montantTTC: number | null
  prixBrutHT?: number | null
  remise?: string | null
  codeTva?: string | null
  emplacement?: string | null
  note?: string | null
}

export type CommercialPdfDocument = {
  title: string
  numero: string
  date: string
  heure?: string | null
  auteur?: string | null
  validite?: string | null
  statut?: string | null
  reference?: string | null
  company: { nom: string; activite?: string; lines?: string[] }
  client: { numero?: string | null; lines: string[] }
  lines: CommercialPdfLine[]
  totals: { totalHT: number; totalTVA: number | null; totalTTC: number | null }
  notes?: string | null
  paymentLines?: string[]
  footerLines?: string[]
}

type TaxGroup = { code: string | null; taux: number | null; htCents: number; tvaCents: number | null }

export function formatCommercialMoney(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} EUR`
}

export function formatCommercialDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
  return new Date(value).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
}

export function formatCommercialTime(value: string): string | null {
  if (!/T\d{2}:\d{2}/.test(value)) return null
  return new Date(value).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
}

function taxGroups(lines: CommercialPdfLine[]): TaxGroup[] {
  const groups = new Map<string, TaxGroup>()
  for (const line of lines) {
    const key = JSON.stringify([line.codeTva ?? null, line.tauxTva])
    let group = groups.get(key)
    if (!group) {
      group = { code: line.codeTva ?? null, taux: line.tauxTva, htCents: 0, tvaCents: 0 }
      groups.set(key, group)
    }
    group.htCents += Math.round(line.montantHT * 100)
    group.tvaCents = group.tvaCents === null || line.montantTVA === null
      ? null : group.tvaCents + Math.round(line.montantTVA * 100)
  }
  return [...groups.values()].sort((a, b) => (b.taux ?? -1) - (a.taux ?? -1))
}

const borderLayout = {
  hLineWidth: () => 0.6,
  vLineWidth: () => 0.6,
  hLineColor: () => '#777777',
  vLineColor: () => '#777777',
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 5,
  paddingBottom: () => 5,
}

/** Présentation commune ; les montants et informations absentes restent inchangés. */
export function buildCommercialDefinition(document: CommercialPdfDocument): Record<string, unknown> {
  const groups = taxGroups(document.lines)
  const field = (label: string, value: string) => ({
    text: [{ text: `${label} : `, bold: true }, { text: value }],
    fontSize: 8,
  })
  const date = formatCommercialDate(document.date)
  const identification = [
    field('N°', document.numero),
    field('Date', document.heure ? `${date} à ${document.heure}` : date),
    ...(document.client.numero ? [field('Client n°', document.client.numero)] : []),
    ...(document.auteur ? [field('Servi par', document.auteur)] : []),
    ...(document.validite ? [field('Validité', document.validite)] : []),
    ...(document.statut ? [field('Statut', document.statut)] : []),
    ...(document.reference ? [field('Référence', document.reference)] : []),
  ]
  const clientLines = document.client.lines.filter(Boolean)
  const companyLines = [document.company.nom, ...(document.company.lines?.filter(Boolean) ?? [])]
  const tableBody = [
    [
      { text: 'Qté', style: 'articleHeader', alignment: 'right' },
      { text: 'Référence', style: 'articleHeader' },
      { text: 'Désignation', style: 'articleHeader' },
      { text: 'Prix brut\nHT', style: 'articleHeader', alignment: 'right' },
      { text: 'Remise', style: 'articleHeader', alignment: 'right' },
      { text: 'Prix net\nHT', style: 'articleHeader', alignment: 'right' },
      { text: 'Montant\nHT / TTC', style: 'articleHeader', alignment: 'right' },
      { text: 'TVA\nCode / taux', style: 'articleHeader', alignment: 'right' },
    ],
    ...document.lines.map((line) => [
      { text: String(line.quantite), alignment: 'right' },
      { text: line.reference },
      {
        stack: [
          { text: line.designation },
          ...(line.emplacement ? [{ text: `Emplacement : ${line.emplacement}`, style: 'secondary' }] : []),
          ...(line.note ? [{ text: line.note, style: 'secondary' }] : []),
        ],
      },
      { text: line.prixBrutHT == null ? '—' : formatCommercialMoney(line.prixBrutHT), alignment: 'right' },
      { text: line.remise ?? '—', alignment: 'right' },
      { text: formatCommercialMoney(line.prixNetHT), alignment: 'right' },
      {
        stack: [
          { text: formatCommercialMoney(line.montantHT) },
          { text: line.montantTTC === null ? 'TTC non figé' : `TTC ${formatCommercialMoney(line.montantTTC)}`, style: 'secondary' },
        ],
        alignment: 'right',
      },
      {
        stack: [
          { text: line.codeTva ?? '—' },
          { text: line.tauxTva === null ? 'Non figée' : `${String(line.tauxTva).replace('.', ',')} %`, style: 'secondary' },
        ],
        alignment: 'right',
      },
    ]),
  ]
  const recap = {
    table: {
      headerRows: 1,
      widths: [24, '*', 32, 64],
      body: [
        [
          { text: 'Code', style: 'articleHeader' },
          { text: 'Base HT', style: 'articleHeader', alignment: 'right' },
          { text: 'Taux', style: 'articleHeader', alignment: 'right' },
          { text: 'TVA', style: 'articleHeader', alignment: 'right' },
        ],
        ...groups.map((group) => [
          { text: group.code ?? '—' },
          { text: formatCommercialMoney(group.htCents / 100), alignment: 'right' },
          { text: group.taux === null ? 'N/D' : `${String(group.taux).replace('.', ',')} %`, alignment: 'right' },
          { text: group.tvaCents === null ? 'Non figée' : formatCommercialMoney(group.tvaCents / 100), alignment: 'right' },
        ]),
      ],
    },
    layout: borderLayout,
    fontSize: 7.5,
    margin: [0, 0, 0, 7],
  }
  const totals = {
    unbreakable: true,
    table: {
      widths: ['*', 108],
      body: [
        [
          { text: 'Total HT', style: 'totalLabel' },
          { text: formatCommercialMoney(document.totals.totalHT), style: 'totalValue' },
        ],
        [
          { text: 'TVA', style: 'totalLabel' },
          { text: document.totals.totalTVA === null ? 'Non figée (historique)' : formatCommercialMoney(document.totals.totalTVA), style: 'totalValue' },
        ],
        [
          { text: 'Total TTC', style: 'grandTotal' },
          { text: document.totals.totalTTC === null ? 'Non figé (historique)' : formatCommercialMoney(document.totals.totalTTC), style: 'grandTotal' },
        ],
      ],
    },
    layout: borderLayout,
  }
  const paymentLines = document.paymentLines?.map((text) => ({ text, margin: [0, 0, 0, 4] })) ?? []

  return {
    pageSize: 'A4',
    pageMargins: [30, 82, 30, 52],
    header: (page: number) => ({
      margin: [30, 14, 30, 0],
      stack: [
        { text: document.company.nom, alignment: 'center', fontSize: 21, bold: true },
        ...(document.company.activite ? [{ text: document.company.activite, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 7] }] : []),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535.28, y2: 0, lineWidth: 0.7, lineColor: '#555555' }] },
        ...(page > 1 ? [{ text: `${document.title} n° ${document.numero} · ${date}`, alignment: 'center', fontSize: 8, margin: [0, 5, 0, 0] }] : []),
      ],
    }),
    footer: (page: number, pages: number) => ({
      margin: [30, 8, 30, 0],
      stack: [
        ...(document.footerLines?.map((text) => ({ text, fontSize: 7, alignment: 'center', color: '#555555' })) ?? []),
        { text: `Page n° ${page}/${pages}`, alignment: 'right', fontSize: 8, margin: [0, 4, 0, 0] },
      ],
    }),
    content: [
      {
        columns: [
          { width: '*', stack: companyLines.map((text, index) => ({ text, bold: index === 0 })), fontSize: 9 },
          { width: 248, stack: clientLines.map((text) => ({ text })), fontSize: 10, bold: true },
        ],
        columnGap: 16,
        margin: [0, 0, 0, 14],
      },
      {
        table: {
          widths: [132, '*'],
          body: [[
            { text: document.title, bold: true, fontSize: 13, fillColor: '#eeeeee' },
            {
              columns: [
                { width: '*', stack: identification.slice(0, 3) },
                { width: '*', stack: identification.slice(3) },
              ],
              columnGap: 10,
              fillColor: '#eeeeee',
            },
          ]],
        },
        layout: borderLayout,
        margin: [0, 0, 0, 14],
      },
      {
        table: { headerRows: 1, widths: [25, 64, '*', 46, 32, 46, 65, 43], body: tableBody },
        layout: {
          ...borderLayout,
          fillColor: (index: number) => index === 0 ? '#eeeeee' : null,
          paddingLeft: () => 3,
          paddingRight: () => 3,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        fontSize: 8,
      },
      {
        stack: document.notes ? [
          { text: 'Notes', bold: true },
          { text: document.notes, margin: [0, 3, 0, 8] },
        ] : [],
        fontSize: 8,
        margin: [0, 14, 0, 0],
      },
      {
        columns: [{ width: '*', text: '' }, { width: 242, stack: [recap] }],
        columnGap: 18,
        margin: [0, document.lines.length <= 8 && !document.notes ? 58 : 0, 0, 0],
      },
      {
        unbreakable: true,
        columns: [
          { width: '*', stack: paymentLines, fontSize: 8 },
          { width: 242, stack: [totals] },
        ],
        columnGap: 18,
        margin: [0, 0, 0, 0],
      },
    ],
    styles: {
      articleHeader: { bold: true, color: '#222222', fontSize: 8 },
      secondary: { color: '#555555', fontSize: 7 },
      totalLabel: { alignment: 'right', bold: true, fontSize: 9 },
      totalValue: { alignment: 'right', fontSize: 9 },
      grandTotal: { alignment: 'right', bold: true, fontSize: 10, fillColor: '#eeeeee' },
    },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#111111' },
  }
}

export async function generateCommercialPdf(document: CommercialPdfDocument): Promise<Buffer> {
  return pdfmake.createPdf(buildCommercialDefinition(document)).getBuffer()
}
