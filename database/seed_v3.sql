-- ---------------------------------------------------------------------------
-- Jeu de donnees de demonstration — etape 2 (modele de donnees).
--
-- Complement de `seed_v2.sql`, qui couvre les 8 metiers de la v2. Ce fichier
-- alimente les quatre entites ajoutees a l'etape 2 : emplacements, taux de
-- TVA, carnet fournisseurs et journal d'audit.
--
-- Idempotent : rejouable sans effet de bord, comme `seed_v2.sql`. C'est
-- necessaire parce que `npm run db:seed` est execute en ouverture de suite de
-- tests.
--
-- Applique via : `npm run db:seed` (qui rejoue les deux fichiers).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Taux de TVA
--
-- Le taux par defaut (20 %) est insere en premier : c'est lui que les
-- nouvelles references reprendront. `uq_tva_taux` rend le rejeu sans effet.
-- ---------------------------------------------------------------------------
INSERT INTO tva (taux, libelle, defaut, actif) VALUES
  (20.00, 'TVA normale 20 %',     1, 1),
  (10.00, 'TVA reduite 10 %',     0, 1),
  (5.50,  'TVA super-reduite 5,5 %', 0, 1),
  (0.00,  'Exonere 0 %',          0, 1)
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle);

-- ---------------------------------------------------------------------------
-- Emplacements — 2 allees, leurs etageres et leurs places.
--
-- Les allées n'ont pas de parent (`parent_id` NULL) ; chaque etagere se
-- rattache a son allee, chaque place a son etagere. Le code est unique PAR
-- PARENT : `E-01` existe legitiment sous chaque allee.
--
-- On cree d'abord les allées, puis les etageres (en Resolve les allees par
-- leur code), puis les places. L'ordre compte : une FK ne peut pas pointer
-- vers une ligne qui n'existe pas encore.
-- ---------------------------------------------------------------------------
-- `parent_id = 0` est la sentinelle des allees (pas de parent physique) et non
-- un `NULL` : l'index UNIQUE (parent_id, code) ne detecte pas les doublons sur
-- `NULL` (SQL standard), ce qui rend le seed non idempotent. Avec `0`, le
-- `ON DUPLICATE KEY UPDATE` se declenche correctement.
INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite, actif) VALUES
  ('allee', 0, 'A', 'Allee freins et filtres', 0, 1),
  ('allee', 0, 'B', 'Allee batteries et huiles', 0, 1)
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle);

INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite, actif)
SELECT 'etagere', a.id, e.code, e.libelle, 0, 1
FROM (
  SELECT 'A' AS allee, 'E-01' AS code, 'Etagere plaquettes' AS libelle
  UNION ALL SELECT 'A', 'E-02', 'Etagere filtres'
  UNION ALL SELECT 'B', 'E-01', 'Etagere batteries'
  UNION ALL SELECT 'B', 'E-02', 'Etagere huiles'
) e
JOIN emplacements a ON a.code = e.allee AND a.niveau = 'allee'
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle);

INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite, actif)
SELECT 'place', e.id, p.code, p.libelle, p.capacite, 1
FROM (
  SELECT 'A' AS allee, 'E-01' AS etagere, 'P-01' AS code, 'Plaquettes' AS libelle, 40 AS capacite
  UNION ALL SELECT 'A', 'E-01', 'P-02', 'Plaquettes', 40
  UNION ALL SELECT 'A', 'E-02', 'P-01', 'Filtres a huile', 30
  UNION ALL SELECT 'A', 'E-02', 'P-02', 'Filtres a air', 30
  UNION ALL SELECT 'B', 'E-01', 'P-01', 'Batteries', 12
  UNION ALL SELECT 'B', 'E-02', 'P-01', 'Huiles moteur', 24
) p
JOIN emplacements e ON e.code = p.etagere AND e.niveau = 'etagere'
JOIN emplacements a ON a.id = e.parent_id AND a.code = p.allee
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle), capacite = VALUES(capacite);

