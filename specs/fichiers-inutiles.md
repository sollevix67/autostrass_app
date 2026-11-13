# Audit des fichiers inutiles — 13 novembre 2026

Analyse initiale du dépôt à partir du commit `aec0e60` : **805 fichiers suivis
par Git, 47 511 424 octets**. Cette première intervention était documentaire.
Le nettoyage ci-dessous a ensuite été demandé par l'utilisateur, sans migration
ni écriture en base.

## Archivage et suppression

Les neuf fichiers sans usage interne ont été sauvegardés puis supprimés le
13 novembre 2026, à partir du commit `181c545`. Archive versionnée :
[fichiers-inutilises-2026-11-13.zip](../backups/nettoyage/fichiers-inutilises-2026-11-13.zip),
**23 660 octets**, contenant les neuf fichiers avec leurs chemins relatifs
d'origine, `MANIFEST.json` et `RESTAURATION.md`.

CRC, chemins sûrs, tailles et SHA-256 vérifiés deux fois indépendamment avant
suppression ; chaque entrée reproduisait exactement le fichier original.
SHA-256 du ZIP :
`989ebcb8182022a727f078d23c40a592fb7869adb1f8f63afaa191d3594a3065`.
Le guide inclus décrit la restauration. Les nettoyages conditionnels listés
plus bas ne font pas partie de cette suppression.

Validation du nettoyage : `npm run build`, `npm run lint` et `npm run test:errors`
réussis ; seuls les avertissements préexistants de taille du bundle Vite et de
fonction du vérificateur Figma inutilisée subsistent. Graphify actualisé :
**2 908 nœuds, 5 987 liens, 192 communautés**, 180 empreintes de code conformes,
aucune source manquante, aucun lien orphelin, HTML/JSON cohérents. Les sources
supprimées ne figurent plus dans le manifeste ni dans les nœuds et liens.

## Fichiers archivés puis supprimés

Ces neuf fichiers étaient les premiers candidats au nettoyage, avec une confiance
élevée. Ils représentaient **41 350 octets**. L'absence de référence interne ne
permet pas de vérifier les éventuels consommateurs externes d'une URL publique.

| Fichier | Octets | Preuve |
|---|---:|---|
| `src/utils/coerce.ts` | 733 | Aucun import depuis les points d'entrée ou les scripts ; `pickEnum` n'apparaît que dans sa définition, les fonctions serveur `toNumber` sont distinctes. |
| `src/utils/ids.ts` | 965 | Aucun import ; `createLineId` n'apparaît que dans sa définition, le `nextId` de `Toast.tsx` est une variable locale indépendante. |
| `src/assets/hero.png` | 13 057 | Aucun import ni référence textuelle dans le dépôt. |
| `src/assets/react.svg` | 4 126 | Aucun import ni référence textuelle ; asset du modèle initial. |
| `src/assets/vite.svg` | 8 709 | Aucun import ni référence textuelle ; asset du modèle initial. |
| `public/icons.svg` | 5 031 | Sprite sans usage interne ; `src/components/Icon.tsx` produit ses propres SVG inline. |
| `build_errors.txt` | 7 906 | Ancien journal de compilation, sans consommateur ; les dernières validations documentées sont réussies. |
| `generate-debug.txt` | 149 | Ancien avertissement Drizzle Kit 0.18.1 ; la dépendance actuelle est 0.31.11. |
| `database/drizzle/meta/_journal.json.bak` | 674 | Sauvegarde limitée à 0000–0003 ; le journal actif contient 0000–0010 et le migrateur lit uniquement `_journal.json`. |

Avant suppression, les deux modules TS étaient inclus dans la vérification
TypeScript par `include: ["src"]`, mais n'étaient appelés par aucun module. Des fonctions exportées peuvent
passer `noUnusedLocals` même si leur fichier n'est jamais importé.

## Sauvegardes et artefacts à rationaliser

| Ensemble | Taille initiale | Recommandation |
|---|---:|---|
| Cinq captures `specs/screenshots/formulaires-modaux/*-PCDT67.png` | 701 563 octets | Candidates à supprimer : SHA-256 identique aux originales du commit `f1d4b3a`, retrouvables dans Git. Elles diffèrent des captures actuelles et ne doivent pas être décrites comme leurs doublons binaires. |
| Sept sauvegardes datées `graphify-out/2026-*` présentes au démarrage | 19 551 100 octets, 35 fichiers | Choisir une durée de conservation ; Git garde déjà les versions précédentes. Conserver le graphe courant. |
| `graphify-out/cache/` | 3 090 734 octets, 215 fichiers | Cache technique, à considérer pour l'exclusion du versionnement. Les caches AST sont régénérables ; préserver les résultats sémantiques si leur recalcul payant doit être évité. |
| Deux `graphify-out/cache/.gfy-replace-bak-*.tmp` | 68 602 octets, inclus dans le cache | Reliquats de sauvegardes temporaires, candidats à examiner lors du nettoyage du cache ; ne participent pas au graphe d'imports applicatif. |

