-- Add catalogue fields to articles table and create compatibility table

-- Step 1: Add new columns to articles table
ALTER TABLE articles
  ADD COLUMN tva_id INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Foreign key to tva',
  ADD COLUMN ean13 VARCHAR(16) NULL,
  ADD COLUMN delai_disponibilite INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN forcer_sur_commande BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN prix_unitaire_ttc DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- Step 2: Update existing articles to set tva_id to the default tva (if exists, otherwise keep default 1)
UPDATE articles
SET tva_id = COALESCE((SELECT id FROM tva WHERE defaut = TRUE LIMIT 1), 1);

-- Step 3: Update prix_unitaire_ttc based on tva and prix_unitaire_ht
UPDATE articles a
JOIN tva t ON t.id = a.tva_id
SET a.prix_unitaire_ttc = a.prix_unitaire_ht * (1 + t.taux / 100);

-- Step 4: Add index on ean13 and foreign key on tva_id (already not null, so we can add the key)
ALTER TABLE articles
  ADD INDEX idx_articles_ean13 (ean13),
  ADD FOREIGN KEY (tva_id) REFERENCES tva(id) ON DELETE RESTRICT;

-- Step 5: Create compatibility table
CREATE TABLE IF NOT EXISTS article_compatibilite (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  article_id INT UNSIGNED NOT NULL,
  type ENUM('immatriculation', 'VIN') NOT NULL,
  valeur VARCHAR(32) NOT NULL,
  compatible BOOLEAN NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  INDEX idx_article_compatibilite_article_id (article_id),
  INDEX idx_article_compatibilite_type_valeur (type, valeur)
);