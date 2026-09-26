/**
 * Remet a zero les empreintes calculees avec une regle obsolete.
 *
 * Usage : npx tsx scripts/reset-fingerprints.ts
 *
 * A n'executer que si la regle de calcul d'empreinte a ete modifiee. Les
 * ventes sans empreinte ne sont pas « rompues » : `verifyFingerprints` les
 * compte comme anterieures et repart du genine, ce qui est exactement le
 * comportement voulu apres un changement de regle.
 */

import 'dotenv/config'
import mysql from 'mysql2/promise'

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

const [avant] = await connection.query('SELECT COUNT(*) AS total FROM ventes WHERE fingerprint IS NOT NULL')
console.log(`Empreintes a effacer : ${(avant as Array<{ total: number }>)[0].total}`)

const confirmation = process.argv[2]
if (confirmation !== '--oui') {
  console.log('Relancez avec --oui pour confirmer.')
  await connection.end()
  process.exit(0)
}

await connection.query('UPDATE ventes SET fingerprint = NULL WHERE fingerprint IS NOT NULL')
const [apres] = await connection.query('SELECT COUNT(*) AS total FROM ventes WHERE fingerprint IS NOT NULL')
console.log(`Empreintes restantes : ${(apres as Array<{ total: number }>)[0].total}`)
console.log('Prochaine vente enregistree : elle sera scellee avec la regle en vigueur.')

await connection.end()
