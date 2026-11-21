import { deflateSync } from 'node:zlib'
import type { DocumentsPdfLogo } from '../../src/schemas/parametres.js'

export function pngCrc32(value: Buffer): number {
  let crc = 0xffffffff
  for (const octet of value) {
    crc ^= octet
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function pngChunk(type: string, data: Buffer): Buffer {
  const tag = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(pngCrc32(Buffer.concat([tag, data])))
  return Buffer.concat([length, tag, data, crc])
}

/** Petite image réelle produite localement, jamais dérivée d'un fichier utilisateur. */
export function makePng(width = 32, height = 32): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  const pixels = Buffer.alloc((width * 4 + 1) * height)
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const offset = row * (width * 4 + 1) + 1 + column * 4
      pixels[offset] = 30
      pixels[offset + 1] = 64
      pixels[offset + 2] = 175
      pixels[offset + 3] = 255
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(pixels)), pngChunk('IEND', Buffer.alloc(0)),
  ])
}

export function makePngLogo(width = 32, height = 32): DocumentsPdfLogo {
  return { mimeType: 'image/png', data: makePng(width, height).toString('base64') }
}

/** Palette transparente compacte ; le cas 8 × 1 reproduit la régression PDFKit. */
export function makePalettePng(depth: 1 | 2 | 4 = 1, width = 8, height = 1, interlaced = false, mixed = false) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width)
  header.writeUInt32BE(height, 4)
  header[8] = depth
  header[9] = 3
  header[12] = interlaced ? 1 : 0
  const palette = Buffer.from([240, 10, 10, 30, 64, 175])
  const rgba = Buffer.alloc(width * height * 4)
  const indexAt = (x: number, y: number) => mixed && (x + y) % 2 === 0 ? 0 : 1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = indexAt(x, y), offset = (y * width + x) * 4
      palette.copy(rgba, offset, index * 3, index * 3 + 3)
      rgba[offset + 3] = index ? 255 : 0
    }
  }
  const passes = interlaced
    ? [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]]
    : [[0, 0, 1, 1]]
  const rows: Buffer[] = []
  for (const [startX, startY, stepX, stepY] of passes) {
    const passWidth = Math.max(0, Math.ceil((width - startX) / stepX))
    if (!passWidth) continue
    for (let y = startY; y < height; y += stepY) {
      const row = Buffer.alloc(1 + Math.ceil(passWidth * depth / 8))
      for (let column = 0; column < passWidth; column += 1) {
        const bit = column * depth
        row[1 + Math.floor(bit / 8)] |= indexAt(startX + column * stepX, y) << (8 - depth - bit % 8)
      }
      rows.push(row)
    }
  }
  const bytes = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header),
    pngChunk('PLTE', palette), pngChunk('tRNS', Buffer.from([0, 255])),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))), pngChunk('IEND', Buffer.alloc(0)),
  ])
  return { bytes, rgba, width, height, logo: { mimeType: 'image/png' as const, data: bytes.toString('base64') } }
}

/** Enrichit un PNG avec une métadonnée neutre pour exercer la limite de taille réelle. */
export function pngAtByteLength(size: number): Buffer {
  const image = makePng(1, 1)
  const bytes = size - image.length - 12
  if (bytes < 2) throw new Error('Taille insuffisante pour une métadonnée PNG.')
  const metadata = Buffer.alloc(bytes, 65)
  metadata[0] = 84
  metadata[1] = 0
  return Buffer.concat([image.subarray(0, -12), pngChunk('tEXt', metadata), image.subarray(-12)])
}

export async function makeJpegLogo(width = 16, height = 16): Promise<DocumentsPdfLogo> {
  const { encode } = await import('jpeg-js')
  const data = Buffer.alloc(width * height * 4)
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = 30
    data[offset + 1] = 64
    data[offset + 2] = 175
    data[offset + 3] = 255
  }
  return { mimeType: 'image/jpeg', data: Buffer.from(encode({ width, height, data }, 80).data).toString('base64') }
}
