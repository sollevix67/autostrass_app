# Passation — OpenStrass

État consolidé le **28 novembre 2026**. Le parcours d’achat des devis convertis
couvre le choix du fournisseur, la commande, les réceptions et les attributions.
Les factures et les devis sont consultables dans l’application.
La base de développement `autostrass_test` est en 0013. L’API redémarrée et
l’écran des commandes fournisseurs ont été vérifiés sur cette base.
Les 16 constats de la revue initiale restent corrigés. Les preuves et procédures
détaillées sont dans les guides liés. L'ancien journal reste disponible
avec `git show 397ddee:passation.md` (747 lignes, 55 795 octets dans Git).

## Prochaines priorités

Les **16 constats R01–R16** sont corrigés et testés ; détail, migration et preuves
dans les [correctifs](specs/correctifs-revue-2026-11-14.md). La revue et son inventaire
SHA-256 documentent l’ancien état. La [revue du 27 novembre](specs/analyse-depot-2026-11-27.md)
et ses [correctifs](#reprise-des-cinq-correctifs-du-27-novembre-2026) couvrent cinq autres constats.

1. Vérifier la version des autres installations et y déployer la migration
   **0013** après sauvegarde, puis redémarrer leur API.
   Rapprocher les anciennes ventes
   HT encaissées de leurs justificatifs, sans réécriture ni reset d'empreintes.
2. Étendre l’approvisionnement aux commandes clients saisies directement et
   compléter les bons de commande et de livraison PDF. Le parcours livré est
   décrit dans le [guide des achats](specs/commandes-fournisseurs.md).
   [TODO.md](TODO.md) reste le cahier des charges.
3. Vérifier les migrations et le redémarrage API sur chaque installation ;
   réaliser les recettes certificat, Cloudflare Turnstile et PDA Zebra TC22.
   L'authentification Android avec Turnstile reste à définir.
4. Réconcilier le stock historique excédentaire par comptage physique.

## Architecture et repères

React 19, TypeScript, Vite et React Router 7 ; Express 5, MariaDB/mysql2 et Drizzle.
Express est le backend livré, malgré la mention initiale NestJS dans TODO.
Vite relaie `/api` vers le port 3001. Les commandes `tsx` actuelles ne surveillent
pas les fichiers : **redémarrer l'API** après un changement serveur.

| Périmètre | Entrées |
|---|---|
| Routes, navigation, thèmes | `src/App.tsx` |
| HTTP et contrats | `src/services/{api,contracts,resilience}.ts` |
| Hooks et formulaires | `src/hooks/`, `src/schemas/`, `src/components/` (RHF/Zod) |
| Serveur et accès aux données | `server/index.ts`, `server/middleware/`, `server/repositories/` |
| Schéma | `server/db/schema.ts`, `schema_step2.ts`, `database/drizzle/` |
| Design | [MASTER.md](design-system/autostrass/MASTER.md), `src/*.css` |

Conserver les services et validations partagés, les identifiants numériques,
les imports backend en `.js`, deux espaces, apostrophes simples et aucun
point-virgule. Répondre en français. Après chaque action, actualiser cette
passation ; avant livraison, actualiser Graphify, committer et pousser.

## Modules livrés et travail restant

| Module | Livré | À compléter |
|---|---|---|
| Stock | Emplacements hiérarchiques, allocations, transferts, inventaire par référence et historique | Recette Zebra ; campagnes multi-articles et brouillons partagés |
| Catalogue | CRUD, référentiels administrables, prix HT/TTC, TVA, EAN13, forcing et délai | Recherche EAN13 dédiée, compatibilité immatriculation/VIN |
| Caisse/comptoir | Sessions sérialisées, comptages, plafond, TVA figée, encaissement TTC, empreintes v1/v2, facture PDF ; migration 0011 locale appliquée | Autres installations ; rapprochement historique ; clavier/autocomplétion et recette fiscale |
| Devis | Numéro D, création/édition, PDF, partage volontaire email/WhatsApp, conversion C atomique et besoins courants | Recette messageries/PDA sur appareils ciblés |
| Fournisseurs/réceptions | Fournisseur et mode par besoin, horaires, achats groupés, prix d’achat, réceptions partielles, stock et attribution au client | Approvisionnement des commandes directes et rapprochement des anciens reliquats inconnus |
| Commandes clients | Création, lignes, statuts, numéros C et TVA/client figés ; commandes issues d'un devis protégées | Bon PDF et approvisionnement des commandes directes |
| Livraisons | CRUD lié aux commandes, dates, transporteur, adresse/statut ; modèle PDF documenté | Bons automatiques, numérotation, tournées et secteurs ; [modèle BL](specs/bon-livraison-modele.md) |
| Retours | Création et lignes, montant recalculé | Avoirs numérotés/PDF, remise en stock, motifs et bons de refus |
| Clients | CRUD, numéro personnalisable, SIRET professionnel, secteur facultatif | Autocomplétion adresse/SIREN/SIRET, documents/paiements, limites et tournées |
| Véhicules | CRUD et statut | Kilométrage, entretien, carburant et coût/km |
| Utilisateurs | Création/édition, rôles, activation et protections contre l'auto-verrouillage | Plannings, horaires, accès métier détaillés |
| Paramètres | Dix rubriques, référentiels, plafond Caisse, présentation des PDF, DB, quotas, HTTPS et Turnstile | Recette de déploiement réelle |

## Contrats métier à préserver

Ces invariants expriment le comportement attendu. Les défauts de la revue initiale
sont corrigés dans la livraison liée ; les limites métier et WCAG restent ouvertes.

**Stock et inventaire.** Origine de transfert explicite (allocation ou non affecté),
référence dans l'URL encodée, emplacements numériques ; destination `null` prioritaire
sur l'ancien alias `destination_id`. Quantités entières, stock disponible et
allocations cohérentes. Transactions/verrous, stock total conservé, fusion à la
destination, allocation vide supprimée ; transfert à soi sans effet. Mouvement
`TRANSFERT` de delta nul et audit atomiques, rollback si journalisation impossible.
Suppression d'emplacement sérialisée.
L'inventaire compte une référence complète, stock non affecté compris, avec motif
et confirmation. Version obsolète/rejouée refusée ; transaction `READ COMMITTED`
pour stock, allocations, historique, mouvement et audit. Après conflit, nouveau
comptage obligatoire. Historique autonome, filtre/pagination de 50, sans édition
ni suppression. Pas de brouillon serveur ni interception du bouton Précédent.
Guides : [inventaire](specs/inventaire-physique.md),
[emplacements](specs/stock-emplacements-design.md).

**Clients et fournisseurs.** Écritures confirmées par l'API, saisie conservée en cas
d'échec ; caissiers en lecture seule. Numéro client : 1 à 6 chiffres ASCII, zéros
initiaux préservés, facultatif en création, requis dans l'édition. Génération
transactionnelle `000001`–`999999`, saturation sans insertion, doublon
`409 CLIENT_NUMBER_EXISTS`. Les documents utilisent l'id interne ; anciens numéros
lisibles et remplacés seulement explicitement. SIRET facultatif de 14 chiffres,
`VARCHAR(14) NULL` ; effacement → `NULL`, clé omise en PUT → valeur conservée.
Client particulier → SIRET effacé atomiquement. Fournisseur : seul le nom requis,
coordonnées vides à `null`, erreurs API associées aux champs.
Guides : [clients](specs/client-modal.md), [fournisseurs](specs/fournisseurs.md).

**Caisse, ventes et PDF.** Une session ouverte au maximum par caissier ; vente sans
session refusée. Clôture par son propriétaire, y compris pour un admin, sérialisée
avec les ventes. Total théorique calculé au serveur ; seules les espèces touchent
le tiroir. Vente et mouvement atomiques. Vente validée/clôture figées ; correction
par avoir puis nouvelle vente. Empreintes SHA-256 chaînées, événements système,
archivage et mode dégradé fiscal : ne jamais réinitialiser les empreintes de
production pour masquer une anomalie.
L'auteur de vente vient du compte authentifié ; un nom fourni par le client est
ignoré, l'identité est conservée dans l'empreinte, le journal et la facture.
Prix HT en centimes ; taux TVA du catalogue figé à la création, taxe arrondie par
ligne puis sommée ; TTC commun au paiement, rendu, journal, empreinte v2 et PDF.
Carte/chèque au TTC exact, rendu espèces calculé au serveur ; montant incohérent
refusé. Historique v1 inchangé, TVA/TTC inconnus signalés dans son PDF.
Contrôle fiscal complet par lots, absence d'empreinte récente/v2 refusée ; archive
annuelle v2 ancrée avec chaînons interannées et contrôle SHA-256 à relecture.
Ouverture et clôture en dialogue : 15 coupures de 500 € à 0,01 €, sous-totaux et
calcul en centimes, total incomplet signalé. Confirmation de clôture dans le même
dialogue et protection synchrone contre les doubles envois. À l'ouverture, seul
le total `fondsCaisse` est persisté ; plafond dynamique admin, défaut 10 000 €,
maximum lié au `DECIMAL(12,2)`, zéro autorisé. Lecture indisponible → ouverture
bloquée ; actualiser ne perd pas la saisie. Changement appliqué aux ouvertures
suivantes, sans modifier les sessions existantes ni la clôture.
Guides : [ouverture](specs/caisse-ouverture.md), [clôture](specs/caisse-cloture.md).
La facture `GET /api/ventes/:id/facture` et le devis `GET /api/devis/:id/pdf`
existent. Les PDF refusent les URL et limitent les fichiers locaux aux quatre
polices Roboto de pdfmake. Bons de commande/livraison et avoirs PDF restent à créer.
En-tête, logo, coordonnées et pied commun configurables par l'admin ; les routes
injectent les paramètres à chaque génération, sans réécriture métier. Les logos
validés sont embarqués ; [guide](specs/documents-pdf-personnalisation.md).

**Devis et commandes.** Numéros D/C uniques, six lettres aléatoires `a-zA-Z`,
collation binaire, numéro/date immuables. Client, désignation et TVA figés, prix
HT explicitement éditables avant conversion ; nouvelle référence → catalogue.
Validation complète et version optimiste ; devis annulé/expiré non convertible,
converti figé. Conversion transactionnelle/idempotente, commande liée immuable
hors statut/date de livraison ; audit et lignes atomiques. Aucun mouvement de
stock ni fiscal. Les besoins des devis convertis tiennent compte des achats en
cours, des attributions et du stock disponible pour les commandes actives.
Consultation, téléchargement et partage du PDF contrôlés par version. Partage natif de fichier ou repli
téléchargement + email/WhatsApp, sans envoi automatique ni statut fictif.
[Guide](specs/devis.md), [recette](specs/captures/devis/resultats.json).

**Formulaires et utilisateurs.** Les formulaires métier et Administration sont
migrés en dialogues natifs : focus contenu/restitué, Annuler/croix/Échap,
clic extérieur sans fermeture ni perte de saisie,
fermeture et doubles envois bloqués pendant l'écriture, saisie conservée en erreur.
Filtres, sélection de référence inventaire et connexion restent dans la page.
Panier conservé à la fermeture ; confirmations d'inventaire empilées conservées.
Référence catalogue immuable. Locale HTML/Zod française, traductions natives
réinitialisées après correction/réouverture. Échap ferme aussi le lecteur PDF.
Edition utilisateur : mot de passe vide conservé, téléphone `null` effacé, clé
omise conservée. `/auth/me` relit le compte ; actualisation de soi recharge aussi
le CSRF. [Formulaires](specs/formulaires-modaux.md), [utilisateurs](specs/utilisateurs.md).

**Paramètres.** Admin : toutes rubriques ; magasinier : emplacements ; caissier :
exclu. Catégories/sous-catégories/secteurs en MariaDB, codes stables, suppression
refusée si utilisés. Réglages techniques atomiques dans
`config/runtime/settings.json` hors Git, secrets masqués. Connexion DB testée avant
sauvegarde ; nouveau pool DB et HTTPS au redémarrage, quotas/Turnstile/plafond à
chaud. PEM validés ; HTTPS sert API/build, HTTP conservé ou redirigé en 308.
Turnstile vérifie jeton, hostname et action via Siteverify.
[Guide](specs/parametres.md), [roadmap](specs/parametres-roadmap.md).

## Base et déploiement

Journal Drizzle versionné **0000 à 0013** : `0007` référentiels, `0008` inventaire,
`0009` SIRET fournisseur, `0010` SIRET client, `0011` TVA/TTC/scellement v2,
`0012` Devis/suivi approvisionnement et numéros/client/TVA commandes,
`0013` horaires fournisseurs, traçabilité des achats et entrées en stock.
`0013` appliquée le 28 novembre à `autostrass_test`. Les 14 entrées Drizzle,
les données antérieures et l’écran fournisseur ont été contrôlés après sauvegarde.
`0012` appliquée le 21 novembre à `autostrass_test` MariaDB 10.11.14 : trois
tables ajoutées, anciennes colonnes et 805 lignes des 36 tables historiques
inchangées, treize migrations vérifiées ; données Devis de recette absentes.
`0011` appliquée le 14 novembre à la base configurée **autostrass_test** (MariaDB
10.11.14) après sauvegarde locale ; quatre colonnes et journal contrôlés, 55 ventes
et lignes conservées, SHA-256 des 36 tables anciennes inchangés. Les douze
migrations `0000`–`0011` correspondent au journal ; SHA-256 0006 écrit en majuscules
en base, contenu identique au fichier courant. API redémarrée, HTTP 3001 et HTTPS
3443 ; caisse ouverte conservée. Le statut doit être vérifié sur les autres bases.
Ce statut ne remplace pas une vérification de chaque installation. Sauvegarder,
comparer schéma/journal, lancer `npm run db:migrate` puis redémarrer l'API ; ne pas
compléter artificiellement le journal. `database/schema.sql` est le socle catalogue
v1 ; seeds réservés à la démonstration, allocations incohérentes signalées sans
les redistribuer. Une base vierge s’installe avec `npm run db:migrate`, puis
`npm run db:admin -- "Prénom" "Nom" "email"` pour créer son premier
administrateur. La démonstration se charge sur demande avec `npm run db:seed`.
La [procédure](README.md#première-installation) précise le choix de la connexion.

`.env.example` → `.env`, `DB_*`, `JWT_SECRET` ≥32 caractères. `/api/health` distingue
`connected`, `unavailable`, `unconfigured` ; pannes SQL → `503 DATABASE_UNAVAILABLE`
sans détails internes. JWT HS256 12 h en mémoire/cookie httpOnly, compte relu par
requête. Conserver RBAC/CSRF/en-têtes et intégrité fiscale. Admin : tous droits ;
magasinier : dépôt ; caissier : caisse/documents. Ne jamais versionner secrets,
`config/ssl/`, `config/runtime/` ou `archives/`. [Ancienne revue](SECURITY-REVIEW.md).

## Vérifications et outils

Commandes courantes : `npm ci`, `npm run dev`/`dev:api`, `build`, `lint`, `preview`,
`test:errors`, `test:pdf`, `test:ventes`, `test:devis`, `test:devis:ui` et
`test:installation`, `test:commandes-fournisseurs` et `test:commandes-fournisseurs:ui`.
`test:stock`, `test:inventaire`, `test:integration`,
`test:parametres` et `test:utilisateurs:ui` créent une base/API jetable via
`TEST_DB_*` (compte pouvant créer/supprimer une base). Les appels directs
`test:api`/`test:security` écrivent dans la base ciblée : uniquement sur base jetable.
Le harnais `createTestEnvironment` charge les seeds dans sa base dédiée.
`test:repos`/`test:caisse` : diagnostics
manuels ; `caisse:diagnostic` en lecture seule. Conserver les scénarios concurrence,
rollback, droits et intégrité fiscale lors des correctifs.

Dernières recettes historiques (distinctes des contrôles du jour) : **127 API,
59 sécurité**, MariaDB portable 11.4.5 jetable ; **524 contrôles** de formulaires,
**122 Caisse**, **63 utilisateurs**, **85 inventaire**. Guides/scripts/captures dans
`specs/` et `scripts/`. Revue WCAG du 13 novembre : 101 scans axe, 24 routes,
22 dialogues ; **sept constats ouverts (trois P1, quatre P2)**, aucun correctif
livré. [Rapport WCAG](specs/accessibilite-wcag-review.md).

Compétence `accessibility` 2.0 installée au projet dans `.agents/skills/`.
TokenEconomizer 0.1.0 installé et activé pour Codex avec cinq hooks approuvés ;
source/configuration/mémoire hors dépôt. Configuration documentée : micro-skills
`envfacts`, retraits `propose`, protections `collaboration`/`image_media`, garde
`nudge` ; repomap/import historique désactivés. [Analyse](specs/tokeneconomizer-analyse.md),
[installation](specs/tokeneconomizer-installation.md). Catalogue design :
`npm run uipro -- "erp inventory operations internal tool data dense" --design-system -p "Autostrass"`
ou `uipro:node`. Nettoyage antérieur : [audit](specs/fichiers-inutiles.md),
[ZIP restaurable](backups/nettoyage/fichiers-inutilises-2026-11-13.zip).

## Limites et points ouverts

CSP complète à définir selon déploiement ; pas de révocation JWT avant expiration,
quotas en mémoire par processus (stockage partagé nécessaire en multi-instance).
Service et conditions d'accès immatriculation/VIN à choisir, saisie manuelle à
préserver. Certificat de production, Cloudflare réel, Zebra et recette NVDA/zoom
natif non fournis aux campagnes précédentes. Contrôles fiscaux logiciels et
certification/déploiement sont à distinguer.

Nettoyage local à confirmer avant toute suppression : ancien résidu ignoré
`.ventes-review.local/database-data/`, répertoires temporaires
`autostrass-inventaire-verification-20261106` (identifiants de test) et
`autostrass-transfer-verification/data`. Ces traces historiques ne constituent
pas un contrôle actuel de présence ou de processus.

## Graphify et revue initiale du 14 novembre

[Graphique](graphify-out/graph.html), `graph.json`, `GRAPH_REPORT.md`, `manifest.json`.
`graphify update . --force` **0.9.108** réussi sans appel LLM : **3 028 nœuds**,
**6 136 liens**, **194 communautés** ; rapport de revue ajouté au graphe,
sauvegarde du 14 novembre et HTML/JSON/rapport/manifeste/cache actualisés.
Contrôle final : 180 empreintes de code conformes, aucun identifiant dupliqué,
source manquante ou lien orphelin ; quatre hyperedges valides et HTML/JSON
identiques avec multiplicité. Les 22 nœuds du rapport de revue sont présents.
Les 20 localisations de la passation ont été recalées sans changer les relations.
Limites : CSS non indexé, 15 SQL sans parseur, extraction sémantique documentaire
et renommage LLM non relancés ; les liens du graphe ne prouvent pas le câblage runtime.

Revue répartie entre trois agents et le conducteur : **203 fichiers de code,
style et SQL, 40 374 lignes**, outils `.github` inclus, configurations et snapshots
également examinés. Contrôles du jour : build, lint, `test:errors`, `test:pdf`,
**7 groupes unitaires Paramètres**, syntaxe **35 Python / 16 JS-MJS-CJS** conformes.
Avertissement Vite existant : bundle >500 kB. Référentiels StrictMode reproduits
dans Chromium avec API simulée ; anomalies Caisse/fiscales reproduites en mémoire.
Passation compactée de 747 à 227 lignes (environ −72 % en taille), contrats conservés.
Outils : 59 tests UI-styling/brand et 2 tests de tokens réussis. Ces derniers
nécessitent pytest et `-X utf8` sous Windows ; premier essai sans dépendance puis
échec cp1252 identifiés. Suite UI-Pro : 130 réussites et deux erreurs d'import
dues à trois scripts absents ; collecte incomplète et résultat global non conforme.
Contrôle fiscal : préfixe de 5 000 ventes déclaré intact malgré une rupture sur
la 5 001e, et dernière empreinte absente acceptée, reproduits avec les fonctions
réelles en mémoire. Constat authentification SQL → 401 également reproduit.
Rapport de 16 constats et [inventaire SHA-256](specs/revue-code-2026-11-14.json)
rédigés ; 203 sources effectivement revues et code inchangé. Revue indépendante
conforme : contrats conservés, références corrigées, liens locaux et 203 SHA-256
valides. `git diff --check` conforme, `origin/main` identique à la tête initiale
après fetch. Revue indépendante du graphe conforme ; livraison de la passation,
du rapport, de l'inventaire et de Graphify par commit et push sur `origin/main`.
Aucun correctif applicatif livré.

## Reprise et correctifs du 14 novembre

Passation/Graphify lus avant travail ; répartition entre trois agents et conducteur.
Les 16 constats sont corrigés, avec revue indépendante des montants/concurrence
et des archives. Reproductions résiduelles corrigées : rendu d'un panier hors
DECIMAL, saturation du pool à l'ouverture, snapshot SQL Drizzle mal séparé et
empreintes v2 manquantes dans préfixe/ancrage. Les seuils historiques de l'évaluateur
UI-Pro restent incompatibles avec le runtime local ; diagnostic sans seuils
documenté, sans modifier les approbations ni présenter ce contrôle comme vert.

Contrôles finaux : build, lint, erreurs SQL, PDF réel (taux mixtes/historique),
montants/JWT et mapper utilisateurs conformes ; **neuf groupes fiscaux**, **11
groupes SQL ventes/Caisse**, **128 API**, **59 sécurité**, **90 Chromium** (Vite
StrictMode et production), **155 UI-Pro** et **deux CLI tokens Windows** réussis.
Douze ouvertures concurrentes → une session/11 conflits ; deux comptes avec pool
de deux connexions sans blocage ; rollback de vente sur échec journal vérifié.
Route réelle : plus de 5 000 ventes, altération/empreinte absente finale refusées ;
archive annuelle SQL exportée et relue avec SHA-256. MariaDB portable 11.4.5
isolée puis arrêtée, bases jetables supprimées ; aucune donnée réelle modifiée.
Migration 0011 et redémarrage API étaient encore requis à la fin des correctifs ;
application locale réalisée ci-dessous, autres installations à vérifier.
Compilation autonome des nouveaux scripts conforme avec la déclaration pdfmake
locale ; 155 UI-Pro et deux CLI tokens réexécutés par le conducteur, réussis.
`git diff --check` conforme ; fetch confirme `origin/main` sur `402e283` avant
livraison. Correctifs commités dans `fa66b63` (65 fichiers), puis documentation et
Graphify livrés dans un second commit sur `origin/main`.
Graphify **0.9.108** actualisé depuis `fa66b63` : **3 187 nœuds**, **6 561 liens**,
**198 communautés**, sans appel LLM. Rapport de correctifs et nouveaux scripts
présents ; 20 localisations de passation recalées. Audit indépendant conforme :
193 empreintes de code, 508 entrées du manifeste, aucun doublon ni élément orphelin ;
quatre hyperedges valides et HTML/JSON identiques avec multiplicité.
Limites conservées : CSS non indexé, **16 SQL** sans parseur ; extraction sémantique
et renommage LLM non relancés. Métadonnée de commit = base applicative `fa66b63` ;
le second commit ne contient que la passation et les artefacts du graphe.

## Application de la migration 0011 — 14 novembre

Migration demandée explicitement par l'utilisateur. Passation/Graphify relus,
script Drizzle et configuration effective contrôlés ; sauvegarde, comparaison
schéma/journal et identification de l'API en cours avant application.
Inspection : `autostrass_test`, MariaDB 10.11.14, 37 tables InnoDB, 55 ventes et
55 lignes, une caisse ouverte. Seule 0011 en attente, ses quatre colonnes absentes.
Empreinte historique 0006 différente du fichier actuel : rapprochement Git en
cours. Premier dump natif refusé pour son exigence TLS par défaut ; transport
aligné sur la connexion locale de l'application avant nouvelle sauvegarde.
Sauvegarde SQL réussie hors dépôt/OneDrive, sous le profil local Autostrass,
ACL limitées au propriétaire et SYSTEM : 105 095 octets, SHA-256 conservé,
38 objets dont 37 tables ; aucune routine, événement ou trigger. Identifiants
du dump effacés après exécution. Préparation de la comparaison de toutes les
anciennes colonnes et du journal avant/après, API locale à suspendre brièvement.
API locale suspendue, état initial de 36 tables métier/journaux et de la caisse
ouverte conservé. `npm run db:migrate` réussi : 0011 appliquée. L'écart 0006 était
uniquement la casse de son SHA-256 (majuscule en base), identique au fichier
actuel ; aucune réconciliation ni modification des anciennes entrées effectuée.
Contrôle après migration conforme : quatre définitions SQL exactes, entrée 0011
correcte, 36 tables identiques sur toutes leurs anciennes colonnes, 55 ventes et
55 lignes préservées, empreintes et anciens montants inchangés. TVA/TTC historiques
restent NULL et version 1 ; une caisse ouverte conservée sans clôture.
API redémarrée en fenêtre masquée : lanceur PID 40248, serveur PID 33636,
HTTP 3001/HTTPS 3443 ; health 200 connected dans les deux modes, certificat HTTPS
vérifié. Lectures ventes/session conformes ; fiscal 200 `anterieures`, aucune rupture.
Aucune vente ni donnée de recette créée sur cette base.
Sauvegarde restaurable, état avant/après et résultats API hors Git :
`%LOCALAPPDATA%/Autostrass/backups/migrations/0011-2026-11-14T13-40-40-449Z-6e173183/`.
Dump `avant-0011.sql`, SHA-256 `a62775f50f5f272db45a3cfd5d3f88969fce3b293f417d2114720a5eac1f55c1`.
Logs API : `%TEMP%/autostrass-api-20261114-migration.{out,err}.log`.
Application terminée ; Graphify actualisé sans LLM : **3 188 nœuds**, **6 562
liens**, **197 communautés**, quatre hyperedges. Audit indépendant : 193 empreintes
de code et 508 entrées conformes, HTML/JSON identiques, 20 localisations recalées ; documentation et graphe
livrés par commit et push sur `origin/main`. Sauvegarde et journaux restent hors Git.

## Clic extérieur des fenêtres contextuelles — 14 novembre

Demande utilisateur : conserver toutes les fenêtres contextuelles ouvertes lors
d'un clic extérieur. Passation et fichiers Graphify relus ; dépôt propre sur
`b8932a6`. Inspection initiale : fermeture du fond dans `FormDialog`, le dialogue
Emplacements et les cinq dialogues spécialisés Catalogue, Clients, Fournisseurs,
Réceptions et Caisse. Les confirmations utilisent le composant partagé.
Les sept définitions natives ont maintenant `closedby="closerequest"` et aucun
gestionnaire de fermeture extérieure. Annuler/croix/Échap et les protections
pendant la sauvegarde sont conservés. Audit indépendant : aucun autre dialogue
applicatif oublié ; la navigation mobile est un menu distinct. Adaptation des
recettes existantes et des guides réalisée : clic extérieur vérifié avec saisie
dans les 19 formulaires partagés, une confirmation empilée, Clients, Fournisseurs
et Caisse ; anciennes attentes de fermeture du fond remplacées. Build frontend/
backend, lint et `git diff --check` réussis ; avertissement Vite >500 kB existant.
Recettes Chromium réussies : 122 Caisse, 155 Clients et 139 Fournisseurs ; contrôle
indépendant Catalogue/Réceptions/Emplacements : 70 contrôles, clic et tap extérieur
à 1440/375 px, saisie intacte, Échap/Annuler/croix fonctionnels, aucune erreur JS.
API simulée partout, aucune donnée réelle consultée ou modifiée. La recette des
19 formulaires s'est arrêtée au panier : sa fixture omettait `/api/tva`, requis
depuis le correctif fiscal précédent. Fixture alignée (TVA 20 %), nouvelle
exécution réussie : **544 contrôles sur 19 formulaires**, confirmations empilées
comprises. Total : **1 030 contrôles Chromium réussis** ; captures et rapports des
recettes existantes actualisés. Guides alignés sur le nouveau comportement.
Revue indépendante finale conforme : périmètre exhaustif, fixtures, scripts et
guides cohérents. Correctif et preuves commités dans `515aa8f`. Graphify 0.9.108
actualisé depuis cette base : **3 188 nœuds, 6 562 liens, 197 communautés**,
quatre hyperedges ; 508 entrées du manifeste conformes, aucune source manquante,
aucun doublon ni lien orphelin. Les 20 localisations de passation sont recalées
et le HTML régénéré depuis le JSON. Sans appel LLM ; limites antérieures
conservées : CSS non indexé, 16 SQL sans parseur. Documentation et Graphify sont
livrés dans un second commit, avec le correctif, sur `origin/main`.

## Arrêt de l'API au démarrage — 14 novembre

Signalement utilisateur : `tsx server/index.ts exited with code 1`.
Passation et Graphify relus avant diagnostic. Vérification des journaux, ports
et processus pour identifier la cause ; aucune nouvelle migration à ce stade.
Reproduction avec `npm run dev:api` : `EADDRINUSE` sur 3443, sortie 1. L'ancienne
API post-migration (serveur 33636, lanceur 40248, créée à 14:45) occupe 3001/3443
et répond encore health 200 connected. Le `npm run dev` utilisateur lancé à
22:10 a conservé Vite sur 5173 mais son API est sortie. Cause : double démarrage,
sans défaut de code ni de migration. Arrêt ciblé de notre ancienne instance,
puis recette temporaire de démarrage et libération des ports pour l'utilisateur.
Identité des deux processus vérifiée avant arrêt ; ancienne instance arrêtée.
Ports 3001/3443 libérés, Vite utilisateur conservé sur 5173. Audit indépendant
confirme la cause et l'absence de correctif applicatif requis. Vérification d'un
démarrage temporaire avec arrêt garanti après contrôles health/proxy en cours.
Premier démarrage temporaire : health HTTP connecté, puis recette interrompue
par une hypothèse de chemin de certificat (`settings.json` absent). API temporaire
arrêtée dans le bloc final. Le serveur utilise ici la reprise des certificats
locaux prévue par `settingsStore` ; recette alignée sur ce repli avant relance.
Recette finale réussie : nouveau processus serveur vivant, HTTP/HTTPS health 200
`connected`, certificat HTTPS vérifié et proxy Vite health 200 `connected`.
Processus de vérification arrêté ; contrôle final des ports : 3001/3443 libres,
Vite utilisateur 28084 toujours sur 5173. L'utilisateur peut faire Ctrl+C dans
son terminal puis relancer `npm run dev`. Aucun code applicatif, réglage ni
donnée métier modifié. README clarifié sur le démarrage d'une seule API.
Passation/Graphify actualisés et livrés par commit/push sur `origin/main`.

## Relance automatique du développement — 14 novembre

Demande utilisateur : `npm run dev` doit arrêter les anciennes instances avant
de redémarrer. Passation, instructions et Graphify relus. Conception d'un lanceur
qui identifie les processus de développement de ce dépôt, préserve les processus
étrangers et nettoie ses enfants à la fermeture. Module système et tests confiés
à un agent ; câblage npm, précontrôle des ports et documentation par le conducteur.
`predev` est intégré avant `dev` : arrêt ciblé puis contrôle des ports configurés
HTTP/HTTPS/Vite. `concurrently --kill-others` arrête le service restant si l'autre
sort ; `vite --strictPort` évite un changement silencieux de port. README et
commande `test:dev` ajoutés ; module de nettoyage et validation encore en cours.
Compilation frontend/backend réussie, avec l'avertissement Vite >500 kB antérieur.
Préparation de la recette complète : processus étranger préservé, relance de
deux développements successifs et arrêt de Vite après échec de l'API ; seules
les lectures health sont prévues sur la base configurée.
Module livré et relu : chemins CLI normalisés, script Node réellement exécuté,
racines voisines/tests/preview protégés, lanceur et ancêtres exclus. Identité
PID/date de création/commande revalidée avant arrêt ciblé de l'arbre ; aucune
suppression globale de Node ni arrêt par port. **29 contrôles** réussis, dont
arbres factices et projet voisin préservé ; syntaxe, lint et diff conformes.
L'ancien arbre réel 12176/Vite 28084 sera remplacé par la recette de relance,
explicitement autorisée par la demande utilisateur. Arrêt compagnon borné à 3 s.
Recette réelle `npm run dev` réussie : **huit contrôles**, service étranger 3001
conservé et refus explicite, ancien Vite nettoyé, premier lancement API HTTP/
HTTPS + Vite, deuxième lancement remplaçant les deux PID sans conflit, health
et proxy 200 `connected`. L'arrêt forcé de l'API entraîne celui de Vite et une
sortie npm non nulle. Nettoyage final effectué, aucun service de recette restant,
aucune écriture métier/MariaDB. Script de reproduction privé :
`%TEMP%/autostrass-test-dev-relance.cjs`. Revue finale : un CLI tsx en mode eval
avec un argument `server/index.ts` pouvait être confondu avec l'API. Exclusion
eval/print partagée avec Node ajoutée et test négatif des variantes. Validation
finale réussie : **30 contrôles processus + huit contrôles de relance = 38**,
build, lint, syntaxe Node et diff conformes. Recettes système sur Windows ; branche
POSIX implémentée mais non exécutée sur un hôte Linux/macOS. Fonctionnalité et
preuves commitées dans `7e7a7a2`. Graphify 0.9.108 actualisé depuis cette base :
**3 221 nœuds, 6 633 liens, 195 communautés**, quatre hyperedges, trois nouveaux
scripts présents ; **196 empreintes de code et 511 entrées du manifeste conformes**,
aucune source manquante, aucun doublon ni lien orphelin. Localisations passation
et README recalées, HTML régénéré ; limites CSS/16 SQL et absence d'appel LLM
conservées. Passation et Graphify livrés dans un second commit avec la fonctionnalité
sur `origin/main`.

## Reprise du travail — 21 novembre 2026

Passation et fichiers Graphify relus avant toute intervention. La dernière
livraison documentée termine la relance automatique du développement ; le graphe
courant comporte 3 221 nœuds et 6 633 liens. Contrôle de l'état Git et du cahier
des charges vérifiés : `main` sur `3c0b6c5`, dernières livraisons terminées.
Deux suppressions locales préexistantes (`.claude/CLAUDE.md` et
`.omc/template-version.json`) sont conservées. Reprise du module **Devis** du
TODO, répartie entre persistance/conversion, interface et PDF/tests ; le
conducteur intègre les routes, prépare la recette isolée et livre le tout.
Contrat fixé : numéro D immuable, client/désignation/TVA figés, prix HT éditables,
version optimiste, statut brouillon/envoyé/annulé/converti, conversion atomique
et idempotente en commande C. Le stock reste inchangé ; les pénuries alimentent
une liste d'approvisionnement liée aux commandes actives. PDF et partage de
fichier à l'initiative de l'utilisateur, avec repli explicite email/WhatsApp.
Routes dédiées et validation API ajoutées : dates calendaires strictes, quantités
entières, prix au centime, 200 lignes maximum et champs non autorisés refusés.
Devis/PDF/conversion réservés aux admins et caissiers ; liste d'approvisionnement
également consultable par les magasiniers. Premier PDF réel réussi par l'agent :
instantané client, taux mixtes, pagination et accès aux ressources restreint.
Contrats/service/hook/formulaire frontend en cours ; numérotation et protection
des commandes directes intégrées à la persistance pour sérialiser les conversions.
MariaDB portable 11.4.5 disponible pour une recette entièrement isolée.
Instance de recette initialisée dans un nouveau dossier temporaire, port local
33327, identifiants aléatoires hors dépôt. Le harnais créera des bases neuves et
les supprimera après les tests ; aucune opération sur la base applicative.
Persistance/migration 0012, PDF et scripts de recette métier implémentés par les
agents. Routes adaptées au repository SQL et premières vérifications lancées
sur l'instance jetable. Commandes `test:devis` et `test:devis:ui` ajoutées ; le
conducteur relit immutabilité, concurrence, pénuries et instantanés avant livraison.
Première recette SQL : droits/CSRF, création/relecture, taxes mixtes, historique
NULL et validation atomique réussis. Le test de casse des numéros révèle la
collation SQL par défaut ; correction explicite binaire D/C en cours. PDF réel
et erreurs SQL réussis. Interface/contrats/service/hook livrés, compilation et
lint ciblés conformes ; recette navigateur et revue indépendante métier en cours.
Collation binaire D/C corrigée dans le schéma, la migration et son snapshot ;
Drizzle ne détecte aucun écart supplémentaire. Build complet et lint global
réussis (avertissement de bundle Vite préexistant). Nouvelle recette SQL lancée.
Neuf groupes SQL passent, dont six conversions simultanées vers une seule
commande. Une URL de test de modification des lignes est corrigée ; les patches
d'entête de commande vides/inconnus sont désormais refusés proprement en 422.
Revue indépendante : normalisation des anciennes références pour l'ordre des
verrous, projection des besoins actualisée après stock/statuts, et contrôle de
version au téléchargement/partage PDF ajoutés. Ce dernier évite de joindre un
PDF récent à un message destiné à l'ancien client. Recettes ciblées en cours.
Guide Devis et README rédigés : contrats, partage volontaire, migration additive,
tests, protection des commandes et suite du chantier fournisseurs explicités.
Correction métier terminée : la liste d'approvisionnement projette les besoins
courants, y compris ceux initialement couverts, et reste en lecture seule.
Anciennes références normalisées avant verrouillage, PDF contrôlé par version
et type réel, doublons/casse du formulaire corrigés. Compilation serveur/frontend
et lint ciblés conformes ; recettes complémentaires de concurrence préparées.
Recettes existantes Stock/Inventaire/API/Sécurité et Ventes/Caisse lancées sur
l'instance isolée, avec nouveau build et PDF facture. Les attentes de comptage
des tests Devis sont adaptées au suivi interne des lignes initialement couvertes.
Régressions existantes réussies : **13 transferts**, **128 API**, **59 sécurité**,
**14 inventaires**, **neuf groupes fiscaux** et **11 groupes SQL Ventes/Caisse**.
PDF facture et nouveau build conformes. Suite Devis complète relancée après
corrections des fixtures et ajout des scénarios de besoins dynamiques.
PDF Devis et **15 groupes métier Devis** réussis. Dernières attentes SQL de suivi
interne en cours d'alignement dans la suite de concurrence ; recette Chromium
lancée. Dates des commandes directes validées strictement pour éviter une erreur
SQL avec un numéro construit sur une date impossible. Le périmètre de la liste
est explicité : devis convertis, avec demande des commandes directes déduite.
Recette Chromium réussie : **68 contrôles**, API simulée, thèmes et mobile,
saisie/focus conservés, doubles envois bloqués, PDF périmé/invalide refusé,
partage natif simulé et repli email/WhatsApp sans envoi réel. Captures et rapport
dans `specs/captures/devis/`. Un locator Actualiser ambigu de recette a été
corrigé ; aucun défaut applicatif associé. La base locale vérifiée en lecture
reste `autostrass_test` MariaDB 10.11.14, migration 0011 à sa dernière entrée ;
API et Vite actuels repérés pour préparer la migration 0012 après sauvegarde.
Les **11 groupes de concurrence/audit** sont réussis. Captures finales françaises
et état mobile normal actualisés ; contrôle complémentaire des dates directes
préparé. Procédure locale de sauvegarde/migration/empreintes rédigée hors Git,
cible bornée à `autostrass_test` et journal historique vérifié avant application.
Développement local arrêté par `predev`. Premier dump interrompu par le client
MariaDB 11.4 qui exige TLS par défaut alors que cette connexion locale utilise
le transport de l'API sans TLS ; aucune migration appliquée. Dump aligné sur la
connexion existante avant reprise de la procédure, identifiants temporaires effacés.
Validation finale : **12 groupes de concurrence/audit**, **15 groupes Devis**,
PDF réel, **74 contrôles Chromium**, dix captures, build/lint conformes.
Migration 0012 appliquée à `autostrass_test` après dump SQL vérifié par SHA-256 ;
anciennes colonnes et données comparées avant/après, aucune réécriture historique.
Trois tables ajoutées, colonnes anciennes commandes toujours NULL, numéros D/C
en collation binaire et nouvelle entrée Drizzle vérifiés. Relance API/Vite en cours.
**36 tables historiques et 805 lignes conservées**, treize migrations dans le
journal. Dump restaurable hors Git :
`%LOCALAPPDATA%/Autostrass/backups/migrations/0012-2026-11-21T11-31-32.311Z-ecf554bc/` ;
SHA-256 `16e2110c1cc1cb83f6c45a8e32dbd3de8fa25e3c00cc05dbe41970753c6ab76a`.
Développement relancé en fenêtre masquée ; health API et proxy Vite connectés,
route Devis anonyme refusée en 401. Aucune donnée de devis ou de recette créée
sur la base locale. Contrôle final HTTPS, nettoyage de l'instance jetable et
actualisation Graphify avant commit/push.
Contrôle HTTPS repris après correction du script de recette (socket lu avant
la fin de réponse) ; aucun défaut applicatif ni modification de réglage TLS.
HTTPS health connecté, certificat vérifié (TLS 1.3). Toutes les bases jetables
supprimées ; MariaDB portable arrêtée proprement et identifiants temporaires
effacés. Développement local conservé sur API HTTP 3001/HTTPS 3443 et Vite 5173.
Suppressions locales préexistantes commitées séparément dans `f1b7ace`.
Fonctionnalité, documentation et preuves prêtes pour le commit Devis ; Graphify
sera actualisé depuis cette base applicative.
Fonctionnalité et preuves commitées dans `c3b75cb` (45 fichiers). Actualisation
Graphify depuis cette base, puis vérification indépendante et livraison finale.
Graphify **0.9.114** actualisé et audité : **3 383 nœuds, 7 156 liens,
206 communautés**, quatre hyperedges. **221 empreintes de code et 539 entrées
du manifeste conformes** ; aucune source manquante, aucun doublon ni lien
orphelin, HTML/JSON identiques avec multiplicité. Les 20 localisations de
passation sont recalées ; guide Devis présent avec huit nœuds et 13 citations
locales explicites. Structure documentaire mise à jour, anciens concepts et
relations conservés, sans appel API LLM. Limites : huit CSS non indexés,
17 SQL sans parseur ; l'extraction sémantique historique n'a pas été relancée.
Le CLI a aussi rafraîchi automatiquement sa compétence Claude globale avec
sauvegarde de l'ancienne copie ; cache AST migré vers la version courante.
Livraison regroupant les commits `f1b7ace`, `c3b75cb` et l'actualisation de
Graphify/passation sur `origin/main`. Prochaine priorité : commandes fournisseurs.

## Modèle de bon de livraison — 21 novembre 2026

Exemple photographique fourni par l'utilisateur. Passation et Graphify relus ;
analyse de la mise en page et comparaison avec les contrats Livraisons/Commandes.
La photo sert de référence documentaire, sans déduire de nouvelles règles de
retour, d'horaires ou de numérotation depuis son contenu. Préparation d'une
spécification anonymisée ; les coordonnées client et bancaires du document ne
sont pas copiées dans le dépôt. Revue du modèle de données confiée à un agent.
Photo examinée et revue indépendante terminée : format A4, société/client,
bandeau numéro/date/heure/auteur/référence, articles avec emplacement et prix,
TVA/TTC et pied de page. [Spécification](specs/bon-livraison-modele.md) ajoutée.
Champs manquants identifiés : identité entreprise, numéro L, lignes livrées,
prix brut/remise, référence client/véhicule, auteur/heure d'émission et règlement.
Le bon automatique dépend de l'attribution des réceptions, encore à développer.
Numérotation du TODO conservée ; aucune règle de retour ou de départ déduite de
la photo. Livraison documentaire uniquement, sans modification applicative ni
base ; contrôles des liens et actualisation Graphify avant commit/push.
Spécification et journal committés dans `a7c539d`. Mise à jour du graphe limitée
à cette documentation et aux localisations de passation, sans appel API LLM.
Vérification des liens locaux, empreintes et concordance HTML/JSON, puis
livraison de cette référence sur `origin/main` ; le PDF BL reste à implémenter.

## Présentation commune des documents — 21 novembre 2026

Demande utilisateur : reprendre la présentation du modèle BL pour les autres
documents. Passation, Graphify et modèle relus ; harmonisation des PDF Facture
et Devis existants via un gabarit commercial A4 partagé. Répartition entre
implémentation du gabarit/adaptateurs, tests/rendus PDF et revue indépendante.
Les futurs commandes/BL/avoirs utiliseront ce socle à leur implémentation.
Prix, TVA, historique, paiements, auteur et instantanés métier à conserver ;
champs absents non inventés, ressources PDF locales restreintes.
Gabarit partagé et adaptateurs Facture/Devis implémentés. Identité connue
AUTOSTRASS/activité commune, coordonnées et échéance fictives anciennes retirées,
mention de scellement non démontrée remplacée par l'identité neutre de vente.
Valeurs reçues/rendues distinctes, dates Europe/Paris et sommes TVA par ligne
préservées. Revue indépendante : notes longues pouvaient finir après les totaux ;
correction par flux de notes puis ventilation et bloc final indivisible appliquée.
Recettes PDF étendues et rendus fictifs en cours, sans accès à la base applicative.
Rendus Facture/Devis inspectés : présentation commune conforme. Bloc émetteur
gauche complété avec le nom connu et identité centralisée ; aucune coordonnée
supplémentaire inventée. [Guide commun](specs/documents-commerciaux.md) rédigé,
modèle BL et guide Devis reliés. Commande `test:pdf` élargie aux trois suites PDF.
Build complet et lint global réussis ; suites finales/régénération des exemples
après ce dernier ajustement en cours. Les anciens prix, taux, montants, auteur,
paiements et numéros restent les données source ; aucune migration nécessaire.
Les trois suites PDF et 11 groupes commerciaux sont réussis ; contrôle
supplémentaire du conducteur : une désignation catalogue multiligne admissible
de 249 caractères perdait sa fin dans une ligne indivisible. Pagination de
tableau reprise pour conserver ce contenu, sans troncature ni changement métier ;
régression permanente ajoutée avant livraison.
Ligne multiligne corrigée : en-têtes répétés, 120 lignes et marqueur final
conservés, totaux sur la dernière page. Bloc émetteur/identité commune et
présentation définitive vérifiés ; validations PDF et compilation finales
réexécutées après ces corrections. Répertoires données/repos/frontend inchangés.
Validation finale : suites Facture/Devis/ressources, **12 groupes commerciaux**
et **12 PDF réels** conformes (dix exemples fictifs conservés). Notes et
désignations multilignes intégrales, taux mixtes/200 taux, répétitions et
totaux de dernière page contrôlés ; build et lint réussis. API/Vite relancés
en fenêtre masquée pour charger le nouveau gabarit ; contrôle health en cours.
Relance vérifiée : API HTTP et HTTPS, proxy Vite connectés en 200, certificat
HTTPS contrôlé. Aucune donnée ni configuration métier modifiée. Rendus finaux
et rapport des documents à jour ; livraison du gabarit partagé puis Graphify.
Exemples définitifs : dix PDF fictifs, 43 pages/PNG contrôlées, deux PDF
supplémentaires de ligne haute vérifiés en mémoire. Gabarit retenu pour les
factures, devis et futurs documents ; titres et champs propres restent adaptés.
Liens/documentation et diff conformes, code et preuves prêts pour commit/push.
Dernière fixture visuelle de notes complétée par des lignes entières et un
marqueur final, afin d'éviter une fin de mot artificiellement tronquée dans
l'exemple ; les régressions de pagination exactes restent distinctes et vertes.
Gabarit partagé, adaptateurs, tests et exemples committés dans `faea3f2`
(70 fichiers). Actualisation Graphify depuis ce code et ses guides, contrôle
des empreintes/citations/export et livraison sur `origin/main`.
Graphify actualisé depuis `faea3f2` : **3 433 nœuds, 7 290 liens,
203 communautés**, quatre hyperedges. **226 sources de code et 602 entrées
du manifeste** vérifiées ; aucune source manquante, doublon ou extrémité orpheline.
Les dix PDF liés au rapport existent ; HTML/JSON concordent avec multiplicité.
Guides et localisations recalés, sans appel API LLM ; extraction PDF indisponible,
17 SQL sans parseur et huit CSS non indexés. Livraison complète sur `origin/main`.

## Renommage OpenStrass — 21 novembre 2026

Demande utilisateur : nom d'application **OpenStrass**, signature exacte
**OpenStrass - Gestion commerciale et logistique open source**. Passation et
Graphify relus avant travail. Inventaire des noms visibles de l'interface,
des PDF et de la documentation ; préparation d'une identité partagée.
Les identifiants de données, d'authentification et les preuves historiques
seront examinés séparément du texte de marque pour préserver les contrats.
Identité partagée créée par l'agent frontend ; adaptations UI/PDF en cours.
Métadonnées npm renommées `openstrass`, README, consignes, produit et design
actualisés avec le nom/signature demandés. Les clés techniques existantes
(sessions, CSRF, JWT, préférences, bases et archives) sont conservées.
Deux modifications documentaires Caisse préexistantes ont été constatées et
conservées ; aucune suppression ni réécriture de ces changements utilisateur.
Nom/signature partagés appliqués au serveur, aux PDF et aux assertions de
présentation. Douze groupes PDF commerciaux conformes, identité/signature
exactes sur chaque page et montants/historique préservés ; validation JWT/montants
conforme avec les identifiants historiques. Rendus fictifs régénérés, interface
et affichage mobile en vérification ; aucune migration requise.
Reprise du conducteur après passation : journal et Graphify relus, état courant
de 3 433 nœuds/7 290 liens confirmé. Frontend et backend/PDF figés ; dix PDF
et 43 PNG régénérés avec la nouvelle marque. Audit des occurrences restantes,
build/lint global, recette mobile et relance locale avant commit/push.
Compilation frontend/backend et production, puis lint global réussis ; seul
l'avertissement Vite de bundle supérieur à 500 kB préexistant demeure. Relecture
du diff : constantes, métadonnées, favicon et documents conformes ; cookies,
CSRF, JWT, préférences, configurations et données historiques conservés.
Développement relancé en fenêtre masquée : API HTTP 3001, HTTPS 3443 et proxy
Vite 5173 connectés en 200 ; certificat vérifié en TLS 1.3, titre/signature HTML
conformes et route Devis anonyme toujours refusée en 401. Aucune écriture métier,
modification de configuration ou migration. Deux commentaires de source actuels
renommés ; les anciennes occurrences restantes correspondent aux contrats
techniques, comptes de démonstration, chemins réels et rapports historiques.
Recette indépendante Chromium réussie : **sept états** desktop/mobile 375 px,
menus et thèmes clair/sombre, API simulée ; nom/signature/monogramme conformes,
aucun astérisque littéral, débordement, erreur JS ni écriture API. Sept captures
et observations conservées dans `%TEMP%/openstrass-brand-review-PhY1v8/`.
Contrôle du conducteur : rendus Facture/Devis lisibles, SHA-256 des dix PDF et
43 captures conformes au rapport. Trois ajustements documentaires préexistants
(guides ouverture/clôture Caisse et modèle BL) conservés et relus avant commit.
Ajustements utilisateur des trois guides committés séparément dans `6cd4381`.
Renommage, documentation et exemples prêts pour le commit applicatif après
build/lint, PDF et recette Chromium ; Graphify sera actualisé depuis cette base.
Renommage applicatif et preuves committés dans `abc703b` ; inspection visuelle
du conducteur conforme sur le bureau et la connexion mobile. Actualisation
Graphify 0.9.114 depuis cette base, puis audit et livraison sur `origin/main`.
Graphify actualisé sans appel LLM ni rafraîchissement automatique de compétence :
**3 438 nœuds, 7 316 liens, 205 communautés**, quatre hyperedges et 603 entrées
de manifeste. Nouvelle identité partagée et références UI/PDF présentes ;
recalage des libellés documentaires OpenStrass et localisations avant audit.
Libellés de marque, vingt localisations de passation et racines README/design
recalés ; IDs documentaires historiques et relations sémantiques conservés.
Contrôle de concordance adapté aux champs natifs HTML `from/to/label` ;
export MultiGraph à clés uniques pour conserver les relations parallèles.
Audit indépendant conforme : **226 sources de code**, **592 empreintes AST**
sur **603 entrées du manifeste**, **491 clés documentaires anciennes** et
**79 liens locaux** vérifiés ; aucune source manquante, clé dupliquée ou
extrémité orpheline. HTML/JSON concordent avec multiplicité, quatre hyperedges
valides et libellés OpenStrass conformes. Les onze empreintes AST vides sont
des SQL sans parseur ; limites des huit CSS et de l'extraction PDF conservées.
Format JSON maintenu, derniers repères et empreintes de passation recalés.
`origin/main` vérifié après fetch, sans changement concurrent. Livraison des
commits `6cd4381`, `abc703b` et de Graphify/passation par commit puis push sur
`origin/main` ; développement local conservé sur HTTP 3001/HTTPS 3443/Vite 5173.

## Personnalisation des documents PDF — 21 novembre 2026

Demande utilisateur : pouvoir personnaliser l'en-tête et le pied de page des
documents PDF. Passation et Graphify relus avant intervention ; étude du
gabarit partagé et des paramètres existants pour une configuration commune
aux factures et devis, conservant la présentation et les données métier.
Logo confirmé par l'utilisateur. Contrat partagé : émetteur 80 caractères,
activité 180, coordonnées huit lignes de 120, pied commun six lignes de 100 ;
PNG/JPEG embarqué facultatif, 256 Ko et 1 024 px maximum. Ancienne configuration
compatible via les valeurs OpenStrass par défaut, sauvegarde admin atomique,
aperçu fictif sans persistance ni accès métier, réglages lus à chaque génération.
Schéma Zod partagé ajouté ; backend/PDF, interface et tests répartis entre les
trois agents, documentation et recette isolée conduites par le conducteur.
Décodeur JPEG `jpeg-js` 0.4.4 ajouté et verrouillé pour valider réellement les
images, avec limites explicites ; aucun paquet natif ni dépendance transitive.
Guide de personnalisation rédigé et relié aux paramètres et au gabarit partagé.
Recherche des binaires MariaDB portables existants pour une recette indépendante
de la base applicative et des réglages réels.
Premier bootstrap portable interrompu par une mauvaise construction du tableau
d'arguments PowerShell ; aucun service ni accès applicatif. La commande combinée
de nettoyage a été refusée par la politique automatique avant exécution ; reprise
non destructive avec des arguments séparés et vérifiés. MariaDB portable 11.4.5
initialisée dans le dossier de recette, port 50930, connexion validée ; identifiants
aléatoires dans un fichier privé hors dépôt. Bases et réglages jetables pour les tests.
Backend/configuration/routes et interface implémentés ; compilation complète et
lint global réussis, revue et recettes finales en cours. Précomposition mesurée
des zones PDF ; première recette aux maxima révèle que `noWrap` ne respecte pas
les LF d'un même nœud dans pdfmake. Passage à des nœuds distincts pour chaque
ligne, puis revalidation ; émetteur/destinataire et données source conservés.
Sept groupes Paramètres existants et mapping des erreurs SQL réussis. Les douze
groupes commerciaux passent ; vérification aux maxima avec logo/textes complets,
pied répété, lignes vides et totaux sur la dernière page conforme. Revue
indépendante : PNG indexés 1/2/4 bits transparents peuvent perdre leur masque dans
PDFKit malgré leur validité. Normalisation RGBA huit bits avant composition et
régression sur une image opaque huit pixels en cours ; aucune donnée réelle touchée.
PNG normalisés en RGBA huit bits non entrelacé, transparence et Adam7 conservés.
Douze groupes unitaires Documents PDF réussis ; pixels et masques des vrais PDF
contrôlés indépendamment, ainsi que 28 variantes par le backend. Code backend
figé et compilé ; recettes API/UI et exemples personnalisés en cours. Commandes
`test:pdf`, `test:documents-pdf` et `test:documents-pdf:ui` raccordées et documentées.
Recette API réussie : **neuf groupes**, droits/CSRF, vingt refus de validation,
aperçu sans persistance, sauvegardes concurrentes, application à chaud des vrais
PDF Facture/Devis et redémarrage, avec tables/migrations conservées. Base/config
de recette supprimées. **74 contrôles Chromium** réussis, vrais PDF fictifs/API
simulée, saisie/annulation/timeout, erreur/sauvegarde exclusive, logos et mobile
clair/sombre ; six captures. Raccord npm UI complété avec le chargeur `tsx`.
Build/lint globaux finaux conformes ; commande npm UI exécutée avec succès,
74 contrôles et six captures. Deux PDF personnalisés (une et deux pages), trois
rendus natifs, logos source/préparé et rapport dans `specs/captures/documents-pdf/`.
Les anciens dix PDF/43 PNG sont inchangés. Aperçu téléchargé vérifié ; iframe
non visible dans les captures Chromium, rendu PDF contrôlé séparément sous Windows.
Instance MariaDB portable arrêtée par SHUTDOWN après vérification de sa cible ;
aucune base jetable restante. Suppression du dossier temporaire refusée par la
politique automatique (« blocked by policy »), même avec chemin littéral vérifié.
Dossier fictif hors dépôt conservé, fichier privé d'identifiants vidé ; aucun
service de recette actif. Relance locale pour charger la nouvelle configuration.
Relance vérifiée : API HTTP 3001, HTTPS 3443 et proxy Vite 5173 connectés en 200,
certificat TLS 1.3 valide ; paramètres/aperçu anonymes refusés en 401. Ancien
fichier de configuration chargé avec les valeurs PDF par défaut, sans sauvegarde.
Inspection du conducteur : formulaire mobile et résumé conformes, logo/en-tête/
pied des trois pages natifs lisibles ; deux SHA-256 d'exemples vérifiés.
Diff et origine conformes, sans migration ni changement concurrent. Fonctionnalité,
documentation et preuves prêtes pour commit ; Graphify actualisé depuis cette base.
Personnalisation, documentation et preuves committées dans `66c6058`.
Graphify 0.9.114 actualisé sans appel LLM ni rafraîchissement de compétence :
**3 584 nœuds, 7 765 liens, 204 communautés**, 636 entrées du manifeste et quatre
hyperedges. Guide de personnalisation, preuves et code nouveaux présents ;
recalage final des repères, citations et exports avant livraison.
Contrôle de provenance : référence `jpeg-js` identifiée comme paquet externe
et import du sous-processus eval recadré sur `server/services/settingsStore.ts` ;
aucun changement de topologie. Localisations et caches corrigés avant vérification
des sources, empreintes et concordance HTML/JSON avec multiplicité.
Audit final Graphify : **241 sources de code**, **625 empreintes AST** sur
**636 entrées du manifeste**, vingt localisations de passation et **72 liens
locaux des guides courants** vérifiés. Aucun fichier source manquant, doublon
d'identifiant ou lien orphelin ; quatre hyperedges valides, HTML/JSON concordants
avec multiplicité. Les nouveaux paramètres, codecs, générateurs, tests et guides
sont présents. Limites SQL/CSS/PDF et absence d'appel LLM conservées.
Livraison de `66c6058` et du commit Graphify/passation sur `origin/main` ;
application locale relancée et disponible, paramètres réels conservés.

## Analyse du dépôt du 27 novembre 2026

Lecture de la passation et des exports Graphify du 21 novembre. La revue part
de `cf7b952` sur `main`, avec un arbre de travail propre. Les trois volets de
lecture couvrent l’interface, les flux métier côté serveur et les outils de
validation. Le conducteur vérifie les constats et exécute les contrôles.

Le build TypeScript/Vite et Oxlint passent sous Node 22.23.4. Le JavaScript
initial pèse 642,22 kB minifiés (184,83 kB gzip). Les tests d’erreurs SQL,
de validation des transferts, de montants de vente, d’intégrité fiscale
(9 groupes), de paramètres (7 groupes) et de PDF passent. La revue a aussi
exercé les écritures de stock, le repli du catalogue et la procédure
d’installation sur une base vierge.

Sur MariaDB 11.4.5 jetable, le retrait de 1 a laissé 4 pièces au total pour
5 affectées, puis le transfert a renvoyé `409 INCONSISTENT_STOCK`. Sur base
vide, `db:migrate` s’est arrêté à `0005` faute de table `articles`. L’API du
tableau de bord a compté zéro commande en cours malgré une commande validée.
Les 13 scénarios de transfert, 14 d’inventaire et 27 groupes Devis/concurrence
passent sur des bases jetables. Instance arrêtée et fichiers temporaires de
cette recette supprimés. Les contrôles Chrome du comptoir, des réceptions et
du tableau de bord ont utilisé des réponses HTTP simulées.

Le [rapport d’analyse](specs/analyse-depot-2026-11-27.md) documente les
cinq constats, les repères d’architecture, la couverture fonctionnelle et
les limites du déploiement. Les priorités immédiates sont la cohérence du
stock, la provenance des prix au comptoir et l’installation sur base vide.
Les 35 liens locaux du rapport ont été vérifiés. Le commit `b1139d5` sert
de base à l’actualisation de Graphify.
Graphify 0.9.115 relie le rapport à la passation. Les exports HTML et JSON
concordent sur 3 593 nœuds et 7 796 liens, répartis en 209 communautés.
Les empreintes du manifeste ont été vérifiées. Le parseur SQL facultatif est absent.

## Reprise des cinq correctifs du 27 novembre 2026

Reprise sur `57301ac`, avec un arbre propre. La passation, le rapport de revue
et les exports Graphify ont été relus. Les travaux portent sur le retrait de
stock, les prix du comptoir, l’installation sur base vide, le choix du
fournisseur à la réception et les indicateurs du tableau de bord.

Une instance MariaDB 11.4.5 a été démarrée sur un port local distinct pour
les recettes. Les réceptions chargent l’annuaire et gardent le nom dans le
document. Le tableau de bord compte les commandes en attente, validées ou
expédiées et lit directement les articles au seuil. Les cartes et le badge de
stock utilisent les valeurs servies. Au comptoir, 65 contrôles Chromium avec
API simulée couvrent notamment la panne du catalogue, la reprise au prix réel
et la conservation du panier.

Sur MariaDB jetable, le retrait et l’édition catalogue renvoient 409 si la
quantité demandée entame le stock affecté. Les 19 scénarios stock et les
14 scénarios inventaire passent, y compris l’annulation des écritures si le
journal échoue. Chromium a vérifié un retrait refusé, un retrait accepté au
solde renvoyé par le serveur et la conservation de la saisie catalogue.

Les 136 contrôles API, 59 contrôles de sécurité, 27 groupes Devis et
concurrence, 11 groupes ventes/caisse, 9 groupes fiscaux, les tests PDF,
le mapping des erreurs, le build et Oxlint passent. Les 53 contrôles Chromium
des réceptions, du tableau de bord et des écrans associés passent en
développement et en production avec une API simulée. Un second parcours
Chromium sur API et MariaDB réelles a créé un fournisseur depuis son annuaire,
enregistré deux pièces à 15,50 € HT et relu la réception après désactivation
du fournisseur. Les compteurs affichés concordent avec les requêtes SQL.

La recette Windows a reproduit les coupures du proxy Vite sur le stock.
Une connexion HTTP persistante entre Vite et Express a donné 24 réponses
réussies sur 24 sur les lectures de santé, articles et stock, contre 9 sur
24 avec l’ancienne configuration. Six navigations et rechargements Chromium
ont réussi avec la configuration corrigée, puis les écritures autorisées et
les refus de stock ont été vérifiés sur l’API jetable.

L’installation sépare le socle catalogue et les exemples. Les sept groupes
de `test:installation` vérifient notamment les treize empreintes Drizzle sur
base vierge, la connexion du premier administrateur créé une seule fois, le
rejeu d’une migration, la cible effective du seed et son rollback. Le seed
conserve le stock non affecté et les répartitions existantes. Deux migrateurs
concurrents ont aussi achevé une installation auparavant arrêtée à `0005`.

Le commit `458edbe` contient l’installation. Après le dernier changement de
seed et du proxy, les suites installation, intégration, ventes, devis et les
30 contrôles des processus de développement passent. Le build produit
643,36 kB de JavaScript minifié (185,13 kB gzip) et conserve l’avertissement
Vite du seuil de 500 kB. Les bases de recette ont été supprimées, MariaDB a
été arrêtée et le fichier d’identifiants a été retiré. Les journaux, captures et
fichiers de l’instance arrêtée restent dans `%TEMP%/openstrass-reprise-52d4bbd0ab`
après le refus du nettoyage récursif par le contrôle automatique.

Le comptoir est livré dans `fb61a7d`, le proxy Vite dans `629b1dc` et les
correctifs du dépôt dans `8039bd6`. Ce dernier commit sert de base au
[graphe actualisé](graphify-out/graph.html).
Graphify 0.9.115 a réindexé le code. Le parseur SQL facultatif reste absent.
La mise à jour automatique du marqueur Graphify de Claude a été annulée après
comparaison des neuf fichiers de la compétence avec le paquet 0.9.114.

## Compétences Obsidian et find-skills du 28 novembre 2026

Le registre d’installation personnel et le catalogue de la session Codex
confirment huit ajouts. Le dépôt `obsidianmd/obsidian-skills` fournit
`obsidian-markdown`, `obsidian-bases`, `json-canvas`, `obsidian-cli`,
`obsidian-headless`, `defuddle` et `knap`. La compétence `find-skills`
provient de `vercel-labs/skills`. Ces compétences sont installées dans
`~/.agents/skills/`. La compétence `accessibility` est suivie dans OpenStrass.

La première consultation de Graphify 0.9.122 a actualisé le marqueur de
la compétence Claude. Son manifeste et ses huit références correspondent
à la version 0.9.114. Le marqueur a été rétabli à cette version.

Le verrou npm avait aussi été modifié avant l’inventaire. Avec ces versions,
`npm run build`, `npm run lint` et `npm run test:errors` passent. La suite
`npm run test:pdf` échoue dans `scripts/lib/pdf-assertions.ts` lors de la
seconde lecture d’un flux déjà consommé avec `pdfmake` 0.3.15. Cet utilitaire
sert aux tests et à la génération des exemples. Le générateur utilisé pour
les factures, devis et aperçus appelle `getBuffer()` une seule fois.

## Reprise des contrôles PDF du 28 novembre 2026

Reprise sur `9d9408d`, avec un arbre Git propre. La lecture de la passation et
la requête sur le graphe placent `capturePdfDefinitions` et `renderedPdfPages`
dans le chemin des contrôles commerciaux. Le premier travail repris est la
régression signalée avec `pdfmake` 0.3.15 dans les tests et les exemples.

`npm run test:pdf` reproduit l’échec sur la première facture. `getBuffer()`
termine le flux, puis l’utilitaire appelle `getStream()` et reçoit l’erreur
`PDF stream has already been consumed.` Le service commercial effectue une
seule lecture. Le correctif et la préparation de l’index Graphify sont répartis
entre deux agents. Le conducteur vérifie les exemples à partir des PDF produits.

`renderedPdfPages` utilise désormais le document PDFKit déjà composé par
`pdfmake`. Les tests inspectent les pages du PDF dont le service a fourni les
octets. `pdfDocumentPromise` et `_pdfMakePages` sont internes au moteur.
La suite `test:pdf` passe pour les factures, les devis, les douze groupes
commerciaux et les douze groupes de personnalisation. Oxlint, TypeScript
strict sur l’utilitaire et `test:errors` passent aussi. Les dix exemples
commerciaux et les deux exemples personnalisés ont été régénérés hors dépôt.

Le build de production passe avec l’avertissement Vite déjà connu sur la taille
du JavaScript initial (646,26 kB minifiés). Sur les douze exemples, Xpdf
retrouve le même texte page par page et les 46 images produites par le moteur
PDF de Windows sont identiques octet pour octet aux références du dépôt. La
facture personnalisée et les deux pages du devis ont aussi été relues à l’écran.
Les exemples fictifs de cette recette restent sous
`%TEMP%/openstrass-pdf-fa367a98724f4d6f8a116f6aa26ee09a` après le refus
du nettoyage par le contrôle automatique. Le dépôt conserve ses références.
Le [graphe Graphify](graphify-out/graph.html) prend pour base le commit
`26e3dfe` qui contient le correctif et les résultats des contrôles PDF.

## Consultation des PDF dans l’application — 28 novembre 2026

Reprise sur `5b43ad5`, arbre propre. La passation et Graphify identifient les
factures des ventes au comptoir, les devis et l’aperçu de personnalisation dans
les paramètres. La demande porte sur la lecture de ces PDF directement dans
l’application. Les téléchargements et le partage restent des actions volontaires.

Le dialogue `PdfPreviewDialog` récupère le document avec la session en cours ou reçoit le
brouillon PDF déjà préparé. Il annule la requête à la fermeture et libère l’URL
de téléchargement. Le lecteur PDF.js et son worker sont servis par l’application.
Les devis utilisent la version de la ligne sélectionnée et les factures le numéro
de vente. Les parcours de lecture sont en recette sur ordinateur et écran mobile.

`PdfReader` utilise PDF.js 6.5.438 pour dessiner la page et exposer son texte aux lecteurs
d’écran. Les quatre parcours Chromium (développement et build, bureau et mobile
375 px) vérifient les pixels visibles, les deux pages du devis, le zoom, le retour
au détail, le conflit de version, le fichier illisible et la réponse tardive.
Le téléchargement volontaire restitue les octets du document affiché. Les 65
contrôles du comptoir, les 74 des devis et les 75 des paramètres passent, ainsi
que le build, Oxlint, `test:pdf` et `test:errors`. Le serveur Vite local sert le
nouveau lecteur et l’API de développement répond sur son port habituel.

Sur le build servi par Express avec MariaDB 11.4.5 jetable, Chromium a affiché
la facture 000001 puis les deux pages d’un devis de 28 lignes à 390 px de large.
Les six tables métier et d’audit contrôlées ont conservé leurs empreintes. Les
bases jetables ont été supprimées et les instances arrêtées. Les [captures du
lecteur](specs/captures/documents-pdf/README.md#interface) illustrent la consultation.
Le commit fonctionnel `5a5fbbb` sert de base au [graphe Graphify](graphify-out/graph.html).

## Reprise après la consultation des PDF — 28 novembre 2026

La passation et le graphe (3 643 nœuds) ont été consultés. Le lecteur de factures
et de devis est livré. La prochaine priorité de développement indiquée dans la
passation concerne les commandes fournisseurs et leur réception.

Sur `de9f8e2`, le cahier des charges, le schéma et le calcul des besoins confirment
que les tables de commandes fournisseurs existent. Le lot reprend les besoins des
devis convertis. Les travaux sont répartis entre commandes, réceptions et interface.
Le conducteur prend en charge la migration, les horaires, l’intégration et la recette.

MariaDB 11.4.5 jetable écoute sur la boucle locale. La migration 0013 a été
générée pour les horaires, le lien achat–besoin, les quantités reçues et
attribuées et les clés de rejeu. Les colonnes facultatives et les valeurs
par défaut permettent de relire les documents antérieurs.

Les routes des horaires sont raccordées. Les douze contrôles de l’horloge
Europe/Paris couvrent l’heure limite incluse, la réouverture, le passage à minuit
et les deux changements d’heure. Le prix d’achat HT est saisi lors de la commande,
le catalogue ne conservant jusqu’ici que le prix de vente.

Sur MariaDB 11.4.5 jetable, les 27 groupes Devis/concurrence et le PDF Devis
passent avec 0013. Les tests des réceptions vérifient l’attribution hors ordre,
le rejeu concurrent, le dernier reliquat et l’annulation de toute la transaction
si l’audit échoue. Le tableau de bord reconnaît le mouvement de réception fournisseur.

Le parcours Chromium sur le build Express et l’API réelle a converti une demande
de sept pièces avec deux en stock. Cinq ont été achetées à 7,55 € HT puis reçues
en deux fois (deux et trois). L’écran mobile et MariaDB confirment cinq pièces
attribuées et sept en stock. Les trois parcours Chromium avec API simulée couvrent
les droits, les filtres et la reprise d’une saisie après perte de réponse.
Le build et Oxlint passent, ainsi que les suites PDF, erreurs, installation,
stock (19 scénarios), inventaire (14), API (136 contrôles) et sécurité (59).
Le chargement initial représente 656,12 kB minifiés, avec l’avertissement
Vite de 500 kB. La nouvelle page est chargée à la demande.

L’index des lignes clientes par référence et le calcul des besoins ont été
vérifiés sur 3 000 lignes, dont 2 160 actives comparées à un calcul indépendant.
Une base en 0012 avec achats envoyés, partiels et reçus a repris 0013 après
interruption du DDL. Les anciennes colonnes des 35 tables métier ont été comparées
avant et après migration puis rejeu. Le journal compte quatorze migrations.
La base configurée `autostrass_test` a été contrôlée en lecture à la version 0012.
La première requête Graphify avait actualisé le marqueur de la compétence Claude.
Le marqueur 0.9.114 a été rétabli après comparaison des neuf fichiers au paquet Windows.

Le commit applicatif `8176c8e` est poussé sur `origin/main`. Le build final, le
parcours Chromium réel et les trois parcours simulés passent. Les bases jetables
ont été supprimées, MariaDB arrêtée et son fichier d’identifiants retiré.
Le contrôle automatique a refusé le nettoyage de quatre dossiers sous `%TEMP%` :
`openstrass-achats-e604d1b9f58742548b33bd12803d8e50` (instance arrêtée),
`openstrass-achats-devis-ce252beac14140e19b9f3bd87d7898a9` et
`openstrass-achats-receptions-24ec06640245408ebe8b41766edf30e7` (captures de recette) et `openstrass-graphe-achats-gxzgqx07` (copies de travail de Graphify).
Le [graphe Graphify](graphify-out/graph.html) indexe `8176c8e` avec 3 830 nœuds, 8 455 liens, 198 communautés et 674 sources au manifeste.

## Mise en service des commandes fournisseurs sur la base de développement

L’API signale l’erreur MariaDB 1054 sur la colonne heure_blocage. La
passation et Graphify situent cette lecture dans le dépôt fournisseurs et
la création de la colonne dans la migration 0013.

La connexion effective de l’API cible autostrass_test sur MariaDB 10.11.14.
Ses treize entrées Drizzle correspondent aux migrations 0000 à 0012. Les
colonnes de 0013 sont absentes. La base comporte 40 tables InnoDB et
une commande fournisseur envoyée.

La lecture des horaires sur le dépôt MariaDB a reproduit l’erreur 1054. Avant
migration, un dump transactionnel de 113 098 octets a été sauvegardé hors Git.
Les empreintes des 818 lignes des 39 tables métier sont identiques de part et
d’autre du dump. La structure des 40 tables et de la vue figure dans le SQL.
Sauvegarde : `%LOCALAPPDATA%/Autostrass/backups/migrations/0013-2026-11-28T16-23-50.815Z-608f7a16/avant-0013.sql`.

La [migration 0013](database/drizzle/0013_commandes_fournisseurs.sql) est
appliquée à autostrass_test. Les 14 empreintes Drizzle correspondent au dépôt.
Les dix colonnes, les trois index et les deux clés étrangères attendus sont présents.
Les 818 lignes des 39 tables métier et la définition de la vue concordent avec
la sauvegarde. Les lectures fournisseurs, horaires, commandes et besoins passent.

Après redémarrage de l’API et de Vite, Chromium affiche les trois horaires
fournisseurs avec une session magasinier. Le chargement de l’annuaire, des
horaires, des commandes fournisseurs et des articles à commander renvoie HTTP 200
dans l’application. L’API et le proxy Vite confirment la connexion MariaDB.
Le point de santé HTTPS répond également en 200, avec certificat vérifié et TLS 1.3.

Les empreintes des données métier concordent aussi après la consultation Chromium.
Le journal du nouveau serveur compte zéro erreur 1054 pendant ces contrôles.
