/**
 * Archivage fiscal JSON Lines, avec ancrage de la chaîne entre deux années.
 *
 * Usage : npx tsx scripts/archive-fiscal.ts 2025 [dossier-de-sortie]
 *         npx tsx scripts/archive-fiscal.ts --verifier <fichier.jsonl>
 * Conserver les exports et leurs SHA-256 sur deux supports pendant sept ans.
 */

import 'dotenv/config'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import mysql from 'mysql2/promise'
import { z } from 'zod'
import {
  fingerprintVente, FingerprintVerifier, GENESIS_HASH, verifyFingerprints,
  type FingerprintedSale, type FingerprintResult,
} from '../server/middleware/compliance.js'
import { toIsoString } from '../server/repositories/mapping.js'

const saleSchema = z.object({
  id: z.number().int().positive(), sessionId: z.number().int().positive().nullable(),
  dateVente: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), 'Date de vente invalide.'),
  caissier: z.string(), modePaiement: z.string(), totalHT: z.number().finite(),
  fingerprintVersion: z.union([z.literal(1), z.literal(2)]).optional(),
  totalTVA: z.number().finite().nullable().optional(), totalTTC: z.number().finite().nullable().optional(),
  montantPaye: z.number().finite(), monnaie: z.number().finite(),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  archiveYear: z.number().int().optional(), degrade: z.boolean().optional(),
  articles: z.array(z.object({
    reference: z.string(), designation: z.string(), quantite: z.number().int(), prixUnitaire: z.number().finite(),
    tauxTva: z.number().finite().nullable().optional(),
  })),
})

type ArchivedSale = FingerprintedSale & { archiveYear?: number; degrade?: boolean }
type Anchor = { vente: ArchivedSale; empreintePrecedente: string }
type ArchiveHeader = {
  type: 'autostrass-fiscal-archive'
  version: 2
  annee: number
  ancrage: Anchor | null
  premiereEmpreinte: ArchivedSale | null
  ventes: number
  chainons: number
  premiereVente: number | null
  derniereVente: number | null
}
type ArchiveRecord = ArchivedSale | { type: 'chain-context'; vente: ArchivedSale }

function saleYear(vente: ArchivedSale): number {
  return vente.archiveYear ?? new Date(vente.dateVente).getUTCFullYear()
}

/** Construit l'export pendant un parcours complet et vérifié de la base. */
export class FiscalArchiveBuilder {
  private readonly verifier = new FingerprintVerifier()
  private previous: Anchor | null = null
  private anchor: Anchor | null = null
  private firstSeal: ArchivedSale | null = null
  private records: ArchiveRecord[] = []
  private lastAnnualIndex = -1
  private annualCount = 0

  constructor(private readonly year: number, private readonly lastAnnualId = Number.MAX_SAFE_INTEGER) {}

  add(vente: ArchivedSale): void {
    const previousHash = this.verifier.previousHash
    this.verifier.add(vente)
    if (this.verifier.broken) {
      throw new Error(`Refus d'archiver : chaîne rompue sur la vente #${this.verifier.result().rupture}.`)
    }
    if (vente.fingerprint !== null && this.firstSeal === null) this.firstSeal = vente
    if (saleYear(vente) === this.year) {
      if (this.annualCount === 0) this.anchor = this.previous
      this.records.push(vente)
      this.lastAnnualIndex = this.records.length - 1
      this.annualCount++
    } else if (this.annualCount > 0 && vente.id < this.lastAnnualId) {
      // Une vente antidatée peut intercaler une autre année dans l'ordre des id.
      this.records.push({ type: 'chain-context', vente })
    }
    this.previous = { vente, empreintePrecedente: previousHash }
  }

  finish(): string {
    const controle = this.verifier.result()
    if (!controle.intacte) throw new Error(`Refus d'archiver : chaîne non vérifiable sur la vente #${controle.rupture}.`)
    const records = this.records.slice(0, this.lastAnnualIndex + 1)
    const annual = records.filter((record): record is ArchivedSale => !('type' in record))
    const header: ArchiveHeader = {
      type: 'autostrass-fiscal-archive', version: 2, annee: this.year, ancrage: this.anchor,
      premiereEmpreinte: this.firstSeal, ventes: annual.length, chainons: records.length - annual.length,
      premiereVente: annual[0]?.id ?? null, derniereVente: annual[annual.length - 1]?.id ?? null,
    }
    return [header, ...records].map((value) => JSON.stringify(value)).join('\n') + '\n'
  }
}

