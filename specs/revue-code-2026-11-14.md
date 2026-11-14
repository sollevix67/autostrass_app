# Revue intégrale du code — 14 novembre 2026

La revue relève **16 défauts : sept P1, huit P2 et un P3**. Les plus urgents
concernent les montants encaissés, les empreintes fiscales et les écritures
affichées comme réussies après un refus API. Aucun correctif applicatif n'est
inclus : cette livraison rassemble la revue, la passation compactée et Graphify.

Révision examinée : `397ddee2951016ed5283397b35d822132528558b`, branche `main`.
P1 : correction prioritaire avant utilisation du parcours concerné en production ;
P2 : correction à planifier ; P3 : anomalie mineure de contrat.

## Périmètre et méthode

Lecture répartie entre trois agents et le conducteur, avec recoupement des
routes, repositories, schémas, appels frontend et tests. **203 fichiers de code,
styles et SQL, 40 374 lignes** : `src/` (78), `server/` (35), `scripts/` (31),
`database/` (15), outils `.github/` (42), deux configurations TypeScript racine.
`index.html`, configurations, contrats documentés et snapshots Drizzle ont
également été examinés. L'[inventaire](revue-code-2026-11-14.json) conserve les
chemins, nombres de lignes, SHA-256 et périmètres de revue.

Les preuves dynamiques utilisent Chromium avec API interceptée ou les fonctions
réelles en mémoire. Aucune connexion à la base applicative, migration, écriture
fiscale ou modification de données métier n'a été effectuée. La concurrence SQL
est analysée statiquement, sans nouvelle recette MariaDB. Les sept constats de
la [revue WCAG précédente](accessibilite-wcag-review.md) restent ouverts et ne
sont pas recomptés ci-dessous. Les fonctionnalités absentes de TODO sont des
écarts métier, distincts des défauts de fonctionnement retenus ici.

## Constats prioritaires

### R01 — P1 — Le comptoir encaisse le HT alors que la facture réclame le TTC

Sources : [VentesComptoirView.tsx](../src/views/VentesComptoirView.tsx), lignes
125 et 155 ; [schemas.ts](../server/middleware/schemas.ts), ligne 380 ;
[pdfInvoice.ts](../server/services/pdfInvoice.ts), lignes 207–212.
Le panier utilise `prixUnitaireHT`, le paiement minimal et la monnaie sont
calculés sur le HT. La facture ajoute ensuite systématiquement 20 %. Une vente
de 31 € HT est acceptée et encaissée à 31 €, mais sa facture affiche 37,20 € TTC.
Les articles peuvent avoir d'autres taux : aucun taux n'est figé dans les lignes
de vente. Définir et conserver une base commune pour total, TVA, paiement,
monnaie, empreinte et facture, plutôt que de calculer la taxe seulement au PDF.
Preuve : chaîne d'appels recoupée et arithmétique du cas présent dans les fixtures API.

### R02 — P1 — Une monnaie arbitraire permet une recette nulle ou négative

Source : [schemas.ts](../server/middleware/schemas.ts), lignes 373–381.
Le schéma vérifie seulement `montantPaye >= total`, puis accepte toute monnaie
non négative. Les fonctions réelles acceptent total 10 €, payé 10 €, monnaie
10 € ou 20 € : la caisse retient respectivement 0 € ou −10 € pour une vente
validée. Le calcul frontend ne protège pas les autres clients de l'API. Recalculer
la monnaie au serveur selon le paiement et les totaux retenus, ou vérifier leur
cohérence avant la transaction. Preuve : `venteBodySchema.safeParse` exécuté en mémoire.

### R03 — P1 — Un prix accepté peut rompre sa propre empreinte après stockage

