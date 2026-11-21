import { createHash } from 'node:crypto'
import { deflateSync, inflateSync } from 'node:zlib'
import jpeg from 'jpeg-js'
import {
  documentsPdfSettingsSchema,
  DOCUMENTS_PDF_LIMITS,
  type DocumentsPdfSettings,
  type DocumentsPdfLogo,
} from '../../src/schemas/parametres.js'

export class DocumentsPdfLogoError extends Error {
  readonly status = 422
  readonly code = 'VALIDATION_ERROR'
  constructor(message: string) {
    super(message)
    this.name = 'DocumentsPdfLogoError'
  }
}

export type PreparedDocumentsPdfLogo = { dataUri: string; width: number; height: number }
const preparedLogos = new Map<string, PreparedDocumentsPdfLogo>()
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  return crc >>> 0
})

function invalidLogo(): never { throw new DocumentsPdfLogoError('Le logo est invalide ou corrompu. Choisissez une image PNG ou JPEG valide.') }
function checkDimensions(width: number, height: number) {
  if (width < 1 || height < 1 || width > DOCUMENTS_PDF_LIMITS.logoDimension || height > DOCUMENTS_PDF_LIMITS.logoDimension) {
    throw new DocumentsPdfLogoError('Le logo doit mesurer au maximum 1 024 × 1 024 pixels.')
  }
}
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const chunk = Buffer.alloc(data.length + 12)
  chunk.writeUInt32BE(data.length)
  chunk.write(type, 4, 'ascii')
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(chunk.subarray(4, chunk.length - 4)), chunk.length - 4)
  return chunk
}

function pngSample(row: Buffer, index: number, depth: number): number {
  if (depth === 16) return row.readUInt16BE(index * 2)
  if (depth === 8) return row[index]
  return row[Math.floor(index * depth / 8)] >>> (8 - depth - index * depth % 8) & (2 ** depth - 1)
}

