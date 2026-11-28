# Devis et conversion en commande client

Livraison du 21 novembre 2026. Ce module reprend les exigences Devis du
[cahier des charges](../TODO.md). Les besoins générés par la conversion
alimentent les [commandes fournisseurs](commandes-fournisseurs.md).

## Utilisation

Les administrateurs et caissiers disposent de **Commercial → Devis**. La liste
se recherche par numéro, client ou article et se filtre par statut. Le numéro
ouvre les coordonnées et les lignes du document ; les actions permettent de
modifier, consulter le PDF, télécharger, partager et convertir le devis.

**Nouveau devis** ouvre un dialogue avec le client, la date, la validité
facultative, les articles et les notes. Les suggestions du catalogue proposent
la référence, la désignation et l'EAN13. Chaque ligne indique sa TVA ; son prix
HT et sa quantité sont modifiables. Les totaux HT, TVA et TTC sont calculés en
centimes, avec arrondi de TVA par ligne. Le serveur confirme les valeurs finales.

Un numéro `yyyymmdd-D-xxxxxx` est attribué à l'enregistrement. Les six lettres
aléatoires utilisent `a-zA-Z` ; les index SQL distinguent majuscules et
minuscules. Le numéro et sa date restent immuables. Le devis conserve les
coordonnées du client, la désignation et la TVA de chaque référence. Une
modification ultérieure du client ou du catalogue ne réécrit pas le document.
Changer de client dans le devis prend les coordonnées du nouveau client ;
ajouter une référence prend sa désignation et sa TVA actuelles.

Les statuts sont **Brouillon**, **Envoyé**, **Annulé** et **Converti**. Le statut
Envoyé se choisit volontairement après transmission. Un devis annulé peut être
réouvert par modification ; un devis converti reste figé. Une date de validité
dépassée bloque la conversion jusqu'à sa modification. Les dates de validité
et de conversion suivent la journée en Europe/Paris.

## PDF et partage

Le PDF comprend le numéro, les dates, le statut, le client, les lignes et les
totaux figés. **Voir le PDF** ouvre le document dans le lecteur de l’application,
depuis la liste ou la fiche. La consultation, le téléchargement et le partage
utilisent la version affichée. Si le devis a changé, actualisez la liste.
Sa [présentation A4 commune](documents-commerciaux.md) reprend celle du modèle
de bon de livraison, avec le même en-tête, bandeau, tableau, récapitulatif et pied
de page que la facture ; la validité et le statut restent propres au devis.

**Partager** prépare le PDF puis permet le partage de fichier natif lorsque le
navigateur et l'appareil le proposent. En repli, télécharger le PDF, ouvrir
l'email ou WhatsApp, puis joindre le fichier dans l'application de messagerie.
Les liens préremplissent le destinataire et le texte ; ils ne joignent pas
automatiquement le PDF et ne confirment pas l'envoi. Aucun email ni message
n'est transmis automatiquement par le serveur.

## Conversion et articles à commander

La conversion demande confirmation et accepte une date de livraison prévue
facultative. Une transaction crée la commande `yyyymmdd-C-xxxxxx`, copie les
coordonnées, les prix et la TVA, puis lie le devis et la commande. Une conversion
répétée, y compris simultanée ou après une réponse réseau perdue, retrouve la
même commande. Toute erreur de lignes, d'approvisionnement ou d'audit annule
l'ensemble de l'opération.

Créer, modifier ou convertir un devis ne modifie ni le stock physique, ni les
allocations d'emplacements, ni les mouvements fiscaux. Les commandes directes
et les conversions sérialisent leur demande sur les mêmes références. La
disponibilité tient compte des quantités des commandes en attente et validées.

Le volet **Articles à commander** présente les quantités encore manquantes des
devis convertis, liées à leur commande client. Les commandes directes participent
au calcul de disponibilité ; leur propre approvisionnement reste à compléter
pour les commandes saisies directement. La lecture recalcule ces besoins depuis
le stock physique, les quantités déjà attribuées et les achats en cours. Le stock
libre est réparti par ordre de création des commandes actives puis par ligne.
Une annulation ou une entrée de stock peut réduire ou supprimer un besoin ;
une baisse du stock peut le faire réapparaître. Il s'agit d'un calcul de demande,
sans mouvement d’emplacement à la consultation.

