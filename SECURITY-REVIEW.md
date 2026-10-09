# Revue de sécurité et de fiabilité — Autostrass

## Synthèse

La revue a relevé quatre constats de sévérité haute et quatre de sévérité
moyenne. Les priorités sont la protection des écritures catalogue/stock,
l’autorisation de clôture des sessions de caisse et la cohérence des montants
pendant une clôture concurrente.

Cette revue est statique. Les scripts susceptibles de modifier la base réelle
n’ont pas été exécutés et l’état réel des migrations n’a pas été vérifié.
Aucun correctif n’a été appliqué dans le cadre de cette revue.

## Constats

| # | Sévérité | Fichier | Lignes | Constat | Confiance |
|---|---|---|---:|---|---:|
| 1 | Haute | `server/index.ts` | 298–379 | Les handlers de création, modification, ajustement de quantité et suppression d’articles sont enregistrés hors du routeur authentifié. Ils ne semblent exiger ni authentification ni protection CSRF, ce qui permet à un appelant non authentifié d’altérer le catalogue et le stock. | 9/10 |
| 2 | Haute | `server/middleware/resourceRoutes.ts` | 600–613 | La route de clôture vérifie le rôle mais pas que la session appartient à l’utilisateur. Un caissier peut donc clôturer la session d’un autre caissier. | 9/10 |
| 3 | Haute | `server/repositories/cashRegisterRepository.ts` | 383–434 | `close` lit la session et calcule les totaux sans verrouiller la ligne au préalable. Une vente en cours peut retenir le verrou de session pendant que la clôture calcule ses totaux ; la clôture peut ensuite écrire des totaux qui omettent cette vente. | 8/10 |
| 4 | Haute | `database/schema.sql` | 29–49, 107–115 | Le script de bootstrap crée une table qui référence `emplacements` sans que cette table soit créée dans le script. La section des vues paraît également mal formée et fait référence à `stock_par_emplacements`, qui n’est pas créée ici. Le bootstrap documenté n’est donc pas exploitable tel quel. | 9/10 |
| 5 | Moyenne | `database/drizzle/meta/_journal.json` | 2–41 | Le journal contient les migrations jusqu’à `0004`, alors que les fichiers `0005` et `0006` existent. La commande Drizzle standard ne les exécutera pas sans mise à jour cohérente du chemin de migration. Cela ne permet pas de conclure si elles ont été appliquées manuellement sur une base existante. | 9/10 |
| 6 | Moyenne | `database/seed_v3.sql` | 88–104 | Les jointures d’emplacements se basent sur le code enfant seul, alors que ces codes sont réutilisés dans la hiérarchie. Le seed peut alors allouer du stock à plusieurs emplacements correspondants et dépasser le solde de l’article. | 9/10 |
| 7 | Moyenne | `server/repositories/articleRepository.ts` | 48–82 | La requête sélectionne l’alias `emplacement`, mais le mapper lit `row.code ?? row.location`. Comme `code` n’est pas sélectionné, l’API peut retourner l’ancien emplacement texte plutôt que l’emplacement hiérarchique choisi. | 9/10 |
| 8 | Moyenne | `scripts/close-open-sessions.ts` | 24–42 | Le script ferme toutes les sessions ouvertes et écrit zéro dans les totaux réel et théorique ainsi que dans l’écart, sans comptage ni rapprochement. Son exécution peut détruire des résultats financiers de clôture. | 9/10 |

## Actions recommandées

1. Exiger authentification, protection CSRF et rôle d’écriture adapté sur chaque
   handler de mutation catalogue/stock ; ajouter des tests de non-régression
   couvrant les appels anonymes.
2. Vérifier l’appartenance de la session de caisse avant sa clôture. Si un
   administrateur peut déroger à cette règle, rendre cette dérogation explicite
   et auditée.
3. Verrouiller la session au début de la transaction de clôture et conserver le
   verrou durant le calcul et l’écriture des montants.
4. Réparer le bootstrap SQL ou documenter un chemin d’installation unique et
   exécutable.
5. Réconcilier l’état de chaque base avant de définir un chemin de migration
   sûr pour `0005` et `0006` ; ne pas rejouer ces migrations à l’aveugle.
6. Borner les jointures du seed par parent et vérifier l’invariant de
   conservation entre stock total et allocations par emplacement.
7. Mapper explicitement l’alias d’emplacement renvoyé par la requête.
8. Rendre le script de fermeture ciblé et préserver les résultats financiers,
   ou le remplacer par un mécanisme de clôture normal avec comptage.

## Vérifications et limites

- `npm run build` : réussi.
- `npm run lint` : réussi avec deux avertissements `react(purity)` dans
  `src/App.tsx` (lignes 201–202).
- Les tests API, sécurité et base de données n’ont pas été lancés, car ils
  peuvent écrire dans une base réelle ou modifier des données.
- L’état des migrations sur les bases déployées n’a pas été inspecté.
- Points positifs relevés : les routes métier récentes utilisent des contrôles
  d’authentification, CSRF et de rôles ; les mots de passe sont hachés ; les
  créations de documents et mouvements de caisse utilisent des transactions.