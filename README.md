# Autostrass

Application React + Express + MariaDB pour la gestion commerciale et logistique.

## MariaDB / Drizzle

Le schéma principal est défini dans `server/db/schema.ts` et la configuration Drizzle dans `drizzle.config.ts`.

1. Copier `.env.example` vers `.env`.
2. Renseigner les paramètres MariaDB (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
3. Générer ou appliquer les migrations lorsqu’un schéma change :

```bash
npm run db:generate
npm run db:migrate
```

Note : avec la version Drizzle présente dans ce dépôt (`drizzle-kit@0.18.1`), la commande de génération correcte est `drizzle-kit generate:mysql` (et non `drizzle-kit generate`).

Les migrations sont stockées dans `database/drizzle/` et le client Drizzle est initialisé via `server/db/client.ts`.

## Démarrage

```bash
npm install
npm run dev
```

L’API expose `GET /api/health` et `GET /api/dashboard` sur le port `3001`. Vite relaie automatiquement les appels `/api` vers cette API.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
