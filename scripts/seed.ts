import { readFile } from 'node:fs/promises'
import type { RowDataPacket } from 'mysql2/promise'
import { withInstallationConnection } from './lib/installation.js'
import { splitStatements } from './lib/sql.js'

const SEED_FILES = ['seed_v2.sql', 'seed_v3.sql']
const SEEDED_TABLES = [
  'articles', 'stock_balances', 'users', 'clients', 'vehicules', 'receptions', 'reception_lines',
  'ventes', 'vente_lines', 'commandes', 'commande_lines', 'livraisons', 'retours', 'retour_lines',
  'tva', 'emplacements', 'stock_par_emplacements', 'fournisseurs', 'commandes_fournisseurs',
  'commande_four_lines', 'journal_actions',
]

try {
  await withInstallationConnection(async (connection) => {
    await connection.beginTransaction()
    try {
      for (const file of SEED_FILES) {
        const sql = await readFile(new URL(`../database/${file}`, import.meta.url), 'utf8')
        const statements = splitStatements(sql)
        for (const [index, statement] of statements.entries()) {
          const label = statement.replace(/\s+/g, ' ').slice(0, 70)
          console.log(`  ${file} ${index + 1}/${statements.length}  ${label}`)
          await connection.query(statement)
        }
      }
      const [mismatches] = await connection.query<RowDataPacket[]>(`
        SELECT spe.reference_id, sb.quantity, SUM(spe.quantite) AS allocated
        FROM stock_par_emplacements spe
        LEFT JOIN stock_balances sb ON sb.reference_id = spe.reference_id
        GROUP BY spe.reference_id, sb.quantity
        HAVING sb.quantity IS NULL OR MIN(spe.quantite) < 0 OR allocated > sb.quantity
      `)
      if (mismatches.length) {
        for (const row of mismatches) {
          console.error(`  article #${row.reference_id} : stock ${row.quantity}, affecté ${row.allocated}`)
        }
        throw new Error('Répartition de stock invalide.')
      }
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    }

    console.log('\nContenu après chargement de la démonstration')
    for (const table of SEEDED_TABLES) {
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM \`${table}\``)
      console.log(`  ${table.padEnd(18)} ${rows[0].n}`)
    }
  })
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Échec du chargement des données de démonstration.')
  process.exitCode = 1
}
