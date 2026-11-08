# Passation — Autostrass App

**Synthèse au 8 novembre 2026.** Cette version remplace le journal chronologique
par l'état livré, les contrats à préserver et les points de reprise.
L'[historique intégral avant compaction](https://github.com/sollevix67/autostrass_app/blob/37ac9167d92d33d9997f2ad3f560ec34e94379f4/passation.md)
est conservé dans Git : `git show 37ac916:passation.md`.
Le cahier des charges reste [TODO.md](TODO.md) ; un CRUD livré ne couvre pas
nécessairement toutes ses exigences métier.

## Reprise prioritaire

1. **Figma** : rétablir l'accès aux outils MCP et obtenir le fichier/cadre cible
   pour l'inspection, la bibliothèque et l'intégration. Aucun fichier Figma créé.
   Les paramètres de création demandés sont `design` / `Untitled` ; voir ci-dessous.
2. **Métier** : devis, puis commandes fournisseurs, avec numérotation, conversion
   et attribution des réceptions. Compléter ensuite les documents PDF manquants.
3. **Déploiement** : vérifier le journal des migrations de chaque installation,
   charger les contrats récents par redémarrage API, puis tester certificat,
   Cloudflare Turnstile et PDA Zebra TC22 réels. L'authentification Android reste
   à définir si Turnstile est activé.
4. **Stock historique** : réconcilier les allocations excédentaires par un
   comptage explicite ; aucune redistribution automatique ni masquage des écarts.
5. **Recette locale** : confirmer le redémarrage de l'API habituelle et recontrôler
   le proxy Vite, qui avait produit des `ECONNRESET` pendant la recette transferts.

## Repères techniques

React 19, TypeScript, Vite, React Router 7 ; Express 5, MariaDB/mysql2 et Drizzle.
Le backend actuel est Express, malgré la mention initiale de NestJS dans TODO.
Le développement utilise Vite → `/api` → port 3001. `tsx` n'utilise pas de
surveillance dans les commandes actuelles : redémarrer l'API après un changement
serveur ou de configuration nécessitant une prise d'effet au démarrage.

| Repère | Source |
|---|---|
| Routes, shell, thèmes | `src/App.tsx` |
| Client HTTP, contrats, indisponibilité | `src/services/api.ts`, `contracts.ts`, `resilience.ts` |
| Hooks métier et référentiels | `src/hooks/` ; `useResource`, `useCatalogue`, `useStock`, `useReferentials` |
| Formulaires et composants partagés | `src/schemas/`, `src/components/` ; RHF/Zod, `PageLayout`, `DataTable`, `ConfirmDialog`, toasts |
| API, validation, repositories | `server/index.ts`, `server/middleware/`, `server/repositories/` |
| Schémas et migrations | `server/db/schema.ts` réexporte aussi `schema_step2.ts` ; `database/drizzle/` |
| Design | [MASTER.md](design-system/autostrass/MASTER.md), `src/tokens.css`, `components.css`, `forms.css` |

Conserver les contrats API autoritatifs, les identifiants numériques et les
services partagés. Style : deux espaces, apostrophes simples, sans points-virgules,
imports backend avec `.js`. Réponses en français ; après chaque intervention,
mettre à jour cette passation, vérifier Graphify, commiter et pousser les changements.

## État fonctionnel et écarts métier

Le tableau reprend les livraisons documentées et les exigences restantes de TODO ;
les modules anciens n'ont pas fait l'objet d'un nouvel audit exhaustif.

