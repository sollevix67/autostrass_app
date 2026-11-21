# Présentation commune des documents commerciaux

Demande du 21 novembre 2026 : conserver la présentation du
[modèle de bon de livraison](bon-livraison-modele.md) pour les autres documents.
Le gabarit est maintenant utilisé par les **factures de vente comptoir** et
les **devis**. Les futurs bons de commande, de livraison et avoirs utiliseront
le même socle lors de l'implémentation de leurs modules PDF.

## Mise en page partagée

A4 portrait, noir/gris, police Roboto embarquée et tableaux encadrés.

- Nom et sous-titre de l'émetteur personnalisables, avec OpenStrass et sa
  signature par défaut, logo facultatif et trait
  horizontal ; l'identification du document est répétée sur les pages suivantes.
- Émetteur à gauche, client à droite. Le nom connu de l'émetteur est toujours
  présent ; les coordonnées supplémentaires ne sont imprimées que si fournies.
- Bandeau gris : titre, numéro, date et numéro client, puis champs propres au
  document. La facture affiche l'heure connue et le caissier ; le devis affiche
  sa validité et son statut, sans inventer d'auteur ou d'heure d'émission.
- Articles : quantité, référence, désignation, prix brut HT, remise, prix net HT,
  montant HT/TTC et code/taux TVA. Emplacement et note de ligne sont facultatifs.
- Ventilation TVA à droite, puis totaux HT/TVA/TTC et renseignements de paiement
  dans un bloc final. Les notes s'écoulent avant cette zone, même sur plusieurs
  pages ; les totaux globaux restent sur la dernière page.
- En-têtes de colonnes répétés, pagination dynamique « Page n° X/Y » et mentions
  propres au document. Aucun texte légal, horaire ou condition de retour n'est
  déduit automatiquement de la photo.

L'identité, les coordonnées, le logo et les mentions du pied de page sont
[personnalisables dans les paramètres](documents-pdf-personnalisation.md),
avec un aperçu fictif avant sauvegarde. Aucune valeur supplémentaire n'est
fournie automatiquement. L'ancienne adresse et
le téléphone de démonstration de la facture, ainsi que son délai de paiement
« 30 jours fin de mois » sans donnée source, ont été retirés.

## Données métier conservées

Le gabarit reçoit les données et les affiche ; il ne crée pas de numéro métier,
ne modifie ni vente ni devis, et n'enregistre aucun mouvement fiscal ou de stock.

| Facture | Devis |
|---|---|
| Numéro de vente affiché sur six chiffres, id interne conservé | Numéro D immuable conservé avec sa casse |
| Date/heure de vente en Europe/Paris ; date seule sans heure ajoutée | Date du devis, validité et statut enregistrés |
| Caissier enregistré dans la vente | Aucun auteur documentaire ajouté faute de donnée métier |
| Client fourni par la route ; client de passage si absent | Coordonnées du clientSnapshot du devis |
| HT, TVA et TTC fiscaux fournis | HT, TVA, TTC et montants de lignes figés |
| Mode de paiement, montant reçu et monnaie rendue distincts | Notes conservées intégralement |

La facture relit toujours les coordonnées client actuelles : les ventes ne
contiennent pas d'instantané client. Cette harmonisation ne crée pas cet
historique absent. Le devis conserve son instantané même après modification
du client ou du catalogue.

Les prix existants sont affichés comme prix nets HT convenus. Un prix brut,
une remise ou un code TVA absent apparaît « — » ; aucune remise n'est calculée
depuis un tarif catalogue actuel. Les taux connus restent affichés, sans inventer
un identifiant fiscal de document.

La ventilation additionne les taxes arrondies **par ligne**, avec un calcul en
centimes. Deux lignes de 0,05 € HT à 10 % représentent ainsi 0,02 € de TVA.
Les totaux enregistrés du document restent la source d'affichage. Pour une
facture historique, les valeurs TVA/TTC inconnues restent signalées comme
« Non figée/Non figé (historique) », même si un paiement ou un taux est présent.

Une vente TTC 30 € avec 40 € reçus et 10 € rendus conserve ces trois valeurs et
leurs sens. Le pied de page identifie la vente et son mode ; il ne prétend plus
prouver un scellement absent du contrat de génération PDF.

## Implémentation et vérification

Le [gabarit partagé](../server/services/pdfCommercial.ts) expose une construction
de définition pure et la génération PDF. Les adaptateurs
[Facture](../server/services/pdfInvoice.ts) et
[Devis](../server/services/pdfDevis.ts) gardent leurs signatures et routes.
L'identité par défaut utilise [les constantes de marque](../src/branding.ts) ;
les routes transmettent la configuration courante `documentsPdf` aux générateurs.

Les ressources restent limitées aux quatre polices Roboto fournies par pdfmake ;
les URL et autres fichiers locaux sont refusés avant téléchargement/lecture.
Les tests génèrent de vrais PDF et vérifient contenus, montants, marges et pages :

- [Facture et ressources](../scripts/test-pdf-invoice.ts).
- [Devis et ressources](../scripts/test-devis-pdf.ts).
- [Présentation commerciale](../scripts/test-pdf-commercial.ts) : taux mixtes,
  historique, client, auteur, dates, 80 lignes, 1 998 caractères de notes et
  ventilation de 200 taux.

Les exemples entièrement fictifs sont conservés dans
`specs/captures/documents/` ; le script
[de rendu Windows](../scripts/render-pdf-examples.ps1) produit les PNG via le
moteur PDF natif, sans dépendance graphique supplémentaire ni réseau.