Sources : [schemas.ts](../server/middleware/schemas.ts), ligne 333 ;
[documentRepositories.ts](../server/repositories/documentRepositories.ts), ligne
317 ; [resourceRoutes.ts](../server/middleware/resourceRoutes.ts), ligne 432.
Les prix ne sont pas limités aux centimes. Avec `prixUnitaire = 0.015`, l'empreinte
utilise `Math.round(0.015 * 100) = 2`, tandis que l'insertion utilise
`(0.015).toFixed(2) = '0.01'`. Après relecture, le prix signé devient un centime
et la vérification signale une altération sans modification postérieure à la vente.
Valider la précision ou normaliser une seule fois avant calcul, stockage et
scellement. Preuve : schéma, sérialisation et vérificateur réels exécutés en mémoire,
rupture sur la vente 1 ; stockage SQL lui-même non exécuté.

### R04 — P1 — Le contrôle fiscal déclare intact un préfixe seulement

Source : [complianceRoutes.ts](../server/middleware/complianceRoutes.ts), ligne 71.
La route prend les 5 000 premières ventes par défaut, puis renvoie `etat: intacte`
sans indiquer que la chaîne continue au-delà. Une rupture sur la vente 5 001 est
invisible au contrôle habituel. Une limite demandée plus petite reproduit le
problème. Vérifier toute la chaîne par lots ou expliciter un résultat partiel avec
borne et continuation. Preuve : chaîne de 5 001 ventes construite en mémoire,
dernière vente modifiée ; préfixe `{intacte:true}`, chaîne complète
`{intacte:false, rupture:5001}`. Sélection limitée de la route confirmée statiquement.

### R05 — P1 — Deux ouvertures peuvent créer deux caisses pour le même compte

Sources : [cashRegisterRepository.ts](../server/repositories/cashRegisterRepository.ts),
ligne 264 ; [schema.ts](../server/db/schema.ts), lignes 361–362.
L'ouverture recherche une session existante sans verrou, puis insère ; les index
sur statut/utilisateur ne sont pas uniques. Deux transactions qui lisent avant
la première insertion peuvent donc chacune créer une session ouverte. Les verrous
des ventes ne réparent pas cette double ouverture ; sélection et attribution des
ventes deviennent ambiguës. Sérialiser l'ouverture sur une ligne stable du compte
ou ajouter une contrainte garantissant l'invariant. Preuve statique : transaction,
schéma et migrations recoupés ; pas de reproduction concurrente sur MariaDB.

### R06 — P1 — L'archive annuelle refuse une chaîne intacte entre deux années

Source : [archive-fiscal.ts](../scripts/archive-fiscal.ts), lignes 92 et 137.
L'export filtre l'année demandée, mais le vérificateur repart de la genèse. La
première vente de cette année référence pourtant celle de l'année précédente.
Deux ventes scellées le 31 décembre 2025 et le 1er janvier 2026 passent ensemble ;
le lot 2026 seul échoue sur la vente 2 et l'archive est refusée avant écriture.
Conserver le chaînon précédent dans le format d'archive, avec son contrôle lors
de l'export et de la relecture. Preuve : fonctions réelles exécutées en mémoire,
aucune archive réelle consultée ou écrite.

### R07 — P1 — Réceptions et Catalogue affichent un succès après un refus API

Sources : [ReceptionsView.tsx](../src/views/ReceptionsView.tsx), lignes 47–50 et
139–152 ; [useResource.ts](../src/hooks/useResource.ts), lignes 55 et 124–127 ;
[useCatalogue.ts](../src/hooks/useCatalogue.ts), lignes 168–172 ;
[CatalogueView.tsx](../src/views/CatalogueView.tsx), ligne 143.
Les réceptions laissent les écritures locales autorisées par défaut. Un POST
`503 DATABASE_UNAVAILABLE` crée une ligne locale, ferme le dialogue et efface la
saisie ; le toast affiche même `NaN € HT`, puisque le faux résultat n'a pas de
total serveur. Le Catalogue bloque le mode hors ligne déjà connu, mais une panne
pendant un PUT bascule en repli local et la fermeture utilise l'ancien état.
Preuves Chromium : une requête refusée dans chaque parcours, aucun dialogue
ouvert après réponse, toast de succès ; modification Catalogue visible seulement
localement. Exiger une réponse API avant succès et conserver la saisie en cas
d'échec, conformément aux contrats des guides.

