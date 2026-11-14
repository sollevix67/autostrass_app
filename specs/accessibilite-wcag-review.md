# Revue WCAG 2.2 — 13 novembre 2026

La revue de l'interface React et de ses styles relève **sept problèmes**, dont
**trois prioritaires**. Les composants et parcours concernés ont été vérifiés
avec la compétence `accessibility` 2.0, sur le code du commit `852e5a2`.
Les fichiers applicatifs restent inchangés ; cette livraison conserve le rapport,
le script de revue et les preuves.

## Priorités

| ID | Priorité | Problème | Critère | Source principale |
|---|---|---|---|---|
| A11Y-01 | P1 | Le résumé d'erreurs interrompt la correction des champs | 2.4.3 A | `src/components/forms/ErrorSummary.tsx:108` |
| A11Y-02 | P1 | Le tri des tableaux ne fonctionne qu'à la souris | 2.1.1 A | `src/components/DataTable.tsx:105` |
| A11Y-03 | P1 | L'erreur de Stock en toast est ignorée dans un dialogue natif | 4.1.3 AA | `src/components/Toast.tsx:54`, `src/views/StockView.tsx:147` |
| A11Y-04 | P2 | Le menu mobile masque le contrôle qui conserve le focus | 2.4.11 AA | `src/App.tsx:186`, `src/App.css:247` |
| A11Y-05 | P2 | Les erreurs de référentiels ne précisent pas le champ fautif | 3.3.1 A | `src/views/parametres/ReferentielEditor.tsx:29` |
| A11Y-06 | P2 | La finalité des données personnelles n'est pas déclarée lors de l'édition de soi | 1.3.5 AA | `src/views/UtilisateursView.tsx:272` |
| A11Y-07 | P2 | Le titre du document n'identifie pas la vue affichée | 2.4.2 A | `index.html:7` |

P1 : fonctionnalité indisponible au clavier ou erreur essentielle inaccessible.
P2 : navigation, orientation ou identification des saisies à corriger ensuite.

## A11Y-01 — Le résumé d'erreurs reprend le focus pendant la saisie

Dans Inventaire, commencer le comptage de `DLG-1`, puis valider sans quantités
ni motif. Revenir au champ de quantité et taper `10` : **seul `1` est saisi**,
puis le focus revient à `.error-summary`. Ce comportement a été observé dans
l'écran réel et reproduit indépendamment avec le composant partagé.

Le callback `ref` de `ErrorSummary.tsx:108–110` est recréé à chaque rendu et
appelle `focus()` dès que `focusCycle > 0`. Les champs contrôlés de
`InventaireView.tsx:171–173` provoquent un rendu à chaque caractère. Le cycle
fondé sur la signature des erreurs peut également changer pendant la correction.

Le résumé doit reprendre le focus lors d'une soumission invalide explicite,
avec une référence stable ; les rendus et corrections de saisie doivent
conserver le focus du champ en cours.

Preuve : `manual.inventoryFocus` dans
[verification.json](screenshots/accessibility-review/verification.json),
[capture](screenshots/accessibility-review/inventaire-focus.png).

## A11Y-02 — Le tri des tableaux est inaccessible au clavier

Dans Clients, les sept en-têtes triables ont `tabIndex = -1` et ne contiennent
aucun bouton. Un parcours de 35 tabulations n'atteint aucun de ces contrôles.
Un clic sur « N° » change pourtant `aria-sort` de `none` à `ascending`.

`DataTable.tsx:105` attache `onClick` directement à `<th>`. `aria-sort` annonce
l'état du tri mais ne rend pas l'élément activable. Le même composant sert à
plusieurs vues métier et référentiels. Une reproduction indépendante avec deux
lignes B/A confirme que le clic trie les lignes et que Tab saute les en-têtes.

Placer un bouton natif dans chaque en-tête triable, garder `aria-sort` sur le
`th`, et vérifier Entrée/Espace sans ajouter un second déclenchement clavier
au bouton natif.

Preuves : `manual.tableSort`, `tableMouseSort` et `tableTabStops`.

## A11Y-03 — Le toast d'erreur est exclu de l'arbre d'accessibilité

