import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise'
import { effectiveDatabaseSettings } from '../../server/services/settingsStore.js'

/** Sérialise les commandes d’installation d'une même base. MariaDB libère le verrou à la déconnexion. */
export async function withInstallationConnection(action: (connection: Connection) => Promise<void>): Promise<void> {
  const settings = effectiveDatabaseSettings()
  if (!settings.host || !settings.database || !settings.user) {
    throw new Error('Renseignez la connexion MariaDB dans les paramètres ou les variables DB_*.')
  }
  const connection = await mysql.createConnection({ ...settings, connectTimeout: 5000 })
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT GET_LOCK(CONCAT('openstrass-install-', MD5(DATABASE())), 60) AS acquired",
    )
    if (rows[0]?.acquired !== 1) throw new Error('Une autre installation occupe cette base MariaDB.')
    await action(connection)
  } finally {
    await connection.end()
  }
}
