/** Lancé par createTestEnvironment.runScript : ne cible que sa base dédiée. */
import { equal, ok } from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { verifyFiscalArchive } from './archive-fiscal.js'
import mysql from 'mysql2/promise'
import { fingerprintVente } from '../server/middleware/compliance.js'

if (process.env.NODE_ENV !== 'test' || !/^autostrass_transfer_test_[a-f0-9]{16}$/.test(process.env.DB_NAME ?? '')) {
  throw new Error('Cette recette doit être lancée depuis le harnais de base jetable.')
}
const output = await mkdtemp(resolve(tmpdir(), 'autostrass-fiscal-archive-test-'))
async function command(args: string[]) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/archive-fiscal.ts', ...args], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let text = ''
  child.stdout.on('data', (chunk) => { text += chunk.toString() })
  child.stderr.on('data', (chunk) => { text += chunk.toString() })
  const status = await new Promise<number | null>((finish, reject) => {
    child.once('error', reject)
    child.once('exit', finish)
  })
  equal(status, 0, text)
}
try {
  const baseUrl = process.env.API_URL!
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'sophie.bernard@autostrass.fr', motDePasse: 'demo1234' }),
  })
  equal(login.status, 200)
  const cookie = login.headers.getSetCookie().map((part) => part.split(';')[0]).join('; ')
  const csrf = decodeURIComponent(cookie.match(/autostrass_csrf=([^;]+)/)![1])
  const headers = { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' }
  const current = await fetch(`${baseUrl}/api/caisse/actuelle`, { headers })
  if (!await current.json()) {
    const opening = await fetch(`${baseUrl}/api/caisse/ouvrir`, { method: 'POST', headers, body: JSON.stringify({ fondsCaisse: 0 }) })
    equal(opening.status, 201)
  }
  for (const dateVente of ['2025-12-31T10:00:00Z', '2026-01-01T10:00:00Z']) {
    const sale = await fetch(`${baseUrl}/api/ventes`, {
      method: 'POST', headers,
      body: JSON.stringify({ dateVente, modePaiement: 'espèces', montantPaye: 10, articles: [{ reference: 'PLA-2841', designation: 'Archive', quantite: 1, prixUnitaire: 1 }] }),
    })
    equal(sale.status, 201, await sale.text())
  }
  await command(['2026', output])
  const file = resolve(output, 'ventes-2026.jsonl')
  const archive = verifyFiscalArchive(await readFile(file, 'utf8'))
  ok(archive.ventes > 0)
  equal(archive.controle.intacte, true)
  await command(['--verifier', file])
  console.log('Archive SQL annuelle v2 et relecture CLI/SHA-256 réussies avec chaînon interannées.')
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME })
  try {
    const [last] = await connection.query<mysql.RowDataPacket[]>('SELECT id, fingerprint FROM ventes ORDER BY id DESC LIMIT 1')
    let previous = String(last[0].fingerprint)
    const firstId = Number(last[0].id) + 1
    for (let offset = 0; offset < 5001; offset += 250) {
      const heads: unknown[][] = []
      const lines: unknown[][] = []
      for (let index = offset; index < Math.min(5001, offset + 250); index += 1) {
        const id = firstId + index
        const fixture = { id, sessionId: null, dateVente: '2026-11-14T12:00:00Z', caissier: 'Fixture fiscale', modePaiement: 'carte', totalHT: 0, totalTVA: 0, totalTTC: 0, fingerprintVersion: 2, montantPaye: 0, monnaie: 0, articles: [{ reference: 'TEST-FISCAL', designation: 'Recette', quantite: 1, prixUnitaire: 0, tauxTva: 20 }] }
        previous = fingerprintVente(fixture, previous)
        heads.push([id, '2026-11-14 12:00:00', fixture.caissier, previous])
        lines.push([id, 1, 'TEST-FISCAL', 'Recette', 1, 0, 20, 0])
      }
      await connection.query('INSERT INTO ventes(id,date_vente,caissier,fingerprint,fingerprint_version,total_ht,total_tva,total_ttc,montant_paye,monnaie,mode_paiement) VALUES ' + heads.map(() => '(?,?,?,?,2,0,0,0,0,0,\'carte\')').join(','), heads.flat())
      await connection.query('INSERT INTO vente_lines(vente_id,ligne,reference,designation,quantite,prix_unitaire,taux_tva,montant) VALUES ?', [lines])
    }
    const intact = await fetch(`${baseUrl}/api/nf525/controle`, { headers })
    equal(intact.status, 200, await intact.text())
    const lastId = firstId + 5000
    await connection.execute('UPDATE ventes SET total_ttc=1 WHERE id=?', [lastId])
    for (const query of ['', '?limite=5000']) {
      const broken = await fetch(`${baseUrl}/api/nf525/controle${query}`, { headers })
      equal(broken.status, 409)
      equal((await broken.json()).details.rupture, lastId)
    }
    await connection.execute('UPDATE ventes SET total_ttc=0, fingerprint=NULL WHERE id=?', [lastId])
    const missing = await fetch(`${baseUrl}/api/nf525/controle`, { headers })
    equal(missing.status, 409)
    equal((await missing.json()).details.rupture, lastId)
    console.log('Route SQL réelle : chaîne >5000 contrôlée entièrement, dernière altération et empreinte absente détectées.')
  } finally { await connection.end() }
} finally {
  const target = resolve(output)
  const parent = resolve(tmpdir())
  if (target.startsWith(`${parent}\\autostrass-fiscal-archive-test-`) || target.startsWith(`${parent}/autostrass-fiscal-archive-test-`)) {
    await rm(target, { recursive: true, force: true })
  }
}
