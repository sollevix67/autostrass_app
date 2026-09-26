/**
 * Applique le jeu de donnees de demonstration `database/seed_v2.sql`.
 *
 * Usage : `npm run db:seed`
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

const SEED_FILE = 'database/seed_v2.sql'

const hasDatabaseConfig = Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD)

if (!hasDatabaseConfig) {
  console.error('Variables DB_* absentes : renseignez le fichier .env.')
  process.exit(1)
}

const sql = readFileSync(SEED_FILE, 'utf8').replace(/^USE .*?;\s*$/m, '')

/** Retire les lignes de commentaire pour ne garder que les instructions. */
function statements(source: string): string[] {
  return source
    .split(';')
    .map((part) =>
      part
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((part) => part.length > 0)
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

const list = statements(sql)
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
