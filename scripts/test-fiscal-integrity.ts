import { deepEqual, equal, ok, rejects, throws } from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  fingerprintVente, GENESIS_HASH, scanFingerprints, verifyFingerprints, type FingerprintedSale,
} from '../server/middleware/compliance.js'
import { FiscalArchiveBuilder, verifyFiscalArchive } from './archive-fiscal.js'

let groups = 0
function pass(label: string) { groups++; console.log(`OK ${label}`) }

function sale(id: number, dateVente = '2026-01-01T12:00:00.000Z'): FingerprintedSale {
  return {
    id, sessionId: 1, dateVente, caissier: 'Test', modePaiement: 'espèces',
    totalHT: 10, montantPaye: 20, monnaie: 10, fingerprint: null,
    articles: [{ reference: 'A', designation: 'Article', quantite: 1, prixUnitaire: 10 }],
  }
}
function sealedChain(ventes: FingerprintedSale[]): FingerprintedSale[] {
  let previous = GENESIS_HASH
  return ventes.map((vente) => {
    const fingerprint = fingerprintVente(vente, previous)
    previous = fingerprint
    return { ...vente, fingerprint }
  })
}
function archive(year: number, ventes: FingerprintedSale[]): string {
  const builder = new FiscalArchiveBuilder(year)
  for (const vente of ventes) builder.add(vente)
  return builder.finish()
}
function changeArchive(content: string, mutate: (entries: any[]) => void): string {
  const entries = content.trim().split('\n').map((line) => JSON.parse(line))
  mutate(entries)
  return entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n'
}

const old = sale(1)
equal(fingerprintVente(old, GENESIS_HASH), createHash('sha256').update(
  `${GENESIS_HASH}~1~1~2026-01-01~Test~espèces~1000~2000~1000~A|Article|1|1000`, 'utf8',
).digest('hex'))
equal(fingerprintVente({ ...old, fingerprintVersion: 1, totalTVA: null, totalTTC: null }, GENESIS_HASH), fingerprintVente(old, GENESIS_HASH))
pass('Empreinte v1 conservée à l\'identique et champs nouveaux ignorés pour l\'historique')

const recent = {
  ...sale(2), fingerprintVersion: 2, totalTVA: 2, totalTTC: 12, montantPaye: 20, monnaie: 8,
  articles: [{ ...sale(2).articles[0], tauxTva: 20 }],
}
const mixed = sealedChain([old, recent])
ok(verifyFingerprints(JSON.parse(JSON.stringify(mixed))).intacte)
for (const update of [
  { ...mixed[1], totalTVA: 3 }, { ...mixed[1], totalTTC: 13 },
  { ...mixed[1], articles: [{ ...mixed[1].articles[0], tauxTva: 5.5 }] },
  { ...mixed[1], fingerprintVersion: 1 }, { ...mixed[1], totalTTC: null },
]) equal(verifyFingerprints([mixed[0], update]).rupture, 2)
throws(() => fingerprintVente({ ...recent, fingerprintVersion: 3 }, GENESIS_HASH), /inconnue/)
pass('Chaîne mixte v1/v2 relisible ; altérations TVA, TTC, taux ou version détectées')

deepEqual(verifyFingerprints([]), { intacte: true, rupture: null, anterieures: 0 })
equal(verifyFingerprints([{ ...mixed[0], fingerprint: null }]).rupture, 1)
equal(verifyFingerprints([mixed[0], { ...mixed[1], fingerprint: null }]).rupture, 2)
const historic = [sale(1), sale(2), ...sealedChain([sale(3), sale(4)])]
deepEqual(verifyFingerprints(historic), { intacte: true, rupture: null, anterieures: 2 })
equal(verifyFingerprints([...historic, sale(5)]).rupture, 5)
equal(verifyFingerprints([mixed[1], mixed[0]]).rupture, 2)
equal(verifyFingerprints([mixed[0], mixed[0]]).rupture, 1)
pass('Absences récentes, chaîne entièrement non scellée et ordre invalide refusés ; vrai préfixe historique conservé')