/** Relecture autonome : preuve de début, ancrage et chaînons sont tous contrôlés. */
export function verifyFiscalArchive(content: string): {
  controle: FingerprintResult; ventes: number; version: number; ancrage: number | null
} {
  const entries: unknown[] = content.split(/\r?\n/).filter((line) => line.trim() !== '').map((line) => JSON.parse(line))
  const first = entries[0] as Partial<ArchiveHeader> | undefined
  if (first?.type !== 'autostrass-fiscal-archive') {
    const ventes = entries.map((entry) => saleSchema.parse(entry))
    return { controle: verifyFingerprints(ventes), ventes: ventes.length, version: 1, ancrage: null }
  }
  if (first.version !== 2 || !Number.isInteger(first.annee) || (first.annee ?? 0) < 2000) {
    throw new Error('En-tête fiscal invalide ou version inconnue.')
  }
  const header = first as ArchiveHeader
  const firstSeal = header.premiereEmpreinte === null ? null : saleSchema.parse(header.premiereEmpreinte)
  if (firstSeal && (firstSeal.fingerprint === null || firstSeal.fingerprint !== fingerprintVente(firstSeal, GENESIS_HASH))) {
    throw new Error('La preuve du début de scellement est altérée.')
  }
  let anchor: { id: number; fingerprint: string; historicalBeforeId?: number } = {
    id: 0, fingerprint: GENESIS_HASH, historicalBeforeId: firstSeal?.id,
  }
  if (header.ancrage !== null) {
    const vente = saleSchema.parse(header.ancrage.vente)
    const previous = header.ancrage.empreintePrecedente
    if (!/^[0-9a-f]{64}$/.test(previous)
      || (vente.fingerprint === null
        ? (vente.fingerprintVersion ?? 1) !== 1 || !firstSeal || vente.id >= firstSeal.id || previous !== GENESIS_HASH
        : vente.fingerprint !== fingerprintVente(vente, previous))) {
      throw new Error(`L'ancrage de l'archive est altéré sur la vente #${vente.id}.`)
    }
    anchor = { ...anchor, id: vente.id, fingerprint: vente.fingerprint ?? GENESIS_HASH }
  }
  const verifier = new FingerprintVerifier(anchor)
  const annual: ArchivedSale[] = []
  let contexts = 0
  for (const entry of entries.slice(1)) {
    const record = entry as { type?: unknown; vente?: unknown }
    const isContext = record.type === 'chain-context'
    const vente = saleSchema.parse(isContext ? record.vente : entry)
    if ((saleYear(vente) === header.annee) === isContext) {
      throw new Error(`L'année de la vente #${vente.id} ne correspond pas à son rôle dans l'archive.`)
    }
    verifier.add(vente)
    if (isContext) contexts++
    else annual.push(vente)
  }
  if (header.ventes !== annual.length || header.chainons !== contexts
    || header.premiereVente !== (annual[0]?.id ?? null)
    || header.derniereVente !== (annual[annual.length - 1]?.id ?? null)
    || (entries.length > 1 && (entries[entries.length - 1] as { type?: string }).type === 'chain-context')) {
    throw new Error('Les bornes ou les comptes de l\'archive sont incohérents.')
  }
  return { controle: verifier.result(), ventes: annual.length, version: 2, ancrage: anchor.id || null }
}

async function verify(file: string): Promise<void> {
  if (!file) throw new Error('Indiquez le fichier JSON Lines à vérifier.')
  const content = await readFile(file, 'utf8')
  const result = verifyFiscalArchive(content)
  const checksumFile = file.replace(/\.jsonl$/i, '') + '.sha256'
  try {
    const checksum = (await readFile(checksumFile, 'utf8')).trim().split(/\s+/)[0]
    if (checksum !== createHash('sha256').update(content, 'utf8').digest('hex')) {
      throw new Error('L\'empreinte SHA-256 du fichier d\'archive ne correspond plus.')
    }
  } catch (error) {
    if (result.version === 2 || (error as { code?: string }).code !== 'ENOENT') throw error
    console.log('Export ancien sans fichier SHA-256 : seule la chaîne des ventes a été contrôlée.')
  }
  console.log(`${result.ventes} vente(s) relue(s) depuis ${path.basename(file)}`)
  if (!result.controle.intacte) throw new Error(`CHAINE ROMPUE sur la vente #${result.controle.rupture}`)
  console.log(result.ancrage === null ? 'Chaîne intacte depuis la genèse.' : `Chaîne intacte depuis l'ancrage #${result.ancrage}, vérifié.`)
  if (result.controle.anterieures > 0) console.log(`${result.controle.anterieures} vente(s) historiques antérieures au scellement.`)
}

