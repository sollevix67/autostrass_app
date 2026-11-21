import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'

export type RgbaImage = { width: number; height: number; rgba: Buffer }

/** Décode l'image RGBA8 préparée indépendamment du service de validation. */
export function rgbaFromPng(buffer: Buffer): RgbaImage {
  assert.deepEqual(buffer.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const chunks: Buffer[] = []
  let width = 0, height = 0
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      assert.equal(data[8], 8, 'Le logo préparé doit avoir huit bits par canal')
      assert.equal(data[9], 6, 'Le logo préparé doit être RGBA')
      assert.equal(data[12], 0, 'Le logo préparé doit être non entrelacé')
    }
    if (type === 'IDAT') chunks.push(data)
    offset += length + 12
  }
  assert.ok(width > 0 && height > 0 && width <= 1024 && height <= 1024)
  const rowBytes = width * 4
  const raw = inflateSync(Buffer.concat(chunks), { maxOutputLength: (rowBytes + 1) * height })
  assert.equal(raw.length, (rowBytes + 1) * height)
  const rgba = Buffer.alloc(rowBytes * height)
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (rowBytes + 1)]
    assert.ok(filter >= 0 && filter <= 4)
    for (let x = 0; x < rowBytes; x += 1) {
      const position = y * rowBytes + x
      const left = x < 4 ? 0 : rgba[position - 4]
      const up = y === 0 ? 0 : rgba[position - rowBytes]
      const corner = y === 0 || x < 4 ? 0 : rgba[position - rowBytes - 4]
      const estimate = left + up - corner
      const distances = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - corner)]
      const nearest = [left, up, corner][distances.indexOf(Math.min(...distances))]
      const adjustment = [0, left, up, Math.floor((left + up) / 2), nearest][filter]
      rgba[position] = (raw[y * (rowBytes + 1) + x + 1] + adjustment) & 255
    }
  }
  return { width, height, rgba }
}

/** Pixels RGB et masque réellement incorporés dans les PDF issus des PNG préparés. */
export function rgbaImagesFromPdf(buffer: Buffer): RgbaImage[] {
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-')
  const objects = new Map<number, string>()
  for (const object of buffer.toString('latin1').matchAll(/(\d+)\s+0\s+obj\s*([\s\S]*?)\s*endobj/g)) {
    objects.set(Number(object[1]), object[2])
  }
  const stream = (body: string): Buffer => {
    const content = body.match(/stream\r?\n([\s\S]*?)\r?\nendstream/)
    assert.ok(content, 'Le flux des pixels doit être présent')
    assert.match(body.slice(0, body.indexOf('stream')), /\/Filter\s+\/FlateDecode\b/)
    return inflateSync(Buffer.from(content[1], 'latin1'), { maxOutputLength: 1024 * 1024 * 4 })
  }
  const result: RgbaImage[] = []
  for (const body of objects.values()) {
    if (!/\/Subtype\s+\/Image\b/.test(body) || !/\/ColorSpace\s+\/DeviceRGB\b/.test(body)) continue
    const width = Number(body.match(/\/Width\s+(\d+)/)?.[1])
    const height = Number(body.match(/\/Height\s+(\d+)/)?.[1])
    assert.ok(width > 0 && height > 0 && width <= 1024 && height <= 1024)
    assert.match(body, /\/BitsPerComponent\s+8\b/)
    assert.doesNotMatch(body, /\/DecodeParms\b/, 'Les PNG RGBA incorporés sont des pixels RGB dépaquetés')
    const rgb = stream(body)
    assert.equal(rgb.length, width * height * 3)
    const maskReference = body.match(/\/SMask\s+(\d+)\s+0\s+R/)
    assert.ok(maskReference, 'Le masque alpha du logo doit être incorporé')
    const mask = objects.get(Number(maskReference[1]))
    assert.ok(mask)
    assert.match(mask, /\/ColorSpace\s+\/DeviceGray\b/)
    const alpha = stream(mask)
    assert.equal(alpha.length, width * height)
    const rgba = Buffer.alloc(width * height * 4)
    for (let pixel = 0; pixel < alpha.length; pixel += 1) {
      rgb.copy(rgba, pixel * 4, pixel * 3, pixel * 3 + 3)
      rgba[pixel * 4 + 3] = alpha[pixel]
    }
    result.push({ width, height, rgba })
  }
  return result
}