| Module | Livré | Reste à compléter |
|---|---|---|
| Stock | Emplacements hiérarchiques, allocations, transferts, inventaire physique par référence et historique | Recette Zebra ; campagnes multi-articles et brouillons partagés hors périmètre actuel |
| Catalogue | CRUD, catégories/sous-catégories administrables, TVA et prix TTC, forcing, délai, EAN13 ; création/modification en dialogue | Recherche EAN13 dédiée, compatibilité immatriculation/VIN et autres exigences à rapprocher de TODO |
| Caisse et comptoir | Sessions, comptage, clôture, ventes figées, empreintes chaînées, facture PDF ; auteur issu du compte connecté | Complétude clavier/autocomplétion et exigences NF203/NF525 de déploiement à confirmer |
| Devis | Non commencé | Numérotation, CRUD, PDF, email/WhatsApp et conversion en commande |
| Commandes/réceptions fournisseurs | Réceptions persistées, lignes et historique, formulaire en dialogue | Commandes fournisseurs, horaires, liste à commander, suivi par fournisseur, attribution automatique et intégration au carnet |
| Commandes clients | API, lignes et statuts | Numérotation métier et bons de commande PDF |
| Livraisons | CRUD lié aux commandes, transporteur, dates, adresse et statut ; secteurs clients administrables | Bons automatiques, numérotation, tournées et intégration des secteurs |
| Retours clients | API et lignes, montant recalculé | Avoirs numérotés/PDF, remise en stock et bons de retour refusé avec motifs |
| Clients | CRUD en dialogue, numéro personnalisable limité à six chiffres, SIRET professionnel, secteur facultatif | Autocomplétion adresse/SIREN/SIRET, suivi des documents et paiements, suspension/limitation, tournées |
| Fournisseurs | CRUD, coordonnées facultatives, SIRET, création/modification en dialogue | Suivi des commandes lié au futur module fournisseurs |
| Véhicules | CRUD, statut modifiable | Kilométrage, entretiens/réparations, carburant et coût/km |
| Personnels/utilisateurs | Comptes, rôles, activation et protections contre l'auto-verrouillage | Plannings, horaires et profils/accès métier détaillés |
| Paramètres | Huit rubriques, routes, API, référentiels, sauvegardes, HTTPS et Turnstile | Recette certificat/Cloudflare/terminaux réels ; guides de déploiement ci-dessous |

## Contrats à préserver

### Stock et inventaire

Les transferts choisissent explicitement l'origine (allocation ou stock non affecté).
La référence vient de l'URL encodée, les emplacements sont numériques et une
destination `null` prime sur l'alias historique `destination_id`. Quantités entières,
stock disponible et cohérence des allocations contrôlés. Verrouillage transactionnel,
stock total conservé, allocations épuisées supprimées et destination fusionnée ;
origine identique sans effet. Mouvement `TRANSFERT` de delta nul et audit atomique :
un échec de journalisation annule tout. Suppression d'emplacement sérialisée.

L'inventaire `/stock/inventaire` / `/api/inventaires` compte une référence complète,
stock non affecté compris, avec motif et confirmation. Une version obsolète ou rejouée
est refusée ; transaction `READ COMMITTED` pour stock, allocations, historique,
mouvement `INVENTAIRE_PHYSIQUE` et audit. Historique autonome, filtre par référence,
pagination de 50, sans modification/suppression. Pas de brouillon serveur ni
interception du bouton Précédent ; après conflit, nouveau comptage exigé.
Les chemins d'emplacement se regroupent par référence sans dupliquer les articles ;
les panneaux Stock occupent toute la largeur et les codes longs reviennent à la ligne.
Guide : [inventaire-physique.md](specs/inventaire-physique.md) ;
[affichage des emplacements](specs/stock-emplacements-design.md).

### Clients et fournisseurs

Les écritures Clients/Fournisseurs exigent une confirmation API : une panne conserve
la saisie et ne produit pas de faux succès local. Caissiers en lecture seule.
Numéro client : 1 à 6 chiffres ASCII, zéros initiaux conservés ; facultatif à la
création, obligatoire dans le formulaire de modification. Génération transactionnelle
`000001` à `999999`, collisions évitées, saturation sans insertion partielle.
Doublon : `409 CLIENT_NUMBER_EXISTS`. Les documents référencent l'id interne.
Les anciens numéros restent lisibles et ne sont remplacés qu'explicitement.

