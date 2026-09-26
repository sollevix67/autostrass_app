import { defineConfig } from 'drizzle-kit'

/**
 * Configuration drizzle-kit.
 *
 * `dialect: 'mysql'` cible MariaDB (compatible MySQL). Les migrations sont
 * generees dans `database/drizzle/` et appliquees via `npm run db:migrate`
 * (voir README). Le dossier n'est pas versionne automatiquement par
 * `drizzle-kit` : on le commite pour garder l'historique applicatif.
 */
export default defineConfig({
  dialect: 'mysql',
  schema: './server/db/schema.ts',
  out: './database/drizzle',
  dbCredentials: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'autostrass',
  },
  strict: true,
  verbose: true,
})
