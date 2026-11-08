# Bibliothèque Figma Autostrass — découverte

Date : 2026-11-08. Exécution : `ds-autostrass-2026-11-08`.

Statut : **P0.a–P0.c, P0.e et P0.f réalisés ; P0.d attend l'approbation**. Le périmètre ci-dessous reste une proposition. Le fichier Design [Untitled](https://www.figma.com/design/UP7nQVTU4dlyfEiQdG2IYe) est créé et inspecté ; aucun composant, variable ou style créé.

## P0.a — Sources et tokens

La source des valeurs est [src/tokens.css](../../src/tokens.css), cohérente avec [MASTER.md](MASTER.md). Les composants utilisent [components.css](../../src/components.css), [forms.css](../../src/forms.css), [index.css](../../src/index.css) et [App.css](../../src/App.css).

**66 propriétés CSS** : 49 couleurs, 3 familles de polices, 7 espacements, 4 rayons et 3 niveaux d'ombre. **35 surcharges sombres** et **12 alias**. Une valeur identique dans les deux modes peut provenir de l'héritage de la déclaration claire ; les expressions `var(...)` restent des alias à résoudre dans chaque mode.

La syntaxe WEB devra conserver le nom CSS exact, avec le wrapper `var(...)`. Les noms des variables et collections Figma seront arrêtés après inspection des conventions du fichier cible.

