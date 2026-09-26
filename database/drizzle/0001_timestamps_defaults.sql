ALTER TABLE `clients` MODIFY COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `clients` MODIFY COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `commandes` MODIFY COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `commandes` MODIFY COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `livraisons` MODIFY COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `livraisons` MODIFY COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `receptions` MODIFY COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `receptions` MODIFY COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `retours` MODIFY COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `vehicules` MODIFY COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `vehicules` MODIFY COLUMN `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ventes` MODIFY COLUMN `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;