-- ---------------------------------------------------------------------------
-- Stock reparti par emplacement.
--
-- Repartition **derivee de la base**, pas de references codees en dur : chaque
-- article existant est place sur la premiere place de la premiere allee, et la
-- moitie de son stock sur une deuxieme place quand il y en a une.
--
-- Deux raisons a cette ecriture. La premiere est la robustesse : un jeu de
-- demonstration qui nomme `PLA-2841` produit silencieusement zero ligne sur une
-- base dont le catalogue a evolue — c'est exactement ce qui est arrive, la
-- table restait vide sans lever la moindre erreur. La seconde est l'invariant :
-- chaque quantite est une *part* de `stock_balances.quantity`, donc la somme
-- des lignes vaut toujours le total, sans que l'operateur ait a reconcilier
-- deux nombres saisis a la main.
-- ---------------------------------------------------------------------------
INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite)
SELECT a.id, p.id, CEIL(s.quantity / 2)
FROM articles a
JOIN stock_balances s ON s.reference_id = a.id
JOIN emplacements p ON p.niveau = 'place' AND p.code = 'P-01'
WHERE s.quantity > 0
ON DUPLICATE KEY UPDATE quantite = VALUES(quantite);

-- Seconde place : le reliquat. `quantity - CEIL(quantity/2)` vaut `FLOOR`,
-- et les deux moities redonnent exactement le total. Ligne volontairement
-- absente pour les articles dont le stock tient sur une seule place.
INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite)
SELECT a.id, p.id, s.quantity - CEIL(s.quantity / 2)
FROM articles a
JOIN stock_balances s ON s.reference_id = a.id
JOIN emplacements e ON e.niveau = 'etagere' AND e.code = 'E-01'
JOIN emplacements p ON p.parent_id = e.id AND p.niveau = 'place' AND p.code = 'P-02'
WHERE s.quantity >= 2
ON DUPLICATE KEY UPDATE quantite = VALUES(quantite);

-- ---------------------------------------------------------------------------
-- Carnet fournisseurs
--
-- Trois fournisseurs aux conditions de livraison distinctes : c'est ce que le
-- cahier des charges demande de pouvoir filtrer (« selection du fournisseur et
-- du mode de livraison »).
-- ---------------------------------------------------------------------------
INSERT INTO fournisseurs (nom, code, email, telephone, adresse, ville, code_postal, delai_livraison, mode_livraison, actif) VALUES
  ('Autoparts Distribution',  'AUT', 'contact@autoparts-dist.fr', '01 42 18 33 44', '12 rue de la Fonderie',  'Saint-Denis', '93400', 3,  'livraison', 1),
  ('Batteries Express SARL',  'BAT', 'commande@batteries-express.fr','01 45 22 71 09', '5 avenue Victor Hugo','Melun',       '77000', 1,  'express',   1),
  ('Lubrifiants du Sud',      'LUB', 'pro@lubrifiants-sud.fr',    '04 91 55 20 18', 'Zone Commerciale Pontet','Marseille',  '13000', 5,  'retrait',   1)
ON DUPLICATE KEY UPDATE email = VALUES(email), telephone = VALUES(telephone);

-- ---------------------------------------------------------------------------
-- Commande fournisseur de demonstration
--
-- La ligne porte un article ** reelement sous son seuil**, selectionne par la
-- requete (`quantity <= minimum_quantity`) plutot que nomme : une reference
-- codee en dur disparaitrait du catalogue et laisserait une commande vide,
-- sans erreur. C'est aussi la situation que la liste « a commander » du
-- cahier des charges doit produire.
-- ---------------------------------------------------------------------------
INSERT INTO commandes_fournisseurs (fournisseur_id, date_commande, statut, mode_livraison, date_livraison_prevue, notes)
SELECT f.id, '2026-09-24', 'envoyée', 'livraison', '2026-09-27', 'Reapprovisionnement des articles sous le seuil'
FROM fournisseurs f
WHERE f.code = 'AUT'
  AND NOT EXISTS (SELECT 1 FROM commandes_fournisseurs cf WHERE cf.fournisseur_id = f.id AND cf.date_commande = '2026-09-24');

INSERT INTO commande_four_lines (commande_id, ligne, reference, designation, quantite, prix_unitaire)
SELECT cf.id, 1, a.reference, a.designation,
       GREATEST(s.minimum_quantity * 2 - s.quantity, 1),
       a.unit_price_ht
FROM commandes_fournisseurs cf
JOIN fournisseurs f ON f.id = cf.fournisseur_id
JOIN articles a ON a.id = (
  SELECT sb.reference_id FROM stock_balances sb
  WHERE sb.quantity <= sb.minimum_quantity
  ORDER BY sb.quantity ASC, sb.reference_id ASC
  LIMIT 1
)
JOIN stock_balances s ON s.reference_id = a.id
WHERE f.code = 'AUT' AND cf.date_commande = '2026-09-24'
ON DUPLICATE KEY UPDATE quantite = VALUES(quantite), prix_unitaire = VALUES(prix_unitaire);