## Autres défauts confirmés

### R08 — P2 — Le journal soustrait deux fois la monnaie rendue

Source : [cashRegisterRepository.ts](../server/repositories/cashRegisterRepository.ts),
lignes 348 et 365. Pour payé 50 €, monnaie 19 €, le journal écrit un encaissement
net de +31 €, puis une sortie de −19 € : somme 12 € au lieu de 31 €. La clôture
utilise les ventes et conserve 31 €, d'où une divergence entre journal et total
théorique. Choisir encaissement brut plus rendu, ou encaissement net seul.
Preuve : vraie méthode `recordVente`, transaction simulée capturant les insertions.

### R09 — P2 — Une empreinte manquante récente est qualifiée d'historique ancien

Source : [compliance.ts](../server/middleware/compliance.ts), ligne 135.
Toute empreinte `null` est comptée comme antérieure, sans borne de mise en
conformité ni distinction après le début de la chaîne. Si la dernière vente
scellée perd son empreinte, le contrôle reste intact. Le cas d'une vente seule
avec empreinte manquante donne `{intacte:true, anterieures:1}`. Conserver la
compatibilité avec l'historique réellement ancien, mais refuser une absence dans
la période scellée. Preuve : vérificateur réel exécuté en mémoire.

### R10 — P2 — StrictMode laisse des référentiels vides dans les formulaires

Source : [useReferentials.ts](../src/hooks/useReferentials.ts), lignes 37–45 et
84–90. La promesse partagée conserve le signal d'une seule instance. Le premier
nettoyage StrictMode l'annule ; le second effet rejoint cette promesse et le
résultat vide est mis en cache. Chromium, accès direct `/commandes-clients` avec
un client fourni par l'API simulée : une seule requête `/clients`, sélecteur
restant vide après réponse. Une navigation rapide peut aussi annuler la requête
partagée d'une autre instance. Découpler l'annulation d'un abonné de la requête
commune et éviter de conserver un résultat annulé comme une liste valide.

### R11 — P2 — Actualiser Caisse ne recharge pas son journal

Sources : [useCashSession.ts](../src/hooks/useCashSession.ts), lignes 134–155 ;
[CaisseView.tsx](../src/views/CaisseView.tsx), ligne 262.
Le hook dépend uniquement de l'id et mémorise l'id déjà demandé. Le bouton recharge
session et plafond, mais pas les mouvements de cette même session. Chromium avec
API simulée : le total espèces passe de 0 à 10 €, un seul GET mouvements et
aucune nouvelle entrée dans le journal. Exposer une recharge des mouvements et
la déclencher avec les autres données ; le défaut concerne aussi le build de production.

### R12 — P2 — Une panne SQL est renvoyée comme une authentification invalide

Source : [auth.ts](../server/middleware/auth.ts), ligne 203.
`requireAuth` convertit toute exception étrangère à `AuthError` en 401, y compris
une panne de lecture du compte. Vrai JWT et vraie fonction, repository simulant
`ECONNREFUSED` : `401 UNAUTHENTICATED`, au lieu du 503 du mapping commun. Les routes
affichent alors une erreur d'authentification ; lors du chargement, `/auth/me`
échoue et la restauration de session est abandonnée. Chaque requête ne déconnecte
pas automatiquement l'utilisateur. Préserver la classification SQL de disponibilité.

### R13 — P2 — La recherche de tokens boucle sans fin à la racine Windows

Source : [embed-tokens.cjs](../.github/prompts/design-system/scripts/embed-tokens.cjs),
lignes 19–23. La boucle s'arrête seulement sur `/`. Sous Windows,
`path.dirname('C:\\') === 'C:\\'` : en l'absence de `assets/design-tokens.css`,
elle ne se termine jamais. Ce fichier est absent du dépôt actuel. Commande réelle
restée active au-delà du délai de deux secondes, processus Node de reproduction
identifié puis arrêté. Tester la stabilité du parent pour terminer sur toutes
les plateformes et retourner l'erreur prévue.

