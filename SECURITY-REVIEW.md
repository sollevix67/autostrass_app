# Revue de sécurité et de fiabilité — Autostrass

## Synthèse

La revue a relevé quatre constats de sévérité haute et quatre de sévérité
moyenne. Des correctifs sont appliqués pour sept constats. Le statut du
journal des migrations `0005`/`0006` reste bloqué, faute de connaître l'état de
toutes les bases déployées.

Cette revue est statique. Les tests et scripts susceptibles de modifier une
base réelle n’ont pas été exécutés ; l’état réel des migrations n’a pas été
vérifié.

## Constats

| # | Sévérité | Fichier | Lignes | Constat | Confiance | État |
|---|---|---|---:|---|---:|---|
| 1 | Haute | `server/index.ts` | 298–379 | Les mutations d’articles étaient accessibles sans authentification ni CSRF, permettant de modifier catalogue et stock. | 9/10 | Corrigé ; tests ajoutés, non exécutés |
| 2 | Haute | `server/middleware/resourceRoutes.ts` | 600–613 | La clôture ne vérifiait pas le propriétaire de la session. | 9/10 | Corrigé ; test ajouté, non exécuté |
| 3 | Haute | `server/repositories/cashRegisterRepository.ts` | 383–434 | Une clôture concurrente pouvait omettre une vente en cours de ses totaux. | 8/10 | Corrigé par verrouillage transactionnel |
| 4 | Haute | `database/schema.sql` | 29–49, 107–115 | Le bootstrap référençait des tables absentes et n’était pas cohérent avec les migrations ultérieures. | 9/10 | Corrigé ; séquence documentée, non exécutée sur une base |
| 5 | Moyenne | `database/drizzle/meta/_journal.json` | 2–41 | Le journal s’arrête à `0004`, alors que les fichiers `0005` et `0006` existent et peuvent avoir des états différents selon les bases. | 9/10 | Bloqué : état des bases à réconcilier |
| 6 | Moyenne | `database/seed_v3.sql` | 88–104 | Les jointures du seed pouvaient confondre des codes d’emplacement répétés sous plusieurs parents et multiplier le stock alloué. | 9/10 | Corrigé ; contrôle ajouté, non exécuté |
| 7 | Moyenne | `server/repositories/articleRepository.ts` | 48–82 | Le mapper ignorait l’alias d’emplacement hiérarchique renvoyé par la requête. | 9/10 | Corrigé |
| 8 | Moyenne | `scripts/close-open-sessions.ts` | 24–42 | Le script fermait toutes les sessions avec des totaux et écarts nuls, sans comptage. | 9/10 | Corrigé en diagnostic non-mutant |

## Actions appliquées et restantes

Les constats 1–4 et 6–8 ont reçu des correctifs. Le constat 5 nécessite une
réconciliation base par base avant de modifier `_journal.json` ou d'exécuter
les migrations. La section d'initialisation de `passation.md` décrit une
séquence manuelle réservée à une base neuve ; elle n'est pas une résolution du
statut des bases existantes.

## Vérifications et limites

- `npm run build` : réussi ; Vite signale que le bundle principal dépasse
  légèrement 500 kB.
- `npm run lint` : réussi avec deux avertissements `react(purity)`
  préexistants dans `src/App.tsx` (lignes 201–202).
- Les tests API, sécurité et base de données n’ont pas été lancés, car ils
  peuvent écrire dans une base réelle ou modifier des données.
- L’état des migrations sur les bases déployées n’a pas été inspecté.
- Points positifs relevés : les routes métier récentes utilisent des contrôles
  d’authentification, CSRF et de rôles ; les mots de passe sont hachés ; les
  créations de documents et mouvements de caisse utilisent des transactions.