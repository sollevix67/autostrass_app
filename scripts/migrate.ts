import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { withInstallationConnection } from './lib/installation.js'
import { splitStatements } from './lib/sql.js'

try {
  await withInstallationConnection(async (connection) => {
    const catalogue = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8')
    for (const statement of splitStatements(catalogue)) await connection.query(statement)
    const migrationsFolder = fileURLToPath(new URL('../database/drizzle', import.meta.url))
    await migrate(drizzle(connection), { migrationsFolder })
  })
  console.log('Socle catalogue et migrations Drizzle appliqués.')
} catch (error) {
  console.error('Échec de l’application des migrations.', error)
  process.exitCode = 1
}