const missingRecent = { ...recent, id: 1, fingerprint: null }
const restartedRecent = sealedChain([{ ...recent, id: 2 }])[0]
equal(verifyFingerprints([missingRecent, restartedRecent]).rupture, 1)
const recentAfterMissing = await scanFingerprints(async (after, size) => (
  [missingRecent, restartedRecent].filter((vente) => vente.id > after).slice(0, size)
), 1)
equal(recentAfterMissing.rupture, 1)
equal(recentAfterMissing.anterieures, 0)
throws(() => archive(2026, [missingRecent, restartedRecent]), /rompue.*#1/)
const falseHistoricArchive = [
  {
    type: 'autostrass-fiscal-archive', version: 2, annee: 2026, ancrage: null,
    premiereEmpreinte: restartedRecent, ventes: 2, chainons: 0, premiereVente: 1, derniereVente: 2,
  },
  missingRecent, restartedRecent,
].map((entry) => JSON.stringify(entry)).join('\n') + '\n'
equal(verifyFiscalArchive(falseHistoricArchive).controle.rupture, 1)
const falseHistoricAnchor = [
  {
    type: 'autostrass-fiscal-archive', version: 2, annee: 2026,
    ancrage: { vente: { ...missingRecent, dateVente: '2025-12-31T12:00:00Z' }, empreintePrecedente: GENESIS_HASH },
    premiereEmpreinte: restartedRecent, ventes: 1, chainons: 0, premiereVente: 2, derniereVente: 2,
  },
  restartedRecent,
].map((entry) => JSON.stringify(entry)).join('\n') + '\n'
throws(() => verifyFiscalArchive(falseHistoricAnchor), /ancrage/)
pass('Absence d\'empreinte v2 refusée avant une nouvelle genèse, dans les lots et dans l\'archive annuelle')

const many = sealedChain(Array.from({ length: 5001 }, (_, i) => sale(i + 1)))
many[5000] = { ...many[5000], totalHT: 11 }
for (const size of [1, 2, 5000]) {
  let calls = 0
  const result = await scanFingerprints(async (after, batchSize) => {
    calls++
    return many.filter((vente) => vente.id > after).slice(0, batchSize)
  }, size)
  equal(result.rupture, 5001)
  equal(result.verifiees, 5000)
  equal(result.derniereVente, 5001)
  ok(calls >= Math.ceil(5001 / size))
}
const paginatedHistory = await scanFingerprints(async (after, size) => historic.filter((vente) => vente.id > after).slice(0, size), 1)
equal(paginatedHistory.anterieures, 2)
ok(paginatedHistory.intacte)
await rejects(scanFingerprints(async () => { throw new Error('Lecture SQL interrompue') }), /interrompue/)
await rejects(scanFingerprints(async () => [], 0), /taille/)
pass('Rupture sur la vente 5001 détectée pour trois tailles de lot ; historique traverse les pages ; panne de lecture propagée')

const twoYears = sealedChain([sale(1, '2025-12-31T12:00:00Z'), recent])
const annual = archive(2026, twoYears)
deepEqual(verifyFiscalArchive(annual), {
  controle: { intacte: true, rupture: null, anterieures: 0 }, ventes: 1, version: 2, ancrage: 1,
})
throws(() => verifyFiscalArchive(changeArchive(annual, (entries) => { entries[0].ancrage.vente.totalHT = 11 })), /ancrage|scellement/)
throws(() => verifyFiscalArchive(changeArchive(annual, (entries) => { entries[0].ancrage.empreintePrecedente = 'a'.repeat(64) })), /ancrage/)
equal(verifyFiscalArchive(changeArchive(annual, (entries) => { entries[1].totalTTC = 13 })).controle.rupture, 2)
throws(() => verifyFiscalArchive(changeArchive(annual, (entries) => { entries[0].premiereEmpreinte.monnaie = 11 })), /scellement/)
throws(() => verifyFiscalArchive(changeArchive(annual, (entries) => { entries.pop() })), /bornes|comptes/)
pass('Archive annuelle interannées validée avec ancrage ; ancrage, preuve, vente ou bornes altérés refusés')

const interleaved = sealedChain([
  sale(1, '2025-12-31T12:00:00Z'), sale(2), sale(3, '2025-12-30T12:00:00Z'), sale(4),
])
const withBridge = archive(2026, interleaved)
equal(verifyFiscalArchive(withBridge).ventes, 2)
ok(verifyFiscalArchive(withBridge).controle.intacte)
equal(verifyFiscalArchive(changeArchive(withBridge, (entries) => { entries[2].vente.totalHT = 99 })).controle.rupture, 3)
throws(() => verifyFiscalArchive(changeArchive(withBridge, (entries) => { entries.splice(2, 1) })), /comptes/)
equal(verifyFiscalArchive(changeArchive(withBridge, (entries) => {
  entries.splice(2, 1); entries[0].chainons = 0
})).controle.rupture, 4)
pass('Vente antidatée d\'une autre année conservée comme chaînon ; altération ou suppression détectées')

const oldYear = archive(2025, [sale(1, '2025-12-30T12:00:00Z'), sale(2, '2025-12-31T12:00:00Z'), ...sealedChain([sale(3)])])
deepEqual(verifyFiscalArchive(oldYear).controle, { intacte: true, rupture: null, anterieures: 2 })
const historicAnchor = archive(2025, [sale(1, '2024-12-31T12:00:00Z'), sale(2, '2025-12-31T12:00:00Z'), ...sealedChain([sale(3)])])
deepEqual(verifyFiscalArchive(historicAnchor).controle, { intacte: true, rupture: null, anterieures: 1 })
equal(verifyFiscalArchive(historicAnchor).ancrage, 1)
throws(() => archive(2025, [sale(1, '2025-12-31T12:00:00Z')]), /non vérifiable/)
ok(verifyFiscalArchive(mixed.map((vente) => JSON.stringify(vente)).join('\n')).controle.intacte)
ok(verifyFiscalArchive(archive(2024, mixed)).controle.intacte)
pass('Année entièrement historique reconnue grâce à la preuve de début ; export ancien depuis genèse et année vide compatibles')

const directory = await mkdtemp(path.join(tmpdir(), 'autostrass-fiscal-unit-'))
try {
  const file = path.join(directory, 'ventes-2026.jsonl')
  const checksum = path.join(directory, 'ventes-2026.sha256')
  await writeFile(file, annual, 'utf8')
  const run = () => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/archive-fiscal.ts', '--verifier', file], { encoding: 'utf8', timeout: 15000 })
  equal(run().status, 1)
  await writeFile(checksum, `${createHash('sha256').update(annual).digest('hex')}  ventes-2026.jsonl\n`, 'utf8')
  const correct = run()
  equal(correct.status, 0, correct.stderr)
  ok(correct.stdout.includes('ancrage #1'))
  await writeFile(checksum, 'f'.repeat(64) + '  ventes-2026.jsonl\n', 'utf8')
  const wrong = run()
  equal(wrong.status, 1)
  ok(wrong.stderr.includes('SHA-256'))
  pass('Relecture CLI autonome sans base ; SHA-256 valide accepté, absent ou altéré refusé')
} finally {
  equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()))
  ok(path.basename(directory).startsWith('autostrass-fiscal-unit-'))
  await rm(directory, { recursive: true, force: true })
}

console.log(`${groups} groupes de régression fiscale réussis.`)
