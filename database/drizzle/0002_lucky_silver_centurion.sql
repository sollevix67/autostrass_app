CREATE TABLE `cash_movements` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`session_id` int unsigned NOT NULL,
	`type` varchar(16) NOT NULL,
	`montant` decimal(12,2) NOT NULL DEFAULT '0.00',
	`vente_id` int unsigned,
	`libelle` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `cash_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_session_breaks` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`session_id` int unsigned NOT NULL,
	`denomination` decimal(8,2) NOT NULL,
	`quantite` int NOT NULL DEFAULT 0,
	CONSTRAINT `cash_session_breaks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_sessions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`caissier` varchar(128) NOT NULL,
	`utilisateur_id` int unsigned NOT NULL,
	`statut` varchar(16) NOT NULL DEFAULT 'ouverte',
	`fonds_caisse` decimal(12,2) NOT NULL DEFAULT '0.00',
	`total_theorique` decimal(12,2),
	`total_reel` decimal(12,2),
	`ecart` decimal(12,2),
	`opened_at` datetime NOT NULL,
	`closed_at` datetime,
	`notes` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cash_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ventes` ADD `session_id` int unsigned;--> statement-breakpoint
ALTER TABLE `cash_movements` ADD CONSTRAINT `cash_movements_session_id_cash_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `cash_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_movements` ADD CONSTRAINT `cash_movements_vente_id_ventes_id_fk` FOREIGN KEY (`vente_id`) REFERENCES `ventes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_session_breaks` ADD CONSTRAINT `cash_session_breaks_session_id_cash_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `cash_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_sessions` ADD CONSTRAINT `cash_sessions_utilisateur_id_users_id_fk` FOREIGN KEY (`utilisateur_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_cash_movements_session` ON `cash_movements` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_cash_movements_type` ON `cash_movements` (`type`);--> statement-breakpoint
CREATE INDEX `idx_cash_breaks_session` ON `cash_session_breaks` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_cash_sessions_statut` ON `cash_sessions` (`statut`);--> statement-breakpoint
CREATE INDEX `idx_cash_sessions_caissier` ON `cash_sessions` (`utilisateur_id`);--> statement-breakpoint
ALTER TABLE `ventes` ADD CONSTRAINT `ventes_session_id_cash_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `cash_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_ventes_session` ON `ventes` (`session_id`);