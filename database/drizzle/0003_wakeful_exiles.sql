CREATE TABLE `offline_vente_queue` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`reference` varchar(64) NOT NULL,
	`payload` text NOT NULL,
	`fingerprint` varchar(64) NOT NULL,
	`integree` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `offline_vente_queue_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_offline_vente_reference` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `system_events` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`type` varchar(32) NOT NULL,
	`detail` varchar(255),
	`degrade` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `system_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ventes` ADD `fingerprint` varchar(64);--> statement-breakpoint
ALTER TABLE `ventes` ADD `degrade` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_offline_vente_integree` ON `offline_vente_queue` (`integree`);--> statement-breakpoint
CREATE INDEX `idx_system_events_type` ON `system_events` (`type`);--> statement-breakpoint
CREATE INDEX `idx_ventes_fingerprint` ON `ventes` (`fingerprint`);