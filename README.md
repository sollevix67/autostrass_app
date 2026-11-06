# Autostrass

Application React + Express + MariaDB pour la gestion commerciale et logistique.

## MariaDB / Drizzle

Le schéma principal est défini dans `server/db/schema.ts` et la configuration Drizzle dans `drizzle.config.ts`.

1. Copier `.env.example` vers `.env`.
2. Renseigner les paramètres MariaDB (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
3. Démarrer MariaDB avant la connexion ; `GET /api/health` indique si la base est `connected`, `unavailable` ou `unconfigured`.
4. Générer ou appliquer les migrations lorsqu’un schéma change :

```bash
npm run db:generate
npm run db:migrate
```

La version installée de `drizzle-kit` (0.31.x) utilise `drizzle-kit generate`.
L'application des migrations passe par le migrateur MySQL de Drizzle ORM.

Les migrations sont stockées dans `database/drizzle/` et le client Drizzle est initialisé via `server/db/client.ts`.

## Démarrage

```bash
npm install
npm run dev
```

L’API expose `GET /api/health` et `GET /api/dashboard` sur le port `3001`. Vite relaie automatiquement les appels `/api` vers cette API.

## Paramètres du dépôt

Le module `/parametres` administre la connexion MariaDB, les quotas API et
de connexion, les emplacements, les secteurs clients, les catégories et
sous-catégories, HTTPS et Turnstile. Appliquer la migration `0007` avec
`npm run db:migrate` avant utilisation. Les paramètres techniques sont
enregistrés hors Git dans `config/runtime/settings.json` ; MariaDB et HTTPS
nécessitent un redémarrage pour appliquer leurs modifications.

Voir le [guide d'administration et de déploiement](specs/parametres.md) pour
les droits, sauvegardes, certificats, clés Cloudflare et procédures de
récupération, et la [feuille de route](specs/parametres-roadmap.md) pour la recette restante.

## Inventaire physique

Le [comptage physique du stock](specs/inventaire-physique.md) est accessible
dans **Stock → Inventaire physique**. Appliquer la migration `0008` avant
utilisation. Le magasinier ou l’administrateur compte les emplacements,
valide l’écart et retrouve le détail dans l’historique.

## Tests sur une base jetable

```bash
npm run test:errors
npm run build
npm run test:parametres
npm run test:stock
npm run test:inventaire
npm run test:integration
```

`test:stock` vérifie la validation et les transferts réels (conservation,
concurrence, audit et droits). `test:integration` enchaîne également les
suites API et sécurité, puis les scénarios d’inventaire physique.
Ces commandes créent leur propre base MariaDB,
appliquent le schéma, les migrations et les seeds, démarrent une API isolée,
puis arrêtent cette API et suppriment la base créée, même en cas d'échec.
Elles n'utilisent jamais `DB_NAME` comme cible.

`test:inventaire` isole les 14 scénarios de comptage : écarts, emplacements,
concurrence, droits, historique et rollback. La [recette navigateur](specs/inventaire-physique.md)
décrit également le script optionnel Playwright et les captures de validation.

Configurer `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER` et
`TEST_DB_PASSWORD` pour utiliser une instance de test ; à défaut, les
paramètres `DB_*` correspondants sont repris. Le compte doit pouvoir créer
et supprimer une base `autostrass_transfer_test_*` ainsi que créer les
tables et triggers de test. Un refus de création interrompt le test sans
réutiliser une base existante. Les secrets restent hors du dépôt.

L'API jetable utilise `NODE_ENV=test` : son plafond global est de 1 000
requêtes pour permettre la suite complète, contre 100 en développement et
en production. Les protections CSRF, les rôles et les limites de tentatives
d'authentification restent actifs.

Les commandes historiques `test:api` et `test:security` ciblent l'API déjà
démarrée (`API_URL`, port 3001 par défaut) et écrivent dans sa base ; réserver
leur exécution directe à une base de test.

`test:parametres` ajoute les contrôles des paramètres, référentiels,
persistance, certificats et Turnstile, puis les suites API et sécurité sur
sa propre base jetable. Le build préalable permet de vérifier que le site
compilé est servi en HTTPS. Le fichier de paramètres de test est isolé et
supprimé à la fin.

## Style et thèmes

La palette bleu et ambre, les polices et les espacements sont centralisés
dans `src/tokens.css`. Les thèmes clair et sombre partagent les mêmes
composants ; le mode automatique suit le système. Voir
[le design system](design-system/autostrass/MASTER.md) pour l'organisation
des feuilles CSS et [la revue visuelle](specs/css-review.md) pour la validation.

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