SIRET facultatif : 14 chiffres ASCII, stockage `VARCHAR(14) NULL`. Un champ effacé
vaut `NULL`, une clé omise dans un PUT conserve la valeur. Côté clients, SIRET réservé
aux professionnels ; enregistrer comme particulier l'efface dans la même écriture SQL.
Côté fournisseurs, seul le nom est requis ; coordonnées vides normalisées à `null`,
téléphone acceptant les séparateurs autorisés, erreurs API reliées aux champs.
Guides : [client-modal.md](specs/client-modal.md), [fournisseurs.md](specs/fournisseurs.md).

### Caisse et PDF

Une seule session ouverte par caissier ; vente sans session refusée. Clôture réservée
au propriétaire, même pour un administrateur, et sérialisée avec les ventes.
Total théorique calculé côté serveur ; seules les espèces touchent le tiroir.
Vente et mouvement de caisse sont atomiques. Vente validée et clôture figées ;
correction par avoir puis nouvelle vente. Empreintes SHA-256 chaînées, événements
système, mécanismes de mode dégradé et archivage fiscal ; ne pas réinitialiser les
empreintes de production pour résoudre une anomalie.

Depuis le 8 novembre, le champ « Caissier » est retiré du formulaire comptoir :
le serveur détermine l'auteur depuis le compte authentifié, ignore un nom fourni
par le client et conserve cette identité dans l'empreinte, le journal et la facture.
Seule la facture `GET /api/ventes/:id/facture` est livrée. Génération serveur
`server/services/pdfInvoice.ts` : accès URL refusé, accès local limité aux quatre
polices Roboto du paquet pdfmake. Devis, bons de commande/livraison et avoirs restent
à créer, avec routes et boutons de téléchargement. Numérotation détaillée dans TODO.

### Interface et paramètres

Clients, Fournisseurs, Catalogue et Réceptions utilisent des dialogues natifs :
focus contenu puis restitué, Annuler/croix/Échap/fond, erreurs conservant les valeurs,
fermeture et doubles envois bloqués pendant la sauvegarde. Création/édition explicites ;
référence catalogue immuable. Échap relayé par l'aperçu intégré est aussi pris en charge.
Document en français, locale Zod française et traductions natives réinitialisées lors
des corrections/réouvertures ; contraintes HTML, focus et messages métier conservés.
Replis locaux historiques des autres hooks inchangés : distinguer démonstration et
persistance. Réutiliser les tokens bleu/ambre, Fira Sans/Fira Code et thèmes auto/clair/sombre.
La refonte du 4 novembre remplace les surcharges de l'ancien essai Modern CSS.

Paramètres : admin pour toutes les rubriques, magasinier pour les emplacements,
caissier exclu. Catégories, sous-catégories et secteurs persistés dans MariaDB ;
codes stables et suppression refusée si utilisée. Réglages techniques atomiques dans
`config/runtime/settings.json`, hors Git, secrets masqués par l'API. Connexion DB
testée avant sauvegarde et appliquée au redémarrage du pool commun Express/Drizzle ;
HTTPS au redémarrage, quotas et Turnstile à chaud. PEM validés, Express servant le
build/API en HTTPS, HTTP maintenu ou redirigé en 308. Turnstile contrôle jeton,
hostname et action via Siteverify. Guides : [parametres.md](specs/parametres.md),
[parametres-roadmap.md](specs/parametres-roadmap.md).

## Base, activation et sécurité

Le journal versionné contient **0000 à 0010**. Les migrations récentes sont :

| Migration | Changement |
|---|---|
| `0007_parametres_referentiels` | Référentiels catégories/sous-catégories/secteurs et rattachements |
| `0008_inventaire_stock` | Historique d'inventaire et index |
| `0009_fournisseur_siret` | `fournisseurs.siret VARCHAR(14) NULL` |
| `0010_client_siret` | `clients.siret VARCHAR(14) NULL` |

