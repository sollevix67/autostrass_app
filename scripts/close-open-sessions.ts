/**
 * Diagnostic en lecture seule des sessions de caisse restees ouvertes.
 *
 * Usage : npm run caisse:diagnostic
 *
 * Une session doit etre cloturee depuis l'application, apres comptage
 * physique. Ce script ne modifie jamais les totaux ni le statut d'une session.
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

try {
  const [rows] = await connection.query(
    'SELECT id, caissier, fonds_caisse, opened_at FROM cash_sessions WHERE statut = ? ORDER BY id',
    ['ouverte'],
  )

  const sessions = rows as Array<{ id: number; caissier: string; fonds_caisse: string; opened_at: Date }>
  if (sessions.length === 0) {
    console.log('Aucune session ouverte.')
  } else {
    console.log('Sessions ouvertes (aucune modification effectuee) :')
    for (const session of sessions) {
      console.log(
        `Session #${session.id} (${session.caissier}, fond ${session.fonds_caisse}, ouverte ${session.opened_at.toISOString()})`,
      )
    }
    console.log('Effectuez le comptage physique puis cloturez chaque session depuis l application.')
  }
} finally {
  await connection.end()
}
