CREATE TABLE `articles_a_commander` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`commande_id` int unsigned NOT NULL,
	`ligne` int NOT NULL,
	`reference` varchar(64) NOT NULL,
	`designation` varchar(255) NOT NULL,
	`quantite` int NOT NULL,
	`fournisseur_id` int unsigned,
	`mode_livraison` varchar(16) NOT NULL DEFAULT 'livraison',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `articles_a_commander_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_articles_a_commander_ligne` UNIQUE(`commande_id`,`ligne`)
);
--> statement-breakpoint
CREATE TABLE `devis` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`numero` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
	`client_id` int unsigned NOT NULL,
	`client_snapshot` json NOT NULL,
	`utilisateur_id` int unsigned NOT NULL,
	`date_devis` date NOT NULL,
	`date_validite` date,
	`notes` text,
	`statut` varchar(16) NOT NULL DEFAULT 'brouillon',
	`version` int unsigned NOT NULL DEFAULT 1,
	`commande_id` int unsigned,
	`total_ht` decimal(12,2) NOT NULL,
	`total_tva` decimal(12,2) NOT NULL,
	`total_ttc` decimal(12,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devis_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_devis_numero` UNIQUE(`numero`),
	CONSTRAINT `uq_devis_commande` UNIQUE(`commande_id`)
);
--> statement-breakpoint
CREATE TABLE `devis_lines` (
	`devis_id` int unsigned NOT NULL,
	`ligne` int NOT NULL,
	`reference` varchar(64) NOT NULL,
	`designation` varchar(255) NOT NULL,
	`quantite` int NOT NULL,
	`prix_unitaire` decimal(12,2) NOT NULL,
	`taux_tva` decimal(5,2) NOT NULL,
	`montant` decimal(12,2) NOT NULL,
	`montant_tva` decimal(12,2) NOT NULL,
	`montant_ttc` decimal(12,2) NOT NULL,
	CONSTRAINT `devis_lines_devis_id_ligne_pk` PRIMARY KEY(`devis_id`,`ligne`)
);
--> statement-breakpoint
ALTER TABLE `commande_lines` ADD `taux_tva` decimal(5,2);--> statement-breakpoint
ALTER TABLE `commandes` ADD `numero` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `commandes` ADD `client_snapshot` json;--> statement-breakpoint
ALTER TABLE `commandes` ADD CONSTRAINT `uq_commandes_numero` UNIQUE(`numero`);--> statement-breakpoint
ALTER TABLE `articles_a_commander` ADD CONSTRAINT `articles_a_commander_commande_id_commandes_id_fk` FOREIGN KEY (`commande_id`) REFERENCES `commandes`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `articles_a_commander` ADD CONSTRAINT `articles_a_commander_fournisseur_id_fournisseurs_id_fk` FOREIGN KEY (`fournisseur_id`) REFERENCES `fournisseurs`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devis` ADD CONSTRAINT `devis_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devis` ADD CONSTRAINT `devis_utilisateur_id_users_id_fk` FOREIGN KEY (`utilisateur_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devis` ADD CONSTRAINT `devis_commande_id_commandes_id_fk` FOREIGN KEY (`commande_id`) REFERENCES `commandes`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `devis_lines` ADD CONSTRAINT `devis_lines_devis_id_devis_id_fk` FOREIGN KEY (`devis_id`) REFERENCES `devis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_articles_a_commander_reference` ON `articles_a_commander` (`reference`);--> statement-breakpoint
CREATE INDEX `idx_devis_client` ON `devis` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_devis_statut` ON `devis` (`statut`);
