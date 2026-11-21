import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'

/** Lecture sémantique des PDF pdfmake/Identity-H reçus par HTTP, sans bibliothèque externe. */
export function textFromPdf(buffer: Buffer): string[] {
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-')
  const objects = new Map<number, string>()
  for (const match of buffer.toString('latin1').matchAll(/(\d+)\s+0\s+obj\s*([\s\S]*?)\s*endobj/g)) {
    objects.set(Number(match[1]), match[2])
  }
  const body = (id: number): string => {
    const value = objects.get(id)
    assert.ok(value !== undefined, `Objet PDF ${id} absent`)
    return value
  }
  const stream = (id: number): string => {
    const value = body(id)
    const parts = value.match(/stream\r?\n([\s\S]*?)\r?\nendstream/)
    assert.ok(parts, `Flux PDF ${id} absent`)
    const bytes = Buffer.from(parts[1], 'latin1')
    return /\/FlateDecode\b/.test(value.slice(0, value.indexOf('stream')))
      ? inflateSync(bytes).toString('latin1') : bytes.toString('latin1')
  }
  const unicode = (hex: string): string => {
    hex = hex.replace(/\s/g, '')
    assert.equal(hex.length % 4, 0)
    let value = ''
    for (let offset = 0; offset < hex.length; offset += 4) value += String.fromCharCode(parseInt(hex.slice(offset, offset + 4), 16))
    return value
  }
  const fontMaps = new Map<number, Map<number, string>>()
  const fontMap = (id: number): Map<number, string> => {
    const cached = fontMaps.get(id)
    if (cached) return cached
    const reference = body(id).match(/\/ToUnicode\s+(\d+)\s+0\s+R/)
    assert.ok(reference, 'La police doit définir les caractères Unicode imprimés')
    const cmap = stream(Number(reference[1]))
    const result = new Map<number, string>()
    for (const block of cmap.matchAll(/beginbfchar\s+([\s\S]*?)\s+endbfchar/g)) {
      for (const item of block[1].matchAll(/<([a-f0-9]+)>\s*<([a-f0-9\s]*)>/gi)) result.set(parseInt(item[1], 16), unicode(item[2]))
    }
    for (const block of cmap.matchAll(/beginbfrange\s+([\s\S]*?)\s+endbfrange/g)) {
      for (const item of block[1].matchAll(/<([a-f0-9]+)>\s*<([a-f0-9]+)>\s*(\[[\s\S]*?\]|<[a-f0-9\s]+>)/gi)) {
        const start = parseInt(item[1], 16), end = parseInt(item[2], 16)
        assert.ok(end >= start && end - start < 65536)
        if (item[3].startsWith('[')) {
          const values = [...item[3].matchAll(/<([a-f0-9\s]*)>/gi)].map((part) => unicode(part[1]))
          assert.equal(values.length, end - start + 1)
          values.forEach((value, index) => result.set(start + index, value))
        } else {
          const firstHex = item[3].slice(1, -1).replace(/\s/g, '')
          const first = BigInt(`0x${firstHex}`)
          for (let code = start; code <= end; code += 1) result.set(code, unicode((first + BigInt(code - start)).toString(16).padStart(firstHex.length, '0')))
        }
      }
    }
    assert.ok(result.size > 0)
    fontMaps.set(id, result)
    return result
  }
  const pageRoot = [...objects.values()].find((value) => /\/Type\s+\/Pages\b/.test(value))
  assert.ok(pageRoot)
  const kids = pageRoot.match(/\/Kids\s*\[([\s\S]*?)\]/)
  assert.ok(kids)
  const pageIds = [...kids[1].matchAll(/(\d+)\s+0\s+R/g)].map((item) => Number(item[1]))
  assert.ok(pageIds.length > 0)
  return pageIds.map((id) => {
    const page = body(id)
    const resourcesRef = page.match(/\/Resources\s+(\d+)\s+0\s+R/)
    assert.ok(resourcesRef)
    const fonts = new Map<string, Map<number, string>>()
    for (const font of body(Number(resourcesRef[1])).matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
      fonts.set(font[1], fontMap(Number(font[2])))
    }
    const contents = page.match(/\/Contents\s*(\[[\s\S]*?\]|\d+\s+0\s+R)/)
    assert.ok(contents)
    const runs: string[] = []
    for (const content of contents[1].matchAll(/(\d+)\s+0\s+R/g)) {
      const data = stream(Number(content[1]))
      for (const textBlock of data.matchAll(/\bBT\s+([\s\S]*?)\s+ET\b/g)) {
        let selected: Map<number, string> | undefined
        for (const token of textBlock[1].matchAll(/\/(F\d+)\s+-?[\d.]+\s+Tf|\[([\s\S]*?)\]\s*TJ|<([a-f0-9]+)>\s*Tj/gi)) {
          if (token[1]) { selected = fonts.get(token[1]); continue }
          assert.ok(selected, 'Une police doit précéder le texte PDF')
          const encoded = token[3] ? [token[3]] : [...token[2].matchAll(/<([a-f0-9]+)>/gi)].map((value) => value[1])
          let decoded = ''
          for (const hex of encoded) {
            assert.equal(hex.length % 4, 0)
            for (let offset = 0; offset < hex.length; offset += 4) {
              const code = parseInt(hex.slice(offset, offset + 4), 16)
              assert.ok(selected.has(code), `Caractère PDF ${code} absent de la police`)
              decoded += selected.get(code)
            }
          }
          // Le CID réservé 0 n'a pas de caractère imprimé dans les polices embarquées.
          // oxlint-disable-next-line no-control-regex
          runs.push(decoded.replace(/\u0000/g, ''))
        }
      }
    }
    return runs.join(' ').replace(/\s+/g, ' ').trim()
  })
}
