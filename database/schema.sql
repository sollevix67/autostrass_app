-- Socle catalogue v1, requis par les migrations Drizzle.
-- db:migrate l'applique sur la base sélectionnée par la connexion.

-- ---------------------------------------------------------------------------
-- Referentiels catalogue v1
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
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_articles_reference (reference)
) ENGINE=InnoDB;

-- Solde total par article (les allocations par emplacement sont en v2).
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

-- Journal des mouvements de stock (audit + tracabilite).
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

CREATE VIEW IF NOT EXISTS v_stock AS
SELECT
  a.reference,
  a.designation,
  a.category,
  a.unit_price_ht AS prix_unitaire_ht,
  a.location AS emplacement,
  s.quantity,
  s.minimum_quantity AS minimum
FROM articles a
JOIN stock_balances s ON s.reference_id = a.id;
