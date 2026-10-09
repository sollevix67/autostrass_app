# Revue de sécurité et de fiabilité — Autostrass

## Synthèse

La revue a relevé quatre constats de sévérité haute et quatre de sévérité
moyenne. Les huit constats sont corrigés dans le code et vérifiés sur la base
de test fictive `autostrass_test`. Les autres bases existantes doivent toujours
être contrôlées individuellement avant migration.

Les tests API et sécurité ont été exécutés sur cette base non productive.
L'exécution du seed a détecté des allocations préexistantes supérieures au
stock catalogue ; elles ont été préservées plutôt que redistribuées sans
information métier.

## Constats

| # | Sévérité | Fichier | Lignes | Constat | Confiance | État |
|---|---|---|---:|---|---:|---|
| 1 | Haute | `server/index.ts` | 298–379 | Les mutations d’articles étaient accessibles sans authentification ni CSRF, permettant de modifier catalogue et stock. | 9/10 | Corrigé ; tests ajoutés, non exécutés |
| 2 | Haute | `server/middleware/resourceRoutes.ts` | 600–613 | La clôture ne vérifiait pas le propriétaire de la session. | 9/10 | Corrigé ; test ajouté, non exécuté |
| 3 | Haute | `server/repositories/cashRegisterRepository.ts` | 383–434 | Une clôture concurrente pouvait omettre une vente en cours de ses totaux. | 8/10 | Corrigé par verrouillage transactionnel |
| 4 | Haute | `database/schema.sql` | 29–49, 107–115 | Le bootstrap référençait des tables absentes et n’était pas cohérent avec les migrations ultérieures. | 9/10 | Corrigé ; séquence documentée, non exécutée sur une base |
| 5 | Moyenne | `database/drizzle/meta/_journal.json` | 2–41 | Le journal s’arrêtait à `0004`, alors que les fichiers `0005` et `0006` existaient et pouvaient avoir des états différents selon les bases. | 9/10 | Corrigé et appliqué sur `autostrass_test` après vérification du schéma |
| 6 | Moyenne | `database/seed_v3.sql` | 88–104 | Les jointures du seed pouvaient confondre des codes d’emplacement répétés sous plusieurs parents et multiplier le stock alloué. | 9/10 | Corrigé ; contrôle ajouté, non exécuté |
| 7 | Moyenne | `server/repositories/articleRepository.ts` | 48–82 | Le mapper ignorait l’alias d’emplacement hiérarchique renvoyé par la requête. | 9/10 | Corrigé |
| 8 | Moyenne | `scripts/close-open-sessions.ts` | 24–42 | Le script fermait toutes les sessions avec des totaux et écarts nuls, sans comptage. | 9/10 | Corrigé en diagnostic non-mutant |

## Actions appliquées et restantes

Les huit constats ont reçu des correctifs. Les migrations `0003` et `0004`
étaient déjà présentes dans le schéma de `autostrass_test` mais absentes de son
journal ; leur historique a été réconcilié après vérification. Les migrations
`0005` et `0006` ont ensuite été appliquées et leur résultat vérifié. La
commande `npm run db:migrate` utilise le migrateur MySQL de Drizzle ORM, la
version de `drizzle-kit` du projet ne proposant pas de commande `migrate`.
Cette vérification ne couvre pas les autres bases existantes.

## Vérifications et limites

- `npm run build` : réussi ; Vite signale que le bundle principal dépasse
  légèrement 500 kB.
- `npm run lint` : réussi avec deux avertissements `react(purity)`
  préexistants dans `src/App.tsx` (lignes 201–202).
- `npm run db:migrate` : réussi, migrations enregistrées jusqu'à `0006`.
- Tests sur `autostrass_test` : **121/121 API**, **58/58 sécurité**.
- `npm run db:seed` : données de démonstration appliquées, mais contrôle de
  conservation en échec sur quatre articles dont les affectations préexistantes
  multiplient le stock catalogue par cinq. Elles n'ont pas été modifiées.
- Les autres bases existantes n’ont pas été inspectées.
- Points positifs relevés : les routes métier récentes utilisent des contrôles
  d’authentification, CSRF et de rôles ; les mots de passe sont hachés ; les
  créations de documents et mouvements de caisse utilisent des transactions.