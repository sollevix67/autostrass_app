/**
 * Applique une migration en affichant l'erreur reelle.
 *
 * `drizzle-kit migrate` echoue avec un code 1 sans message : le detail est
 * perdu. Ce script rejoue le fichier instruction par instruction et affiche
 * le code mysql2, ce qui est indispensable pour diagnostiquer une contrainte
 * MariaDB (les messages du serveur sont explicites, ceux de l'outillage non).
 *
 * Usage : `npx tsx scripts/apply-migration.ts database/drizzle/0004_xxx.sql`
 */

import 'dotenv/config'
import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
const file = process.argv[2]
if (!file) {
  console.error('Usage : npx tsx scripts/apply-migration.ts <fichier.sql>')
  process.exit(1)
}


const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

/**
 * Normalisation robuste : drizzle-kit marque les segments avec
 * `--> statement-breakpoint` et on a vu des parse erreurs lorsqu'on
 * découpe mal. On remplace ce marqueur par ';' puis on split sur ';'.
 */
const raw = readFileSync(file, 'utf8')
const normalized = raw.replace(/--> statement-breakpoint/g, ';')
const statements = normalized
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
let failures = 0
for (const [index, statement] of statements.entries()) {
  const label = statement.replace(/\s+/g, ' ').slice(0, 80)
  try {
    await connection.query(statement)
    console.log(`  ${String(index + 1).padStart(2)}/${statements.length}  OK   ${label}`)
  } catch (error) {
    failures += 1
    const detail = error as { code?: string; sqlMessage?: string }
    console.error(`  ${String(index + 1).padStart(2)}/${statements.length}  ECHEC ${label}`)
    console.error(`         ${detail.code ?? ''} ${detail.sqlMessage ?? (error as Error).message}`)
  }
}

await connection.end()
process.exit(failures === 0 ? 0 : 1)