Les cinq captures historiques sont :

- `base-de-donnees-1440-light-PCDT67.png`
- `categories-1440-light-PCDT67.png`
- `connexion-1440-light-PCDT67.png`
- `https-1440-light-PCDT67.png`
- `limites-api-1440-light-PCDT67.png`

Graphify représente **28 579 367 octets**, soit environ **60 %** du volume des
fichiers suivis initialement. Son diagramme courant, son manifeste et ses données
de navigation restent utiles et sont requis par les consignes du dépôt. Les
tailles ci-dessus précèdent l'actualisation du graphe effectuée pour cet audit.

## Fichiers locaux hors Git

`.ventes-review.local/` contient **149 486 120 octets**, dont 149 465 312 dans
`database-data/`. La passation le décrit comme un résidu de recette jetable.
L'inventaire des processus n'a trouvé aucun MariaDB et aucun Node dont la commande
mentionne ce répertoire. Un futur nettoyage doit néanmoins vérifier à nouveau
l'absence de service actif et le caractère jetable des données au moment d'agir.
Aucun fichier de données ou de configuration sensible n'a été ouvert.

`dist/` (653 677 octets), les journaux locaux et les fichiers `*.tsbuildinfo`
sont des sorties régénérables, déjà ignorées par Git. `node_modules/` et `.venv/`
sont des environnements de travail ; leur absence du code applicatif ne suffit
pas à les qualifier d'inutiles. `.catalogue-verification.local/` est vide.

## À conserver ou à confirmer

- `database/schema.sql`, `seed_v2.sql` et `seed_v3.sql` : utilisés dans
  `scripts/lib/test-environment.ts:185–188` et `scripts/seed.ts:24`.
- Migrations journalisées, snapshots Drizzle et `_journal.json` actif : nécessaires
  au suivi du schéma et aux futures générations de migrations.
- `database/migrate_v1.sql` : hors chaîne actuelle, mais réalise la conversion
  spécifique `stock_items` → `articles` d'une ancienne installation. Archivable
  seulement après confirmation de l'abandon de ces installations.
- Scripts de tests sans commande npm : recettes manuelles documentées. Les outils
  fiscaux, `apply-migration.ts` et les diagnostics de Caisse ont aussi un usage.
- Feuilles CSS : imports vérifiés, y compris `tokens.css` via `index.css`.
- `server/types/pdfmake.d.ts` : déclaration ambient incluse par le tsconfig serveur.
- `public/favicon.svg` : référencé dans `index.html`.
- `.github/skills/`, `.github/prompts/`, `.claude/` et `.omc/` : outils de développement
  facultatifs au runtime, documentés dans `.claude/CLAUDE.md`. Les commandes
  `npm run uipro` et `uipro:node` utilisent notamment les données UI/UX.

Six paires de documents de référence dans `.github/prompts/design/` et les prompts
`slides/`/`banner-design/` sont identiques octet pour octet (**23 160 octets de
redondance**). Une mutualisation exige de corriger les références des prompts ;
supprimer simplement une copie casserait les chemins documentés. Conserver les
licences des ressources tierces.

Le bas de `README.md`, à partir de « React + TypeScript + Vite », conserve les
instructions génériques en anglais du modèle. Ce contenu est à adapter ; le
README contient par ailleurs la configuration et les commandes du projet.

## Vérifications

Lecture préalable de `passation.md`, des consignes et des fichiers Graphify.
Inventaire Git, tailles, recherche des références et comparaison SHA-256.
Analyse des imports avec `ts.preProcessFile`, résolution `.js` → `.ts`, points
d'entrée frontend/backend, Vite, Drizzle et tous les scripts : **118 fichiers
src/server**, deux modules TS non atteignables, aucune résolution relative en
échec. Les références CSS et déclarations ambient ont été vérifiées séparément.

Au démarrage, les **182 empreintes de code** TS/TSX/JS/MJS/CJS/Python du manifeste
Graphify étaient conformes et aucun fichier indexé ne manquait. Le graphe sert
à l'orientation ; il ne prouve pas l'utilisation runtime. CSS et SQL sont hors
extraction de code et la sémantique documentaire n'a pas été relancée.
Graphify 0.9.108 a ensuite actualisé le diagramme : **2 925 nœuds, 5 999 liens,
172 communautés**, aucun identifiant en double ni lien orphelin, identifiants
et extrémités des liens HTML/JSON identiques. Les 182 empreintes de code sont
conformes. Son CLI a remplacé automatiquement le cache AST de l'ancienne version
et créé une sauvegarde datée ; à la fin de l'audit initial, les candidats étaient
encore présents. Ils sont maintenant conservés dans le ZIP. Les détails de l'actualisation et de la livraison figurent dans
`passation.md`.

Aucun test applicatif ou SQL requis pour l'audit documentaire initial. Pour
la suppression, compilation, lint et test de correspondance des erreurs SQL
font partie des validations, avec contrôle de l'archive et de Graphify.
