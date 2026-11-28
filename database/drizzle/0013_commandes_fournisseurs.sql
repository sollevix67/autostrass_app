-- MariaDB valide chaque ALTER séparément. Un migrateur interrompu peut reprendre le lot.
ALTER TABLE `commande_four_lines`
  ADD COLUMN IF NOT EXISTS `besoin_id` int unsigned,
  ADD COLUMN IF NOT EXISTS `quantite_recue` int DEFAULT 0 NOT NULL,
  ADD CONSTRAINT `commande_four_lines_besoin_id_articles_a_commander_id_fk`
    FOREIGN KEY IF NOT EXISTS `commande_four_lines_besoin_id_articles_a_commander_id_fk` (`besoin_id`)
    REFERENCES `articles_a_commander` (`id`) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE `commandes_fournisseurs`
  ADD COLUMN IF NOT EXISTS `fournisseur_nom` varchar(128),
  ADD COLUMN IF NOT EXISTS `cle_commande` char(36),
  ADD UNIQUE INDEX IF NOT EXISTS `uq_cmd_four_cle` (`cle_commande`);
--> statement-breakpoint
ALTER TABLE `fournisseurs`
  ADD COLUMN IF NOT EXISTS `heure_blocage` time,
  ADD COLUMN IF NOT EXISTS `duree_blocage_minutes` int unsigned;
--> statement-breakpoint
ALTER TABLE `reception_lines`
  ADD COLUMN IF NOT EXISTS `ligne_commande_fournisseur` int,
  ADD COLUMN IF NOT EXISTS `quantite_attribuee` int DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `receptions`
  ADD COLUMN IF NOT EXISTS `commande_fournisseur_id` int unsigned,
  ADD COLUMN IF NOT EXISTS `cle_operation` char(36) DEFAULT NULL,
  ADD UNIQUE INDEX IF NOT EXISTS `uq_receptions_commande_cle` (`commande_fournisseur_id`, `cle_operation`),
  ADD CONSTRAINT `receptions_commande_fournisseur_id_commandes_fournisseurs_id_fk`
    FOREIGN KEY IF NOT EXISTS `receptions_commande_fournisseur_id_commandes_fournisseurs_id_fk` (`commande_fournisseur_id`)
    REFERENCES `commandes_fournisseurs` (`id`) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_commande_lines_reference` ON `commande_lines` (`reference`);
--> statement-breakpoint
UPDATE `commande_four_lines` l JOIN `commandes_fournisseurs` c ON c.id = l.commande_id
SET l.quantite_recue = l.quantite WHERE c.statut = 'reçue' AND c.cle_commande IS NULL;