Dernier état documenté de la base configurée : `0008`, `0009` et `0010` appliquées
le 6 novembre ; les trois fournisseurs et quatre clients existants ont été conservés,
SIRET initial à `NULL`. Les anciennes mentions « 0008 à appliquer » concernent
les installations qui n'ont pas été migrées. Aucun accès DB ni contrôle de la base
active effectué pendant cette compaction. Sur chaque installation : sauvegarder,
comparer schéma et journal Drizzle, puis `npm run db:migrate` et redémarrer l'API.
Ne pas compléter artificiellement le journal. `database/schema.sql` ne crée que le
socle catalogue v1 ; les seeds sont réservés aux données de démonstration.
Le contrôle de conservation du seed signale les allocations incohérentes sans
les redistribuer ni les écraser.

Configurer `.env` depuis `.env.example`, `DB_*` et `JWT_SECRET` d'au moins 32 caractères.
`/api/health` distingue `connected`, `unavailable`, `unconfigured` ; les erreurs SQL
de connexion sont mappées en `503 DATABASE_UNAVAILABLE` sans exposer la cause au client.
JWT HS256 de 12 h en mémoire/cookie httpOnly, compte relu à chaque requête ; conserver
RBAC, CSRF, normalisation et en-têtes de sécurité. Admin : tous droits ; magasinier :
écritures dépôt ; caissier : caisse/documents. Aucun secret, `config/ssl/`,
`config/runtime/` ou `archives/` fiscal dans Git. Revue historique :
[SECURITY-REVIEW.md](SECURITY-REVIEW.md).

## Validation et commandes

**Dernière recette applicative documentée, 8 novembre** : build, lint et
`test:errors` réussis ; **126 contrôles API**, **59 sécurité**, **21 Chromium**
pour l'attribution des ventes, avec API réelle et MariaDB 11.4.5 jetable.
Avertissement Vite préexistant : paquet JavaScript >500 kB.
Les autres campagnes restent consultables dans leurs scripts, guides et captures :

| Sujet | Validation conservée | Preuves |
|---|---|---|
| Traductions des formulaires | 54 contrôles Chromium `en-US`, API simulée | `scripts/test-french-validation-ui.mjs`, `specs/screenshots/validation-fr/` |
| PDF | Vrais PDF, quatre polices, multi-pages, refus URL/fichier puis génération réussie | `npm run test:pdf` |
| Dialogues | Clients 157, fournisseurs 142, catalogue 79, réceptions 62 contrôles Chromium | `specs/screenshots/{client-edit,fournisseurs,catalogue-modal,reception-modal}/` |
| SIRET/numérotation | 9 scénarios SIRET client, 11 fournisseurs, 12 de numérotation réelle | `scripts/test-client-siret.ts`, `test-fournisseurs.ts`, `test-client-numbers.ts` |
| Stock | 13 scénarios transferts, 14 inventaire, 84 contrôles Chromium inventaire | `npm run test:stock`, `npm run test:inventaire`, `specs/screenshots/inventaire/` |
| Paramètres | 5 groupes unitaires, 8 groupes API, 336 contrôles navigateur | `npm run test:parametres`, `specs/screenshots/parametres/` |
| Refonte CSS | 451 contrôles, 104 rendus, contrastes et absence de débordement | [css-review.md](specs/css-review.md), `specs/screenshots/css-review/` |
| Ventes et identité | Relecture SQL/API, PDF et contrôle des empreintes | `specs/screenshots/ventes-utilisateur/` |

`npm ci` ; `npm run dev` ou `dev:api` ; `npm run build` ; `npm run lint` ;
`npm run preview`. Recherche design : `npm run uipro -- "erp inventory operations
internal tool data dense" --design-system -p "Autostrass"`, ou `uipro:node`.

`test:stock`, `test:inventaire`, `test:integration` et `test:parametres` utilisent une
base/API jetable via `TEST_DB_*` ; le compte doit pouvoir créer/supprimer la base.
Les appels directs `test:api` et `test:security` écrivent dans la base de l'API ciblée,
et `test:api` recharge les seeds : uniquement sur base jetable. `test:repos` et
`test:caisse` sont des diagnostics manuels ; `caisse:diagnostic` reste en lecture seule.
Pour les futurs correctifs, conserver les tests de concurrence, rollback du journal,
droits et intégrité fiscale. Aucune nouvelle recette applicative pour cette compaction.

