/**
 * Ferme les sessions de caisse restees ouvertes, hors celle du caissier
 * connecte s'il en a une.
 *
 * Usage : npx tsx scripts/close-open-sessions.ts
 *
 * Utile apres une verification manuelle : une session laissee ouverte
 * empeche la suivante (409 `SESSION_DEJA_OUVERTE`) et fausse le controle de
 * caisse de la journee suivante.
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

const [rows] = await connection.query(
  'SELECT id, caissier, fonds_caisse FROM cash_sessions WHERE statut = ? ORDER BY id',
  ['ouverte'],
)

if ((rows as unknown[]).length === 0) {
  console.log('Aucune session ouverte.')
} else {
  for (const row of rows as Array<{ id: number; caissier: string; fonds_caisse: string }>) {
    // Comptage deFermeture a blanc : le but est de liberer le poste, pas de
    // simuler un controle. L'ecart resultant sera affiche tel quel.
    const [result] = await connection.query(
      `UPDATE cash_sessions
          SET statut = 'clôturée',
              total_reel = 0.00,
              total_theorique = 0.00,
              ecart = 0.00,
              closed_at = NOW(),
              notes = 'Fermeture administrative'
        WHERE id = ?`,
      [row.id],
    )
    console.log(`Session #${row.id} (${row.caissier}, fond ${row.fonds_caisse}) fermee — ${result}`)
  }
}

await connection.end()