Les fournisseurs et modes de livraison se filtrent dans ce volet. Le fournisseur
est initialement **À choisir**, et le mode **livraison**. Les acheteurs effectuent
l’affectation, la commande et les réceptions dans **Commandes fournisseurs**.
L'API de lecture est aussi accessible aux magasiniers.

Une commande provenant d'un devis conserve ses coordonnées et ses lignes :
leur modification et sa suppression sont refusées. Son statut et sa date de
livraison prévue restent modifiables. Les commandes historiques conservent leurs
anciens identifiants et leurs TVA inconnues ; aucune numérotation rétroactive
ni réécriture de prix n'est réalisée.

## API et persistance

| Route | Contrat |
|---|---|
| `GET /api/devis` | Liste avec lignes, coordonnées et montants cohérents |
| `GET /api/devis/:id` | Document complet |
| `POST /api/devis` | Client, date, validité, notes et lignes référence/quantité/prix HT |
| `PUT /api/devis/:id` | Même formulaire, version obligatoire et statut facultatif |
| `POST /api/devis/:id/convertir` | Version obligatoire, date de livraison facultative ; devis, commande et besoins en réponse |
| `GET /api/devis/:id/pdf?version=…` | PDF ; conflit si la version demandée a changé |
| `GET /api/articles-a-commander` | Besoins actuels des commandes actives |

Les écritures exigent l'authentification, les droits et le CSRF. Les lectures
Devis/PDF sont également réservées aux administrateurs et caissiers. Un conflit
de version renvoie `409 DEVIS_CONFLICT` ; la saisie reste dans le dialogue.
Les champs inconnus, les dates impossibles, les quantités non entières, les
prix hors centimes et les doublons de référence sont refusés. Limites :
200 lignes, 9 999 unités par ligne, prix unitaire HT de 0 à 1 000 000 €, total
compatible avec `DECIMAL(12,2)`.

La migration [0012_devis.sql](../database/drizzle/0012_devis.sql) ajoute les
tables `devis`, `devis_lines`, `articles_a_commander`, ainsi que le numéro et
l'instantané client de `commandes` et la TVA de `commande_lines`. Les nouvelles
colonnes des anciennes commandes restent `NULL`. Sauvegarder la base, appliquer
`npm run db:migrate`, puis redémarrer l'API avant d'utiliser le module.

## Vérification

`npm run test:devis` contrôle le PDF réel et les scénarios API/SQL sur deux bases
jetables créées par le harnais : numérotation, montants, coordonnées, versions,
conversions simultanées, demande partagée, pénuries, droits et rollback.
Configurer `TEST_DB_*` avec un compte capable de créer et supprimer ces bases.

`npm run build` puis `npm run test:devis:ui` exécutent la recette Chromium avec
API simulée, sans base applicative ni envoi de message. Les résultats et
captures sont conservés dans `specs/captures/devis/`.

## Repères dans le dépôt

- [Persistance et conversion](../server/repositories/devisRepository.ts),
  [commandes clients](../server/repositories/documentRepositories.ts).
- [Routes Devis](../server/middleware/devisRoutes.ts),
  [validation des requêtes](../server/middleware/devisSchemas.ts).
- [Numérotation](../server/services/documentNumbers.ts),
  [génération du PDF](../server/services/pdfDevis.ts).
- [Interface Devis](../src/views/DevisView.tsx),
  [dialogue de partage](../src/views/devis/DevisShareDialog.tsx).
- [Recette métier](../scripts/test-devis.ts),
  [concurrence et audit](../scripts/test-devis-concurrence.ts),
  [PDF réel](../scripts/test-devis-pdf.ts),
  [recette navigateur](../scripts/test-devis-ui.mjs).