function pngLogo(bytes: Buffer): PreparedDocumentsPdfLogo {
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(pngSignature)) invalidLogo()
  let offset = 8
  let width = 0
  let height = 0
  let depth = 0
  let color = -1
  let interlace = 0
  let paletteEntries = 0
  let palette: Buffer = Buffer.alloc(0)
  let indexedAlpha: Buffer = Buffer.alloc(0)
  let transparentGray: number | null = null
  let transparentRgb: number[] | null = null
  let sawData = false
  let endedData = false
  let ended = false
  let transparency = false
  const compressed: Buffer[] = []
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) invalidLogo()
    const length = bytes.readUInt32BE(offset)
    const end = offset + 12 + length
    if (end > bytes.length) invalidLogo()
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    if (!/^[A-Za-z]{4}$/.test(type) || crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) invalidLogo()
    const data = bytes.subarray(offset + 8, end - 4)
    if (offset === 8 && type !== 'IHDR') invalidLogo()
    if (sawData && type !== 'IDAT') endedData = true
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13) invalidLogo()
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      checkDimensions(width, height)
      depth = data[8]
      color = data[9]
      interlace = data[12]
      const depths: Record<number, number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] }
      if (!depths[color]?.includes(depth) || data[10] !== 0 || data[11] !== 0 || interlace > 1) invalidLogo()
    } else if (type === 'PLTE') {
      if (sawData || paletteEntries || color === 0 || color === 4 || length < 3 || length > 768 || length % 3) invalidLogo()
      paletteEntries = length / 3
      palette = data
      if (color === 3 && paletteEntries > 2 ** depth) invalidLogo()
    } else if (type === 'tRNS') {
      if (sawData || transparency || color === 4 || color === 6) invalidLogo()
      transparency = true
      if (color === 3 && (!paletteEntries || length < 1 || length > paletteEntries)) invalidLogo()
      if (color === 0 && (length !== 2 || data.readUInt16BE(0) >= 2 ** depth)) invalidLogo()
      if (color === 2 && (length !== 6 || [0, 2, 4].some((position) => data.readUInt16BE(position) >= 2 ** depth))) invalidLogo()
      if (color === 3) indexedAlpha = data
      if (color === 0) transparentGray = data.readUInt16BE(0)
      if (color === 2) transparentRgb = [0, 2, 4].map((position) => data.readUInt16BE(position))
    } else if (type === 'IDAT') {
      if (endedData || color === 3 && !paletteEntries) invalidLogo()
      sawData = true
      compressed.push(data)
    } else if (type === 'IEND') {
      if (length !== 0 || end !== bytes.length || !sawData) invalidLogo()
      ended = true
    } else if (type === 'acTL' || type === 'fdAT' || type === 'fcTL' || (type.charCodeAt(0) & 32) === 0) {
      invalidLogo()
    }
    offset = end
  }
  if (!ended) invalidLogo()
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[color]
  const passes = interlace ? [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]] : [[0, 0, 1, 1]]
  const sizes = passes.map(([x, y, dx, dy]) => ({
    x, y, dx, dy,
    width: Math.max(0, Math.ceil((width - x) / dx)), height: Math.max(0, Math.ceil((height - y) / dy)),
  })).filter((pass) => pass.width && pass.height)
  const expected = sizes.reduce((size, pass) => size + (Math.ceil(pass.width * channels * depth / 8) + 1) * pass.height, 0)
  const packed = Buffer.concat(compressed)
  let raw: Buffer
  try {
    const result = inflateSync(packed, { maxOutputLength: expected + 1, info: true } as never) as unknown as { buffer: Buffer; engine: { bytesWritten: number } }
    if (result.buffer.length !== expected || result.engine.bytesWritten !== packed.length) invalidLogo()
    raw = result.buffer
  } catch { invalidLogo() }
  let position = 0
  const bytesPerPixel = Math.max(1, Math.ceil(channels * depth / 8))
  const rgba = Buffer.alloc(width * height * 4)
  const maximumSample = 2 ** depth - 1
  const toByte = (sample: number) => Math.round(sample * 255 / maximumSample)
  for (const pass of sizes) {
    const rowBytes = Math.ceil(pass.width * channels * depth / 8)
    let previous = Buffer.alloc(rowBytes)
    for (let row = 0; row < pass.height; row += 1) {
      const filter = raw[position++]
      if (filter > 4) invalidLogo()
      const current = Buffer.alloc(rowBytes)
      for (let column = 0; column < rowBytes; column += 1) {
        const left = column < bytesPerPixel ? 0 : current[column - bytesPerPixel]
        const up = previous[column]
        const upperLeft = column < bytesPerPixel ? 0 : previous[column - bytesPerPixel]
        const prediction = left + up - upperLeft
        const paeth = Math.abs(prediction - left) <= Math.abs(prediction - up) && Math.abs(prediction - left) <= Math.abs(prediction - upperLeft)
          ? left : Math.abs(prediction - up) <= Math.abs(prediction - upperLeft) ? up : upperLeft
        const adjustment = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth
        current[column] = (raw[position++] + adjustment) & 255
      }
      for (let pixel = 0; pixel < pass.width; pixel += 1) {
        const sample = pixel * channels
        const destination = ((pass.y + row * pass.dy) * width + pass.x + pixel * pass.dx) * 4
        let alpha = 255
        if (color === 3) {
          const index = pngSample(current, pixel, depth)
          if (index >= paletteEntries) invalidLogo()
          rgba[destination] = palette[index * 3]
          rgba[destination + 1] = palette[index * 3 + 1]
          rgba[destination + 2] = palette[index * 3 + 2]
          alpha = indexedAlpha[index] ?? 255
        } else if (color === 0 || color === 4) {
          const gray = pngSample(current, sample, depth)
          const value = toByte(gray)
          rgba[destination] = value
          rgba[destination + 1] = value
          rgba[destination + 2] = value
          alpha = color === 4 ? toByte(pngSample(current, sample + 1, depth)) : gray === transparentGray ? 0 : 255
        } else {
          const red = pngSample(current, sample, depth)
          const green = pngSample(current, sample + 1, depth)
          const blue = pngSample(current, sample + 2, depth)
          rgba[destination] = toByte(red)
          rgba[destination + 1] = toByte(green)
          rgba[destination + 2] = toByte(blue)
          alpha = color === 6 ? toByte(pngSample(current, sample + 3, depth))
            : transparentRgb && red === transparentRgb[0] && green === transparentRgb[1] && blue === transparentRgb[2] ? 0 : 255
        }
        rgba[destination + 3] = alpha
      }
      previous = current
    }
  }
  // PDFKit/png-js ne dépaquette pas correctement les palettes transparentes <8 bits.
  // Toute image validée est réencodée en RGBA8, sans entrelacement ni métadonnées.
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  const scanlines = Buffer.alloc((width * 4 + 1) * height)
  for (let row = 0; row < height; row += 1) rgba.copy(scanlines, row * (width * 4 + 1) + 1, row * width * 4, (row + 1) * width * 4)
  const normalized = Buffer.concat([
    pngSignature, pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(scanlines, { level: 9 })), pngChunk('IEND', Buffer.alloc(0)),
  ])
  return { width, height, dataUri: `data:image/png;base64,${normalized.toString('base64')}` }
}

