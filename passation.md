# Passation — Autostrass App

**Synthèse au 8 novembre 2026.** Cette version remplace le journal chronologique
par l'état livré, les contrats à préserver et les points de reprise.
L'[historique intégral avant compaction](https://github.com/sollevix67/autostrass_app/blob/37ac9167d92d33d9997f2ad3f560ec34e94379f4/passation.md)
est conservé dans Git : `git show 37ac916:passation.md`.
Le cahier des charges reste [TODO.md](TODO.md) ; un CRUD livré ne couvre pas
nécessairement toutes ses exigences métier.

## Reprise prioritaire

1. **Figma** : reprendre le contrôle final P1.g dès que l'accès de lecture est
   disponible. Architecture Starter approuvée ; quatre collections, 112 variables,
   six styles d'ombre et 12 styles de texte créés dans `Untitled`. Le quota MCP
   Starter refuse le vérificateur corrigé ; P1 reste incomplet. Aucune page de
   documentation ni aucun composant créé. Réutiliser les identifiants du registre.
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

**Reprise du 8 novembre, après compaction** : le plugin Figma **2.0.20** est
installé et activé. Les outils MCP Figma sont devenus disponibles dans la session,
et `whoami` a confirmé l'accès connecté, avec une seule équipe sélectionnée
automatiquement. Le diagnostic CLI initial indiquait `not_logged_in` ; la tentative
`codex mcp login figma`, restée en attente, a été arrêtée après confirmation de
l'accès effectif du connecteur. Ne pas confondre ces deux états d'authentification.
Aucun lien OAuth temporaire ni secret conservé dans le dépôt.

