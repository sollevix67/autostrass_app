# Correctifs de la revue intégrale — 14 novembre 2026

Les **16 constats R01–R16** de la [revue](revue-code-2026-11-14.md) sont corrigés.
La revue initiale et son inventaire SHA-256 restent des preuves de l'état examiné
sur `397ddee`, distinctes de cette livraison.

| Constat | Comportement livré | Preuve principale |
|---|---|---|
| R01 | TVA du catalogue figée par ligne ; HT/TVA/TTC communs au panier, paiement, stockage, scellement et PDF | Recettes SQL et Chromium, facture réelle à taux mixtes |
| R02 | Rendu calculé au serveur ; valeur fournie incohérente refusée ; carte/chèque exactement au TTC | Validation pure et appels API refusés |
| R03 | Prix et paiements limités aux centimes ; frontend/serveur alignés | Prix `0.015` refusé et chaîne v2 relue en SQL |
| R04 | Toute la chaîne contrôlée par lots ; `limite` est la taille du lot | Rupture sur la 5 001e vente en mémoire et après ajout de 5 001 ventes SQL |
| R05 | Ouverture sérialisée sur le compte, lecture `READ COMMITTED`, hydratation dans la transaction | 12 appels simultanés : un succès/11 conflits ; deux comptes avec pool de deux connexions |
| R06 | Archive annuelle v2 ancrée sur la vente précédente, avec preuve du début et chaînons interannées | Export SQL, relecture CLI/SHA-256, altérations d'ancrage et ventes antidatées |
| R07 | Réceptions et Catalogue exigent confirmation API ; refus conservant formulaire et données | POST/PUT/DELETE simulés en 503 et nouvelles tentatives Chromium |
| R08 | Journal espèces : paiement brut puis rendu négatif, sans double soustraction | Paiement 50/rendu 12,80, recette 37,20 ; clôture exacte |
| R09 | Absence après début de chaîne ou en v2 toujours refusée, y compris l'ancrage annuel ; ancien préfixe v1 prouvé conservé | Régressions indépendantes v2/null puis nouvelle genèse, chaîne et archive |
| R10 | Requête référentielle partagée indépendante du démontage d'un abonné ; échecs non mis en cache | StrictMode, navigation pendant une requête et reprise après 503 |
| R11 | Actualisation explicite du journal pour une même session, avec erreur et nouvelle tentative | Recettes Vite et production |
| R12 | Erreurs SQL relayées au mapping 503, authentification invalide restant en 401 | JWT réel et repository simulant refus/timeout SQL |
| R13 | Recherche de tokens terminée quand le parent devient stable | Deux tests CLI, dont racine Windows sans tokens |
| R14 | Trois outils manquants et leur module métrique restaurés à une révision amont figée | 155 tests UI-Pro, collecte complète ; [provenance](../.github/prompts/ui-ux-pro-max/scripts/SOURCES.md) |
| R15 | Mapper utilisateur lisant les dates projetées `createdAt`/`updatedAt` | Liste, lecture, authentification et absence de hash public |
| R16 | CSS principal généré à partir de `on_accent` | Tests génération et contraste |

## Contrat de vente et migration

La migration [0011](../database/drizzle/0011_fast_orphan.sql) ajoute
`vente_lines.taux_tva` et `ventes.total_tva`, `total_ttc`, `fingerprint_version`.
Les anciennes lignes restent sans taux figé, les anciens totaux TVA/TTC à `NULL`
et leur empreinte en version 1. Le PDF les identifie comme historiques sans
inventer une TVA de 20 %. Aucune vente ancienne ni empreinte n'est recalculée.

Les nouvelles ventes utilisent une empreinte v2, incluant TVA/TTC et taux des
lignes. Le prix unitaire reste **HT**, à deux décimales. Le taux provient du
catalogue dans la transaction ; s'il est fourni par le client, un taux obsolète
est refusé en `409 TVA_MODIFIEE`. Les clients existants peuvent omettre ce taux.
La TVA est arrondie au centime **par ligne**, puis sommée ; les calculs de taxe
utilisent des entiers. Le TTC est la base du paiement. La monnaie peut être omise
et est calculée au serveur ; une monnaie fournie doit correspondre exactement.
Carte/chèque : montant égal au TTC, sans rendu. Les capacités DECIMAL sont validées
avant insertion et un panier hors limite reste affichable sans plantage.

Avant déploiement : sauvegarder, appliquer `npm run db:migrate` et redémarrer
l'API. Migration appliquée et contrôlée **uniquement dans les bases jetables**
de cette recette ; la base configurée réelle n'a pas été modifiée.
Les anomalies historiques restent à rapprocher des paiements et des justificatifs,
par correction comptable explicite ; l'outil d'effacement des empreintes est
désormais réservé au harnais de test.

## Validations reproductibles

`npm run build`, `npm run lint`, `npm run test:errors`, `npm run test:pdf`,
`tsx scripts/test-vente-validation.ts`, `tsx scripts/test-utilisateurs-mapping.ts`
et **neuf groupes** `tsx scripts/test-fiscal-integrity.ts` réussis.

`npm run test:ventes` ajoute la recette de base/API jetable via `TEST_DB_*` :
**11 groupes** montants/concurrence/rollback, **128 contrôles API**, **59 contrôles
de sécurité**, export/relecture annuelle et chaîne de plus de 5 000 ventes.
MariaDB portable 11.4.5 a été démarrée sur boucle locale, puis arrêtée ; toutes
les bases de recette ont été supprimées par leur harnais. Les suites directes
API/sécurité restent réservées à une base jetable.

Recettes UI : `node scripts/test-review-frontend-ui.mjs` et
`node scripts/test-vente-totals-ui.mjs`, chacune sous Vite/StrictMode et sur le
build de production. Résultats et captures : [frontend](screenshots/revue-correctifs-frontend/verification.json),
[comptoir](screenshots/revue-correctifs-ventes/verification.json).

Outils : **155 tests UI-Pro** et **deux tests CLI tokens** réussis. L'évaluateur
restauré traite 90 cas sans seuils ; ses seuils historiques refusent les empreintes
d'un autre runtime. Ils restent inchangés, et ce diagnostic ne constitue pas une
validation des seuils. Avertissement Vite >500 kB préexistant conservé.
Les sept constats WCAG, les fonctionnalités manquantes, les recettes de déploiement
et les opérations sur matériel réel restent dans la passation.
