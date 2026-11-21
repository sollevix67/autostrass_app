# Bon de livraison — modèle photographique

Référence fournie par l'utilisateur le 21 novembre 2026 :
`20261113_130658.jpg`. Ce document fixe la présentation à reprendre pour le
futur PDF de bon de livraison. La photo originale et ses coordonnées client ou
bancaires ne sont pas versionnées ; les zones décrites ci-dessous sont génériques.

## Présentation retenue

Format **A4 portrait**, sobre et imprimable en noir et gris.

1. **En-tête centré** : logo de l'entreprise et activité, puis un trait horizontal.
2. **Bloc société à gauche** : siège, adresse, téléphone, email, site et mentions
   légales ; coordonnées bancaires uniquement si prévues dans les paramètres.
3. **Destinataire à droite** : nom ou société, adresse, code postal et ville.
   L'adresse de livraison peut différer de l'adresse du compte client.
4. **Bandeau d'identification encadré** : « BON DE LIVRAISON », « Servi par »,
   numéro, date/heure, numéro client et référence de commande ou véhicule.
   Les libellés « Rep » et « Sct » apparaissent dans le modèle ; leur signification
   et leur éventuel rattachement aux référentiels restent à préciser.
5. **Tableau des articles** : quantité, référence, désignation, prix brut,
   remise, prix net, montant HT et code TVA. Une seconde ligne peut indiquer
   l'emplacement de préparation ; une note peut préciser un départ ou une consigne.
6. **Récapitulatif en bas à droite** : code TVA, base HT, taux, montant TVA,
   total TTC et totaux du document. L'espace central reste disponible lorsque
   le bon contient peu d'articles.
7. **Pied de page** : règlement/échéance si renseignés, éventuel bandeau de
   marques, mentions ou conditions configurées et pagination « Page n° X/Y ».

Le logo et les éventuels visuels de marques devront provenir d'assets locaux
adaptés à l'impression. Les tableaux doivent conserver des en-têtes contrastés.
Les documents longs répètent l'identification et les en-têtes de colonnes ;
les totaux globaux apparaissent sur la dernière page, sans chevaucher le pied.

## Champs et sources actuelles

| Zone | Donnée disponible | Complément nécessaire pour le BL |
|---|---|---|
| Société/logo | Marque dans les PDF existants | Identité d'entreprise et assets validés ; les coordonnées d'exemple de la facture ne constituent pas une configuration |
| Client | `commandes.client_snapshot` sur les commandes récentes ; sinon fiche client | Instantané à l'émission, destinataire et adresse de livraison distincts |
| Numéro | Identifiants internes et numéro C de commande | Numéro métier L propre au bon |
| Date/heure/servi par | Dates d'expédition/prévision et timestamps techniques de livraison | Horodatage d'émission et identité authentifiée figés |
| Référence client/véhicule | Aucun champ dédié | Texte de référence, dossier et contexte véhicule client à définir ; le parc de véhicules opérationnels est distinct |
| Rep/secteur | Secteurs clients disponibles, aucun « Rep » documentaire | Sens des libellés et instantanés éventuels |
| Articles | Référence/désignation, quantité commandée, prix HT et TVA des nouvelles commandes | Lignes effectivement livrées, éventuels reliquats et instantanés documentaires |
| Emplacement | Allocations et chemins actuels du stock | Emplacement réellement préparé, y compris plusieurs origines, figé dans le bon |
| Prix brut/remise/net | Prix HT convenu uniquement | Prix brut et remise explicites ; aucune remise reconstruite depuis le catalogue actuel |
| Code/récapitulatif TVA | Taux figés et calculs en centimes | Correspondance imprimée stable code/taux et regroupement sur les quantités livrées |
| Règlement/échéance | Paiements des ventes comptoir, sans lien commande/livraison | Conditions, échéance et solde propres au document ou à sa facture |
| Pied de page | Pagination PDF réutilisable | Textes et visuels configurés pour le bon |

Le suivi [Livraisons](../server/repositories/livraisonRepository.ts) est
actuellement une entête modifiable liée à une commande, sans lignes propres,
numéro L, auteur ni instantané de bon. Le PDF et l'émission automatique restent
à développer. Les [commandes](../server/repositories/documentRepositories.ts)
apportent les prix, la TVA et les coordonnées figées pour les documents récents.

## Règles à préserver lors de l'implémentation

La numérotation demandée dans le [TODO](../TODO.md) reste
`yyyymmdd-L-xxxxxx`, avec six lettres aléatoires `a-zA-Z` et une unicité sensible
à la casse. Le numéro historique visible sur la photo est un exemple de mise
en page ; il ne remplace pas ce contrat ni les identifiants internes.

Le bon devra conserver les données réellement émises : destinataire, adresse,
auteur, horodatage, lignes, emplacements préparés, prix et TVA. Une réédition
doit retrouver ces valeurs, même après une modification du catalogue ou du
client. Les quantités métier restent entières ; un affichage « 1,00 » ne crée
pas de droit à des quantités fractionnaires.

Les montants utilisent le [calcul partagé](../src/utils/venteTotals.ts) : prix
HT en centimes et TVA arrondie par ligne, puis sommée et regroupée par taux.
Exemple numérique du modèle : 114,17 € HT à 20 % donne 22,83 € de TVA et
137,00 € TTC. La TVA inconnue d'une commande historique doit rester signalée.
Un paiement ou un reste dû ne peut être déduit d'une vente simplement rattachée
au même client ; un solde absent ne doit pas être présenté comme nul.

L'émission automatique prévue au TODO dépend de l'attribution des réceptions
fournisseurs aux lignes de commande. Le seul stock disponible ne démontre pas
que cette commande a été réceptionnée. Les livraisons partielles, leurs reliquats,
le moment d'émission et les corrections d'un bon émis restent à définir lors
de ce chantier.

Les conditions de retour, les décotes, la note de départ et les mentions du
document photographié sont du **contenu d'exemple**. Elles ne constituent pas
des instructions à appliquer à l'application et n'ajoutent aucune règle métier.
Les textes retenus pour l'impression devront être configurés explicitement.

## Repères pour la suite

- [Schéma métier](../server/db/schema.ts) et
  [routes commandes/livraisons](../server/middleware/resourceRoutes.ts).
- [Interface Livraisons](../src/views/LivraisonsView.tsx) et
  [contrats HTTP](../src/services/contracts.ts).
- [PDF Devis](../server/services/pdfDevis.ts) pour la pagination et les
  restrictions de ressources locales ; [guide Devis](devis.md) pour les instantanés.
