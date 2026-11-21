import { DOCUMENTS_PDF_LIMITS, type DocumentsPdfLogo } from '../schemas/parametres'

export const pdfLogoSource = (logo: DocumentsPdfLogo) => `data:${logo.mimeType};base64,${logo.data}`

function headerDimensions(bytes: Uint8Array, mimeType: DocumentsPdfLogo['mimeType']): { width: number; height: number } | null {
  if (mimeType === 'image/png') {
    if (bytes.length < 24 || ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
      throw new Error('Choisissez une image PNG ou JPEG valide.')
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) {
    throw new Error('Choisissez une image PNG ou JPEG valide.')
  }
  let offset = 2
  const sizeMarkers = new Set([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207])
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 255) break
    while (offset < bytes.length && bytes[offset] === 255) offset += 1
    const marker = bytes[offset++]
    if (marker === 217 || marker === 218) break
    if (marker === 1 || marker >= 208 && marker <= 216) continue
    if (offset + 2 > bytes.length) break
    const length = bytes[offset] * 256 + bytes[offset + 1]
    if (length < 2 || offset + length > bytes.length) break
    if (sizeMarkers.has(marker) && length >= 7) {
      return { height: bytes[offset + 3] * 256 + bytes[offset + 4], width: bytes[offset + 5] * 256 + bytes[offset + 6] }
    }
    offset += length
  }
  return null
}

function validDimensions({ width, height }: { width: number; height: number }): void {
  if (width < 1 || height < 1 || width > DOCUMENTS_PDF_LIMITS.logoDimension || height > DOCUMENTS_PDF_LIMITS.logoDimension) {
    throw new Error('Le logo doit mesurer au maximum 1 024 × 1 024 pixels.')
  }
}

function decodedDimensions(file: File, signal?: AbortSignal): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    const finish = (error?: Error) => {
      globalThis.clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
      image.onload = null
      image.onerror = null
      URL.revokeObjectURL(url)
      if (error) reject(error)
      else resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    const cancel = () => { image.src = ''; finish(new DOMException('Lecture annulée.', 'AbortError')) }
    const timer = globalThis.setTimeout(() => { image.src = ''; finish(new Error('Impossible de lire cette image. Choisissez un autre fichier.')) }, 10000)
    image.onload = () => finish()
    image.onerror = () => finish(new Error('Impossible de lire cette image. Choisissez un fichier PNG ou JPEG valide.'))
    signal?.addEventListener('abort', cancel, { once: true })
    if (signal?.aborted) cancel()
    else image.src = url
  })
}

/** Lecture locale du fichier choisi ; aucune URL distante ni chemin serveur. */
export async function readPdfLogo(file: File, signal?: AbortSignal): Promise<DocumentsPdfLogo> {
  if (file.size === 0) throw new Error('Le fichier du logo est vide.')
  if (file.size > DOCUMENTS_PDF_LIMITS.logoOctets) throw new Error('Le logo doit faire au maximum 256 Ko.')
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') throw new Error('Choisissez une image PNG ou JPEG.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (signal?.aborted) throw new DOMException('Lecture annulée.', 'AbortError')
  const declared = headerDimensions(bytes, file.type)
  if (declared) validDimensions(declared)
  validDimensions(await decodedDimensions(file, signal))
  if (signal?.aborted) throw new DOMException('Lecture annulée.', 'AbortError')
  const parts: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)))
  }
  return { mimeType: file.type, data: btoa(parts.join('')) }
}
