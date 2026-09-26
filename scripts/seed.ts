/**
 * Applique les jeux de donnees de demonstration.
 *
 * Usage : `npm run db:seed`
 *
 * Deux fichiers, appliques dans l'ordre : `seed_v2.sql` couvre les 8 metiers
 * de la v2, `seed_v3.sql` les entites ajoutees a l'etape 2 (emplacements, TVA,
 * fournisseurs, stock par emplacement). L'ordre compte : le stock par
 * emplacement du v3 reference les articles du v2.
 *
 * Le SQL est replayee instruction par instruction plutot que d'un bloc, car
 * le mode multi-instructions de mysql2 ne renvoie que le dernier jeu de
 * resultats : une erreur sur la premiere instruction passerait silencieusement.
 * C'est exactement ce qui est arrive avec la variable de session `SET @pwd`,
 * qui laissait `password_hash` a NULL sans lever d'erreur visible.
 */

import 'dotenv/config'
import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
import { splitStatements } from './lib/sql.js'

/** Fichiers appliques dans l'ordre ; le second depend du premier. */
const SEED_FILES = ['database/seed_v2.sql', 'database/seed_v3.sql'] as const

const hasDatabaseConfig = Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD)

if (!hasDatabaseConfig) {
  console.error('Variables DB_* absentes : renseignez le fichier .env.')
  process.exit(1)
}

const sql = SEED_FILES.map((file) => readFileSync(file, 'utf8')).join('\n').replace(/^USE .*?;\s*$/gm, '')

const list = splitStatements(sql)

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

let failures = 0

for (const [index, statement] of list.entries()) {
  const label = statement.replace(/\s+/g, ' ').slice(0, 70)
  try {
    await connection.query(statement)
    console.log(`  ${String(index + 1).padStart(2)}/${list.length}  ${label}`)
  } catch (error) {
    failures += 1
    const detail = error as { code?: string; sqlMessage?: string }
    console.error(`  ${String(index + 1).padStart(2)}/${list.length}  ECHEC : ${label}`)
    console.error(`         ${detail.code ?? ''} ${detail.sqlMessage ?? (error as Error).message}`)
  }
}

/** Tables peuplees par le seed, dans l'ordre d'affichage. */
const SEEDED_TABLES = [
  'users',
  'clients',
  'vehicules',
  'receptions',
  'reception_lines',
  'ventes',
  'vente_lines',
  'commandes',
  'commande_lines',
  'livraisons',
  'retours',
  'retour_lines',
  'tva',
  'emplacements',
  'stock_par_emplacements',
  'fournisseurs',
  'commandes_fournisseurs',
  'commande_four_lines',
  'journal_actions',
] as const

// Comptage reel table par table : `information_schema.TABLE_ROWS` est une
// estimation (InnoDB), elle peut afficher 0 pour une table pleine.
console.log('\nContenu apres seed :')
for (const table of SEEDED_TABLES) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\``)
  const count = (rows as Array<{ n: number }>)[0].n
  console.log(`  ${table.padEnd(18)} ${count}`)
}

await connection.end()
console.log(failures === 0 ? '\nSeed applique.' : `\n${failures} instruction(s) en echec.`)
process.exit(failures === 0 ? 0 : 1)