## Figma : état de reprise

Au 8 novembre, aucun outil MCP Figma ni `ToolSearch` n'était exposé et aucun fichier
cible n'avait été fourni. Création, inspection et intégration distantes restent à faire.

- **Nouveau fichier** : compétence `figma-create-new-file`, paramètres `design` /
  `Untitled`. Appeler `whoami` ; plan unique choisi automatiquement, sinon demander
  le plan à l'utilisateur ; puis `create_new_file` et restituer l'URL.
- **Inspection** : URL cible, puis `figma-use` pour pages, composants, variantes,
  instances, variables/modes, styles et contrôle visuel des écrans.
- **Bibliothèque** : P0.a terminé ; P0.b–P0.f en attente de l'inventaire distant,
  `get_libraries`, `search_design_system` et comparaison code/Figma. Confirmer le
  périmètre après inspection, avec accord explicite avant la phase 1 requis par
  `figma-generate-library`. Inventaire :
  [figma-library-discovery.md](design-system/autostrass/figma-library-discovery.md),
  **66 tokens**, **35 surcharges sombres**, **12 alias**, 16 familles proposées,
  27 tracés d'icônes. Reprise locale :
  `%TEMP%/design-system-state-ds-autostrass-2026-11-08.json` (15 empreintes sources,
  registre Figma vide).
- **Intégration** : URL du cadre avec `node-id` et page cible ; charger
  `figma-design-to-code`, appeler `get_design_context` avant le code et réutiliser
  les composants/tokens existants dans les deux thèmes.

## Limites et points à confirmer

CSP complète à définir pour les domaines de déploiement ; déconnexion sans révocation
du JWT avant expiration ; quotas en mémoire par processus, stockage partagé requis
en multi-instance. La compatibilité immatriculation/VIN nécessite un choix de service
et de conditions d'accès, avec saisie manuelle conservée. Pas de certificat de
production, de compte Cloudflare réel ni de Zebra fourni pour les campagnes passées.
Les contrôles logiciels fiscaux ne remplacent pas la validation du déploiement et
des exigences de certification du cahier des charges.

**Nettoyage restant, présence revérifiée pendant la compaction** : les anciennes
suppressions ont été refusées par le contrôle automatique. Subsistent
`.ventes-review.local/database-data/` (ignoré par Git),
`%TEMP%/autostrass-inventaire-verification-20261106/` avec son `credentials.json`
de test, et `%TEMP%/autostrass-transfer-verification/data/`. Les campagnes avaient
arrêté leurs API/MariaDB et supprimé leurs bases ; aucun service arrêté ni nettoyage
effectué pendant cette intervention.

## Graphify et dernière intervention

Artefacts : [graph.html](graphify-out/graph.html), `graph.json`, `GRAPH_REPORT.md`
et `manifest.json`. `graphify update .` **0.9.104** a actualisé JSON, HTML,
rapport, manifeste, cache et sauvegarde du jour : **132 sources TS/TSX/MJS**
conformes, **2 827 nœuds**, **5 759 liens**, **168 communautés**, aucun identifiant
en double ni lien orphelin ; HTML cohérent avec le JSON. Les références de lignes
de cette passation sont recalées sur les sections condensées. Métadonnée de
départ `37ac916`. Limites : CSS non indexé, 15 SQL sans parseur, extraction
sémantique globale et renommage LLM non relancés ; le graphe ne prouve pas
le câblage runtime. Le CLI a aussi actualisé sa compétence Claude locale.

**8 novembre — compaction** : suppression des doublons et états périmés,
regroupement des livraisons/validations, conservation des contrats, migrations,
blocages et liens de reprise. Ancien journal : **2 476 lignes, 154 252 octets**.
Modification documentaire uniquement, sans changement applicatif ni migration.
Livraison prévue par commit et push sur `origin/main` ; tête initiale `37ac916`.
