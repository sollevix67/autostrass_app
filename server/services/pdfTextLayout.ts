import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require_ = createRequire(import.meta.url)
const pdfmakeRequire = createRequire(require_.resolve('pdfmake'))
const pdfkitRequire = createRequire(pdfmakeRequire.resolve('pdfkit'))
const fontkit = pdfkitRequire('fontkit') as {
  create(buffer: Buffer): {
    unitsPerEm: number
    ascent: number
    descent: number
    lineGap: number
    layout(text: string): { positions: Array<{ xAdvance: number }> }
  }
}
const fonts: Record<string, Record<string, string>> = require_('pdfmake/fonts/Roboto.js')
const regularFont = fontkit.create(readFileSync(fonts.Roboto.normal))
const boldFont = fontkit.create(readFileSync(fonts.Roboto.bold))
const segmenter = new Intl.Segmenter('fr', { granularity: 'grapheme' })

/** Mesure les mêmes polices que PDFKit, sans approximation par nombre de caractères. */
export function pdfTextWidth(text: string, fontSize: number, bold = false): number {
  const font = bold ? boldFont : regularFont
  return font.layout(text).positions.reduce((width, position) => width + position.xAdvance, 0) * fontSize / font.unitsPerEm
}

export function pdfLineHeight(fontSize: number, bold = false): number {
  const font = bold ? boldFont : regularFont
  return (font.ascent - font.descent + font.lineGap) * fontSize / font.unitsPerEm
}

/** Précompose des lignes complètes ; aucun caractère ni saut de ligne n'est tronqué. */
export function wrapPdfText(text: string, width: number, fontSize: number, bold = false): string[] {
  const lines: string[] = []
  for (const original of text.split('\n')) {
    let current = ''
    for (const { segment } of segmenter.segment(original)) {
      if (current && pdfTextWidth(current + segment, fontSize, bold) > width) {
        const space = current.lastIndexOf(' ')
        if (space > 0) {
          lines.push(current.slice(0, space + 1))
          current = current.slice(space + 1)
        } else {
          lines.push(current)
          current = ''
        }
      }
      if (current && pdfTextWidth(current + segment, fontSize, bold) > width) {
        lines.push(current)
        current = ''
      }
      current += segment
    }
    lines.push(current)
  }
  return lines
}