### R14 — P2 — Trois scripts absents empêchent la suite d'outils de se charger

Sources : [test_catalog_refresh.py](../.github/prompts/ui-ux-pro-max/scripts/tests/test_catalog_refresh.py),
ligne 13 ; [test_relevance_evaluator.py](../.github/prompts/ui-ux-pro-max/scripts/tests/test_relevance_evaluator.py),
ligne 9. Les recherches d'ancêtre supposent présents `refresh-google-fonts.py`,
`refresh-icon-catalog.py` et `evaluate-relevance.py`. Ils ne sont pas versionnés :
deux modules lèvent `StopIteration` avant leurs tests. Restaurer les outils et
leurs chemins ou réviser explicitement ces tests si le périmètre a été retiré.
Preuve : suite unittest, 130 tests réussis et deux erreurs de chargement ; collecte
incomplète, aucune suite globale présentée comme verte.

### R15 — P3 — Les dates des utilisateurs sont perdues par le mapper

Source : [utilisateurRepository.ts](../server/repositories/utilisateurRepository.ts),
lignes 53 et 67–68. `PUBLIC_COLUMNS` projette `createdAt`/`updatedAt`, mais le
mapper lit `created_at`/`updated_at`. Les lectures retournent donc des chaînes
vides pour ces dates malgré les valeurs SQL. Aligner les clés projetées et lues.
Preuve statique : projection Drizzle, appels list/findById et mapper recoupés.

### R16 — P2 — Le générateur de design ignore la couleur de texte contrastée

Source : [design_system.py](../.github/prompts/ui-ux-pro-max/scripts/design_system.py),
lignes 1196–1197. Le CSS du bouton principal utilise l'accent et impose du blanc,
même quand le résultat contient un token `on_accent` adapté. Avec l'accent ERP
`#D97706`, le blanc donne un contraste de 3,19:1, inférieur aux 4,5:1 requis pour
un texte ordinaire ; le noir prévu donne 6,59:1. Une régénération du master peut
donc réintroduire ce défaut dans les consignes de design. Utiliser `on_accent`
dans le CSS généré. Preuve : génération en mémoire et calcul du contraste ;
le bouton actuel de l'application n'est pas modifié par cette revue.

## Validation et limites pratiques

| Contrôle du jour | Résultat |
|---|---|
| `npm run build` | Réussi ; bundle 598,64 kB, avertissement >500 kB préexistant |
| `npm run lint` | Réussi |
| `npm run test:errors` | Réussi |
| `npm run test:pdf` | Réussi |
| `npm exec -- tsx scripts/test-parametres-unit.ts` | Sept groupes réussis |
| Syntaxe Python AST / Node `--check` | 35 / 16 fichiers conformes |
| pytest UI-styling et brand | 59 tests réussis |
| pytest design-system avec `-X utf8` | Deux tests réussis |
| unittest UI-Pro | 130 réussites, deux modules en erreur, collecte incomplète |
| Recettes ciblées Chromium | Quatre scénarios confirmés : référentiels, réceptions, catalogue, journal Caisse |
| Fonctions fiscales/Caisse/authentification en mémoire | Anomalies chiffrées ci-dessus reproduites |

pytest a été installé dans un environnement temporaire hors dépôt. Les premiers
lancements avec Python global ont échoué faute de dépendance ; le test de tokens
a ensuite rencontré un décodage cp1252, résolu pour l'exécution par `-X utf8`.
Les deux erreurs UI-Pro restent présentes. Aucune nouvelle suite API/sécurité
avec MariaDB n'a été exécutée ; les campagnes historiques ne sont pas attribuées
à cette revue. Les tests verts existants ne couvrent pas les défauts rapportés.

La passation conserve l'état livré, les contrats, migrations, priorités et liens
de reprise ; son ancien contenu est récupérable par `git show 397ddee:passation.md`.
Graphify est régénéré et contrôlé après ces changements ; détails et limites de
son indexation dans [passation.md](../passation.md).
