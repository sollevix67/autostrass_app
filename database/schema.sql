-- Schema Autostrass - depot automobile
-- MySQL / MariaDB 10.6+
-- Application : `mysql -u root -p < database/schema.sql`

CREATE DATABASE IF NOT EXISTS autostrass
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE autostrass;

-- ---------------------------------------------------------------------------
-- Referentiel articles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference      VARCHAR(64)  NOT NULL,
  designation    VARCHAR(255) NOT NULL,
  category       VARCHAR(64)  NOT NULL DEFAULT '',
  unit_price_ht  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  location       VARCHAR(64)  NOT NULL DEFAULT '',
  description    TEXT         NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_articles_reference (reference)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Soldes par emplacement (1 ligne minimum par article)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_balances (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_id      INT UNSIGNED NOT NULL,
  quantity          INT          NOT NULL DEFAULT 0,
  minimum_quantity  INT          NOT NULL DEFAULT 0,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stock_reference (reference_id),
  CONSTRAINT fk_stock_reference
    FOREIGN KEY (reference_id) REFERENCES articles (id) ON DELETE CASCADE,
  CONSTRAINT chk_stock_quantity CHECK (quantity >= 0),
  CONSTRAINT chk_stock_minimum CHECK (minimum_quantity >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Journal des mouvements de stock (audit + tracabilite)
-- ---------------------------------------------------------------------------
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
-- Vues de lecture utilisees par l'API
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_stock AS
SELECT
  a.reference,
  a.designation,
  a.category,
  a.unit_price_ht  AS prix_unitaire_ht,
  a.location       AS emplacement,
  s.quantity,
  s.minimum_quantity AS minimum
FROM articles a
JOIN stock_balances s ON s.reference_id = a.id;

-- ---------------------------------------------------------------------------
-- Jeu de donnees de demonstration
-- ---------------------------------------------------------------------------
INSERT INTO articles (reference, designation, category, unit_price_ht, location, description)
VALUES
  ('PLA-2841', 'Plaquettes de frein avant',  'freins',    15.50, 'A-03 / E-02 / P-14', NULL),
  ('FIL-0920', "Filtre a huile - Renault",    'filtres',    8.20, 'B-01 / E-04 / P-02', NULL),
  ('BAT-7710', 'Batterie 12V 70Ah',          'batteries', 45.00, 'C-02 / E-01 / P-08', NULL),
  ('HUI-5400', 'Huile moteur 5W30 - 5L',     'huiles',    22.00, 'D-05 / E-03 / P-21', NULL)
ON DUPLICATE KEY UPDATE designation = VALUES(designation);

INSERT INTO stock_balances (reference_id, quantity, minimum_quantity)
SELECT a.id, s.quantity, s.minimum
FROM (
  SELECT 'PLA-2841' AS reference, 12 AS quantity, 6 AS minimum
  UNION ALL SELECT 'FIL-0920',  3,  8
  UNION ALL SELECT 'BAT-7710',  6,  4
  UNION ALL SELECT 'HUI-5400', 14, 10
) s
JOIN articles a ON a.reference = s.reference
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), minimum_quantity = VALUES(minimum_quantity);
