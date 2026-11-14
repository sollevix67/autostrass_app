/**
 * Ancien outil de remise à zéro, réservé à une base de démonstration jetable.
 *
 * Usage : npx tsx scripts/reset-fingerprints.ts
 *
 * Ne jamais effacer les empreintes d'une installation réelle. Les changements
 * de calcul sont versionnés (v1/v2) ; une empreinte effacée dans la période
 * scellée est une rupture. Restaurer les preuves depuis une sauvegarde fiable.
 */

import 'dotenv/config'
import mysql from 'mysql2/promise'

if (process.env.NODE_ENV !== 'test' || !/^autostrass_transfer_test_[a-f0-9]{16}$/.test(process.env.DB_NAME ?? '')) {
  throw new Error('Effacement réservé à la base jetable du harnais de test. Conserver les empreintes réelles et utiliser leur version.')
}

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
