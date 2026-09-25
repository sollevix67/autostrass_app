# Passation — Autostrass App

> État du projet au 2026-09-25 — **Semaine 1 (Fondations) terminée**. Build ✅, lint ✅ (0 warning), parcours UI validés au navigateur.

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

### ✅ 7. Nettoyage
- `src/App_new.tsx` supprimé (doublon à l'origine du bug TS2440)
- `src/main.tsx` pointe désormais sur `./App`
- Alertes `alert()` bloquantes remplacées par feedback inline (`role="status"`)
- Validation métier ajoutée (panier vide, montant insuffisant, réception vide)
- Formatage monétaire FR homogénéisé (`Intl.NumberFormat`)
- Accessibilité : `aria-label`, `role="alert"`, `aria-sort`, `<label>` conditionnel dans `FormSelect`

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
| `src/views/CatalogueView.tsx` | CRUD complet + mode local | ✅ |
| `src/views/StockView.tsx` | Filtres, recherche, tri, modale | ✅ |
| `src/views/VentesComptoirView.tsx` | Panier, paiement, monnaie | ✅ |
| `src/views/ReceptionsView.tsx` | Lignes dynamiques (clés stables) | ✅ |
| `src/views/ClientsView.tsx` | CRUD clients typé | ✅ |
| `src/views/VehiculesView.tsx` | Parc véhicules typé | ✅ |
| `src/views/UtilisateursView.tsx` | Rôles, activation | ✅ |
| `src/views/CommandesClientsView.tsx` | Statuts via `pickEnum` | ✅ |
| `src/views/LivraisonsView.tsx` | Statuts éditables inline | ✅ |
| `src/views/RetoursView.tsx` | Retours + remboursement | ✅ |
| `server/repositories/articleRepository.ts` | Accès MariaDB transactions | ✅ |
| `server/middleware/validation.ts` | Validation 422 | ✅ |
| `database/schema.sql` | Schéma v1 + seed | ✅ |
| `database/migrate_v1.sql` | Migration v0.1 → v1 (préserve les données) | ✅ |
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
| Alias SQL `AS references` | `references` est un **mot-clé réservé** en MariaDB : la requête échoue silencieusement côté 503. Utiliser `total_references` |
| Colonne `unit_price_ht` lue depuis `v_stock` | La vue l'expose sous **`prix_unitaire_ht`** (alias explicite dans le `CREATE VIEW`) |
| `JSON_ARRAYAGG` pour filtrer le stock bas | MariaDB ne supporte pas de `FILTER` : agréger tout puis filtrer côté TypeScript (moins coûteux qu'une sous-requête corrélée) |
| `ALTER TABLE ... MODIFY COLUMN` pour recoder un ENUM | Valeurs existantes hors du nouvel ENUM = data loss. Passer par une table tampon + `RENAME TABLE` |

---

## 5. Plan d'actions — Semaine 2

### 📋 Formulaires & Factorisation
1. **React Hook Form + Zod** — schémas dans `src/schemas/`
2. **Composants partagés** :
   - `src/components/PageLayout.tsx` — heading + actions + back-link
   - `src/components/DataTable.tsx` — tableau générique triable/paginable
   - `src/components/ConfirmDialog.tsx` — remplacer les `window.confirm`
3. **Refactorer les 3 vues pilotes** (Catalogue, Stock, Réceptions) sur les nouveaux patterns
4. **Toast/snackbar** pour remplacer les feedbacks inline dispersés

### 🔧 Semaine 3 — Backend & Persistance
5. Endpoints REST pour les 9 entités restantes (réceptions, ventes, commandes, livraisons, retours, clients, véhicules, utilisateurs)
6. Migrations versionnées (Knex ou Drizzle)
7. Auth JWT + RBAC — `requireRole('admin' | 'magasinier' | 'caissier')`

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
```

---

## Variables d'environnement requises

```env
# .env (non versionné)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=autostrass
DB_USER=autostrass
DB_PASSWORD=***
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=***
```

### Initialisation de la base

```bash
# Schema v1 (base vierge)
mysql -h HOST -u USER -p < database/schema.sql

# Migration depuis le schema v0.1 (stock_items / activities)
mysql -h HOST -u USER -p autostrass_test < database/migrate_v1.sql
```

> `migrate_v1.sql` est idempotente : sauvegardes les tables d'origine dans
> `stock_items_backup_v1` et `activities_backup_v1` avant de les supprimer.
> ⚠️ `v_stock` expose le prix sous le nom **`prix_unitaire_ht`** (et non `unit_price_ht`).
> ⚠️ `references` est un **mot-clé réservé MariaDB** : ne jamais l'utiliser comme alias de colonne.

> Sans ces variables, l'API démarre quand même : `/api/health` répond `database: "unconfigured"` et les autres routes renvoient **503**. Le frontend bascule automatiquement en mode local (bandeau d'information + données de démonstration).

---

*Document mis à jour à chaque étape majeure.*