async function archive(annee: number, sortie?: string): Promise<void> {
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error('Variables DB_* absentes : renseignez le fichier .env.')
  }
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  })
  let content: string
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY')
    const [bounds] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT MAX(id) AS last_id FROM ventes WHERE date_vente >= ? AND date_vente < ?',
      [`${annee}-01-01 00:00:00`, `${annee + 1}-01-01 00:00:00`],
    )
    const builder = new FiscalArchiveBuilder(annee, Number(bounds[0].last_id ?? 0))
    let afterId = 0
    for (;;) {
      const [rawVentes] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT v.*, YEAR(v.date_vente) AS archive_year FROM ventes v WHERE v.id > ? ORDER BY v.id LIMIT 1000', [afterId],
      )
      if (rawVentes.length === 0) break
      const ids = rawVentes.map((vente) => Number(vente.id))
      const [details] = await connection.query<mysql.RowDataPacket[]>(
        'SELECT * FROM vente_lines WHERE vente_id IN (?) ORDER BY vente_id, ligne', [ids],
      )
      const bySale = new Map<number, ArchivedSale['articles']>()
      for (const detail of details) {
        const id = Number(detail.vente_id)
        const articles = bySale.get(id) ?? []
        articles.push({
          reference: String(detail.reference), designation: String(detail.designation), quantite: Number(detail.quantite),
          prixUnitaire: Number(detail.prix_unitaire), tauxTva: detail.taux_tva === null ? null : Number(detail.taux_tva),
        })
        bySale.set(id, articles)
      }
      for (const vente of rawVentes) builder.add({
        id: Number(vente.id), sessionId: vente.session_id === null ? null : Number(vente.session_id),
        dateVente: toIsoString(vente.date_vente as Date), caissier: String(vente.caissier), modePaiement: String(vente.mode_paiement),
        totalHT: Number(vente.total_ht), fingerprintVersion: Number(vente.fingerprint_version ?? 1),
        totalTVA: vente.total_tva === null ? null : Number(vente.total_tva), totalTTC: vente.total_ttc === null ? null : Number(vente.total_ttc),
        montantPaye: Number(vente.montant_paye), monnaie: Number(vente.monnaie), degrade: Boolean(vente.degrade),
        fingerprint: vente.fingerprint === null ? null : String(vente.fingerprint),
        archiveYear: Number(vente.archive_year), articles: bySale.get(Number(vente.id)) ?? [],
      })
      afterId = ids[ids.length - 1]
    }
    content = builder.finish()
    const controle = verifyFiscalArchive(content).controle
    if (!controle.intacte) throw new Error(`Refus d'archiver : chaîne rompue sur la vente #${controle.rupture}.`)
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }

  const dossier = sortie ?? path.join('archives', String(annee))
  await mkdir(dossier, { recursive: true })
  const fichier = path.join(dossier, `ventes-${annee}.jsonl`)
  const empreinte = createHash('sha256').update(content, 'utf8').digest('hex')
  await writeFile(fichier, content, 'utf8')
  await writeFile(path.join(dossier, `ventes-${annee}.sha256`), `${empreinte}  ventes-${annee}.jsonl\n`, 'utf8')
  const result = verifyFiscalArchive(content)
  console.log(`Année ${annee} : ${result.ventes} vente(s), archive ${fichier}`)
  console.log(`Empreinte SHA-256 : ${empreinte}`)
  console.log('Conserver sur deux supports distincts ; tester la restauration chaque année ; nommer un responsable.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [, , argument, ...reste] = process.argv
    if (argument === '--verifier') await verify(reste[0])
    else {
      const annee = Number(argument ?? new Date().getFullYear() - 1)
      if (!Number.isInteger(annee) || annee < 2000 || annee > 9998) throw new Error('Année invalide. Exemple : 2025.')
      await archive(annee, reste[0])
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Échec du contrôle fiscal.')
    process.exitCode = 1
  }
}
