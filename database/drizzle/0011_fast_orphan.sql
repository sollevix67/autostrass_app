ALTER TABLE `vente_lines` ADD `taux_tva` decimal(5,2);--> statement-breakpoint
ALTER TABLE `ventes` ADD `total_tva` decimal(12,2);--> statement-breakpoint
ALTER TABLE `ventes` ADD `total_ttc` decimal(12,2);--> statement-breakpoint
ALTER TABLE `ventes` ADD `fingerprint_version` int DEFAULT 1 NOT NULL;