Dans Stock, ouvrir « Modifier DLG-1 », vider Quantité puis Enregistrer.
Le dialogue reste ouvert et le DOM contient : « La quantité et le seuil doivent
être des entiers positifs ou nuls. » Le dialogue ne contient pas cette erreur.

L'arbre d'accessibilité Chromium retourne `ignored: true` pour la région du
toast, avec la raison **`activeModalDialog`**. `showModal()` rend l'extérieur
du dialogue inerte ; la live region de `Toast.tsx:54` se trouve justement à
l'extérieur. Le `role="status"` existant ne suffit donc pas dans ce parcours.
Dans Stock, la garde de `StockView.tsx:147` n'affiche que ce toast ; une valeur
vide convertie en `NaN` n'active pas non plus l'erreur inline `quantite < 0`.

Afficher l'erreur de validation dans le dialogue actif et l'associer au champ.
Les notifications qui doivent être lues avant la fermeture du dialogue doivent
se trouver dans son périmètre accessible. Le même patron est à vérifier pour
le refus d'une immatriculation dupliquée dans Véhicules, identifié statiquement.

Preuve : `manual.modalToast`,
[capture](screenshots/accessibility-review/stock-erreur-toast.png).

## A11Y-04 — Le menu mobile masque le focus

À 375 px, focaliser « Ouvrir le menu » puis appuyer sur Entrée. Le bouton
conserve le focus à `x=12, y=14,5`, taille `34 × 34 px`, derrière la barre
latérale opaque. Au centre du bouton, `elementFromPoint` retourne la marque
du panneau. La capture confirme que le bouton est entièrement recouvert.

Tab passe ensuite à « Notifications », hors de la navigation ouverte. Les liens
du panneau précèdent le déclencheur dans le DOM, et aucun transfert de focus
n'est effectué à l'ouverture. Échap ferme correctement le menu et restaure
le focus : ce comportement existant est à préserver.

À l'ouverture, déplacer le focus dans la navigation. Si le panneau est utilisé
comme une surface modale, rendre le contenu extérieur inerte et contenir le
focus ; préserver les chemins de fermeture et la restitution au déclencheur.

Preuve : `manual.mobileMenu`,
[capture](screenshots/accessibility-review/menu-mobile-focus.png).

## A11Y-05 — Les erreurs de référentiels perdent l'identité du champ

Dans Paramètres → Catégories → Ajouter, saisir 65 caractères dans Code et un
Libellé valide. L'alerte affiche : « Trop grand : chaîne de caractères doit
avoir <=64 caractères ». Elle ne précise pas « Code ». Aucun des champs ne
porte `aria-invalid` ; la description de Code contient seulement son aide
générale, sans mention de l'erreur ni de la limite.

`ReferentielEditor.tsx:29` concatène `issue.message` et perd `issue.path`, qui
identifie pourtant `code`. La même perte existe pour un libellé de plus de
128 caractères et pour certaines validations de `TurnstileForm.tsx:26`.

Conserver le chemin de l'erreur, nommer le champ dans le message global et
afficher une erreur associée au champ via les composants existants. Préciser
également les limites de longueur avant soumission.

Preuve : `manual.categoryValidation`,
[capture](screenshots/accessibility-review/categories-erreur.png).

## A11Y-06 — Les données du compte connecté manquent de finalité déclarée

Dans Utilisateurs, modifier le compte administrateur connecté. Les champs Nom,
Prénom, Email et Téléphone n'ont pas d'attribut `autocomplete` décrivant leur
finalité. `FormInput` ne propose actuellement pas cette propriété.

Ajouter les tokens `family-name`, `given-name`, `email` et `tel` pour les
informations de l'utilisateur lui-même. Ce constat ne s'étend pas aux fiches
de clients ou fournisseurs concernant d'autres personnes.

Preuve : `manual.selfEditPurpose`. La connexion utilise déjà `username` et
`current-password`, et le collage du mot de passe n'est pas bloqué.

## A11Y-07 — Le titre du document reste identique sur toutes les vues

Les 101 états observés conservent `document.title = "autostrass_app"`, alors
que les URLs et titres visibles changent entre Stock, Clients, Paramètres,
connexion, etc. Aucune mise à jour de `document.title` n'est présente dans les
sources. Les vues restent indiscernables dans les onglets et l'historique.

Définir un titre descriptif selon la route, par exemple « Stock — Autostrass »
ou « Clients — Autostrass », y compris pour la connexion et les erreurs 404.

