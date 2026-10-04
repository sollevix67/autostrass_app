-- Schema Autostrass - depot automobile
-- MySQL / MariaDB 10.6+
-- Application : `mysql -u root -p < database/schema.sql`

CREATE DATABASE IF NOT EXISTS autostrass
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE autostrass;

-- ---------------------------------------------------------------------------
-- Referentiel taux de TVA
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tva (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  taux           DECIMAL(5,2) NOT NULL,
  libelle        VARCHAR(64) NOT NULL,
  defaut         BOOLEAN NOT NULL DEFAULT FALSE,
  actif          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tva_taux (taux)
) ENGINE=InnoDB;

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
  emplacement_id INT UNSIGNED          NULL,
  description    TEXT         NULL,
  -- Nouveaux champs catalogue (etape 2)
  tva_id         INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Foreign key to tva',
  ean13          VARCHAR(16) NULL,
  delai_disponibilite INT UNSIGNED NOT NULL DEFAULT 0,
  forcer_sur_commande BOOLEAN NOT NULL DEFAULT FALSE,
  prix_unitaire_ttc DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_articles_reference (reference),
  CONSTRAINT fk_articles_emplacement
    FOREIGN KEY (emplacement_id) REFERENCES emplacements (id) ON DELETE SET NULL,
  CONSTRAINT fk_articles_tva
    FOREIGN KEY (tva_id) REFERENCES tva(id) ON DELETE RESTRICT,
  INDEX idx_articles_ean13 (ean13)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Compatibilite articles (immatriculation, VIN)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_compatibilite (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  article_id     INT UNSIGNED NOT NULL,
  type           ENUM('immatriculation', 'VIN') NOT NULL,
  valeur         VARCHAR(32) NOT NULL,
  compatible     BOOLEAN NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  INDEX idx_article_compatibilite_article_id (article_id),
  INDEX idx_article_compatibilite_type_valeur (type, valeur)
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
  emplacements AS emplacement,
  ep.niveau,
  ep.parent_id,
  s.quantity,
  s.minimum_quantity AS minimum
FROM articles a
JOIN stock_balances s ON s.reference_id = a.id
LEFT JOIN stock_par_emplacements spe ON spe.reference_id = a.id
LEFT JOIN emplacements ep ON ep.id = spe.emplacement_id;

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

-- ---------------------------------------------------------------------------
-- Données de démo pour les emplacements hiérarchiques
-- ---------------------------------------------------------------------------

-- Allées (niveau 1)
INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite) VALUES
  ('allee', NULL, 'A-01', 'Allée A-01', 100),
  ('allee', NULL, 'A-02', 'Allée A-02', 100),
  ('allee', NULL, 'A-03', 'Allée A-03', 100),
  ('allee', NULL, 'A-04', 'Allée A-04', 100),
  ('allee', NULL, 'A-05', 'Allée A-05', 100),
  ('allee', NULL, 'B-01', 'Allée B-01', 100),
  ('allee', NULL, 'B-02', 'Allée B-02', 100),
  ('allee', NULL, 'C-01', 'Allée C-01', 100),
  ('allee', NULL, 'C-02', 'Allée C-02', 100),
  ('allee', NULL, 'D-01', 'Allée D-01', 100),
  ('allee', NULL, 'D-02', 'Allée D-02', 100),
  ('allee', NULL, 'D-03', 'Allée D-03', 100),
  ('allee', NULL, 'D-04', 'Allée D-04', 100),
  ('allee', NULL, 'D-05', 'Allée D-05', 100)
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle);

-- Étagères (niveau 2) - sous allées
INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite)
SELECT 'etagere', a.id, CONCAT(a.code, ' / E-', LPAD(e.num, 2, '0')), CONCAT('Étagère ', a.code, ' / E-', LPAD(e.num, 2, '0')), 20
FROM emplacements a
JOIN (SELECT 1 AS num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) e ON 1=1
WHERE a.niveau = 'allee'
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle);

-- Places (niveau 3) - sous étagères
INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite)
SELECT 'place', e.id, CONCAT(e.code, ' / P-', LPAD(p.num, 2, '0')), CONCAT('Place ', e.code, ' / P-', LPAD(p.num, 2, '0')), 5
FROM emplacements e
JOIN (SELECT 1 AS num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20) p ON 1=1
WHERE e.niveau = 'etagere'
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle);

-- Stock par emplacement (exemple de quelques lignes)
INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite)
SELECT a.id, ep.id, sb.quantity
FROM articles a
JOIN stock_balances sb ON sb.reference_id = a.id
JOIN emplacements ep ON ep.code = a.location
ON DUPLICATE KEY UPDATE quantite = VALUES(quantite);
