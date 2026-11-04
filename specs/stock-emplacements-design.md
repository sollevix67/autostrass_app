# Stock par emplacement — lecture et transferts

## Objectif

Rendre visible dans l'application la hiérarchie existante des emplacements
(allée → étagère → place) et les quantités qui y sont stockées, puis permettre
le déplacement d'une quantité entre emplacements identifiés ou vers le stock
non affecté. Un transfert conserve toujours le solde total de l'article.

## Portée et critères d'acceptation

- `GET /api/emplacements` exige une session authentifiée.
- Chaque emplacement renvoyé expose son niveau, son parent, son chemin lisible,
  son état, sa capacité et le stock total de ses descendants.
- La vue Stock affiche les emplacements et références distinctes sans bloquer
  le chargement existant des articles si cette nouvelle lecture échoue.
- La requête est en lecture seule et les tests API vérifient le refus sans
  authentification ainsi que la forme de la réponse authentifiée.

## Contrat des transferts — 2026-11-04

`GET /api/articles/:reference/emplacements` exige une session authentifiée et
renvoie les quantités disponibles pour choisir l'origine du transfert :

```ts
{
  reference: string
  quantiteTotale: number
  quantiteNonAffectee: number
  emplacements: Array<{
    emplacementId: number
    chemin: string
    quantite: number
  }>
}
```

`POST /api/articles/:reference/transfert` prend la référence dans l'URL,
encodée côté client. Le corps contient :

| Champ | Type | Règle |
|---|---|---|
| `emplacement_id` | entier positif ou `null` | Destination obligatoire ; `null` remet la quantité en stock non affecté. |
| `source_emplacement_id` | entier positif ou `null`, facultatif | Origine choisie ; `null` désigne le stock non affecté. |
| `quantite` | entier de 1 à 2 147 483 647 | Quantité réellement déplacée, bornée par la disponibilité de l'origine. |
| `motif` | texte facultatif, 255 caractères maximum | Conservé dans le journal d'audit. |

L'alias historique `destination_id` est accepté uniquement lorsque
`emplacement_id` est absent. Une destination explicitement `null` conserve
la priorité sur cet alias. Les identifiants sous forme de chaîne sont refusés
par l'API ; le formulaire transmet des nombres.

Pour les anciens clients qui omettent l'origine, le serveur ne la déduit que
si une seule origine possède du stock. Plusieurs origines possibles donnent
`409 SOURCE_REQUIRED` ; aucune allocation ne doit être choisie arbitrairement.
Le formulaire affiche les origines avec leurs quantités et exige un choix
lorsque plusieurs sont disponibles.

## Conservation et journalisation

- La quantité non affectée vaut le total de `stock_balances` moins la somme
  des allocations de `stock_par_emplacements`.
- La source, le solde global et les allocations sont contrôlés dans une
  transaction avec verrouillage. Deux transferts concurrents ne peuvent pas
  consommer la même quantité disponible.
- Un stock déjà incohérent est signalé ; le transfert ne redistribue pas
  automatiquement les anciennes allocations excédentaires.
- La source perd exactement la quantité reçue par la destination. Une
  allocation épuisée est supprimée. Le stock non affecté n'a pas de ligne
  d'allocation et `stock_balances.quantity` reste inchangé.
- Après un déplacement effectif, les anciens champs `articles.location` et
  `articles.emplacement_id` sont vidés : ils ne doivent plus réafficher une
  place obsolète lorsque toutes les allocations ont été retirées.
- Les listes catalogue et stock renvoient une seule ligne par référence,
  avec les chemins de ses emplacements occupés regroupés dans le libellé.
- La suppression d'un emplacement verrouille la même ligne que le transfert
  avant de vérifier son occupation ; une arrivée concurrente ne crée pas
  d'allocation orpheline.
- Une origine égale à la destination ne produit aucun déplacement ni journal
  de transfert.
- Un déplacement effectif écrit `stock_movements.reason = 'TRANSFERT'` avec
  `delta = 0`, puisqu'il ne modifie pas le stock total.
- Dans la même transaction, `journal_actions` conserve l'utilisateur,
  l'article et l'action `modification`. Ses détails JSON décrivent le
  transfert, les identifiants source et destination, la quantité et le motif.
  Un échec de journalisation annule aussi le déplacement.

Cette journalisation réutilise le schéma catalogue v1 et la table
`journal_actions` de la migration `0004`. Aucune nouvelle migration n'est
nécessaire ; les colonnes inexistantes `stock_movements.type` et
`stock_movements.motif` ne sont pas utilisées. Le tableau de bord affiche
un transfert comme tel, sans annoncer un ajustement du stock total.

## Sécurité

- Authentification obligatoire via le middleware existant `requireAuth`.
- Les transferts exigent aussi `requireCsrf` et le rôle `magasinier`
  (ou `admin`, conformément à `requireRole`).
- Les lectures ne modifient pas les données ; les réponses ne contiennent
  pas de données personnelles.
- Requêtes SQL paramétrées, sans concaténation d'entrées utilisateur.
- Les erreurs de base sont renvoyées sous forme d'erreur API explicite.

## Hors périmètre

L'inventaire physique et la réconciliation des allocations historiques
restent des tâches séparées. Le transfert n'effectue ni comptage physique ni
ajustement du stock total. La création/modification des emplacements conserve
ses routes existantes.

## Vérification

`npm run test:stock` crée une base et une API jetables et couvre 13 scénarios
de transfert, dont les refus sans écriture, le stock non affecté, les deux
alias de destination, la concurrence et le rollback après échec du journal.
`npm run test:integration` ajoute les suites API et sécurité à ce même
environnement isolé. Voir le README pour les paramètres `TEST_DB_*`.

Le formulaire affiche les quantités par origine, envoie des identifiants
numériques et bloque la saisie fractionnaire ou supérieure au stock disponible.
La modale est centrée et les tableaux défilent dans leurs panneaux sans
élargir la page mobile. Captures :
[bureau](screenshots/stock-transfer-desktop.png) et
[mobile](screenshots/stock-transfer-mobile.png).
