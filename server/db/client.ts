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

export const hasDatabaseConfig = Boolean(
  process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD,
)

/** Pool MariaDB, ou `null` si la base n'est pas configuree. */
export const pool = hasDatabaseConfig
  ? mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: 10,
      waitForConnections: true,
    })
  : null

/** Instance Drizzle typee sur le schema du projet. */
export const db: MySql2Database<typeof schema> | null = pool ? drizzle(pool, { schema, mode: 'default' }) : null

export { schema }
