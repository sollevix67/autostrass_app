import assert from 'node:assert/strict'
import pdfmake from 'pdfmake'

export type PdfTable = { body: unknown[][]; headerRows?: number }
export type RenderedPdfText = { text: string; x: number; y: number; width: number; height: number }
export type RenderedPdfPage = { width: number; height: number; texts: RenderedPdfText[] }
type InspectablePdfOutput = {
  getBuffer(): Promise<Buffer>
  getStream(): Promise<{
    _pdfMakePages: Array<{
      pageSize: { width: number; height: number }
      items: Array<{ type: string; item: {
        x: number; y: number; inlines: Array<{ text: string }>
        getWidth(): number; getHeight(): number
      } }>
    }>
  }>
}

/** Texte visible uniquement : les propriétés de style et les indices de mise en page sont ignorés. */
export function pdfText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(pdfText).filter(Boolean).join(' ')
  if (!value || typeof value !== 'object') return ''
  const node = value as Record<string, unknown>
  return [node.text, node.content, node.stack, node.columns, node.table, node.body]
    .map(pdfText).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function pdfTables(value: unknown): PdfTable[] {
  if (Array.isArray(value)) return value.flatMap(pdfTables)
  if (!value || typeof value !== 'object') return []
  const node = value as Record<string, unknown>
  const own = node.table && typeof node.table === 'object' && Array.isArray((node.table as PdfTable).body)
    ? [node.table as PdfTable] : []
  return [...own, ...[node.content, node.stack, node.columns, node.table, node.body].flatMap(pdfTables)]
}

export function tableByHeaders(value: unknown, headers: string[]): PdfTable {
  const found = pdfTables(value).find((table) => headers.every((header) => table.body[0]?.some((cell) => pdfText(cell) === header)))
  assert.ok(found, `Tableau absent : ${headers.join(', ')}`)
  return found
}

export function assertLabeledPdfValue(value: unknown, label: string, expected: string) {
  const found = pdfTables(value).flatMap((table) => table.body)
    .find((row) => pdfText(row[0]) === label && row.slice(1).some((cell) => pdfText(cell) === expected))
  assert.ok(found, `${label} doit conserver ${expected}`)
}

export function evaluatePdfCallback(value: unknown, page: number, pages: number): unknown {
  return typeof value === 'function' ? value(page, pages, { width: 595.28, height: 841.89 }) : value
}

export function visiblePdfDefinition(definition: Record<string, unknown>, page = 1, pages = 1): string {
  return pdfText([definition.content, evaluatePdfCallback(definition.header, page, pages), evaluatePdfCallback(definition.footer, page, pages)])
}

export function verifyPdf(buffer: Buffer) {
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-')
  assert.match(buffer.subarray(-32).toString(), /%%EOF/)
  assert.match(buffer.toString('latin1'), /\/BaseFont \/[A-Z]+\+Roboto/)
}

/** Les pages sont celles effectivement composées et transmises par pdfmake au moteur PDF. */
export async function renderedPdfPages(output: InspectablePdfOutput): Promise<RenderedPdfPage[]> {
  const document = await output.getStream()
  assert.ok(Array.isArray(document._pdfMakePages), 'Le moteur PDF doit exposer les pages réellement composées')
  return document._pdfMakePages.map((page) => ({
    width: page.pageSize.width,
    height: page.pageSize.height,
    texts: page.items.filter((item) => item.type === 'line').map(({ item }) => ({
      text: item.inlines.map((inline) => inline.text).join('').replace(/\s+/g, ' ').trim(),
      x: item.x, y: item.y, width: item.getWidth(), height: item.getHeight(),
    })).filter((item) => item.text.length > 0),
  }))
}

export function capturePdfDefinitions() {
  const original = pdfmake.createPdf
  const records: Array<{ definition: Record<string, unknown>; output: InspectablePdfOutput }> = []
  pdfmake.createPdf = (definition) => {
    const output = original.call(pdfmake, definition) as InspectablePdfOutput
    records.push({ definition, output })
    return output
  }
  return {
    records,
    latest() {
      const record = records.at(-1)
      assert.ok(record, 'Un PDF doit avoir été généré')
      return record
    },
    restore() { pdfmake.createPdf = original },
  }
}

export function assertCommercialPages(pages: RenderedPdfPage[], numero: string) {
  assert.ok(pages.length > 0)
  for (const [index, page] of pages.entries()) {
    assert.ok(Math.abs(page.width - 595.28) < 0.5 && Math.abs(page.height - 841.89) < 0.5, 'Format A4 portrait')
    const texts = page.texts.map((item) => item.text)
    assert.ok(texts.some((text) => text.includes(numero)), `Numéro absent de la page ${index + 1}`)
    assert.ok(texts.includes(`Page n° ${index + 1}/${pages.length}`), `Pagination réelle absente de la page ${index + 1}`)
    for (const text of page.texts) {
      assert.ok(Number.isFinite(text.x + text.y + text.width + text.height), `Position PDF invalide : ${text.text}`)
      assert.ok(text.x >= -0.5 && text.y >= -0.5 && text.x + text.width <= page.width + 0.5 && text.y + text.height <= page.height + 0.5, `Texte hors de la page ${index + 1} : ${text.text}`)
    }
    for (let first = 0; first < page.texts.length; first += 1) {
      const a = page.texts[first]
      for (let second = first + 1; second < page.texts.length; second += 1) {
        const b = page.texts[second]
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
        assert.ok(overlapX <= 0.5 || overlapY <= 0.5, `Textes superposés page ${index + 1} : ${a.text} / ${b.text}`)
      }
    }
    if (texts.some((text) => /^REF-\d+/.test(text))) {
      for (const header of ['Qté', 'Référence', 'Désignation', 'Remise']) assert.ok(texts.includes(header), `Colonne ${header} non répétée page ${index + 1}`)
    }
  }
  for (const label of ['Total HT', 'Total TTC']) {
    const recapPages = pages.flatMap((page, index) => page.texts.some((text) => text.text === label) ? [index] : [])
    assert.deepEqual(recapPages, [pages.length - 1], `${label} doit apparaître une fois sur la dernière page`)
  }
  const finalTexts = pages.at(-1)!.texts
  const start = finalTexts.find((text) => text.text === 'Total HT')!
  const end = finalTexts.find((text) => text.text === 'Total TTC')!
  assert.ok(finalTexts.some((text) => text.text === 'TVA' && text.y > start.y && text.y < end.y), 'La TVA globale doit rester entre les deux totaux sur la dernière page')
}
