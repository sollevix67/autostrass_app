CREATE TABLE `commande_four_lines` (
	`commande_id` int unsigned NOT NULL,
	`ligne` int NOT NULL DEFAULT 1,
	`reference` varchar(64) NOT NULL,
	`designation` varchar(255) NOT NULL,
	`quantite` int NOT NULL,
	`prix_unitaire` decimal(12,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `commande_four_lines_commande_id_ligne_pk` PRIMARY KEY(`commande_id`,`ligne`)
);
--> statement-breakpoint
CREATE TABLE `commandes_fournisseurs` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`fournisseur_id` int unsigned NOT NULL,
	`date_commande` date NOT NULL,
	`statut` varchar(16) NOT NULL DEFAULT 'brouillon',
	`mode_livraison` varchar(16) NOT NULL DEFAULT 'livraison',
	`date_livraison_prevue` date,
	`notes` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commandes_fournisseurs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emplacements` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`niveau` varchar(16) NOT NULL,
	`parent_id` int unsigned,
	`code` varchar(32) NOT NULL,
	`libelle` varchar(128),
	`capacite` int NOT NULL DEFAULT 0,
	`actif` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emplacements_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_emplacements_parent_code` UNIQUE(`parent_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `fournisseurs` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`nom` varchar(128) NOT NULL,
	`code` varchar(32),
	`email` varchar(255),
	`telephone` varchar(32),
	`adresse` varchar(255),
	`ville` varchar(64),
	`code_postal` varchar(16),
	`delai_livraison` int NOT NULL DEFAULT 0,
	`mode_livraison` varchar(16) NOT NULL DEFAULT 'livraison',
	`actif` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fournisseurs_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_fournisseurs_nom` UNIQUE(`nom`)
);
--> statement-breakpoint
CREATE TABLE `journal_actions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`utilisateur_id` int unsigned,
	`entite` varchar(64) NOT NULL,
	`entite_id` varchar(64) NOT NULL,
	`action` varchar(16) NOT NULL,
	`details` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `journal_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_par_emplacements` (
	`reference_id` int unsigned NOT NULL,
	`emplacement_id` int unsigned NOT NULL,
	`quantite` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uq_stock_emplacement` UNIQUE(`reference_id`,`emplacement_id`)
);
--> statement-breakpoint
CREATE TABLE `tva` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`taux` decimal(5,2) NOT NULL,
	`libelle` varchar(64) NOT NULL,
	`defaut` boolean NOT NULL DEFAULT false,
	`actif` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tva_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tva_taux` UNIQUE(`taux`)
);
--> statement-breakpoint
CREATE INDEX `idx_cmd_four_fournisseur` ON `commandes_fournisseurs` (`fournisseur_id`);--> statement-breakpoint
CREATE INDEX `idx_cmd_four_statut` ON `commandes_fournisseurs` (`statut`);--> statement-breakpoint
CREATE INDEX `idx_cmd_four_date` ON `commandes_fournisseurs` (`date_commande`);--> statement-breakpoint
CREATE INDEX `idx_emplacements_niveau` ON `emplacements` (`niveau`);--> statement-breakpoint
CREATE INDEX `idx_emplacements_parent` ON `emplacements` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_fournisseurs_actif` ON `fournisseurs` (`actif`);--> statement-breakpoint
CREATE INDEX `idx_journal_entite` ON `journal_actions` (`entite`,`entite_id`);--> statement-breakpoint
CREATE INDEX `idx_journal_utilisateur` ON `journal_actions` (`utilisateur_id`);--> statement-breakpoint
CREATE INDEX `idx_journal_date` ON `journal_actions` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_stock_emplacement_place` ON `stock_par_emplacements` (`emplacement_id`);--> statement-breakpoint
CREATE INDEX `idx_tva_defaut` ON `tva` (`defaut`);