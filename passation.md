# Passation — Autostrass

État consolidé le **14 novembre 2026**, après correction des 16 constats de la
revue initiale sur `397ddee` et reprise depuis `402e283` (`main`). Les preuves et
procédures détaillées sont dans les guides liés. L'ancien journal reste disponible
avec `git show 397ddee:passation.md` (747 lignes, 55 795 octets dans Git).

## Prochaines priorités

Les **16 constats R01–R16** sont corrigés et testés ; détail, migration et preuves
dans les [correctifs](specs/correctifs-revue-2026-11-14.md). La revue et son inventaire
SHA-256 documentent l'ancien état et restent conservés.

1. Déployer la migration **0011** et redémarrer l'API après sauvegarde ; elle a
   été appliquée uniquement sur bases jetables. Rapprocher les anciennes ventes
   HT encaissées de leurs justificatifs, sans réécriture ni reset d'empreintes.
2. Développer les **devis**, puis les **commandes fournisseurs** : numérotation,
   conversion, attribution des réceptions et PDF manquants. [TODO.md](TODO.md)
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
| Caisse/comptoir | Sessions sérialisées, comptages, plafond, TVA figée, encaissement TTC, empreintes v1/v2, facture PDF | Déploiement 0011 ; rapprochement historique ; clavier/autocomplétion et recette fiscale |
| Devis | Non commencé | CRUD, numéro `yyyymmdd-D-xxxxxx`, PDF, email/WhatsApp, conversion |
| Fournisseurs/réceptions | Fournisseurs et réceptions avec lignes/historique | Commandes fournisseurs, horaires, liste à commander, suivi et attribution automatique |
| Commandes clients | Création, lignes et statuts | Numérotation métier, bon PDF |
| Livraisons | CRUD lié aux commandes, dates, transporteur, adresse/statut | Bons automatiques, numérotation, tournées et secteurs |
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
Seule la facture `GET /api/ventes/:id/facture` existe. `pdfInvoice.ts` refuse les
URL et limite les fichiers locaux aux quatre polices Roboto de pdfmake.
Devis, bons de commande/livraison et avoirs PDF restent à créer.

**Formulaires et utilisateurs.** Les formulaires métier et Administration sont
migrés en dialogues natifs : focus contenu/restitué, Annuler/croix/Échap/fond,
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

Journal Drizzle versionné **0000 à 0011** : `0007` référentiels, `0008` inventaire,
`0009` SIRET fournisseur, `0010` SIRET client, `0011` TVA/TTC/scellement v2.
`0011` contrôlée sur bases jetables, non appliquée à la base configurée. Dernier état de la base
configurée : `0008`–`0010` appliquées le 6 novembre, données existantes conservées.
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
`test:errors`, `test:pdf`, `test:ventes`. `test:stock`, `test:inventaire`, `test:integration`,
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
Migration 0011 et redémarrage API encore requis sur les installations.
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
