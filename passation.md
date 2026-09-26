# Passation — Autostrass App

> État du projet au 2026-09-26 — **Étape 1 de la feuille de route terminée :
> les 7 vues restantes sont branchées sur l'API**. Build ✅, lint ✅ 0 warning,
> **69/69 tests API** + **58/58 tests sécurité** ✅.
>
> 📋 **La feuille de route est dans [TODO.md](./TODO.md).** La section 5 de
> ce document en reprend chaque module avec l'écart restant et l'ordre
> d'exécution proposé.

---

## 1. Objectif

Construire une application de gestion de dépôt automobile (stock, réceptions, ventes comptoir, commandes clients, livraisons, retours, clients, véhicules, utilisateurs) avec :
- **Frontend** : React 19 + TypeScript + Vite + React Router v7
- **Backend** : Express 5 + MariaDB (mysql2)
- **Architecture** : Monorepo, types partagés, API REST typée

**Cible** : Déploiement en production avec authentification, persistance réelle, tests, observabilité.

**Périmètre complet** (13 modules) : voir `TODO.md`. Résumé de l'état :

| | |
|---|---|
| ✅ Terminé | Gestion des utilisateurs, carnet d'adresses clients |
| 🟡 Persistance acquise | Stock, réceptions, ventes, commandes, livraisons, retours — les saisies sont **réellement enregistrées** |
| ❌ Non commencé | Devis, commande fournisseurs, carnet fournisseurs, historique, autocomplétion, WhatsApp, documents PDF |

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
| `src/views/CatalogueView.tsx` | CRUD complet branché API + mode local | ✅ |
| `src/views/ClientsView.tsx` | **Modele de reference** : RHF + Zod + DataTable + ConfirmDialog + RBAC | ✅ |
| `src/views/StockView.tsx` | Filtres, recherche, tri, modale — branché API (emplacement en texte libre) | ⚠️ |
| `src/views/VentesComptoirView.tsx` | Panier, encaissement, journal — **branche API** (caisse non modelisee) | ✅ |
| `src/views/ReceptionsView.tsx` | Lignes dynamiques, historique — **branche API** | ✅ |
| `src/views/VehiculesView.tsx` | Parc, statut editable inline — **branche API** | ✅ |
| `src/views/UtilisateursView.tsx` | Roles, activation, garde-fou auto-suppression — **branche API** | ✅ |
| `src/views/CommandesClientsView.tsx` | Lignes + statut inline — **branche API** | ✅ |
| `src/views/LivraisonsView.tsx` | Rattachement commande par liste + statut inline — **branche API** | ✅ |
| `src/views/RetoursView.tsx` | Lignes, montant recalcule — **branche API** | ✅ |
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
| `server/middleware/sanitize.ts` | Normalisation Unicode + rejet du markup | ✅ |
| `server/middleware/csrf.ts` | Double soumission CSRF + rate limit | ✅ |
| `server/middleware/security.ts` | En-têtes HTTP de sécurité | ✅ |
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
| Exception dans un `.transform` Zod | Court-circuite le schema et remonte en **500**. Passer par `ctx.addIssue({ code: 'custom', message })` + `return z.NEVER` → 422, et Zod poursuit la validation (toutes les erreurs d'un coup) |
| `x.optional().or(z.literal(''))` | Rejette une clé **absente** : le `or` exige sa branche littérale. `PUT { role: 'caissier' }` → 422 « Téléphone est requis ». Utiliser `z.preprocess(v => v === '' ? undefined : v, x.optional())` |
| Normaliser avant de détecter | U+2028 se replie en LF, un caractère de contrôle. Nettoyer d'abord laisserait passer un caractère redevenu invisible |
| `no-control-regex` (oxlint) | Déclenché légitimement par une regex de nettoyage. Désactiver en ligne, avec justification |
| Intersection de props qui **retrecit** le type | `CommonProps & { placeholder?: string \| null }` se réduit à `string` (le `undefined` de l'héritage gagne) : l'option `null`, documentée pour supprimer l'option vide d'un `<select>`, ne compilait pas. Écrire `Omit<CommonProps, 'placeholder'> & {...}` |
| `<select>` + `valueAsNumber` sur option vide | Renvoie `NaN`, pas `''`. Un champ obligatoire affiche « est requis » sur une option volontairement laissée vide, et un champ facultatif envoie `NaN` (422). Envelopper d'un `z.preprocess` qui convertit vide/NaN en `null` |
| Deux définitions du même métier | `src/types` (local, `id: string`, `lineId`) et `src/services/contracts.ts` (API, `id: number`) divergeaient. Le backend étant fait, la forme de l'API doit gagner : les interfaces locales mortes sont supprimées, pas maintenues en parallèle |
| Total ou montant **saisi** dans un document | Permet un total incohérent avec le détail — exactement la pièce contestée par un client. Le total est recalculé par le serveur, jamais envoyé par le formulaire |
| Cache module typé par `T` | Fige le type de la **première** réponse pour toutes les vues suivantes. Stocker `unknown[]` dans le cache, typer à la lecture |
| `setState` synchrone dans un effet de hook | Warning `react(set-state-in-effect)`. Relire le cache **pendant le rendu** et ne garder que la réponse réseau dans l'état : la lecture est pure |
| Classes CSS utilisées mais jamais déclarées | `.status-badge`, `.status-select`, `.toggle-btn`… présentes dans les vues depuis la semaine 1, absentes de `App.css` : les statuts s'affichaient en texte nu. Vérifier qu'un `className` a une règle |

---

## 5. Plan d'actions — feuille de route du projet

> La source de vérité est **`TODO.md`** (cahier des charges initial).
> Cette section en reprend les 13 modules et indique, pour chacun, ce qui
> manque. Les sections 1 à 4 décrivent l'historique ; celle-ci décrit
> l'avenir et n'est donc plus organized par semaine.

### 📊 Avancement global : **2 modules terminés / 13**

> **Étape 1 faite.** Les 7 vues « ⚠️ partiel » sont branchées sur l'API :
> RHF + Zod + `DataTable` + `ConfirmDialog` + `canWrite()`, et les
> `window.alert` / `window.confirm` ont disparu. Le tableau ci-dessous décrit
> donc l'écart **fonctionnel restant**, plus l'écart de persistance.

| Module du cahier des charges | Persistance | Écart restant |
|---|---|---|
| Gestion des utilisateurs | ✅ API | — (documents PDF non produits) |
| Carnet d'adresses clients | ✅ API | Autocomplétion d'adresses (étape 5) |
| Gestion de stock | ✅ API | Emplacement en texte libre, pas allée → étagère → place |
| Catalogues HT/TTC | ✅ API (v1) | Prix **HT seul** : ni TVA, ni prix TTC |
| Réception fournisseurs | ✅ API | Fournisseur en texte libre, **pas de carnet** (étape 2) |
| Vente au comptoir | ✅ API | Caisse **non modélisée** : ni session, ni fond de caisse, ni journal des mouvements (étape 4) |
| Commande client | ✅ API | **Pas de bon de commande PDF** (étape 3) |
| Livraisons clients pro | ✅ API | **Pas de bon de livraison PDF** (étape 3) |
| Gestion des retours | ✅ API | **Pas d'avoir PDF** (étape 3) |
| Création de devis | ❌ non commencé | — |
| Commande fournisseurs | ❌ non commencé | Aucun concept dans le schéma |
| Carnet d'adresses fournisseurs | ❌ non commencé | `fournisseur` est une simple chaîne sur les réceptions |
| Historique complet des actions | ❌ non commencé | Seul `stock_movements` existe, pas de journal d'audit |
| Autocomplétion Google (adresses) | ❌ non commencé | — |
| Intégration WhatsApp | ❌ non commencé | — |

> **Point clé** : le backend des 8 métiers est terminé (tables, repositories,
> routes, RBAC, validation) et le frontend est désormais branché dessus. Ce
> qui manque est presque toujours du **modèle de données** (étape 2) ou des
> **documents PDF** (étape 3) — plus de travail d'interface.

### 📋 Avancement de la checklist ui-ux-pro-max

- [x] `cursor: pointer` sur tous les éléments cliquables
- [x] Anneau de focus visible au clavier (`:focus-visible`)
- [x] `prefers-reduced-motion` respecté
- [x] Contraste des libellés d'état ≥ 4.5:1
- [x] Remplacer les emojis utilisés comme icônes par des SVG (`src/components/Icon.tsx`)
- [x] Vérifier les breakpoints 375 / 768 / 1024 / 1440 px
- [x] Appliquer la typographie Fira Code / Fira Sans
- [x] Migrer la palette vers les variables du design system (`src/tokens.css`)

### ✅ 11. Durcissement des formulaires contre l'injection

> **Point de méthode** : l'audit a d'abord établi ce que l'architecture
> garantit **déjà**, pour ne pas empiler des filtres redondants.

| Vecteur | État | Pourquoi |
|---------|------|----------|
| Injection SQL | ✅ déjà couvert | Toutes les requêtes sont paramétrées (`?`) ou passent par Drizzle, qui lie les valeurs. Zéro interpolation SQL sur une variable. |
| XSS stocké | ✅ déjà couvert | React échappe le texte ; zéro `innerHTML` / `dangerouslySetInnerHTML`. |
| Mass-assignment | ✅ déjà couvert | Zod 4 est en mode *strip* : les clés inconnues sont supprimées du corps validé. |
| Biais Unicode | ⚠️ **corrigé** | U+202E, U+200B, C0/DEL/C1 étaient acceptés. |
| CSRF | ⚠️ **corrigé** | `SameSite=Lax` ne protège pas du même site. |
| Force brute | ⚠️ **corrigé** | Aucune limite sur `/api/auth/login`. |
| En-têtes HTTP | ⚠️ **corrigé** | Aucun `nosniff`, ni protection clickjacking. |

| Fichier | Rôle |
|---------|------|
| `server/middleware/sanitize.ts` | NFKC, suppression des caractères de contrôle et invisibles, détection du markup |
| `server/middleware/csrf.ts` | Double soumission CSRF, rate limit à fenêtre glissante |
| `server/middleware/security.ts` | En-têtes HTTP de sécurité |
| `scripts/test-security.ts` | **58 assertions** d'injection |

**Subtilités de la normalisation** :
- La longueur est vérifiée **après** normalisation, sinon 4 000 caractères de largeur nulle passaient sous une limite de 64.
- On normalise **avant** de détecter : U+2028 se replie en LF (caractère de contrôle). Nettoyer d'abord laisserait passer un caractère redevenu invisible.
- Le mot de passe n'est **pas** normalisé à la connexion : bcrypt compare octet par octet, supprimer un caractère invaliderait un mot de passe valide.

**CSRF** : `SameSite=Lax` bloque le cookie sur les requêtes cross-site *de premier niveau*, mais **autorise** le même site. Une page-XSS sur l'origine, ou un sous-domaine volé, pouvait donc déclencher `POST /api/ventes` avec le cookie de session. La double soumission (cookie non-`httpOnly` + en-tête `X-CSRF-Token`, comparés à temps constant) ferme ce reste.

**Rate limit** : seules les tentatives **échouées** sont comptées. Compter les succès bloquerait un magasinier qui se trompe de mot de passe dix fois, alors que l'attaquant n'a progressé sur rien. Un succès purge le compteur. Les compteurs sont cloisonnés par famille de routes — sinon la suite de tests de sécurité bloquait la suite d'API pendant 15 minutes.

### 🗺️ Ordre d'exécution proposé

**Étape 1 — Débloquer la persistance (7 vues)** ✅ **FAITE**
Migré vers `useResource` : `VehiculesView`, `UtilisateursView`, `ReceptionsView`,
`VentesComptoirView`, `CommandesClientsView`, `LivraisonsView`, `RetoursView`.
Chaque vue : RHF + Zod + `DataTable` + `ConfirmDialog` + `canWrite()`.
Les `window.alert` / `window.confirm` ont disparu.

> Détail dans la section 12 ci-dessous.

**Étape 2 — Modèle de données**
- `emplacements` hiérarchiques (allée → étagère → place) + migration de
  `articles.location` (texte libre) vers une clé étrangère
- `tva` + `prix_ttc` sur le catalogue
- `fournisseurs` (entité à part entière) + `commandes_fournisseurs`
- `sessions_caisse` + `mouvements_caisse`
- `journal_actions` (audit global : qui, quoi, quand, sur quoi)

**Étape 3 — Documents PDF**
Devis, factures, bons de commande, bons de livraison, avoirs.
Choix d'architecture : génération **côté serveur** (`pdfmake` ou `puppeteer`)
plutôt que côté client — un numéro de facture doit être immuable et
imprimable depuis n'importe quel poste.

**Étape 4 — Caisse**
Ouverture / fermeture de session, fond de caisse, clôture avec écart,
journal des mouvements.

**Étape 5 — Intégrations**
- Autocomplétion d'adresses (Google Places, ou alternative sans quota ni clé
  API comme `api-adresse.data.gouv.fr`)
- WhatsApp Business Cloud API (webhook + messages sortants)

**Étape 6 — Qualité et production**
Vitest + Playwright, `React.lazy`, logs structurés, CI/CD, CSP.

### ❓ Décisions en attente

Deux points du cahier des charges demandent un arbitrage, pas une
implémentation :

1. **Immatriculation / VIN** — le TODO demande « voir si c'est possible ».
   L'API **SIV** française (interieur.gouv.fr) permet de résoudre un VIN
   (marque, modèle, année, kilométrage) mais exige un compte professionnel et
   des quotas. L'alternative gratuite `api-adresse.data.gouv.fr` ne couvre
   pas les véhicules. **Question : intégrer l'API SIV derrière une
   abstraction (avec repli sur la saisie manuelle), ou rester en saisie
   manuelle ?**

2. **Gestion de caisse** — « gestion de caisse » est ambigu : sessions
   d'ouverture/fermeture, tiroir, fond de caisse, clôture avec comptage ?
   **Question : quel niveau de détail est attendu ?**

### 🔐 Dette technique connue

- **CSP** volontairement absente : `frame-ancestors` est posé, mais une
  politique complète casserait le chargement des polices Google et le client
  Vite. À définir au moment du déploiement, quand les domaines exacts sont connus.
- **Déconnexion** : le cookie est effacé mais le jeton reste valide 12 h. Un
  stockage de jetons révocables (table `sessions` ou Redis) est nécessaire
  pour une déconnexion définitive.
- **Rate limit en mémoire** : le compteur vit dans un seul processus. Derrière
  un load balancer, la limite effective est multipliée par le nombre
  d'instances. Acceptable pour un dépôt mono-instance ; sinon il faut un
  stockage partagé.
- **Inactivité** : les 7 vues non migrées affichent des `SEED_*` et n'écrivent
  nulle part.

---

## 5 bis. Historique des plans hebdomadaires

> Conservé pour la traçabilité. Ces découpages ne correspondent plus à la
> feuille de route ci-dessus, qui fait foi.

### Semaine 2 — Formulaires & Factorisation
1. **React Hook Form + Zod** — schémas dans `src/schemas/` ✅
2. **Composants partagés** : `PageLayout`, `DataTable`, `ConfirmDialog` ✅
3. **Refactorer les 3 vues pilotes** (Catalogue, Stock, Réceptions) ✅
4. **Toast/snackbar** pour remplacer les feedbacks inline dispersés ✅

### Semaine 3 — Backend & Persistance
5. ~~Endpoints REST pour les 9 entités restantes~~ ✅
6. ~~Migrations versionnées (Drizzle)~~ ✅
7. ~~Auth JWT + RBAC — `requireRole`~~ ✅

### Semaine 4 — Qualité & Production
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
npm run test:api      # 69 assertions de bout en bout (API démarrée requise)
npm run test:security # 58 assertions d'injection / CSRF / en-têtes
npm run test:repos    # lecture de la base réelle par repository
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

## 12. ✅ Étape 1 — Les 7 vues branchées sur l'API

> Avant cette étape, ces modules affichaient des données codées en dur et
> **aucune saisie n'était enregistrée** : la caisse, les commandes et les
> retours n'existaient que dans l'état mémoire du navigateur.

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/options.ts` | Listes de `<select>`, formats monétaires, `today()`. Centralisées pour que les libellés soient identiques partout (les documents PDF reprendront ces libellés) |
| `src/components/ResourceBanners.tsx` | Bandeaux « API indisponible » / erreur / droits insuffisants. Factorisés : un module qui oublierait le bandeau de mode dégradé afficherait des données de démo en laissant croire qu'elles sont enregistrées |
| `src/hooks/useReferentials.ts` | Cache module des listes de référence (clients, commandes, ventes) pour les `<select>`. Une seule requête par chemin, partagée entre vues |

### Fichiers réécrits

`VehiculesView`, `UtilisateursView`, `ReceptionsView`, `VentesComptoirView`,
`CommandesClientsView`, `LivraisonsView`, `RetoursView` — toutes au même
patron que `ClientsView`, qui sert de modèle.

### Écarts fonctionnels corrigés au passage

Ces modules affichaient un état qui n'existait pas en base. L'écart a été
corrigé plutôt que conservé :

- **Commandes** : le formulaire n'avait pas de lignes, or l'API en exige au
  moins une. Elles ont été ajoutées (comme à la réception).
- **Retours** : le montant remboursé était **saisi** et stocké dans une
  colonne. Il vaut désormais la somme des lignes, recalculée par le serveur —
  un montant saisi permettait un remboursement incohérent avec le détail, qui
  est exactement la pièce contestée par un client.
- **Livraisons** : la commande de rattachement était saisie à la main. Elle se
  choisit maintenant dans une liste issue de l'API : un numéro erroné n'existe
  pas, et l'API répondait 422.
- **Ventes** : les 3 `window.alert` (dont un qui affichait le ticket de caisse
  dans une boîte système bloquante) sont remplacés par des toasts.
- **Utilisateurs** : le mot de passe est demandé à la création, comme l'exige
  l'API. Le formulaire ne le montre pas à la modification : on ne change un
  compte que pour ce qu'on veut changer. Le serveur interdit à un
  administrateur de se supprimer, se désactiver ou se retirer ses propres
  droits (409) : le bouton correspondant est désactivé sur sa propre ligne
  plutôt que de laisser un échec.
- **Véhicules** : le statut est modifiable depuis le tableau (le geste le plus
  fréquent du dépôt). L'immatriculation en doublon est refusée **avant**
  l'appel réseau, la base n'ayant pas de contrainte d'unicité sur cette
  colonne.
- **Schémas** : `quantiteRecue` devient `quantite` pour coller au contrat de
  l'API. Une seule forme de ligne (`documentLineSchema`) pour les 4 documents.

### Nettoyage

- 7 interfaces mortes supprimées de `src/types/index.ts` (`Reception`, `Vente`,
  `CommandeClient`, `Livraison`, `Retour`, `Client`, `Vehicule`, `Utilisateur`).
  Elles portaient des `id` en chaîne et des `lineId` locaux que la base ignore :
  deux définitions concurrentes du même métier. Les formes autoritatives
  vivent dans `src/services/contracts.ts`.
- `src/App.css` : `.status-badge`, `.type-badge`, `.role-badge`,
  `.status-select`, `.toggle-btn`, `.static-value` et `.muted` étaient
  **utilisées depuis la semaine 1 sans avoir jamais été déclarées** — les
  statuts s'affichaient en texte nu, sans la lecture en couleur que le dépôt
  fait tous les jours. Déclarées.
- `src/components/forms/FormFields.tsx` : `SelectProps` était
  `CommonProps & { placeholder?: string | null }`. L'intersection se réduit au
  type le plus étroit : `placeholder` redevenait `string`, et l'option `null`
  documentée pour supprimer l'option vide d'un `<select>` **ne compilait pas**.
  Corrigé par `Omit<CommonProps, 'placeholder'>`. Même piège sur `rows` du
  `textarea`.

### Vérification

Build ✅ · lint ✅ 0 warning · **69/69** tests API · **58/58** tests sécurité.
Contrôle visuel des 4 vues les plus sensibles (véhicules, réceptions, ventes,
clients) : les données affichées proviennent bien de MariaDB.

---

*Document mis à jour à chaque étape majeure.*
