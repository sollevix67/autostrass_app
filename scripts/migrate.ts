import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { db, pool } from '../server/db/client.js'

if (!db || !pool) {
  console.error('Configuration DB_* incomplète : impossible d’appliquer les migrations.')
  process.exitCode = 1
} else {
  try {
    const migrationsFolder = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../database/drizzle',
    )
    await migrate(db, { migrationsFolder })
    console.log('Migrations Drizzle appliquées.')
  } catch (error) {
    console.error('Échec de l’application des migrations Drizzle.')
    console.error(error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
