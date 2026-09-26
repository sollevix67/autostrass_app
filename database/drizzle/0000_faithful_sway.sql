CREATE TABLE `clients` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`nom` varchar(64) NOT NULL,
	`prenom` varchar(64) NOT NULL,
	`telephone` varchar(32) NOT NULL,
	`email` varchar(255) NOT NULL,
	`adresse` varchar(255) NOT NULL,
	`ville` varchar(64) NOT NULL,
	`code_postal` varchar(16) NOT NULL,
	`type` varchar(32) NOT NULL DEFAULT 'particulier',
	`numero_client` varchar(32) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_clients_numero` UNIQUE(`numero_client`)
);
--> statement-breakpoint
CREATE TABLE `commande_lines` (
	`commande_id` int unsigned NOT NULL,
	`ligne` int NOT NULL DEFAULT 1,
	`reference` varchar(64) NOT NULL,
	`designation` varchar(255) NOT NULL,
	`quantite` int NOT NULL,
	`prix_unitaire` decimal(12,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `commande_lines_commande_id_ligne_pk` PRIMARY KEY(`commande_id`,`ligne`)
);
--> statement-breakpoint
CREATE TABLE `commandes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`client_id` int unsigned NOT NULL,
	`date_commande` date NOT NULL,
	`statut` varchar(32) NOT NULL DEFAULT 'en attente',
	`date_livraison_prevue` date,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `commandes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `livraisons` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`commande_id` int unsigned NOT NULL,
	`transporteur` varchar(128) NOT NULL,
	`date_expedition` date NOT NULL,
	`date_livraison_prevue` date NOT NULL,
	`adresse_livraison` varchar(255) NOT NULL,
	`statut` varchar(32) NOT NULL DEFAULT 'en attente',
	`tracking` varchar(64),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `livraisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reception_lines` (
	`reception_id` int unsigned NOT NULL,
	`ligne` int NOT NULL DEFAULT 1,
	`reference` varchar(64) NOT NULL,
	`designation` varchar(255) NOT NULL,
	`quantite_recue` int NOT NULL,
	`prix_unitaire` decimal(12,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `reception_lines_reception_id_ligne_pk` PRIMARY KEY(`reception_id`,`ligne`)
);
--> statement-breakpoint
CREATE TABLE `receptions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`fournisseur` varchar(128) NOT NULL,
	`date_reception` date NOT NULL,
	`notes` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `receptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retour_lines` (
	`retour_id` int unsigned NOT NULL,
	`ligne` int NOT NULL DEFAULT 1,
	`reference` varchar(64) NOT NULL,
	`designation` varchar(255) NOT NULL,
	`quantite` int NOT NULL,
	`prix_unitaire` decimal(12,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `retour_lines_retour_id_ligne_pk` PRIMARY KEY(`retour_id`,`ligne`)
);
--> statement-breakpoint
CREATE TABLE `retours` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`vente_id` int unsigned,
	`client_id` int unsigned NOT NULL,
	`date_retour` date NOT NULL,
	`motif` varchar(255) NOT NULL,
	`montant_rembourse` decimal(12,2) NOT NULL DEFAULT '0.00',
	`created_at` timestamp,
	CONSTRAINT `retours_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`nom` varchar(64) NOT NULL,
	`prenom` varchar(64) NOT NULL,
	`email` varchar(255) NOT NULL,
	`telephone` varchar(32),
	`role` varchar(32) NOT NULL DEFAULT 'caissier',
	`actif` boolean NOT NULL DEFAULT true,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_users_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vehicules` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`immatriculation` varchar(16) NOT NULL,
	`marque` varchar(64) NOT NULL,
	`modele` varchar(64) NOT NULL,
	`annee` int NOT NULL,
	`type` varchar(32) NOT NULL DEFAULT 'voiture',
	`kilometrage` int NOT NULL DEFAULT 0,
	`proprietaire` varchar(128) NOT NULL,
	`statut` varchar(32) NOT NULL DEFAULT 'disponible',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `vehicules_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_vehicules_immatriculation` UNIQUE(`immatriculation`)
);
--> statement-breakpoint
CREATE TABLE `vente_lines` (
	`vente_id` int unsigned NOT NULL,
	`ligne` int NOT NULL DEFAULT 1,
	`reference` varchar(64) NOT NULL,
	`designation` varchar(255) NOT NULL,
	`quantite` int NOT NULL,
	`prix_unitaire` decimal(12,2) NOT NULL DEFAULT '0.00',
	`montant` decimal(12,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `vente_lines_vente_id_ligne_pk` PRIMARY KEY(`vente_id`,`ligne`)
);
--> statement-breakpoint
CREATE TABLE `ventes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`client_id` int unsigned,
	`date_vente` datetime NOT NULL,
	`caissier` varchar(128) NOT NULL,
	`total_ht` decimal(12,2) NOT NULL DEFAULT '0.00',
	`montant_paye` decimal(12,2) NOT NULL DEFAULT '0.00',
	`monnaie` decimal(12,2) NOT NULL DEFAULT '0.00',
	`mode_paiement` varchar(16) NOT NULL DEFAULT 'espèces',
	`created_at` timestamp,
	CONSTRAINT `ventes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `commande_lines` ADD CONSTRAINT `commande_lines_commande_id_commandes_id_fk` FOREIGN KEY (`commande_id`) REFERENCES `commandes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commandes` ADD CONSTRAINT `commandes_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `livraisons` ADD CONSTRAINT `livraisons_commande_id_commandes_id_fk` FOREIGN KEY (`commande_id`) REFERENCES `commandes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reception_lines` ADD CONSTRAINT `reception_lines_reception_id_receptions_id_fk` FOREIGN KEY (`reception_id`) REFERENCES `receptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retour_lines` ADD CONSTRAINT `retour_lines_retour_id_retours_id_fk` FOREIGN KEY (`retour_id`) REFERENCES `retours`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retours` ADD CONSTRAINT `retours_vente_id_ventes_id_fk` FOREIGN KEY (`vente_id`) REFERENCES `ventes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retours` ADD CONSTRAINT `retours_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vente_lines` ADD CONSTRAINT `vente_lines_vente_id_ventes_id_fk` FOREIGN KEY (`vente_id`) REFERENCES `ventes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ventes` ADD CONSTRAINT `ventes_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_clients_nom` ON `clients` (`nom`);--> statement-breakpoint
CREATE INDEX `idx_commandes_client` ON `commandes` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_commandes_statut` ON `commandes` (`statut`);--> statement-breakpoint
CREATE INDEX `idx_livraisons_commande` ON `livraisons` (`commande_id`);--> statement-breakpoint
CREATE INDEX `idx_receptions_date` ON `receptions` (`date_reception`);--> statement-breakpoint
CREATE INDEX `idx_retours_client` ON `retours` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_vehicules_statut` ON `vehicules` (`statut`);--> statement-breakpoint
CREATE INDEX `idx_ventes_date` ON `ventes` (`date_vente`);