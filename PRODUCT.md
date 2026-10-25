# PRODUCT.md — Module Stock (autostrass)

## Surface visuelle
Tous les composants Stock : table de données, formulaires, modals, emplacements, transferts.

## Objectif produit
Gérer le stock : consulter, filtrer, ajuster les quantités, créer/éditer des emplacements, transférer des articles entre emplacements.

## Utilisateurs cibles
Plusieurs rôles : magasinier + admin (RBAC).

## Contraintes techniques
- Responsive (mobile/desktop)
- Utilisable au clavier (navigation, raccourcis)
- Mode offline si l'API est indisponible (bascule locale)
- Backend : Express + MariaDB + Drizzle, HTTPS (3443) + HTTP (3001)

## Ce qui fonctionne bien (à conserver)
- Table de données avec tri et filtres
- Recherche par référence/désignation
- Édition en ligne des quantités
- Bascule en mode local si l'API est indisponible
- CRUD emplacements (allée → étagère → place)
- Transfert d'article entre emplacements

## Ce qui ne va pas / à améliorer
- Design générique, manque de hiérarchie visuelle des emplacements
- Formulaires basiques
- États vides absents
- Feedback utilisateur limité (toasts, confirmations, erreurs)
