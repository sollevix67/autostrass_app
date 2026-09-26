# Passation — Autostrass App

> État du projet au 2026-09-26 — **Semaines 1, 2 et 3 (backend) terminées**.
> Build ✅, lint ✅ 0 warning, **69/69 tests API** ✅, parcours de connexion
> et vue Clients validés au navigateur.

---

## 1. Objectif

Construire une application de gestion de dépôt automobile (stock, réceptions, ventes comptoir, commandes clients, livraisons, retours, clients, véhicules, utilisateurs) avec :
- **Frontend** : React 19 + TypeScript + Vite + React Router v7
- **Backend** : Express 5 + MariaDB (mysql2)
- **Architecture** : Monorepo, types partagés, API REST typée

**Cible** : Déploiement en production avec authentification, persistance réelle, tests, observabilité.

---

## 2. Avancées de la semaine 1

### ✅ 1. Client HTTP centralisé — `src/services/api.ts`
- Base URL configurable (`VITE_API_BASE_URL`, défaut `/api`)
- `ApiError` typé (`status`, `code`, `details`, `userMessage` lisible par l'utilisateur)
- Support `AbortSignal` partout (annulation au démontage / refresh concurrent)
- Méthodes `get` / `post` / `put` / `patch` / `delete` + gestion `204` et corps non-JSON
- Helpers `toErrorMessage()` et `isAbortError()`

### ✅ 2. Module de résilience — `src/services/resilience.ts`
- `isApiUnavailable()` : distingue *API absente* (0, 404, 502, 503, 504, `TypeError`) d'*erreur métier* (422, 409…)
- Permet le **mode dégradé local** : l'UI reste utilisable si MariaDB est coupée

### ✅ 3. Hooks métier

| Fichier | Responsabilité |
|---------|----------------|
| `src/hooks/useDashboard.ts` | Fetch dashboard, normalisation des 2 formats de payload, polling 60 s, `lastUpdated`, `refresh()` |
| `src/hooks/useCatalogue.ts` | CRUD articles, ajustement optimiste, seed de démonstration, bascule mode local |
| `src/hooks/useStock.ts` | Chargement `/api/stock`, filtres (all/low/ok), recherche, tri triable, édition modale, métriques mémoïsées |

### ✅ 4. Clés React stables
- `src/utils/ids.ts` : `createLineId()` (UUID) et `nextId()` (séquentiel)
- `key={index}` → `key={lineId}` dans `ReceptionsView` et `VentesComptoirView`
- Champ `lineId` ajouté aux types `Reception['articles']` et `Vente['articles']`

### ✅ 5. Zéro cast `as` non vérifié dans les vues
- `src/utils/coerce.ts` : `pickEnum()` (narrowing sûr pour `<select>`) et `toNumber()`
- Drafts entièrement typés (`Required<Omit<T, 'id'>>`) dans les 8 vues restantes
- Constantes `as const` + `satisfies` pour figer les unions discriminées

### ✅ 6. Backend : endpoints articles + stock

| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/health` | GET | État API + base |
| `/api/dashboard` | GET | Agrégats + stock bas + activité (mouvements) |
| `/api/articles` | GET/POST | Liste / création |
| `/api/articles/:reference` | GET/PUT/DELETE | Lecture / mise à jour / suppression |
| `/api/articles/:reference/quantite` | PATCH | Ajustement de quantité (borné à 0) + journal de mouvement |
| `/api/stock` | GET | Même forme que le catalogue |

- `server/repositories/articleRepository.ts` : transactions, `FOR UPDATE` sur ajustement, `ER_DUP_ENTRY` → 409
- `server/middleware/validation.ts` : validation sans dépendance (longueurs, NaN, négatifs) → 422
- `database/schema.sql` : `articles`, `stock_balances`, `stock_movements`, vue `v_stock`, seed démo

### ✅ 7. Semaine 2 — Formulaires & Factorisation

**Dépendances** : `react-hook-form`, `zod`, `@hookform/resolvers`

| Fichier | Rôle |
|---------|------|
| `src/schemas/index.ts` | 8 schémas Zod (article, réception, client, véhicule, utilisateur, livraison, panier) + messages utilisateur en français |
| `src/components/forms/ErrorSummary.tsx` | Résumé d'erreurs focusable et lié aux champs |
| `src/components/PageLayout.tsx` | Structure commune : eyebrow + titre + description + actions |
| `src/components/DataTable.tsx` | Tableau générique triable (`aria-sort`, 3e clic = tri naturel) |
| `src/components/ConfirmDialog.tsx` | Dialogue accessible remplace `window.confirm` |
| `src/components/useConfirm.ts` | Hook d'état du dialogue |
| `src/components/Toast.tsx` + `toastContext.ts` + `useToast.ts` | Notifications éphémères (`role="status"`, `aria-live="polite"`) |
| `src/components/forms/FormFields.tsx` | Champs réécrits : double mode (contrôlé / RHF), `aria-invalid`, `aria-describedby`, `valueAsNumber` |

**Vues pilotes refactorées** : `CatalogueView`, `StockView`, `ReceptionsView` (avec `useFieldArray`).

**Guidelines ui-ux-pro-max appliquées** :
- *Focusable Error Summary* (High) : `role="alert"` + `tabIndex={-1}` + liens ancres `#nomDuChamp`, focus posé à la première apparition
- *Error Placement* (High) : chaque erreur inline reliée à son champ par `aria-describedby`
- *Error Messages* (High) : `role="alert"` sur les erreurs
- *Data-Dense Dashboard* : profilage des vues tableau
- *Compact Control Semantics* (Critical) : `aria-pressed` sur les onglets de filtre

### ✅ 8. Nettoyage
- `src/App_new.tsx` supprimé (doublon à l'origine du bug TS2440)
- `src/main.tsx` pointe désormais sur `./App`
- Alertes `alert()` bloquantes remplacées par feedback inline et toasts
- Formatage monétaire FR homogénéisé (`Intl.NumberFormat`)
- Hiérarchie des titres : un seul `<h1>` par page (shell global), titres de vue en `<h2>`

### ✅ 9. Semaine 3 (partie 1) — Checklist UX(ui-ux-pro-max) terminée

| Element | Realisation |
|---------|-------------|
| `src/components/Icon.tsx` | Jeu d'icones SVG inline (25 icones), `currentColor`, `aria-hidden` quand decoratif. Remplace tous les emojis. |
| `src/tokens.css` | Tokens centralisés : palette, typo, espacement 2→32 px, rayons, ombres. |
| `src/index.css` | Import Fira Sans + Fira Code, police de base sur les tokens. |
| `src/App.css` | `Georgia`/`monospace` remplacés par les tokens, breakpoints alignés sur **375 / 768 / 1024 / 1440**, styles manquants pour `.action-btn` / `.secondary-button` / `.form-success`. |

> Un emoji n'a pas de rendu fiable : il change selon la police du systeme et
> s'affiche en couleur sur Windows. `Icon` est un SVG qui herite de la
> couleur du texte et reste invisible au lecteur d'écran s'il est décoratif.

### ✅ 10. Semaine 3 (partie 2) — Backend : Drizzle, migrations, API REST, JWT

**Dépendances** : `drizzle-orm`, `drizzle-kit`, `jose`, `bcryptjs`

| Fichier | Role |
|---------|------|
| `server/db/schema.ts` | 12 tables Drizzle (8 metiers + tables de lignes), contraintes uniques, index, relations |
| `server/db/client.ts` | Pool MariaDB + instance Drizzle, `null` si `DB_*` absent |
| `drizzle.config.ts` | Config `drizzle-kit` (dialecte MySQL/MariaDB) |
| `server/repositories/mapping.ts` | `toNumber` (DECIMAL → `number`), `toDateString` (DATE sans décalage), `toHttpError` (déballage de `DrizzleQueryError`) |
| `server/repositories/simpleRepositories.ts` | `SimpleRepository` : CRUD générique + `RepositoryError` |
| `server/repositories/referentielRepositories.ts` | Clients (numéro de dossier dérivé de l'id) et vehicules |
| `server/repositories/utilisateurRepository.ts` | Isolé : `password_hash` ne sort jamais |
| `server/repositories/documentRepositories.ts` | Réceptions, ventes, commandes, retours (entête + lignes en transaction) |
| `server/repositories/livraisonRepository.ts` | Livraisons (sans lignes) |
| `server/middleware/auth.ts` | JWT HS256, `requireAuth`, `requireRole` |
| `server/middleware/schemas.ts` | 8 schemas Zod, messages utilisateur en français |
| `server/middleware/crud.ts` | Fabrique CRUD + `errorHandler` global |
| `server/middleware/documentRoutes.ts` | Routes CRUD de documents (avec `/:id/lignes`) |
| `server/middleware/resourceRoutes.ts` | Montage des 8 metiers + RBAC |
| `server/middleware/authRoutes.ts` | `/api/auth/login`, `/logout`, `/me` |
| `scripts/seed.ts` | Applique `database/seed_v2.sql` instruction par instruction |
| `scripts/test-api.ts` | **69 assertions** de bout en bout |
| `scripts/verify-repositories.ts` | Lecture de la base réelle par repository |

**Migrations** (`database/drizzle/`) :
- `0000_faithful_sway.sql` — 12 tables + FK + index
- `0001_timestamps_defaults.sql` — `DEFAULT CURRENT_TIMESTAMP` sur `created_at` / `updated_at`

#### 🔐 Authentification et RBAC

| Role | Lecture | Ecriture depot (clients, vehicules, receptions) | Caisse (ventes, commandes, livraisons, retours) | Utilisateurs |
|------|---------|------------------|------------------|--------------|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `magasinier` | ✅ | ✅ | ❌ | ❌ |
| `caissier` | ✅ | ❌ | ✅ | ❌ |

- Jeton HS256 12 h, renvoyé dans le corps **et** dans un cookie `httpOnly` / `sameSite=lax`
- `JWT_SECRET` refusé s'il fait moins de 32 caractères
- Le compte est relu en base à **chaque** requête : désactiver un utilisateur invalide ses jetons sans attendre l'expiration
- Message identique pour « email inconnu » et « mot de passe erroné » (pas d'énumération de comptes)
- Un administrateur ne peut ni se supprimer, ni se désactiver, ni se retirer ses propres droits (409 `SELF_LOCKOUT`)
- `password_hash` n'apparaît dans aucune réponse (vérifié par assertion)

#### Frontend connecté

| Fichier | Rôle |
|---------|------|
| `src/services/api.ts` | Envoi du jeton `Bearer`, messages d'erreur 401/403/409/422 |
| `src/components/authContext.ts` / `AuthProvider.tsx` / `useAuth.ts` | Session restaurée via `GET /auth/me`, états `checking` / `authenticated` / `anonymous` |
| `src/views/LoginView.tsx` + `src/auth.css` | Écran de connexion accessible + rappel des comptes de démo |
| `src/hooks/useResource.ts` | CRUD générique (annulation, mode dégradé, tri) |
| `src/services/contracts.ts` | Formes des payloads API |
| `src/views/ClientsView.tsx` | Vue pilote branchée sur l'API (RHF + Zod + DataTable + ConfirmDialog) |

> **Choix de sécurité** : le jeton n'est pas écrit dans `localStorage`. Il est
> tenu en mémoire par le module et le cookie `httpOnly` fait le reste. Un jeton
> dans `localStorage` est lisible par n'importe quel script injecté.

---

## 3. Fichiers importants

| Fichier | Rôle | État |
|---------|------|------|
| `src/services/api.ts` | Client HTTP typé + `ApiError` | ✅ |
| `src/services/resilience.ts` | Détection API indisponible | ✅ |
| `src/hooks/useDashboard.ts` | Dashboard + polling | ✅ |
| `src/hooks/useCatalogue.ts` | CRUD articles | ✅ |
| `src/hooks/useStock.ts` | Table stock + filtres + tri | ✅ |
| `src/utils/ids.ts` | `createLineId`, `nextId` | ✅ |
| `src/utils/coerce.ts` | `pickEnum`, `toNumber` | ✅ |
| `src/types/index.ts` | **Source of truth** — types métier | ✅ |
| `src/App.tsx` | Routing, layout, statut connexion | ✅ |
| `src/views/CatalogueView.tsx` | CRUD complet + mode local | ✅ || `src/views/ClientsView.tsx` | **Pilote branché API** : RHF + Zod + DataTable + ConfirmDialog + RBAC | ✅ |
| `src/views/StockView.tsx` | Filtres, recherche, tri, modale — données locales | ✅ |
| `src/views/VentesComptoirView.tsx` | Panier, paiement, monnaie — données locales | ✅ |
| `src/views/ReceptionsView.tsx` | Lignes dynamiques (clés stables) — données locales | ✅ |
| `src/views/VehiculesView.tsx` | Parc véhicules typé — données locales | ⚠️ à migrer |
| `src/views/UtilisateursView.tsx` | Rôles, activation — données locales | ⚠️ à migrer |
| `src/views/CommandesClientsView.tsx` | Statuts via `pickEnum` — données locales | ⚠️ à migrer |
| `src/views/LivraisonsView.tsx` | Statuts éditables inline — données locales | ⚠️ à migrer |
| `src/views/RetoursView.tsx` | Retours + remboursement — données locales | ⚠️ à migrer |
| `src/components/Icon.tsx` | Jeu d'icônes SVG (remplace les emojis) | ✅ |
| `src/tokens.css` | Tokens de design (palette, typo, espacement) | ✅ |
| `src/hooks/useResource.ts` | CRUD générique sur l'API | ✅ |
| `src/services/contracts.ts` | Formes des payloads API | ✅ |
| `src/components/AuthProvider.tsx` | Session, connexion, déconnexion | ✅ |
| `src/views/LoginView.tsx` | Écran de connexion | ✅ |
| `server/db/schema.ts` | Schéma Drizzle des 12 tables | ✅ |
| `server/repositories/articleRepository.ts` | Accès MariaDB transactions (v1) | ✅ |
| `server/middleware/validation.ts` | Validation 422 (v1) | ✅ |
| `server/middleware/auth.ts` | JWT + `requireRole` | ✅ |
| `server/middleware/resourceRoutes.ts` | Routes des 8 métiers + RBAC | ✅ |
| `database/schema.sql` | Schéma v1 + seed | ✅ |
| `database/migrate_v1.sql` | Migration v0.1 → v1 (préserve les données) | ✅ |
| `database/drizzle/0000_*.sql` | Migration v2 : 12 tables | ✅ |
| `database/drizzle/0001_*.sql` | Timestamps `DEFAULT CURRENT_TIMESTAMP` | ✅ |
| `database/seed_v2.sql` | Jeu de démonstration v2 (idempotent) | ✅ |
| `server/index.ts` | Routes Express | ✅ |

---

## 4. Leçons retenues (Semaine 1)

| Piège | Leçon |
|-------|-------|
| Réactiver le mode local sur `status === 404` seulement | L'API renvoie **503** quand la base est absente : tester toute la famille (0, 404, 502, 503, 504) via `isApiUnavailable()` |
| `isEditing = draft.reference.length > 0` | Passer en mode édition dès qu'on tape une référence. Utiliser un **flag explicite** `editingReference` |
| `Partial<T>` pour les drafts de formulaire | Oblige à `|| ''` et `as` partout. Préférer un draft **complet** + `Required<Omit<T, 'id'>>` |
| `setState` synchrone dans `useEffect` | Provoque un rendu en cascade (warning oxlint). Déplacer dans le callback de `reload()` |
| `<label>` vide pour un `<select>` en ligne | `FormSelect` accepte désormais `label=""` + `aria-label` |
| Casts `'x' as UnionType` dans un objet littéral | Utiliser `const DEFAULT_X: XType = 'x'` puis `satisfies` — le compilateur vérifie la valeur |
| `register` de RHF passé directement à un composant générique | `UseFormRegister<T>` est **contravariant** sur le nom de champ : un composant déclarant `(name: string)` refuse l'instance typée. Élargir côté vue (`register as unknown as FieldRegister`) et garder le composant réutilisable |
| Champs `type="number"` + Zod `z.number()` | RHF renvoie une **chaîne** par défaut → validation « champ requis » alors que le champ est rempli. Passer `{ valueAsNumber: true }` en 2e argument de `register` |
| `containerRef.current?.focus()` dans un `useEffect` | React réattribue le focus au bouton déclencheur après l'effet. Solution retenue : `ref` callback sur un nœud rendu conditionnellement + `key` incrémenté par cycle d'erreurs |
| `setState` synchrone dans un effet de composant | Warning oxlint `react(set-state-in-effect)`. Utiliser une `ref` de signature pour détecter un nouveau cycle sans état |
| Fichiers `.tsx` exportant hooks **et** composants | `react(only-export-components)` casse le fast refresh. Séparer : `Toast.tsx` (composant) / `toastContext.ts` (types) / `useToast.ts` (hook). Même règle pour l'auth : `AuthProvider.tsx` / `authContext.ts` / `useAuth.ts` |
| `UseFormRegister<T>` de RHF passé tel quel | Réflexion : le composant générique `FormInput` déclare `(name: string)`, l'instance typée est **contravariante**. Élargir côté vue : `register as unknown as FieldRegister` |
| `node bcrypt` (natif) | Son script d'installation `node-gyp` est bloqué par la politique npm de ce poste. Utiliser `bcryptjs` (JavaScript pur) |
| Alias SQL `AS references` | `references` est un **mot-clé réservé** en MariaDB : la requête échoue silencieusement côté 503. Utiliser `total_references` |
| Colonne `unit_price_ht` lue depuis `v_stock` | La vue l'expose sous **`prix_unitaire_ht`** (alias explicite dans le `CREATE VIEW`) |
| `JSON_ARRAYAGG` pour filtrer le stock bas | MariaDB ne supporte pas de `FILTER` : agréger tout puis filtrer côté TypeScript (moins coûteux qu'une sous-requête corrélée) |
| `ALTER TABLE ... MODIFY COLUMN` pour recoder un ENUM | Valeurs existantes hors du nouvel ENUM = data loss. Passer par une table tampon + `RENAME TABLE` |
| `router.use('/x', sub)` | Renvoie le **routeur parent**, pas `sub`. Passer la valeur à une fabrique de routes enregistre les routes à la racine → 400 « Identifiant invalide » sur `GET /api/clients` |
| Route enregistrée 2 fois sur la même URL | La **première** sertie l'emporte. Un garde-fou ajouté « après » une route générique est contourné → écrire explicitement les routes sensibles |
| Fabrique CRUD sans RBAC | Toute écriture passait pour tout utilisateur authentifié. `rolesWrite` est désormais **obligatoire** dans `crudRoutes` |
| `DrizzleQueryError` masquant le code SQL | Le vrai code mysql2 est dans `.cause`. Sans déballage, `ER_NO_REFERENCED_ROW_2` répond 500 au lieu de 422 |
| `defaultNow()` en Drizzle 0.45 | Émet `DEFAULT (now())`, que le dialecte MariaDB de `drizzle-kit` **abandonne** → colonnes sans défaut, `created_at` toujours `NULL`. Écrire `.default(sql\`CURRENT_TIMESTAMP\`)` |
| `SET @var` + `multipleStatements` | `mysql2` ne renvoie que le **dernier** jeu de résultats : une erreur sur la 1ʳᵉ instruction passe silencieusement. Répéter le littéral, ou exécuter instruction par instruction |
| Test qui supprime un compte de démo | Casse les runs suivants (les identifiants séquentiels changent). Viser un compte créé par le test et rejouer le seed en ouverture |

---

## 5. Plan d'actions — Semaine 2

### 📋 Formulaires & Factorisation

> Planifier avec `npm run uipro -- "<besoin>" --domain ux` avant d'implémenter.
> Source de vérité visuelle : `design-system/autostrass/MASTER.md`.
>
> Recommandations déjà identifiées :
> - **Data-Dense Dashboard** (style) : profilage exact du dépôt
> - **Focusable Error Summary** + **Error Placement** (ux, sévérité High) : les erreurs
>   existent mais ne sont pas reliées aux champs par `aria-describedby`
> - **Memoized Components** + **Narrow Dependencies** (react) : pour les tables de stock
> - **Line Chart** (chart) : évolution du stock, avec repli stat card si < 4 points
>
> **Avancement de la checklist ui-ux-pro-max :**
> - [x] `cursor: pointer` sur tous les éléments cliquables
> - [x] Anneau de focus visible au clavier (`:focus-visible`)
> - [x] `prefers-reduced-motion` respecté
> - [x] Contraste des libellés d'état ≥ 4.5:1
- [x] Remplacer les emojis utilisés comme icônes par des SVG (`src/components/Icon.tsx`)
- [x] Vérifier les breakpoints 375 / 768 / 1024 / 1440 px
- [x] Appliquer la typographie Fira Code / Fira Sans
- [x] Migrer la palette vers les variables du design system (`src/tokens.css`)

### 🚀 Semaine 4 — Intégration frontend & qualité

1. **Migrer les 7 vues restantes vers `useResource`** : `VehiculesView`,
   `UtilisateursView`, `CommandesClientsView`, `LivraisonsView`, `RetoursView`,
   `VentesComptoirView`, `ReceptionsView`. `ClientsView` sert de pilote.
2. **Conditionner l'interface au rôle** : masquer ou désactiver les actions
   d'écriture quand `canWrite(user.role, metier)` est faux.
3. **Tests** : Vitest pour les hooks et les schemas Zod, Playwright pour les
   parcours de connexion et de saisie.
4. **Performance** : `React.lazy` + `Suspense` sur les routes, `useMemo` sur les vues lourdes.
5. **Observabilité** : logs structurés (pino), Sentry.
6. **CI/CD** : GitHub Actions → lint + typecheck + test + build.

### Rappel : ce qui reste de la semaine 3

- Les 7 vues ci-dessus tournent encore sur des données en mémoire
  (`SEED_*`) : elles nepersistent rien tant qu'elles ne sont pas migrées.
- La déconnexion invalide le cookie mais pas le jeton : un stockage de
  jetons révocables serait nécessaire pour une déconnexion définitive.

1. **React Hook Form + Zod** — schémas dans `src/schemas/`
2. **Composants partagés** :
   - `src/components/PageLayout.tsx` — heading + actions + back-link
   - `src/components/DataTable.tsx` — tableau générique triable/paginable
   - `src/components/ConfirmDialog.tsx` — remplacer les `window.confirm`
3. **Refactorer les 3 vues pilotes** (Catalogue, Stock, Réceptions) sur les nouveaux patterns
4. **Toast/snackbar** pour remplacer les feedbacks inline dispersés

### 🔧 Semaine 3 — Backend & Persistance
5. ~~Endpoints REST pour les 9 entités restantes~~ ✅
6. ~~Migrations versionnées (Drizzle)~~ ✅
7. ~~Auth JWT + RBAC — `requireRole`~~ ✅

### 🚀 Semaine 4 — Qualité & Production
8. Tests : 20 unitaires (Vitest) + 5 intégration (MSW) + 3 E2E (Playwright)
9. Performance : `React.lazy` + `Suspense` sur les routes, `useMemo` sur les vues lourdes
10. Observabilité : Sentry + logs structurés (pino)
11. CI/CD : GitHub Actions → lint + typecheck + test + build

---

## Commandes utiles

```bash
npm run dev        # frontend + API
npm run dev:api    # API seule (port 3001)
npm run build      # tsc -b + tsc server + vite build
npm run lint       # oxlint
npm run preview    # prévisualiser le build

# Base de données (Drizzle)
npm run db:generate # génère une migration depuis server/db/schema.ts
npm run db:migrate  # applique les migrations en attente
npm run db:seed     # jeu de démonstration (idempotent)
npm run db:studio   # interface d'exploration

# Tests
npm run test:api    # 69 assertions de bout en bout (API demarrée requise)
npm run test:repos  # lecture de la base réelle par repository
```

### Recherche design (UI/UX Pro Max)

Le dépôt embarque le skill [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(179 fichiers dans `.github/prompts/`, 7 skills dont `ui-ux-pro-max`, `design-system`, `ui-styling`).
**Python 3.13 est installé** → le moteur complet du skill est utilisable.

```bash
# Design system complet (raisonnement multi-domaines)
npm run uipro -- "erp inventory operations internal tool data dense" \
  --design-system --density 9 --variance 3 -p "Autostrass"

# Persister dans design-system/<projet>/MASTER.md
npm run uipro -- "<requete>" --design-system --persist -p "Autostrass" --output-dir .

# Recherche par domaine
npm run uipro -- "form validation error" --domain ux
npm run uipro -- "memo rerender list keys" --domain react
npm run uipro -- "dashboard data dense" --domain style

# Recharger le skill
npm install -g ui-ux-pro-max-cli && uipro update
```

> `npm run uipro:node` (`scripts/uipro-search.mjs`) reste disponible comme
> alternative sans Python : mêmes CSV, scoring BM25, 8 domaines. Seul le mode
> `--design-system` exige Python.

#### ⚠️ Reformuler les requêtes

La formulation determine la qualite du resultat. Exemple reel sur ce projet :

| Requête | Résultat | Verdict |
|---------|----------|---------|
| `automotive parts depot inventory management` | Cormorant Garamond, mood « academia, library, scholarly » | ❌ Inadapté |
| `erp inventory operations internal tool data dense` | Fira Code / Fira Sans, mood « dashboard, technical, precise » | ✅ Retenu |

Le vocabulaire marketing attire les palettes editorial/serif. Nommer le **type d'interface**
(ERP, dashboard, outil interne) et le niveau de **densité** donne des résultats coherents.

#### Design system retenu — `design-system/autostrass/MASTER.md`

| Aspect | Valeur |
|--------|--------|
| Style | Minimalism & Swiss Style — « enterprise apps, dashboards, professional tools » |
| Densité | 9/10 (dashboard) — espacement 2→32 px |
| Primaire / Accent | `#1E40AF` bleu / `#D97706` ambre |
| Typographie | Fira Code (titres) / Fira Sans (texte) |
| À éviter | Ornements, designs surchargés, absence de filtrage |

---

## Variables d'environnement requises

```env
# .env (non versionné — voir .env.example)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=autostrass
DB_USER=autostrass
DB_PASSWORD=***
PORT=3001
FRONTEND_URL=http://localhost:5173

# Signature des jetons JWT — 32 caractères minimum, sinon l'API refuse de démarrer
# Générer : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=***
```

### Initialisation de la base

```bash
# 1. Schéma v1 (articles / stock) — base vierge
mysql -h HOST -u USER -p < database/schema.sql

# 2. Schema v2 (8 metiers) — 12 tables supplementaires
npm run db:migrate

# 3. Jeu de demonstration (optionnel)
npm run db:seed
```

> `database/seed_v2.sql` est idempotent (4 utilisateurs, 4 clients,
> 4 vehicules, 1 commande + livraison, 1 reception, 1 vente + retour).
> Mot de passe des comptes de démonstration : `demo1234`.
> ⚠️ `migrate_v1.sql` est idempotente : sauvegardes les tables d'origine dans
> `stock_items_backup_v1` et `activities_backup_v1` avant de les supprimer.
> ⚠️ `v_stock` expose le prix sous le nom **`prix_unitaire_ht`** (et non `unit_price_ht`).
> ⚠️ `references` est un **mot-clé réservé** MariaDB : ne jamais l'utiliser comme alias de colonne.

> Sans ces variables, l'API démarre quand même : `/api/health` répond
> `database: "unconfigured"` et les autres routes renvoient **503**. Le
> frontend bascule automatiquement en mode local (bandeau d'information +
> données de démonstration).

---

*Document mis à jour à chaque étape majeure.*