| Token CSS | Clair / valeur de base | Sombre / valeur héritée | Source de base |
|---|---|---|---|
| `--color-primary` | `#1e40af` | `#a9c3ff` | [L5](../../src/tokens.css#L5) |
| `--color-primary-hover` | `#1e3a8a` | `#c7d8ff` | [L6](../../src/tokens.css#L6) |
| `--color-on-primary` | `#ffffff` | `#12264b` | [L7](../../src/tokens.css#L7) |
| `--color-secondary` | `#3b82f6` | `#3b82f6` | [L8](../../src/tokens.css#L8) |
| `--color-accent` | `#d97706` | `#fbbf24` | [L9](../../src/tokens.css#L9) |
| `--color-on-accent` | `#231700` | `#231700` | [L10](../../src/tokens.css#L10) |
| `--color-background` | `#f8fafc` | `#0d1729` | [L11](../../src/tokens.css#L11) |
| `--color-surface` | `#ffffff` | `#162338` | [L12](../../src/tokens.css#L12) |
| `--color-surface-sunken` | `#f1f5f9` | `#101c2e` | [L13](../../src/tokens.css#L13) |
| `--color-muted` | `#e9eef6` | `#24354e` | [L14](../../src/tokens.css#L14) |
| `--color-border` | `#dbe3ef` | `#344660` | [L15](../../src/tokens.css#L15) |
| `--color-border-strong` | `#8190a5` | `#758aa8` | [L16](../../src/tokens.css#L16) |
| `--color-ring` | `#1e40af` | `#a9c3ff` | [L17](../../src/tokens.css#L17) |
| `--color-overlay` | `rgb(15 23 42 / 55%)` | `rgb(2 6 23 / 72%)` | [L18](../../src/tokens.css#L18) |
| `--text-strong` | `#172b4d` | `#f0f5ff` | [L19](../../src/tokens.css#L19) |
| `--text-body` | `#334155` | `#d7e2f3` | [L20](../../src/tokens.css#L20) |
| `--text-muted` | `#526277` | `#b1c1d8` | [L21](../../src/tokens.css#L21) |
| `--text-faint` | `#5c6a7d` | `#a5b8d1` | [L22](../../src/tokens.css#L22) |
| `--color-sidebar` | `#12264b` | `#0a1426` | [L24](../../src/tokens.css#L24) |
| `--color-sidebar-hover` | `#1d3966` | `#1b3254` | [L25](../../src/tokens.css#L25) |
| `--color-sidebar-text` | `#cfdaec` | `#cfdaec` | [L26](../../src/tokens.css#L26) |
| `--color-sidebar-text-strong` | `#ffffff` | `#ffffff` | [L27](../../src/tokens.css#L27) |
| `--color-sidebar-muted` | `#a7bad8` | `#a7bad8` | [L28](../../src/tokens.css#L28) |
| `--color-sidebar-border` | `#365077` | `#324a6a` | [L29](../../src/tokens.css#L29) |
| `--color-sidebar-divider` | `#2b4265` | `#243b5b` | [L30](../../src/tokens.css#L30) |
| `--color-sidebar-ring` | `#fbbf24` | `#fbbf24` | [L31](../../src/tokens.css#L31) |
| `--status-success` | `#166534` | `#86efac` | [L33](../../src/tokens.css#L33) |
| `--status-success-bg` | `#ecf8f0` | `#183b2e` | [L34](../../src/tokens.css#L34) |
| `--status-warning` | `#92400e` | `#fcd68c` | [L35](../../src/tokens.css#L35) |
| `--status-warning-bg` | `#fff4dc` | `#3f301a` | [L36](../../src/tokens.css#L36) |
| `--status-info` | `#1e40af` | `#a9c3ff` | [L37](../../src/tokens.css#L37) |
| `--status-info-bg` | `#edf3ff` | `#223659` | [L38](../../src/tokens.css#L38) |
| `--status-danger` | `#b91c1c` | `#fda4af` | [L39](../../src/tokens.css#L39) |
| `--status-danger-hover` | `#991b1b` | `#fecdd3` | [L40](../../src/tokens.css#L40) |
| `--status-danger-bg` | `#fff1f2` | `#442632` | [L41](../../src/tokens.css#L41) |
| `--status-danger-border` | `#efadb5` | `#9f5a68` | [L42](../../src/tokens.css#L42) |
| `--status-neutral` | `#526277` | `#b1c1d8` | [L43](../../src/tokens.css#L43) |
| `--font-sans` | `'Fira Sans', 'Segoe UI', system-ui, sans-serif` | `'Fira Sans', 'Segoe UI', system-ui, sans-serif` | [L45](../../src/tokens.css#L45) |
| `--font-mono` | `'Fira Code', ui-monospace, Consolas, monospace` | `'Fira Code', ui-monospace, Consolas, monospace` | [L46](../../src/tokens.css#L46) |
| `--font-display` | `var(--font-mono)` | `var(--font-mono)` | [L47](../../src/tokens.css#L47) |
| `--space-xs` | `2px` | `2px` | [L48](../../src/tokens.css#L48) |
| `--space-sm` | `4px` | `4px` | [L49](../../src/tokens.css#L49) |
| `--space-md` | `8px` | `8px` | [L50](../../src/tokens.css#L50) |
| `--space-lg` | `12px` | `12px` | [L51](../../src/tokens.css#L51) |
| `--space-xl` | `16px` | `16px` | [L52](../../src/tokens.css#L52) |
| `--space-2xl` | `24px` | `24px` | [L53](../../src/tokens.css#L53) |
| `--space-3xl` | `32px` | `32px` | [L54](../../src/tokens.css#L54) |
| `--radius-sm` | `6px` | `6px` | [L55](../../src/tokens.css#L55) |
| `--radius-md` | `10px` | `10px` | [L56](../../src/tokens.css#L56) |
| `--radius-lg` | `14px` | `14px` | [L57](../../src/tokens.css#L57) |
| `--radius-pill` | `999px` | `999px` | [L58](../../src/tokens.css#L58) |
| `--shadow-sm` | `0 1px 3px rgb(15 23 42 / 4%)` | `0 1px 3px rgb(0 0 0 / 12%)` | [L59](../../src/tokens.css#L59) |
| `--shadow-md` | `0 4px 16px rgb(15 23 42 / 7%)` | `0 4px 16px rgb(0 0 0 / 18%)` | [L60](../../src/tokens.css#L60) |
| `--shadow-lg` | `0 16px 48px rgb(15 23 42 / 18%)` | `0 16px 48px rgb(0 0 0 / 40%)` | [L61](../../src/tokens.css#L61) |
| `--color-foreground` | `var(--text-strong)` | `var(--text-strong)` | [L64](../../src/tokens.css#L64) |
| `--color-card` | `var(--color-surface)` | `var(--color-surface)` | [L65](../../src/tokens.css#L65) |
| `--color-card-foreground` | `var(--text-strong)` | `var(--text-strong)` | [L66](../../src/tokens.css#L66) |
| `--color-muted-foreground` | `var(--text-muted)` | `var(--text-muted)` | [L67](../../src/tokens.css#L67) |
| `--color-destructive` | `var(--status-danger)` | `var(--status-danger)` | [L68](../../src/tokens.css#L68) |
| `--color-on-destructive` | `#ffffff` | `#421320` | [L69](../../src/tokens.css#L69) |
| `--text-on-dark` | `var(--color-sidebar-text)` | `var(--color-sidebar-text)` | [L70](../../src/tokens.css#L70) |
| `--accent-blue` | `var(--color-primary)` | `var(--color-primary)` | [L71](../../src/tokens.css#L71) |
| `--accent-coral` | `var(--color-accent)` | `var(--color-accent)` | [L72](../../src/tokens.css#L72) |
| `--accent-yellow` | `var(--color-accent)` | `var(--color-accent)` | [L73](../../src/tokens.css#L73) |
| `--accent-green` | `var(--status-success)` | `var(--status-success)` | [L74](../../src/tokens.css#L74) |
| `--accent-coral-soft` | `var(--status-warning-bg)` | `var(--status-warning-bg)` | [L75](../../src/tokens.css#L75) |

Les ombres deviennent des styles d'effet : trois niveaux, chacun avec une définition claire et sombre. Elles ne doivent pas devenir des variables de type texte. Les 63 autres tokens sont des candidats à la création de variables ; leur architecture primitive/sémantique dépendra de l'existant Figma. Aucun nom CSS de primitive inexistant dans le code ne doit être inventé.

## P0.a — Composants et conventions

React utilise PascalCase, les classes CSS kebab-case. Les variantes proposées doivent représenter les propriétés et états effectivement présents dans le code. Le catalogue initial envisagé contient **16 familles**, à confirmer en P0.d ; chaque composant sera construit et validé séparément, en commençant par ses dépendances.

| Famille proposée | Source | Propriétés / états observés |
|---|---|---|
| Icon | `src/components/Icon.tsx` | 27 tracés SVG sur une grille 24 × 24 ; tailles sm=14, md=16, lg=20, xl=24 ; titre optionnel. Prévoir des composants interchangeables pour les icônes imbriquées. |
| Button | `src/components.css:2` | Classes primary, secondary, danger et link ; survol et focus ; désactivation explicitement stylée pour ces quatre classes ; variante small propre à secondary et dimensions compactes propres à link. |
| IconButton | `src/components.css:31` | Boutons d'action, icône et suppression ; états survol/focus ; désactivation explicitement stylée pour action-btn ; géométrie par classe à préserver. |
| FilterTab | `src/components.css:25` | Défaut, survol, focus, active ; ne pas inventer de style disabled dédié, absent de la règle d'opacité. |
| FormInput | `src/components/forms/FormFields.tsx` | Label, valeur, placeholder, required, hint, error, readOnly, type/inputMode ; aucun prop disabled explicite sur ce wrapper. Le CSS commun définit aussi un état disabled pour les champs natifs. |
| FormSelect | `src/components/forms/FormFields.tsx` | Label, options, placeholder nullable, required, hint, error ; saisie contrôlée ou RHF. |
| FormTextarea | `src/components/forms/FormFields.tsx` | Label, texte, placeholder, required, hint, error, rows ; hauteur minimale 96 px. |
| FormCheckbox | `src/components/forms/FormFields.tsx` | Label, defaultChecked, hint, error et enregistrement RHF ; contrôle natif dont le rendu doit être vérifié avant création. |
| Badge | `src/components.css:91` | Classes de statut, type, rôle, emplacement et mode local ; tons neutre/succès/info/erreur/avertissement ; géométrie différente pour les emplacements. |
| ResourceBanners | `src/components/ResourceBanners.tsx` | error, offline, readOnly, resource ; messages conditionnels et rôles alert/status/note. |
| ErrorSummary | `src/components/forms/ErrorSummary.tsx` | Liste d'erreurs, labels et ordre ; titre au singulier/pluriel ; liens vers les champs et focus programmé. |
| Toast | `src/components/Toast.tsx`, `toastContext.ts` | success/error/info, message, fermeture ; maximum 3 notifications ; délai 5 s et suspension au survol à documenter. |
| EditableCard | `src/components/ResourceBanners.tsx` | title, children, canEdit, readOnly ; le mode sans droits affiche un bandeau au lieu de la carte. |
| ConfirmDialog | `src/components/ConfirmDialog.tsx` | title, message, confirmLabel, cancelLabel, destructive, open ; Échap, focus piégé et restauré, annulation initialement focalisée. |
| DataTable | `src/components/DataTable.tsx` | Chargement, vide, données ; tri none/asc/desc ; alignements ; ligne active ; contenu de colonnes configurable. |
| PageLayout | `src/components/PageLayout.tsx` | eyebrow, title, description optionnelle, actions optionnelles et children ; un h1 par vue, retour au dashboard. |

Les éléments proches devront être regroupés ou décomposés selon leurs matrices : jamais plus de 30 combinaisons dans un ensemble sans décomposition. Les icônes imbriquées utiliseront INSTANCE_SWAP, leur présence BOOLEAN, et les libellés TEXT. La présence de propriétés de contenu dans React ne signifie pas que chaque propriété doit devenir une variante.

## P0.a — Typographie et dimensions à préserver

Fira Sans pour le corps et Fira Code pour les titres et références. Le CSS n'expose pas de tokens de taille/poids/interligne : les styles de texte seront extraits des sélecteurs exacts, avec les polices réellement disponibles dans Figma.

| Usage observé | Valeur / source |
|---|---|
| Corps | 14 px, interligne 1,5 — `src/index.css:5` |
| Titre de page | `clamp(22px, 2.2vw, 30px)`, poids 600, approche −0,7 px — `src/App.css:131` ; documenter le comportement responsive, sans choisir une taille arbitraire. |
| Titre de carte | Fira Code, 17 px, poids 500 — `src/forms.css:11` |
| Titre de dialogue | Fira Code, 20 px, poids 500 — `src/forms.css:66` |
| Libellé de champ | Fira Sans, 12 px, poids 500 — `src/forms.css:23` |
| Texte de saisie | 14 px ; 16 px à 768 px et moins — `src/forms.css:25` |
| Bouton standard | 13 px, poids 500, interligne 1,4 — `src/components.css:2` |
| Badge | 11 px, poids 500, interligne 1,4 — `src/components.css:91` |
| En-tête de tableau | 10 px, poids 600, approche 0,6 px — `src/components.css:71` |

Certaines dimensions de composants sont littérales : bouton 9 × 16 px de padding et 40 px de hauteur minimale, champ 10 × 12 px et 42 px, dialogue 28 px de padding puis 22/20 px selon la largeur. Ces valeurs ne correspondent pas toutes aux tokens d'espacement existants. P0.d devra arrêter une solution pour les liaisons Figma sans arrondir ni modifier silencieusement le code. Sur pointeur grossier, les classes visées par `@media (pointer: coarse)` passent à 44 px minimum ; le focus commun utilise un contour de 3 px avec un décalage de 3 px.

## P0.b–P0.f — Découverte distante et périmètre proposé

| Étape | Travail restant / critère |
|---|---|
| P0.b | Réalisé : fichier `UP7nQVTU4dlyfEiQdG2IYe`, une page `Page 1` (`0:1`) vide, aucun objet local. Fira Sans et Fira Code disponibles. |
| P0.c | Réalisé : neuf bibliothèques ajoutées, aucune autre à ajouter, pagination terminée ; 22 recherches traitées dans trois bibliothèques pertinentes. Rechercher de nouveau chaque composant avant création. |
| P0.d | Proposition ci-dessous à approuver : ensemble exact des 66 tokens de la table, 12 styles de texte et les 16 familles recensées. Architecture des primitives et dimensions littérales explicitées. |
| P0.e | Réalisé pour le fichier cible : aucun conflit local, car aucune variable, aucun style et aucun composant existant. Compatibilité des candidats distants non établie. |
| P0.f | Code uniquement : les 66 tokens et 16 familles. Figma uniquement dans le fichier cible : la page vide. Aucun conflit local à résoudre ; les candidats de bibliothèques restent distincts des objets locaux. |

La bibliothèque d'équipe, Material 3 Design Kit et Simple Design System ont été recherchées. Les six bibliothèques Apple listées concernent d'autres plateformes et ne font pas partie de ce périmètre web. Le serveur limite un lot à 20 requêtes : les deux requêtes de styles non traitées dans le premier lot ont été exécutées dans un second lot. Les preuves et clés exactes sont conservées dans [figma-discovery.json](figma-discovery.json).

| Recherche | Résultat et implication |
|---|---|
| Icon, Button | 20 candidats chacun, dont les boutons et boutons à icône Material 3/Simple Design System ; la recherche Icon n'a pas fourni les 27 tracés Autostrass. Ne pas assimiler pertinence de recherche et compatibilité. |
| Badge | Sept candidats, dont les badges de notification Material 3 ; usage distinct des étiquettes métier Autostrass. |
| Les 13 autres familles | Aucun résultat pour les noms recherchés ; cela ne constitue pas un inventaire exhaustif des équivalents. Aucun autre terme tenté après résultat vide. |
| Couleur primaire, surface | 20 candidats Material 3 chacun, avec une taxonomie M3 et certains scopes ALL_SCOPES ; aucune valeur Autostrass vérifiée ou importée. |
| Espacements | Aucun résultat pour cette recherche. |
| Corps, titre, ombres | 16, un et 20 candidats. Le style Body de la bibliothèque d'équipe est identifié ; polices, dimensions et valeurs des styles distants non inspectées. Certaines réponses « shadow » sont des styles FILL, et non des ombres EFFECT. |

**Proposition v1 à approuver — valeurs du code conservées.** Les noms Figma des variables reprennent le nom CSS sans `--`, avec `/` à la place des tirets : par exemple `--color-primary` → `color/primary`, `--space-xs` → `space/xs`. La syntaxe WEB reste exactement `var(--nom-css)`.

| Collection proposée | Variables et modes |
|---|---|
| Color | Les 49 tokens de couleur de la table, modes Light/Dark ; préserver les 11 alias de couleur et les valeurs héritées. |
| Dimensions | Les sept tokens `--space-*` et quatre `--radius-*`, un mode Value ; scopes GAP et CORNER_RADIUS respectivement. |
| Typography | Les trois `--font-*`, un mode Value ; Fira Sans/Fira Code, alias font/display → font/mono, scope FONT_FAMILY. |

Cette proposition représente **63 variables**, sans ajouter de primitives absentes du CSS. Une architecture Figma séparant primitives et sémantique ajouterait **59 couleurs brutes distinctes**, soit **122 variables** au total. Ces primitives n'ont pas de nom CSS propre : leur syntaxe de code nécessite une convention explicite, sans inventer de `--color-*` dans l'application. Le choix entre ces architectures fait partie de P0.d ; aucune des deux n'a été créée.

Les trois tokens d'ombre deviennent six styles d'effet : `Shadow/Light/{sm,md,lg}` et `Shadow/Dark/{sm,md,lg}`. Les styles de texte proposés sont `Body`, `Heading/Page/Min`, `Heading/Page/Max`, `Heading/Card`, `Heading/Dialog`, `Field/Label`, `Field/Input/Desktop`, `Field/Input/Mobile`, `Button/Standard`, `Button/Compact`, `Badge` et `Table/Header`. Ils représentent les neuf usages recensés, avec les deux bornes du titre responsive et les tailles mobile/compacte séparées ; le `clamp()` intermédiaire reste documenté, sans taille arbitraire.

Les 16 familles sont exactement celles de la table P0.a, construites dans l'ordre de leurs dépendances. Les dimensions littérales resteront exactes et documentées, sans arrondi vers un token voisin ; la géométrie fixe et la matrice de chaque famille seront vérifiées avant sa création. Les propriétés de contenu ne deviennent pas des variantes. Les candidats distants devront être inspectés avant tout choix d'import/réutilisation ; aucune compatibilité ni décision de remplacement n'est affirmée à ce stade.

Les couleurs et valeurs de modes viennent du code ; les conventions d'organisation Figma seront respectées lorsqu'elles auront été inspectées. La police native des champs et cases, les tailles responsives et les états visuels devront être vérifiés, sans substitution silencieuse.

## Reprise et vérifications

État local persistant : `%TEMP%/design-system-state-ds-autostrass-2026-11-08.json`. Il contient les 66 tokens avec leurs lignes, alias et valeurs sombres, les empreintes SHA-256 des sources consultées, le fichier cible, la page `0:1` et les décisions P0.d en attente. Le registre des composants, variables et styles est vide. Relire cet état à la reprise et refaire une inspection Figma avant toute création.

**Reprise du 8 novembre après compaction.** Les 15 empreintes SHA-256 correspondent aux sources actuelles ; recomptage de `src/tokens.css` : 66 tokens de base, 35 surcharges sombres et 12 alias. Fichier cible et page enregistrés ; aucun composant créé.

Le plugin Figma 2.0.20 est installé et activé. Après le diagnostic CLI initial `not_logged_in`, les outils sont devenus accessibles dans la session et `whoami` a confirmé la connexion effective. Le connecteur est confirmé connecté par l'utilisateur. La tentative OAuth CLI encore en attente a été arrêtée ; aucun secret ni lien OAuth temporaire conservé dans le dépôt.

Le fichier Design `Untitled` est créé dans le plan unique retourné par `whoami`. Session MCP de la découverte : `c0f4f118-6a6b-48c7-ab25-f662c95181cd`. À la reprise, ouvrir une session puis revérifier le fichier en lecture seule avant création ; `get_libraries` précède toujours `search_design_system`.

Graphify : voir les métriques de la dernière vérification dans [passation.md](../../passation.md#graphify-et-dernière-intervention). Les sources applicatives sont inchangées. Limites existantes : CSS non indexé et analyse sémantique documentaire non relancée.

La phase 0 reste ouverte. Les phases 1 à 4 ne démarrent qu'après validation de la découverte et accord explicite sur le périmètre, conformément au skill invoqué.
