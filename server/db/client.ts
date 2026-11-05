/**
 * Client Drizzle + pool MariaDB.
 *
 * L'API demarre meme sans variables `DB_*` : dans ce cas `db` vaut `null` et
 * les routes repondent 503 (cf. `repositoryOr503` dans server/index.ts). Le
 * frontend bascule alors en mode local.
 */

import 'dotenv/config'
import mysql from 'mysql2/promise'
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from './schema.js'
import { effectiveDatabaseSettings } from '../services/settingsStore.js'

const databaseSettings = effectiveDatabaseSettings()

export const hasDatabaseConfig = Boolean(
  databaseSettings.host && databaseSettings.database && databaseSettings.user,
)

/** Pool MariaDB, ou `null` si la base n'est pas configuree. */
export const pool = hasDatabaseConfig
  ? mysql.createPool({
      ...databaseSettings,
      connectionLimit: 10,
      waitForConnections: true,
      connectTimeout: 5000,
    })
  : null

/** Instance Drizzle typee sur le schema du projet. */
export const db: MySql2Database<typeof schema> | null = pool ? drizzle(pool, { schema, mode: 'default' }) : null

export { schema }
