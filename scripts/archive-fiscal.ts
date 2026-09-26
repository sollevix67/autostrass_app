/**
 * Archivage fiscal — conservation 7 ans (NF525).
 *
 * La NF525 impose de conserver la memoire de vente **7 ans**. Une base MariaDB
 * unique n'est pas un support d'archivage : elle est modifiable, et une
 * sauvegarde ne protege pas de la perte du poste. Ce script produit, chaque
 * annee, un **export en lecture seule, hors base**, des ventes de l'annee
 * precedente.
 *
 * ## Ce que fait l'archivage, et pourquoi c'est insuffisant seul
 *
 * L'export est un fichier texte : il n'est ni modifiable par l'application, ni
 * perdu avec la base. Mais sa conservation depend de quelqu'un. La norme
 * demande un dispositif documente —/support, periodicity, responsable — pas
 * seulement un fichier. **A completer au deploiement** :
 *
 * - support de conservation (disque chiffre, coffre, NAS) ;
 * - copies sur au moins deux sites distincts ;
 * - test de restauration **annuel** (une archive jamais restauree est
 *   supposée fonctionnelle, jamais prouvée) ;
 * - responsable nomme de l'archivage.
 *
 * ## Format de sortie
 *
 * JSON Lines : une vente par ligne, cle/valeur sur une seule ligne. C'est le
 * format qui rend un controle lisible (`grep`, `jq`, un editeur) et qui
 * supporte la reprise apres coup — un export CSV casse des désignations
 * contenant un point-virgule, ce qui est courant sur une piece automobile.
 *
 * Usage :
 *   npx tsx scripts/archive-fiscal.ts 2025 [chemin-de-sortie]
 *   npx tsx scripts/archive-fiscal.ts --verifier <fichier.jsonl>
 */

import 'dotenv/config'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import path from 'node:path'
import mysql from 'mysql2/promise'
import { verifyFingerprints, GENESIS_HASH } from '../server/middleware/compliance.js'

const hasConfig = Boolean(
  process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD,
)

/** Rejoue les empreintes d'un export hors base. */
async function verify(file: string): Promise<void> {
  const ventes: Array<Record<string, never>> = []
  const stream = createReadStream(file, 'utf8')
  const lines = createInterface({ input: stream, crlfDelay: Infinity })

  for await (const line of lines) {
    if (line.trim() === '') continue
    ventes.push(JSON.parse(line) as Record<string, never>)
  }

  const resultat = verifyFingerprints(
    ventes as unknown as Parameters<typeof verifyFingerprints>[0],
  )
  console.log(`${ventes.length} vente(s) relue(s) depuis ${path.basename(file)}`)
  if (resultat.intacte) {
    console.log(`Chaine intacte depuis le genine ${GENESIS_HASH.slice(0, 12)}…`)
    if (resultat.anterieures > 0) {
      console.log(`${resultat.anterieures} vente(s) anterieure(s) a la mise en conformite, sans empreinte.`)
    }
    return
  }
  console.error(`CHAINE ROMPUE sur la vente #${resultat.rupture}`)
  process.exitCode = 1
}

async function archive(annee: number, sortie?: string): Promise<void> {
  if (!hasConfig) {
    console.error('Variables DB_* absentes : renseignez le fichier .env.')
    process.exit(1)
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  const [ventes] = await connection.query(
    `SELECT v.id, v.session_id, v.date_vente, v.caissier, v.mode_paiement,
            v.total_ht, v.montant_paye, v.monnaie, v.fingerprint, v.degrade
       FROM ventes v
      WHERE v.date_vente >= ? AND v.date_vente < ?
      ORDER BY v.id`,
    [`${annee}-01-01 00:00:00`, `${annee + 1}-01-01 00:00:00`],
  )
  const ids = (ventes as Array<{ id: number }>).map((v) => v.id)

  let lignes: Array<Record<string, unknown>> = []
  if (ids.length > 0) {
    const [details] = await connection.query(
      `SELECT vente_id, ligne, reference, designation, quantite, prix_unitaire
         FROM vente_lines WHERE vente_id IN (?) ORDER BY vente_id, ligne`,
      [ids],
    )
    const parVente = new Map<number, Array<Record<string, unknown>>>()
    for (const detail of details as Array<Record<string, unknown>>) {
      const id = Number(detail.vente_id)
      const list = parVente.get(id) ?? []
      list.push({
        reference: String(detail.reference ?? ''),
        designation: String(detail.designation ?? ''),
        quantite: Number(detail.quantite ?? 0),
        prixUnitaire: Number(detail.prix_unitaire ?? 0),
      })
      parVente.set(id, list)
    }
    lignes = (ventes as Array<Record<string, unknown>>).map((vente) => ({
      id: Number(vente.id),
      sessionId: vente.session_id === null ? null : Number(vente.session_id),
      dateVente: String(vente.date_vente),
      caissier: String(vente.caissier),
      modePaiement: String(vente.mode_paiement),
      totalHT: Number(vente.total_ht),
      montantPaye: Number(vente.montant_paye),
      monnaie: Number(vente.monnaie),
      degrade: Boolean(vente.degrade),
      fingerprint: vente.fingerprint === null ? null : String(vente.fingerprint),
      articles: parVente.get(Number(vente.id)) ?? [],
    }))
  }

  await connection.end()

  // Le controle d'inalterabilite est fait **avant** d'ecrire l'archive : on
  // n'archive pas une memoire de vente dont on sait qu'elle est alteree, sinon
  // l'archive herite du soupcon.
  const controle = verifyFingerprints(lignes as unknown as Parameters<typeof verifyFingerprints>[0])
  if (!controle.intacte) {
    console.error(`Refus d'archiver : chaine rompue sur la vente #${controle.rupture}.`)
    process.exit(1)
  }

  const dossier = sortie ?? path.join('archives', String(annee))
  await mkdir(dossier, { recursive: true })
  const fichier = path.join(dossier, `ventes-${annee}.jsonl`)
  const contenu = `${lignes.map((ligne) => JSON.stringify(ligne)).join('\n')}\n`
  await writeFile(fichier, contenu, 'utf8')

  const empreinte = createHash('sha256').update(contenu, 'utf8').digest('hex')

  // Le fichier d'empreinte accompagne l'archive : sans lui, une substitution
  // d'archive passerait inaperTue, puisque l'archive ne se verifie pas seule.
  await writeFile(path.join(dossier, `ventes-${annee}.sha256`), `${empreinte}  ventes-${annee}.jsonl\n`, 'utf8')

  console.log(`Annee ${annee} : ${lignes.length} vente(s)`)
  console.log(`  archive  : ${fichier}`)
  console.log(`  empreinte: ${empreinte}`)
  if (controle.anterieures > 0) {
    console.log(`  ${controle.anterieures} vente(s) sans empreinte (anterieures a la mise en conformite).`)
  } else {
    console.log('  Chaine d empreinte verifiee : intacte.')
  }
  console.log('\nRappels de deploiement :')
  console.log('  - copier sur au moins deux supports distincts')
  console.log('  - tester la restauration au moins une fois par an')
  console.log('  - nommer un responsable de l archivage')
}

const [, , argument, ...reste] = process.argv

if (argument === '--verifier') {
  await verify(reste[0])
} else {
  const annee = Number(argument ?? new Date().getFullYear() - 1)
  if (!Number.isInteger(annee) || annee < 2000) {
    console.error('Annee invalide. Exemple : npx tsx scripts/archive-fiscal.ts 2025')
    process.exit(1)
  }
  await archive(annee, reste[0])
}
