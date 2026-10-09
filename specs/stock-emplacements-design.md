# Stock par emplacement — première tranche

## Objectif

Rendre visible dans l'application la hiérarchie existante des emplacements
(allée → étagère → place) et les quantités qui y sont stockées, sans modifier
les soldes ni l'historique des migrations.

## Portée et critères d'acceptation

- `GET /api/emplacements` exige une session authentifiée.
- Chaque emplacement renvoyé expose son niveau, son parent, son chemin lisible,
  son état, sa capacité et le stock total de ses descendants.
- La vue Stock affiche les emplacements et références distinctes sans bloquer
  le chargement existant des articles si cette nouvelle lecture échoue.
- La requête est en lecture seule et les tests API vérifient le refus sans
  authentification ainsi que la forme de la réponse authentifiée.

## Sécurité

- Authentification obligatoire via le middleware existant `requireAuth`.
- Pas d'écriture ni de données personnelles dans la réponse.
- Requête SQL fixe, sans entrée utilisateur ni concaténation de paramètres.
- Les erreurs de base sont renvoyées sous forme d'erreur API explicite.

## Hors périmètre

La création/modification des emplacements, les transferts, l'inventaire
physique et les migrations restent des tâches séparées. Les migrations 0005
et 0006 ne sont pas ajoutées au journal Drizzle tant que l'état des bases
existantes n'est pas vérifié.
