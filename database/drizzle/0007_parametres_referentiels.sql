CREATE TABLE `categories_articles` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`libelle` varchar(128) NOT NULL,
	`actif` boolean NOT NULL DEFAULT true,
	CONSTRAINT `categories_articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_categories_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `secteurs_livraison` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`libelle` varchar(128) NOT NULL,
	`actif` boolean NOT NULL DEFAULT true,
	CONSTRAINT `secteurs_livraison_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_secteurs_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sous_categories_articles` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`categorie_id` int unsigned NOT NULL,
	`code` varchar(64) NOT NULL,
	`libelle` varchar(128) NOT NULL,
	`actif` boolean NOT NULL DEFAULT true,
	CONSTRAINT `sous_categories_articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_sous_categories_code` UNIQUE(`categorie_id`,`code`)
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `secteur_id` int unsigned;--> statement-breakpoint
ALTER TABLE `sous_categories_articles` ADD CONSTRAINT `sous_categories_articles_categorie_id_categories_articles_id_fk` FOREIGN KEY (`categorie_id`) REFERENCES `categories_articles`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_secteur_id_secteurs_livraison_id_fk` FOREIGN KEY (`secteur_id`) REFERENCES `secteurs_livraison`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
-- Préserver toutes les catégories historiques, même hors de l'ancienne liste.
INSERT INTO categories_articles (code, libelle)
SELECT DISTINCT category, CASE WHEN category = '' THEN 'Sans catégorie (historique)' ELSE category END FROM articles;
--> statement-breakpoint
INSERT INTO categories_articles (code, libelle) VALUES
('freins', 'Freins'), ('filtres', 'Filtres'), ('batteries', 'Batteries'),
('huiles', 'Huiles'), ('pneus', 'Pneus'), ('electrique', 'Électrique'), ('carrosserie', 'Carrosserie')
ON DUPLICATE KEY UPDATE code = VALUES(code);
--> statement-breakpoint
-- Articles relève du schéma SQL v1, absent des snapshots Drizzle historiques.
ALTER TABLE articles ADD COLUMN sous_categorie_id INT UNSIGNED NULL,
ADD CONSTRAINT fk_articles_sous_categorie FOREIGN KEY (sous_categorie_id) REFERENCES sous_categories_articles(id) ON DELETE RESTRICT;
