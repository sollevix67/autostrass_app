# Commander et réceptionner auprès d’un fournisseur

Le magasinier et l’administrateur ouvrent **Commandes fournisseurs** dans la navigation.
L’annuaire permet aussi d’ouvrir les commandes d’un fournisseur et l’écran
**Réceptions** donne accès aux commandes à recevoir.

## Passer une commande

1. Dans **Articles à commander**, retrouver la commande client issue d’un devis
   converti et la référence manquante. Les listes se filtrent par fournisseur
   et mode de livraison.
2. Cliquer sur **Affecter**, choisir un fournisseur actif et ajuster son mode de
   livraison. Le choix est enregistré pour cette ligne de commande client.
3. Cliquer sur **Commander**, saisir la quantité et le prix d’achat unitaire HT.
   Le dialogue permet de regrouper les lignes affectées au même fournisseur
   et au même mode. Une quantité de zéro écarte la ligne. Un prix nul se saisit
   explicitement pour un article gratuit.
4. **Passer la commande** enregistre l’achat au statut **envoyée**. L’opérateur
   transmet la commande au fournisseur par son canal habituel. Le nom, le prix
   et la désignation utilisés à la commande sont conservés dans ses réceptions.

Dans **Horaires de commande**, l’administrateur règle pour chaque fournisseur
une heure de début quotidienne en Europe/Paris et une durée de 1 à 1 439 minutes.
Le serveur contrôle l’horaire au moment de l’enregistrement. La fermeture
commence à la minute indiquée et la commande redevient possible dès la fin
de la durée, y compris après minuit. En mars, une heure inexistante est décalée
d’une heure. En octobre, la première occurrence déclenche le blocage.

## Enregistrer une livraison

Dans **Commandes passées**, choisir **Réceptionner**, renseigner les quantités
livrées ou choisir **Tout réceptionner**. Une première entrée partielle laisse
le solde disponible pour la livraison suivante. La réception est consultable
depuis l’historique. La fiche de commande présente, pour chaque ligne, le numéro
de la commande client, la quantité reçue et la quantité attribuée.

Le stock entre dans le premier emplacement actif, par identifiant, qui contient
déjà cette référence. Sans emplacement éligible, les pièces entrent dans le
stock non affecté. Les compteurs, le mouvement de stock, l’attribution au
client, la réception et le journal sont écrits dans la même transaction.
Une réception liée à un achat est figée dans l’historique.

Les achats en cours couvrent en priorité le besoin auquel ils sont rattachés.
Le stock déjà attribué compte pour sa commande client active. Le reste du stock
couvre la demande dans l’ordre des commandes puis des lignes. Si le client est
déjà servi, si sa commande est annulée ou expédiée, ou si un autre arrivage
couvre une partie de sa demande, la quantité excédentaire entre en stock libre.
Les pièces des commandes clients saisies directement entrent dans le calcul de
disponibilité. La liste d’achat affiche les besoins issus des devis convertis.

Après une coupure réseau, **Réessayer** retrouve le résultat de l’opération.
La même clé accompagne l’achat ou la réception lors du rejeu. L’onglet peut
retrouver les opérations en attente après rechargement.

[Articles à commander](captures/commandes-fournisseurs/articles-a-commander.png) ·
[Réception sur mobile](captures/commandes-fournisseurs/reception-mobile.png) ·
[Attributions détaillées](captures/commandes-fournisseurs/attributions.png)

## Installation et vérification

Sauvegarder la base, appliquer `npm run db:migrate`, puis redémarrer l’API.
La migration ajoute les liens et compteurs et reprend les quantités des anciennes
commandes marquées **reçue**. Une ancienne commande **partielle** dont les entrées
par ligne sont inconnues apparaît avec **Reliquat à rapprocher**. Ses justificatifs
sont nécessaires pour établir le solde. [Migration 0013](../database/drizzle/0013_commandes_fournisseurs.sql)

`npm run test:commandes-fournisseurs` crée des bases et des API jetables via
`TEST_DB_*`. La recette couvre les horaires, les prix d’achat, les accès, les
écritures concurrentes, les réceptions hors ordre et l’annulation de l’entrée si
l’audit échoue. Après `npm run build`, `npm run test:commandes-fournisseurs:ui`
vérifie le parcours Chromium sur ordinateur et mobile avec une API simulée.