## Améliorations complémentaires

Les trois règles automatiques ci-dessous sont étiquetées `best-practice` par
axe 4.14.0, sans tag WCAG. Leurs répétitions par thème ou largeur ne représentent
pas des défauts distincts ; elles ne sont pas comptées parmi les sept constats.

- `aria-allowed-role` : 52 états, `footer role="status"` dans `App.tsx:252`.
  Conserver le footer et placer la live region dans un élément interne adapté.
- `empty-table-header` : quatre états, colonne d'actions sans libellé dans
  Dashboard et Ventes comptoir. Nommer l'en-tête ; les actions des lignes ont
  déjà des noms accessibles.
- `heading-order` : six états, hiérarchie à harmoniser dans Stock et Emplacements.
  Les titres existent et sont descriptifs ; ce signal ne prouve pas à lui seul
  un échec WCAG 1.3.1 ou 2.4.6.

Deux anomalies du résumé méritent également une correction : à la connexion,
les erreurs sont des chaînes que `readMessage` rejette, donc le résumé n'est
jamais rendu ; les deux erreurs inline restent cependant présentes et annoncées.
Les liens d'erreurs de Caisse peuvent viser `#comptage` alors que les inputs
portent des identifiants `comptage.0.quantite`, etc. Ces anomalies ne sont pas
assimilées à une absence totale d'identification des erreurs.

## Vérifications et portée

- Chrome **157.0.8103.51**, axe-core **4.14.0**, compétence `accessibility` **2.0**.
- **101 scans** : 24 routes en clair/sombre, 22 dialogues en clair/sombre,
  connexion/erreurs et quatre vues à 320 px. Menu mobile à 375 px.
- Parcours clavier, arbre d'accessibilité CDP, focus après erreur, métadonnées
  de formulaires et quatre captures. Mode couleurs forcées émulé sur Clients.
- **14 couples de tokens par thème** calculés selon la luminance sRGB : tous
  satisfont leur seuil de 4,5:1 pour le texte normal ou 3:1 pour bordure/focus.
  Minima texte des couples contrôlés : 5,51:1 en clair, 6,86:1 en sombre.
  Bordures de champs : 3,25:1 et 4,47:1. Valeurs dans `manual.tokenContrast`.
- Aucune erreur JavaScript, aucun débordement global dans les quatre vues à
  320 px et **aucune écriture**, même simulée. Toutes les routes `/api` sont
  interceptées ; aucun serveur API ni accès MariaDB n'a été utilisé.
- `node --check` et lint conformes. Le code applicatif n'a pas été modifié.

Axe ne signale aucun échec étiqueté WCAG dans ces états, alors que les parcours
manuels révèlent les problèmes ci-dessus. Ses résultats incomplets comprennent
82 états de contraste, notamment des glyphes non textuels, et 46 états de rôle
ARIA. Les calculs de tokens ne remplacent pas la vérification de toutes les
combinaisons de fonds réelles.

L'arbre d'accessibilité a été inspecté, mais aucun test utilisateur NVDA,
VoiceOver ou TalkBack, zoom natif à 200 %, certificat/Turnstile réel ou terminal
Zebra n'a été réalisé. Les fixtures ne couvrent pas toutes les données,
transactions ou erreurs d'une installation réelle. Cette revue ne constitue
pas une déclaration de conformité WCAG complète.

## Reproduire

Le [script de revue](../scripts/review-accessibility-ui.mjs) utilise le build
courant (`npm run build` si les sources changent) et Chrome installé. Fournir
une copie officielle de `axe-core@4.14.0/axe.min.js` via `AXE_SOURCE`, ou dans
`.a11y-review.local/axe.min.js`, puis lancer `node scripts/review-accessibility-ui.mjs`.
Le paquet npm a été obtenu avec `npm pack axe-core@4.14.0 --ignore-scripts` ;
aucune dépendance npm applicative n'a été ajoutée.

Le JSON versionné conserve les états, règles et observations. Le résultat axe
complet reste local dans `.a11y-review.local/raw-results.json`, ignoré par Git,
afin de limiter les répétitions dans le dépôt. `A11Y_ONLY_DIALOGS` permet de
reprendre des dialogues ciblés à partir de ce résultat local.