function jpegOrientation(bytes: Buffer): number {
  let offset = 2
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 255) invalidLogo()
    while (bytes[offset] === 255) offset += 1
    const marker = bytes[offset++]
    if (marker === 0xda || marker === 0xd9) return 1
    if (marker === 1 || marker >= 0xd0 && marker <= 0xd8) continue
    if (offset + 2 > bytes.length) invalidLogo()
    const length = bytes.readUInt16BE(offset)
    const end = offset + length
    if (length < 2 || end > bytes.length) invalidLogo()
    if (marker === 0xe1 && length >= 8 && bytes.toString('binary', offset + 2, offset + 8) === 'Exif\u0000\u0000') {
      const start = offset + 8
      if (start + 8 > end) invalidLogo()
      const order = bytes.toString('ascii', start, start + 2)
      if (order !== 'II' && order !== 'MM') invalidLogo()
      const read16 = (position: number) => order === 'II' ? bytes.readUInt16LE(position) : bytes.readUInt16BE(position)
      const read32 = (position: number) => order === 'II' ? bytes.readUInt32LE(position) : bytes.readUInt32BE(position)
      if (read16(start + 2) !== 42) invalidLogo()
      const directory = start + read32(start + 4)
      if (directory < start || directory + 2 > end) invalidLogo()
      const entries = read16(directory)
      for (let index = 0; index < entries; index += 1) {
        const position = directory + 2 + index * 12
        if (position + 12 > end) invalidLogo()
        if (read16(position) === 0x0112) {
          const orientation = read16(position + 8)
          return orientation >= 1 && orientation <= 8 ? orientation : 1
        }
      }
      return 1
    }
    offset = end
  }
  return 1
}

function jpegLogo(bytes: Buffer): PreparedDocumentsPdfLogo {
  if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) invalidLogo()
  let offset = 2
  let width = 0
  let height = 0
  while (offset < bytes.length - 2) {
    if (bytes[offset++] !== 255) invalidLogo()
    while (bytes[offset] === 255) offset += 1
    const marker = bytes[offset++]
    if (marker === 1) continue
    if (offset + 2 > bytes.length) invalidLogo()
    const length = bytes.readUInt16BE(offset)
    if (length < 2 || offset + length > bytes.length) invalidLogo()
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8 || bytes[offset + 2] !== 8) invalidLogo()
      height = bytes.readUInt16BE(offset + 3)
      width = bytes.readUInt16BE(offset + 5)
      checkDimensions(width, height)
      break
    }
    if (marker === 0xda || marker === 0xd9) invalidLogo()
    offset += length
  }
  if (!width || !height) invalidLogo()
  try {
    const decoded = jpeg.decode(bytes, {
      useTArray: true, formatAsRGBA: true, tolerantDecoding: false,
      maxResolutionInMP: 1.1, maxMemoryUsageInMB: 32,
    })
    if (decoded.width !== width || decoded.height !== height || decoded.data.length !== width * height * 4) invalidLogo()
  } catch { invalidLogo() }
  const rotate = jpegOrientation(bytes) > 4
  return { width: rotate ? height : width, height: rotate ? width : height, dataUri: `data:image/jpeg;base64,${bytes.toString('base64')}` }
}

/** Validation effective, indépendante du stockage et limitée à une image embarquée. */
export function prepareDocumentsPdfLogo(logo: DocumentsPdfLogo): PreparedDocumentsPdfLogo {
  const bytes = Buffer.from(logo.data, 'base64')
  if (bytes.length < 1 || bytes.length > DOCUMENTS_PDF_LIMITS.logoOctets || bytes.toString('base64') !== logo.data) invalidLogo()
  const key = createHash('sha256').update(logo.mimeType).update(bytes).digest('hex')
  const known = preparedLogos.get(key)
  if (known) return known
  const prepared = Object.freeze(logo.mimeType === 'image/png' ? pngLogo(bytes) : logo.mimeType === 'image/jpeg' ? jpegLogo(bytes) : invalidLogo())
  if (preparedLogos.size >= 4) preparedLogos.delete(preparedLogos.keys().next().value!)
  preparedLogos.set(key, prepared)
  return prepared
}

export function validateDocumentsPdfSettings(settings: DocumentsPdfSettings): DocumentsPdfSettings {
  const values = documentsPdfSettingsSchema.parse(settings)
  if (values.logo) prepareDocumentsPdfLogo(values.logo)
  return values
}
