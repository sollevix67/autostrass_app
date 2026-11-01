# Repository Guidelines

Autostrass manages commercial and logistics workflows using React 19, TypeScript, Express 5, and MariaDB.

## Langue des réponses

Réponds toujours en français.
Mets à jour le fichier `passation.md`après chaque action puis commit et push de tous les changements sur le dépôt.

## Project Structure & Module Organization

- `src/`: frontend views, reusable components, hooks, API services, and Zod schemas. Shared styling lives in `src/*.css`.
- `server/`: Express entry point, middleware, repositories, and database access. Define Drizzle tables in `server/db/schema.ts`.
- `database/drizzle/`: migrations; `database/seed_v*.sql`: seed data.
- `scripts/`: database utilities and verification scripts; `public/`: static SVG assets.
- Consult `specs/`, `design-system/autostrass/MASTER.md`, and `passation.md` for designs and project context.

## Build, Test, and Development Commands

Run commands from the repository root:

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: start Express and Vite; Vite proxies `/api` to port 3001.
- `npm run dev:api`: start only the API.
- `npm run build`: type-check frontend/backend and produce `dist/`.
- `npm run lint`: run Oxlint with `.oxlintrc.json`.
- `npm run preview`: serve the built frontend locally.
- `npm run db:generate` / `npm run db:migrate`: generate/apply Drizzle migrations.

## Coding Style & Naming Conventions

Follow existing TypeScript style: two-space indentation, single-quoted strings, and omitted semicolons. Use PascalCase component files (`PageLayout.tsx`), `use*` hooks, and camelCase functions. Backend imports use `.js` extensions. Reuse shared API services and Zod validation. Oxlint enforces React hook rules; no dedicated formatter is configured.

## Testing Guidelines

Tests are custom TypeScript scripts executed with `tsx`, including Node assertions; no coverage threshold is configured. Run `npm run test:errors` for database error mapping. With the API running, run `npm run test:api` and `npm run test:security` against a disposable MariaDB database: these scripts exercise real writes, and API tests reload seed data. Follow `scripts/test-*.ts` naming. Treat `test:repos` and `test:caisse` as manual diagnostics.

## Commit & Pull Request Guidelines

History commonly uses `feat:`, `fix(scope):`, and `chore:`; write focused, descriptive messages, e.g. `fix(stock): deduplicate article references`. PRs should explain behavior changes, link relevant issues, list validation performed, and include screenshots for UI changes. Highlight schema changes and migration requirements.

## Security & Configuration Tips

Copy `.env.example` to `.env`; configure `DB_*` and a strong `JWT_SECRET` of at least 32 characters. Never commit secrets, `config/ssl/`, or fiscal `archives/`. Preserve authentication, role checks, CSRF protections, and fiscal integrity when modifying business workflows.
