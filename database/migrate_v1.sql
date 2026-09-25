-- Migration v0.1 -> v1
--
-- Contexte : la base d'origine contient encore le schema initial
--   - stock_items(id, name, reference, location, stock_quantity, minimum_quantity, status, updated_at)
--   - activities(id, activity_type ENUM('Reception','Vente','Retour'), title, detail, relative_time, tone, occurred_at)
-- L'API v1 attend :
--   - articles + stock_balances + stock_movements + vue v_stock
--   - activities.activity_type ENUM('RECEPTION','VENTE','RETOUR','INVENTAIRE')
--
-- Migration idempotente : creations en IF NOT EXISTS, insertions conditionnees.
-- Les tables d'origine sont sauvegardees puis SUPPRIMEES en fin de script.
--
--   mysql -h HOST -u USER -p autostrass_test < database/migrate_v1.sql

-- ---------------------------------------------------------------------------
-- 0. Sauvegarde de securite des tables d'origine
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_items_backup_v1 LIKE stock_items;
INSERT IGNORE INTO stock_items_backup_v1 SELECT * FROM stock_items;

CREATE TABLE IF NOT EXISTS activities_backup_v1 LIKE activities;
INSERT IGNORE INTO activities_backup_v1 SELECT * FROM activities;

-- ---------------------------------------------------------------------------
-- 1. Nouvelles tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference     VARCHAR(64)   NOT NULL,
  designation   VARCHAR(255)  NOT NULL,
  category      VARCHAR(64)   NOT NULL DEFAULT '',
  unit_price_ht DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  location      VARCHAR(64)   NOT NULL DEFAULT '',
  description   TEXT          NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_articles_reference (reference)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_balances (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_id     INT UNSIGNED NOT NULL,
  quantity         INT          NOT NULL DEFAULT 0,
  minimum_quantity INT          NOT NULL DEFAULT 0,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stock_reference (reference_id),
  CONSTRAINT fk_stock_reference
    FOREIGN KEY (reference_id) REFERENCES articles (id) ON DELETE CASCADE,
  CONSTRAINT chk_stock_quantity CHECK (quantity >= 0),
  CONSTRAINT chk_stock_minimum CHECK (minimum_quantity >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_id INT UNSIGNED NOT NULL,
  delta        INT          NOT NULL,
  reason       VARCHAR(64)  NOT NULL DEFAULT 'AJUSTEMENT_MANUEL',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_movements_reference (reference_id, created_at),
  CONSTRAINT fk_movements_reference
    FOREIGN KEY (reference_id) REFERENCES articles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 2. Recodage de l'ENUM activities
--    ALTER ... MODIFY est destructif si l'ENUM cible n'inclut pas la valeur
--    courante : on passe par une table tampon pour eviter tout data loss.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS activities_v1;
CREATE TABLE activities_v1 (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  activity_type ENUM('RECEPTION','VENTE','RETOUR','INVENTAIRE') NOT NULL DEFAULT 'RECEPTION',
  title         VARCHAR(180) NOT NULL,
  detail        VARCHAR(255) NOT NULL DEFAULT '',
  relative_time VARCHAR(64)  NOT NULL DEFAULT '',
  occurred_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activities_occurred (occurred_at)
) ENGINE=InnoDB;

INSERT INTO activities_v1 (activity_type, title, detail, relative_time, occurred_at)
SELECT
  CASE activity_type
    WHEN 'Vente'  THEN 'VENTE'
    WHEN 'Retour' THEN 'RETOUR'
    ELSE 'RECEPTION'
  END,
  title,
  COALESCE(detail, ''),
  COALESCE(relative_time, ''),
  COALESCE(occurred_at, NOW())
FROM activities
WHERE title IS NOT NULL;

DROP TABLE IF EXISTS activities;
RENAME TABLE activities_v1 TO activities;

-- ---------------------------------------------------------------------------
-- 3. Copie des articles (stock_items -> articles + stock_balances)
--    L'ancien schema n'a pas de prix : initialise a 0, complete en section 5.
-- ---------------------------------------------------------------------------
INSERT INTO articles (reference, designation, category, unit_price_ht, location)
SELECT
  si.reference,
  si.name,
  '',
  0.00,
  si.location
FROM stock_items si
WHERE si.reference IS NOT NULL
  AND TRIM(si.reference) <> ''
  AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.reference = si.reference);

INSERT INTO stock_balances (reference_id, quantity, minimum_quantity)
SELECT
  a.id,
  GREATEST(si.stock_quantity, 0),
  GREATEST(si.minimum_quantity, 0)
FROM stock_items si
JOIN articles a ON a.reference = si.reference
WHERE NOT EXISTS (SELECT 1 FROM stock_balances sb WHERE sb.reference_id = a.id);

-- ---------------------------------------------------------------------------
-- 4. Vue de lecture utilisee par l'API
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_stock AS
SELECT
  a.reference,
  a.designation,
  a.category,
  a.unit_price_ht    AS prix_unitaire_ht,
  a.location         AS emplacement,
  s.quantity,
  s.minimum_quantity AS minimum
FROM articles a
JOIN stock_balances s ON s.reference_id = a.id;

-- ---------------------------------------------------------------------------
-- 5. Enrichissement des articles migres (l'ancien schema n'avait ni prix ni categorie)
-- ---------------------------------------------------------------------------
UPDATE articles SET unit_price_ht = CASE reference
  WHEN 'PLA-2841' THEN 15.50
  WHEN 'FIL-0920' THEN  8.20
  WHEN 'BAT-7710' THEN 45.00
  WHEN 'HUI-5400' THEN 22.00
  ELSE unit_price_ht
END
WHERE unit_price_ht = 0.00;

UPDATE articles SET category = CASE reference
  WHEN 'PLA-2841' THEN 'freins'
  WHEN 'FIL-0920' THEN 'filtres'
  WHEN 'BAT-7710' THEN 'batteries'
  WHEN 'HUI-5400' THEN 'huiles'
  ELSE category
END
WHERE TRIM(category) = '';

-- ---------------------------------------------------------------------------
-- 6. Suppression de la table d'origine (sauvegardee en section 0)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS stock_items;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT 'articles'              AS table_name, COUNT(*) AS row_count FROM articles
UNION ALL SELECT 'stock_balances',       COUNT(*) FROM stock_balances
UNION ALL SELECT 'stock_movements',      COUNT(*) FROM stock_movements
UNION ALL SELECT 'activities',           COUNT(*) FROM activities
UNION ALL SELECT 'stock_items_backup_v1', COUNT(*) FROM stock_items_backup_v1
UNION ALL SELECT 'activities_backup_v1',  COUNT(*) FROM activities_backup_v1;
