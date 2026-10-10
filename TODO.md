J'aimerais créer une application en Typescript/ViteJS/ReactJS/NestJS (frontend/backend, avec support https et d'une future application androïd sur un PDA Zebra TC22) en plusieurs modules :

    - Stock (backend)
        - Gestion des emplacements (allée -> étagère -> place)
        - Stock à l'emplacement
        - Changement d'emplacemet pour un article
        - Inventaire
	
    - Catalogue (frontend)
        - Ajout, modification, retrait des articles via le backend (référence, code EAN13, désignation, prix d'achat fournisseur, prix de vente magasin, compatibilité, photo du produit, description, caractéristiques techniques, marque, catégorie, sous-catégorie)
        - Affichage du prix ht/ttc
        - Affichage de l'état du stock d'une référence (En stock, Stock faible, Epuisé) avec possibilité de forcer "Sur commande" via le backend
        - Affichage d'un délai de disponibilité paramétrable dans le cas d'un article pas en stock
        - Recherche par désignation, référence ou code EAN13
        - Affichage de la compatibilité (paramétrable) par immatriculation ou VIN (API)
    
    - Caisse (backend)
        - Conforme aux normes NF203 et NF525
        - Contrôle du fond de caisse
        - Ajout des articles au panier depuis le catalogue ou par saisie de la référence, de la désignation (autocompletion) ou du code EAN13
        - Edition de facture en cas de vente au comptoir
        - Ouverture de plusieurs sessions de caisse (maximum 1 session par utilisateur)
        - Interface de caisse utilisable au clavier
        - Clôture
    
    - Devis (backend)
        - Numérotation unique sous la forme yyyymmdd-D-xxxxxx (xxxxxx sera une suite de caractères alphabétique aléatoire [a-zA-Z])
        - Création, modification et envoi par email ou watsapp
        - Transformation d'un devis en commande client et ajout à la liste des références à commander aux fournisseurs, si pas en stock

    - Commande et réception fournisseurs (backend)
        - Blocage des commandes après certaines heures et déblocage après un délai donné
        - Attribution automatique des articles réceptionnés aux commandes clients correspondantes
        - Ajout au stock à l'emplacement contenant déjà la référence
        - Gestion de la liste des articles à commander avec sélection du fournisseur et du mode de livraison
        - Filtrage selon le fournisseur et le mode de livraison

    - Commande client (backend) 
        - Edition des bons de commande en PDF
        - Numérotation unique sous la forme yyyymmdd-C-xxxxxx (xxxxxx sera une suite de caractères alphabétique aléatoire [a-zA-Z])

    - Livraisons (backend)
        - Edition automatique des bons de livraison dès lorsque les articles constituant une commande ont étés réceptionnés
        - Numérotation unique des bons de livraisons sous la forme yyyymmdd-L-xxxxxx (xxxxxx sera une suite de caractères alphabétique aléatoire [a-zA-Z])
        - Gestion des secteurs et des tournées, départs par jour 

    - Retours client (backend)
        - Edition des avoirs
        - Numérotation unique des avoirs sous la forme yyyymmdd-A-xxxxxx (xxxxxx sera une suite de caractères alphabétique aléatoire [a-zA-Z])
        - Remise en stock des articles retournés
        - Génération de bons de livraison pour les retours refusés avec motifs du refus

    - Carnet d'adresses clients (backend)
        - Autocompletion via api-adresse.data.gouv.fr ou via numéro siren/siret
        - Suivi par client des devis, commandes, livraisons
        - Suivi par client des factures payées et à payer
        - Suspension, limitation du compte (blocage livraison, paiement direct uniquement)
        - Attribution à un secteur de tournée

    - Carnet d'adresses des fournisseurs (backend)
        - Suivi des commandes par fournisseurs
    
    - Véhicules (backend)
        - Suivi kilométriques
        - Suivi des entretiens et réparation
        - Suivi carburant (consommation, prix par kilomètres)
    
    - Personnels (backend)
        - Gestion des plannings et des horaires de travail
        - Gestion des accès au différents modules
        - Gestion des profils utilisateur

    - Paramères
        - Base de données
