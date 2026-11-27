# Analyse du dépôt OpenStrass du 27 novembre 2026

Révision examinée `cf7b952`. La revue suit les parcours du magasinier, du caissier et d’une personne qui installe l’application sur une base vide. Les essais SQL utilisent une instance MariaDB 11.4.5 créée pour la revue. Les essais d’interface utilisent Chrome et des réponses HTTP simulées.

## Architecture et couverture métier

OpenStrass réunit dans un dépôt l’interface React 19, l’API Express 5 et treize migrations MariaDB. React Router distribue les écrans, les hooks et le client HTTP chargent les données, puis les routes Express valident les écritures et appellent les dépôts de données. Les dépôts utilisent Drizzle et des requêtes SQL explicites pour les opérations qui exigent des verrous. [Routes de l’interface](../src/App.tsx#L226) · [Client HTTP](../src/services/api.ts#L148) · [API](../server/index.ts#L808) · [Journal des migrations](../database/drizzle/meta/_journal.json)

Le comptage physique, les transferts et la conversion d’un devis en commande ont des tests de concurrence. La conversion conserve le client, les lignes et la TVA, puis retrouve la même commande si la demande est rejouée. La caisse et les PDF disposent de contrôles sur les montants, les arrondis et l’historique. [Conversion](../server/repositories/devisRepository.ts#L236) · [Inventaire](inventaire-physique.md) · [Documents commerciaux](documents-commerciaux.md)

Le parcours d’achat reste partiel. Les tables de commandes fournisseurs existent et les besoins des devis convertis sont consultables. La sélection du fournisseur et du mode de livraison, l’attribution d’une réception aux commandes clients et l’émission automatique du bon de livraison restent à développer. [Schéma fournisseurs](../server/db/schema_step2.ts#L68) · [Guide Devis](devis.md) · [Cahier des charges](../TODO.md#L31)

## 1. Un retrait de stock peut bloquer les transferts

Sur une référence de cinq pièces toutes affectées au même emplacement, l’action « Retirer 1 » a reçu un HTTP 200. MariaDB contenait ensuite quatre pièces au total et cinq affectées. Le transfert suivant a reçu `409 INCONSISTENT_STOCK`. L’ajustement modifie uniquement le solde global. L’édition de quantité dans le catalogue peut aussi écrire un total inférieur aux allocations. La règle à préserver dans ces deux écritures est que le stock total couvre toujours la somme des emplacements. [Action de retrait](../src/views/StockView.tsx#L290) · [Ajustement](../server/repositories/articleRepository.ts#L246) · [Édition du catalogue](../server/repositories/articleRepository.ts#L211) · [Contrôle du transfert](../server/index.ts#L565)

## 2. Le comptoir peut facturer au tarif de démonstration

Avec une caisse ouverte, la TVA disponible et une erreur de lecture du catalogue, le formulaire a proposé les quatre articles de démonstration. Pour `PLA-2841`, Chrome a transmis 15,50 € HT et 18,60 € TTC. La requête a été interceptée pendant l’essai. La lecture de l’API montre qu’elle vérifie la référence et la TVA, puis calcule le montant avec le prix reçu. Si la référence existe au même taux avec un prix réel différent, la vente peut donc être enregistrée au mauvais tarif. Le comptoir doit pouvoir distinguer un article chargé du catalogue d’un article de démonstration avant l’ajout au panier. [Repli du catalogue](../src/hooks/useCatalogue.ts#L142) · [Prix du panier](../src/views/VentesComptoirView.tsx#L137) · [Calcul serveur](../server/middleware/resourceRoutes.ts#L383)

## 3. La procédure d’installation échoue sur une base vide

Sur une base vide configurée, `npm run db:migrate` a échoué à la migration `0005` avec `ER_NO_SUCH_TABLE` sur `articles`. Le harnais d’intégration charge d’abord `database/schema.sql`, étape absente de la procédure du README. Le fichier de socle sélectionne en outre la base `autostrass` et insère des articles de démonstration. Une initialisation destinée aux installations neuves doit respecter `DB_NAME` et permettre de choisir le chargement des données de démonstration. [Installation](../README.md#L14) · [Migration 0005](../database/drizzle/0005_migrate_articles_location_to_emplacement.sql#L17) · [Socle catalogue](../database/schema.sql#L10) · [Harnais](../scripts/lib/test-environment.ts#L187)

## 4. Les réceptions ignorent l’annuaire fournisseurs

Chrome a proposé cinq noms fixes dans le formulaire de réception. Un nouveau fournisseur actif présent dans l’annuaire simulé ne figurait pas dans la liste. L’écran ne charge pas l’annuaire et transmet le libellé sélectionné. Le magasinier ne peut donc pas enregistrer depuis cet écran une réception au nom d’un fournisseur ajouté dans l’annuaire. Ce défaut concerne déjà le parcours de réception existant. [Annuaire](../src/views/FournisseursView.tsx#L76) · [Formulaire de réception](../src/views/ReceptionsView.tsx#L305) · [Liste fixe](../src/options.ts#L86)

## 5. Le tableau de bord affiche des indicateurs fixes

Avec une commande client validée en base, l’API renvoyait zéro commande en cours. L’interface annonce « 3 à préparer » et des variations mensuelles de +8,4 % et +3,2 %, y compris lorsque tous les indicateurs servis valent zéro. Ces valeurs ne permettent pas au responsable de préparer la journée ni de suivre la variation du stock. [Réponse du serveur](../server/index.ts#L152) · [Cartes du tableau de bord](../src/views/DashboardView.tsx#L23)

## Exploitation et vérifications

- Le build et Oxlint passent sous Node 22.23.4. Vite produit un fichier JavaScript initial de 642,22 kB minifiés, soit 184,83 kB gzip, et signale le dépassement du seuil de 500 kB. Les écrans sont importés au démarrage. [Imports des vues](../src/App.tsx#L27)
- Les tests d’erreurs SQL, de montants de vente, de validation des transferts, d’intégrité fiscale (9 groupes), de paramètres (7 groupes) et de PDF passent. Les suites SQL dédiées passent 13 scénarios de transfert, 14 d’inventaire et 27 groupes sur les devis, la conversion et les accès concurrents. Ces suites démarrent chacune leur propre API. [Scripts npm](../package.json#L7) · [Harnais SQL](../scripts/lib/test-environment.ts#L171)
- Le mode de déploiement documenté démarre Express avec `tsx`, installé comme dépendance de développement. La compilation serveur utilise `noEmit`. Une distribution de `dist/` avec les seules dépendances de production ne contient donc pas de serveur exécutable par cette commande. Aucun workflow GitHub Actions n’est versionné dans la révision examinée. [Guide de déploiement](parametres.md#L21) · [Commande API](../package.json#L10) · [Compilation serveur](../tsconfig.server.json#L9)
- La réédition d’une facture relit les coordonnées actuelles du client. Une modification de sa fiche peut changer le destinataire affiché pour un même numéro. Le guide documente cette limite. Le dernier rapport d’accessibilité consigne sept écarts, dont trois prioritaires. La revue du 27 novembre n’a pas refait cette campagne, les suites API et sécurité complètes, ni les recettes sur PDA ou en production. [Route Facture](../server/middleware/resourceRoutes.ts#L685) · [Données des documents](documents-commerciaux.md#L51) · [Revue WCAG](accessibilite-wcag-review.md#L13)
