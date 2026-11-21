# Passation — Autostrass

État consolidé le **21 novembre 2026**, après livraison du module Devis,
conversion en commande et besoins d'approvisionnement courants. Migration 0012
appliquée à la base locale après sauvegarde et comparaison des données.
Les 16 constats de la revue initiale restent corrigés. Les preuves et procédures
détaillées sont dans les guides liés. L'ancien journal reste disponible
avec `git show 397ddee:passation.md` (747 lignes, 55 795 octets dans Git).

## Prochaines priorités

Les **16 constats R01–R16** sont corrigés et testés ; détail, migration et preuves
dans les [correctifs](specs/correctifs-revue-2026-11-14.md). La revue et son inventaire
SHA-256 documentent l'ancien état et restent conservés.

1. Migration **0012** appliquée et développement redémarré sur `autostrass_test`
   le 21 novembre après sauvegarde ; vérifier les autres installations, dont 0011.
   Rapprocher les anciennes ventes
   HT encaissées de leurs justificatifs, sans réécriture ni reset d'empreintes.
2. Développer les **commandes fournisseurs** : sélection fournisseur/mode,
   horaires, commande et attribution des réceptions ; compléter les bons PDF.
   Les Devis sont livrés : [guide](specs/devis.md). [TODO.md](TODO.md)
   reste le cahier des charges ; un CRUD ne couvre pas toutes ses exigences.
3. Vérifier les migrations et le redémarrage API sur chaque installation ;
   réaliser les recettes certificat, Cloudflare Turnstile et PDA Zebra TC22.
   L'authentification Android avec Turnstile reste à définir.
4. Réconcilier le stock historique excédentaire par comptage explicite, sans
   redistribution automatique ; recontrôler le proxy Vite après les anciens
   `ECONNRESET` documentés lors de la recette transferts.

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
| Fournisseurs/réceptions | Fournisseurs et réceptions avec lignes/historique | Commandes fournisseurs, horaires, liste à commander, suivi et attribution automatique |
| Commandes clients | Création, lignes, statuts, numéros C et TVA/client figés ; commandes issues d'un devis protégées | Bon PDF et approvisionnement des commandes directes |
| Livraisons | CRUD lié aux commandes, dates, transporteur, adresse/statut ; modèle PDF documenté | Bons automatiques, numérotation, tournées et secteurs ; [modèle BL](specs/bon-livraison-modele.md) |
| Retours | Création et lignes, montant recalculé | Avoirs numérotés/PDF, remise en stock, motifs et bons de refus |
| Clients | CRUD, numéro personnalisable, SIRET professionnel, secteur facultatif | Autocomplétion adresse/SIREN/SIRET, documents/paiements, limites et tournées |
| Véhicules | CRUD et statut | Kilométrage, entretien, carburant et coût/km |
| Utilisateurs | Création/édition, rôles, activation et protections contre l'auto-verrouillage | Plannings, horaires, accès métier détaillés |
| Paramètres | Neuf rubriques, référentiels, plafond Caisse, DB, quotas, HTTPS et Turnstile | Recette de déploiement réelle |

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

**Devis et commandes.** Numéros D/C uniques, six lettres aléatoires `a-zA-Z`,
collation binaire, numéro/date immuables. Client, désignation et TVA figés, prix
HT explicitement éditables avant conversion ; nouvelle référence → catalogue.
Validation complète et version optimiste ; devis annulé/expiré non convertible,
converti figé. Conversion transactionnelle/idempotente, commande liée immuable
hors statut/date de livraison ; audit et lignes atomiques. Aucun mouvement de
stock ni fiscal. Besoins actuels des devis convertis calculés en lecture seule,
demande des commandes actives par ordre id/ligne ; annulation/stock pris en compte.
PDF téléchargé/partagé contrôlé par version ; partage natif de fichier ou repli
téléchargement + email/WhatsApp, sans envoi automatique ni statut fictif.
[Guide](specs/devis.md), [recette](specs/captures/devis/resultats.json).

**Formulaires et utilisateurs.** Les formulaires métier et Administration sont
migrés en dialogues natifs : focus contenu/restitué, Annuler/croix/Échap,
clic extérieur sans fermeture ni perte de saisie,
fermeture et doubles envois bloqués pendant l'écriture, saisie conservée en erreur.
Filtres, sélection de référence inventaire et connexion restent dans la page.
Panier conservé à la fermeture ; confirmations d'inventaire empilées conservées.
Référence catalogue immuable. Locale HTML/Zod française, traductions natives
réinitialisées après correction/réouverture. L'aperçu intégré relaie aussi Échap.
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

Journal Drizzle versionné **0000 à 0012** : `0007` référentiels, `0008` inventaire,
`0009` SIRET fournisseur, `0010` SIRET client, `0011` TVA/TTC/scellement v2,
`0012` Devis/suivi approvisionnement et numéros/client/TVA commandes.
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
les redistribuer. Aucun accès à la base applicative pendant la revue ni les correctifs.

`.env.example` → `.env`, `DB_*`, `JWT_SECRET` ≥32 caractères. `/api/health` distingue
`connected`, `unavailable`, `unconfigured` ; pannes SQL → `503 DATABASE_UNAVAILABLE`
sans détails internes. JWT HS256 12 h en mémoire/cookie httpOnly, compte relu par
requête. Conserver RBAC/CSRF/en-têtes et intégrité fiscale. Admin : tous droits ;
magasinier : dépôt ; caissier : caisse/documents. Ne jamais versionner secrets,
`config/ssl/`, `config/runtime/` ou `archives/`. [Ancienne revue](SECURITY-REVIEW.md).

## Vérifications et outils

Commandes courantes : `npm ci`, `npm run dev`/`dev:api`, `build`, `lint`, `preview`,
`test:errors`, `test:pdf`, `test:ventes`, `test:devis`, `test:devis:ui`.
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
