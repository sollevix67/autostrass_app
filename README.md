# OpenStrass

**OpenStrass - Gestion commerciale et logistique open source**

Application React + Express + MariaDB pour la gestion commerciale et logistique.

## MariaDB / Drizzle

### Première installation

1. Avec Node.js 22.13 ou ultérieur, exécuter `npm ci` depuis la racine du dépôt.
2. Démarrer MariaDB et y créer une base vide en `utf8mb4`, par exemple avec
   `CREATE DATABASE openstrass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`.
   Donner au compte d’installation les droits de créer et modifier les tables, les vues et les données de cette base.
3. Copier `.env.example` vers `.env`, renseigner `DB_HOST`, `DB_PORT`, `DB_NAME`,
   `DB_USER`, `DB_PASSWORD` et choisir un `JWT_SECRET` aléatoire d’au moins 32 caractères.
   Dans l’exemple précédent, `DB_NAME=openstrass`.
4. Initialiser le catalogue et appliquer les migrations versionnées.

```bash
npm run db:migrate
```

Pour ouvrir une installation avec vos propres données, créer le premier compte sur la base encore dépourvue d’utilisateurs.

```bash
npm run db:admin -- "Camille" "Martin" "camille@example.fr"
```

La commande demande le mot de passe en saisie masquée et accepte également une ligne sur l’entrée standard.
Après le démarrage, se connecter avec cet email et ce mot de passe. Les comptes suivants se créent dans **Administration → Utilisateurs et droits**.

Pour préparer une base de démonstration, exécuter `npm run db:seed` après la migration.
La commande charge le catalogue, le stock, les documents et les comptes d’exemple dans la même base que le migrateur.
Le compte de démonstration `marie.laurent@autostrass.fr` utilise le mot de passe `demo1234`.

### Mise à jour d’une installation existante

Sauvegarder la base, exécuter `npm run db:migrate` et redémarrer l’API.
Le migrateur crée les objets manquants du socle catalogue, puis Drizzle applique les migrations en attente.
Les trois commandes `db:migrate`, `db:admin` et `db:seed` suivent la connexion de l’API. Les paramètres MariaDB enregistrés
dans le fichier de configuration de l’instance ont priorité sur `DB_*`. Pour une installation indépendante,
`AUTOSTRASS_SETTINGS_FILE` permet de désigner son propre fichier.

Le schéma Drizzle est défini dans `server/db/schema.ts`. Lors d’une modification du modèle,
`npm run db:generate` génère les migrations à versionner dans `database/drizzle/`.

## Démarrage

```bash
npm run dev
```

L’API expose `GET /api/health` et `GET /api/dashboard` sur le port `3001`. Vite relaie automatiquement les appels `/api` vers cette API.

`npm run dev` arrête automatiquement les anciennes instances de développement
identifiées dans ce dépôt, puis démarre l'API et Vite. Il vérifie les ports HTTP,
HTTPS et Vite avant le démarrage ; un processus étranger ou non identifié est
conservé et un message indique le port occupé. Vite garde son port configuré.
Si l'un des deux services s'arrête, l'autre est arrêté également.

`npm run dev:api` démarre uniquement l'API, sans nettoyage automatique. Pour
relancer l'ensemble, utiliser `npm run dev`. `npm run test:dev` vérifie le nettoyage
sur des processus factices, sans accès à MariaDB.

## Paramètres du dépôt

Le module `/parametres` administre la connexion MariaDB, les quotas API et
de connexion, les emplacements, les secteurs clients, les catégories et
sous-catégories, la présentation des PDF, HTTPS et Turnstile. Appliquer la migration `0007` avec
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

Les [formulaires métier et Administration](specs/formulaires-modaux.md) s'ouvrent
maintenant en fenêtres contextuelles. Pour la recette Chromium avec API simulée,
exécuter `npm run build`, puis `npm run test:forms:ui` et `npm run test:caisse:ui`.
Ces deux recettes ne nécessitent aucune connexion MariaDB.

Dans **Administration → Utilisateurs et droits**, le crayon ouvre la
[modification du compte](specs/utilisateurs.md). Un nouveau mot de passe est
facultatif ; le laisser vide conserve le mot de passe actuel.

## Devis

Le module **Devis**, réservé aux administrateurs et caissiers, permet la création,
la modification, le PDF et le partage email/WhatsApp, ainsi que la conversion
en une commande client numérotée avec suivi des articles manquants.
Appliquer la migration `0012`, puis redémarrer l'API avant utilisation.
Voir le [guide Devis](specs/devis.md) pour les garanties, le partage de fichier
et la liste d'approvisionnement. `npm run test:devis` utilise des bases jetables ;
`npm run test:devis:ui` vérifie l'interface avec une API simulée après le build.

## Commandes fournisseurs

Dans **Commandes fournisseurs**, l’administrateur ou le magasinier affecte les
articles manquants d’un devis converti, passe la commande au prix d’achat HT
et enregistre les livraisons partielles ou complètes. L’écran détaille les
quantités reçues et attribuées à chaque commande client. Sauvegarder la base
et lancer `npm run db:migrate` pour appliquer `0013`, puis redémarrer l’API.
Les horaires, les règles de stock et les captures figurent dans le
[guide des commandes fournisseurs](specs/commandes-fournisseurs.md).

## Documents PDF

Dans **Ventes au comptoir**, **Voir la facture** ouvre la facture de la vente
sélectionnée. Dans **Devis**, **Voir le PDF** ouvre la version affichée du devis.
Le lecteur permet de tourner les pages, de zoomer et de télécharger le fichier
si vous souhaitez en garder une copie.

Les [documents PDF](specs/documents-pdf-personnalisation.md) disposent d'une
rubrique **Paramètres → Documents PDF**, réservée aux administrateurs :
émetteur, sous-titre, coordonnées, logo PNG/JPEG et pied commun personnalisables,
avec aperçu fictif du brouillon avant sauvegarde. Les nouveaux PDF générés
utilisent ces réglages sans redémarrage ni migration supplémentaire.
`npm run test:pdf` inclut leurs tests purs ; `npm run test:documents-pdf`
complète la recette API sur une base jetable, et `npm run test:documents-pdf:ui`
vérifie l'interface après le build avec une API simulée. La commande
`npm run test:pdf-reader:ui` vérifie la lecture des documents sur ordinateur et mobile.

## Tests sur une base jetable

```bash
npm run test:errors
npm run test:installation
npm run build
npm run test:parametres
npm run test:stock
npm run test:inventaire
npm run test:integration
npm run test:utilisateurs:ui
```

`test:installation` migre une base vide, vérifie la connexion du premier administrateur,
le rejeu du migrateur et le chargement facultatif des exemples.
`test:stock` vérifie la validation et les transferts réels (conservation,
concurrence, audit et droits). `test:integration` enchaîne également les
suites API et sécurité, puis les scénarios d’inventaire physique.
Ces commandes créent leur propre base MariaDB,
appliquent le schéma, les migrations et les seeds, démarrent une API isolée,
puis arrêtent cette API et suppriment la base créée, même en cas d'échec.
Elles n'utilisent jamais `DB_NAME` comme cible.

`test:utilisateurs:ui` utilise Chromium pour vérifier les dialogues, les mots
de passe, les droits et la persistance réelle. Ajouter `-- --all` pour exécuter
aussi les suites API et sécurité dans la même base jetable.

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
