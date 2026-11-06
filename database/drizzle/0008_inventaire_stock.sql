CREATE TABLE `inventaires_stock` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`reference` varchar(64) NOT NULL,
	`designation` varchar(255) NOT NULL,
	`utilisateur_id` int unsigned NOT NULL,
	`auteur` varchar(129) NOT NULL,
	`motif` varchar(255) NOT NULL,
	`quantite_avant` int NOT NULL,
	`quantite_comptee` int NOT NULL,
	`lignes` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `inventaires_stock_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_inventaires_reference` ON `inventaires_stock` (`reference`,`id`);