**Fichier cible** : [Untitled](https://www.figma.com/design/UP7nQVTU4dlyfEiQdG2IYe),
clé `UP7nQVTU4dlyfEiQdG2IYe`, type `design`. Session de construction :
`82b3d40c-67bb-4e75-845b-cf6fd28f137d`. Le canevas reste une page
`Page 1` (`0:1`) vide ; les variables et styles locaux existent désormais.
Fira Sans et Fira Code sont disponibles, avec Regular, Medium et SemiBold.

**P0.a–P0.f réalisés et approuvés** : neuf bibliothèques ajoutées, pagination
terminée et 22 recherches ; candidats distants non importés, compatibilité encore
à vérifier par composant. Les résultats vides par nom ne prouvent pas l'absence
d'équivalents. Inventaire :
[figma-library-discovery.md](design-system/autostrass/figma-library-discovery.md),
preuves initiales : [figma-discovery.json](design-system/autostrass/figma-discovery.json).
L'accord « Oui » couvre six styles d'ombre, 12 styles de texte et 16 familles,
dont 27 icônes. Le refus initial `Limited to 1 modes only` a été résolu par
l'adaptation explicitement choisie : 112 variables dans quatre collections à
un mode Value. Le modèle CSS et les dimensions littérales restent exacts.

| P1 — créations réussies | Nombre |
|---|---|
| Color Light | 49 variables, dont 11 alias |
| Color Dark | 49 variables, dont 11 alias |
| Dimensions | 11 variables, espacements et rayons |
| Typography | 3 variables, dont l'alias font/display → font/mono |
| Styles d'effet | `Shadow/Light/{sm,md,lg}` et `Shadow/Dark/{sm,md,lg}` |
| Styles de texte | Body, Heading/Page/Min, Heading/Page/Max, Heading/Card, Heading/Dialog, Field/Label, Field/Input/Desktop, Field/Input/Mobile, Button/Standard, Button/Compact, Badge, Table/Header |

**P1.g — contrôle final incomplet** : le premier script a parcouru les 112
variables avant d'échouer sur la comparaison JSON intégrale de `fontName` pour
Heading/Page/Min. Figma ajoute `variationSettings` à Fira Code ; une lecture
suivante des 18 styles a montré les propriétés attendues, avec métadonnées
supplémentaires et précision float32. Le
[vérificateur corrigé](design-system/autostrass/figma-scripts/check-foundations.js)
compare les propriétés attendues et tolère un écart numérique de 0,00001.
Son exécution a été refusée : **`You've reached the Figma MCP tool call limit
on the Starter plan.`** Aucun résultat de validation globale réussi enregistré.

La [documentation Figma](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/),
consultée le 8 novembre, indique jusqu'à **20 appels de lecture par mois** pour
Starter et les sièges View/Collab. Certaines écritures et `whoami` sont exemptés ;
cela ne garantit pas la disponibilité des écritures `use_figma`. Le contrôle
requis est effectivement refusé. La date de réinitialisation n'est pas connue.
Ne pas ajouter de mutation artificielle au contrôle pour contourner le quota.

**Reprise** : relire le
[registre versionné](design-system/autostrass/figma-library-state.json) et le
[plan exact](design-system/autostrass/figma-foundation-plan.json), puis ouvrir
`create_session` lorsque la lecture est disponible. Charger `figma-use` et
`figma-generate-library`, incorporer le plan et la fonction de vérification au
script, puis `return await validateFoundations(expected)`. Confirmer les
identifiants réels et persister le résultat avant P2. L'ancien registre
`%TEMP%/design-system-state-ds-autostrass-2026-11-08.json` est absent ; le registre
versionné le remplace. Les 15 sources de découverte ont été comparées au commit
`6fdba67`, sans changement ; 66 tokens, 35 surcharges sombres et 12 alias CSS.

P2 reste à créer : couverture, guide et documentation des fondations avec captures.
P3 : construire les 16 familles séparément, icônes exactes d'abord, puis vérifier
structure et rendu ; INSTANCE_SWAP pour les icônes imbriquées. P4 : accessibilité,
noms, liaisons et Code Connect. Aucun composant ni aucune documentation Figma
créé avant la réussite du contrôle des fondations.

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
et `manifest.json`. Le **10 novembre**, `graphify update .` **0.9.104** a
actualisé JSON, HTML, rapport, manifeste, cache et sauvegarde du jour après
la clôture de Caisse : **134 empreintes sources conformes** (133 TS/TSX/MJS
et le vérificateur JS), **2 865 nœuds**, **5 825 liens**, **187 communautés**, aucun identifiant
en double ni lien orphelin ; identifiants HTML identiques au JSON et même nombre
de liens et mêmes extrémités, sans lien HTML orphelin. Métadonnée de départ
**`052eb33`**. Le vérificateur Figma et `scripts/test-caisse-ui.mjs` sont indexés.
Limites : CSS non indexé, 15 SQL sans parseur, extraction sémantique documentaire
et renommage LLM non relancés ; le graphe ne prouve pas
le câblage runtime. Le CLI a aussi actualisé sa compétence Claude locale.

**8 novembre — compaction** : suppression des doublons et états périmés,
regroupement des livraisons/validations, conservation des contrats, migrations,
blocages et liens de reprise. Ancien journal : **2 476 lignes, 154 252 octets**.
Modification documentaire uniquement, sans changement applicatif ni migration.
Livraison prévue par commit et push sur `origin/main` ; tête initiale `37ac916`.

**8 novembre — reprise Figma** : accès effectif confirmé par `whoami`, fichier
`Untitled` créé, session ouverte, inventaire distant et recherches de bibliothèques
réalisés. Résultats et périmètre proposés consignés, registre local actualisé.
P0.d a ensuite été validé par l'utilisateur ; voir la tentative P1.a ci-dessous.
Validation : 15 empreintes sources Figma et 132 empreintes MD5 de sources du
graphe conformes ; preuves JSON de découverte cohérentes avec les 22 recherches
et les neuf bibliothèques ; `git diff --check` réussi. Aucun test applicatif requis
pour ces changements documentaires.
Modification documentaire uniquement dans le dépôt, sans changement applicatif
ni migration ; tête initiale `e0268fd`, livraison par commit et push sur `origin/main`.

**8 novembre — périmètre Figma approuvé, P1.a tenté** : accord utilisateur « Oui »
enregistré pour 63 variables CSS, six styles d'ombre, 12 styles de texte et
16 familles. Le serveur Figma refuse le second mode du fichier Starter.
État relu : aucune collection ni variable ni style créé ; registre et preuves
actualisés avec l'erreur et les deux possibilités de reprise. Aucun achat,
déplacement de fichier ni changement d'architecture effectué.
Validation : Graphify actualisé et ses 132 sources vérifiées, HTML/JSON cohérents,
sans doublon ni lien orphelin ; accord et état vide de l'échec vérifiés dans les
preuves JSON ; `git diff --check` réussi. Aucun test applicatif requis.
Changements documentaires uniquement dans le dépôt, sans modification applicative
ni migration ; tête initiale `8d9ae49`, livraison par commit et push sur `origin/main`.

**8 novembre — adaptation Starter et fondations Figma** : choix utilisateur
enregistré pour les collections Light/Dark séparées. Créations réussies : quatre
collections, 112 variables (23 alias), six styles d'effet et 12 styles de texte.
Plan, identifiants et contrôle corrigé versionnés. La comparaison des polices
a été corrigée pour les métadonnées Figma et la précision float32 ; son exécution
reste refusée par le quota de lecture MCP. P1 incomplet, P2–P4 non commencés.
Les quotas et exemptions ont été vérifiés dans la documentation officielle ;
aucune création existante supprimée et aucun changement d'abonnement effectué.
Validation locale réussie : plan des 112 variables conforme au CSS, 23 alias
résolus dans le plan, 18 styles enregistrés et identifiants uniques ; syntaxe du
vérificateur contrôlée par `node --check`, sans exécution distante. Graphify
actualisé et vérifié : 133 MD5 sources, HTML/JSON cohérents, aucun doublon ni lien
orphelin. `git diff --check` réussi. Aucun test applicatif requis ; les sources
applicatives et la base sont inchangées. Tête initiale `6fdba67`, livraison par
commit et push sur `origin/main`.

**10 novembre — clôture de Caisse** : demande précisée par
l'utilisateur : déplacer le formulaire dans une fenêtre contextuelle comme les
autres formulaires, puis vérifier le comptage. Relecture de la vue, de RHF/Zod,
des dialogues natifs et du repository de caisse. Points à corriger : huit coupures
seulement (pièces sous 0,50 € absentes), total pouvant afficher `NaN` lorsque la
quantité est effacée, comparaison en flottants et soumission clavier contournant
la confirmation. Conserver le comptage physique explicite et le calcul serveur.
Graphify initial vérifié : 133 empreintes sources conformes, aucun fichier source
manquant ; 2 832 nœuds et 5 764 liens. Tête initiale `052eb33`.

Implémentation : bouton de clôture dans les actions de page, dialogue natif
avec Annuler/croix/Échap/fond et restitution du focus. Validation puis confirmation
dans le même dialogue pour rester dans la couche modale native ; valeurs confirmées
figées avant l'appel API. Protection synchrone contre les doubles envois, fermeture
et champs bloqués pendant l'écriture ; saisie conservée si l'API échoue. Quinze
coupures de 500 € à 0,01 €, sous-totaux par coupure et calcul en centimes ; total
incomplet signalé au lieu de `NaN`. Le repository arrondit déjà les montants à deux
décimales et accepte ces coupures : aucune modification serveur ni migration.
Premier passage navigateur : défaut supplémentaire reproduit, le total mémorisé
restait à zéro après une modification de quantité. Remplacement de `watch` et du
cache `useMemo` par `useWatch` avec recalcul à chaque rendu. Ajout du script
`test:caisse:ui` et de Playwright en dépendance de développement pour une recette
reproductible sans base réelle. Focus de confirmation corrigé pour attendre la
fin de validation RHF, afin que le bouton de retour soit activé avant le focus.

Validation : `build`, `lint` et `test:errors` réussis ; **53 contrôles Chromium**
réussis avec quatre requêtes simulées, aucune écriture MariaDB et aucune erreur
JavaScript. Totaux de 162,88 € et 888,88 €, écart d'un centime, scénario
0,10 + 0,20 €, saisies invalides, confirmation, échec/reprise, comptage vide,
droits, clavier et huit variantes responsive/thème vérifiés. Quatre captures
versionnées ; guide et preuves : [caisse-cloture.md](specs/caisse-cloture.md).
Avertissements existants : bundle Vite supérieur à 500 kB et fonction de contrôle
Figma non utilisée par Oxlint. Aucun nouvel avertissement de lint.
Graphify actualisé puis contrôlé : 134 empreintes conformes, 2 865 nœuds,
5 825 liens et 187 communautés ; aucun doublon ni lien orphelin, HTML/JSON
identiques pour les identifiants et les extrémités des liens. Nouveau test indexé,
cache et sauvegarde du 10 novembre versionnés. La modification de package.json
a entraîné la reconstruction complète du graphe de code, sans LLM ; limites
CSS, SQL et sémantique documentaire inchangées. `git diff --check` réussi.
Livraison par commit et push sur `origin/main`, tête initiale `052eb33`.
