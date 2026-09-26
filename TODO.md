J'aimerais créer une application en Typescript/ViteJS (frontend/backend, avec support https et d'une future application androïd sur un PDA Zebra TC22) en plusieurs modules :

	- Stock:
        - Gestion des emplacements (allée -> étagère -> place)
        - Stock à l'emplacement
        - Changement d'emplacemet pour un article
        - Inventaire
	
    - Catalogue frontend:
        - Ajout, modification, retrait des articles via le backend (référence, code EAN13, désignation, prix d'achat fournisseur, prix de vente magasin, compatibilité)
        - Affichage du prix ht/ttc
        - Affichage de l'état du stock d'une référence (En stock, Stock faible, Epuisé) avec possibilité de forcer "Sur commande" via le backend
        - Affichage d'un délai de disponibilité paramétrable dans le cas d'un article pas en stock
        - Recherche par désignation, référence ou code EAN13
        - Affichage de la compatibilité (paramétrable) par immatriculation ou VIN (API)
    
    - Caisse:
        - Conforme à la norme NF525
        - Ajout des articles au panier depuis le catalogue ou par saisie de la référence, de la désignation (autocompletion) ou du code EAN13
        - Edition de facture en cas de vente directe
        - Ouverture de plusieurs sessions de caisse (maximum 1 session par utilisateur)
        - Interface de caisse utilisable au clavier
        - Clôture
    
    - Devis
        - Numérotation unique sous la forme yyymmdd-D-xxxxxx (xxxxxx sera une suite de caractères alphabétique aléatoire [az-AZ])
        - Création, modification et envoi par email ou watsapp
        - Transformation d'un devis en commande client et ajout à la liste des références à commander aux fournisseurs, si pas en stock

	- Réception fournisseurs
        - Attribution automatique des articles réceptionnés aux commandes clients correspondantes
        - Ajout au stock à l'emplacement contenant déjà la référence

	- Commande client 
        - Edition des bons de commande en PDF
        - Numérotation unique sous la forme yyymmdd-C-xxxxxx (xxxxxx sera une suite de caractères alphabétique aléatoire [az-AZ])

	- Commande fournisseurs
        - Gestion de la liste des articles à commander avec sélection du fournisseur et du mode de livraison
        - Filtrage selon le fournisseur et le mode de livraison

	- Livraisons
        - Edition automatique des bons de livraison dès lorsque la commande est complète,
        - Numérotation unique sous la forme yyymmdd-L-xxxxxx (xxxxxx sera une suite de caractères alphabétique aléatoire [az-AZ])

	- Retours client 
        - Edition des avoirs
        - Numérotation unique sous la forme yyymmdd-A-xxxxxx (xxxxxx sera une suite de caractères alphabétique aléatoire [az-AZ])
        - Remise en stock des articles retournés
        - Génération de bons de livraison pour les retours refusés avec motifs de refus

	- Carnet d'adresses clients
        - Autocompletion via api google
        - Suivi des devis, commandes, livraisons
        - Suivi des factures payées et à payer
        - Suspension, limitation du compte (blocage livraison, paiement direct uniquement)

	- Carnet d'adresses des fournisseurs