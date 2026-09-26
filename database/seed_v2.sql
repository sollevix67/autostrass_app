-- ============================================================================
-- Jeu de donnees de demonstration — metiers v2
-- ----------------------------------------------------------------------------
-- Complementaire a `database/schema.sql` (articles / stock v1).
-- Idempotent : ON DUPLICATE KEY UPDATE ou INSERT IGNORE.
--
--   mysql -h HOST -u USER -p autostrass_test < database/seed_v2.sql
-- ============================================================================

USE autostrass;

-- ---------------------------------------------------------------------------
-- Utilisateurs (mots de passe de demonstration, hash bcrypt)
-- ---------------------------------------------------------------------------
-- mot de passe commun : `demo1234` (bcrypt cost 10, 60 caracteres).
-- Ces comptes sont des jeux de test : ils doivent etre supprimes ou changes
-- avant toute mise en production.
--
-- Le hash est repete litteralement dans chaque ligne plutot que passe par une
-- variable `SET @pwd`. Une variable de session n'est pas substituee de facon
-- fiable par tous les pilotes (mysql2 en mode multi-instructions execute le
-- script sans garantir le meme contexte), et l'echec est silencieux :
-- `password_hash` arrive NULL, la contrainte NOT NULL rejette la ligne, et
-- aucun compte n'est cree sans que l'erreur remonte clairement.
INSERT INTO users (nom, prenom, email, telephone, role, actif, password_hash)
VALUES
  ('Laurent',  'Marie',    'marie.laurent@autostrass.fr',  '0612000001', 'admin',      1, '$2b$10$mAwKLaKjH59dC.XnRA9qa.SDQ.soY1wz3Inr5n.1YlaX6TqNFmWXq'),
  ('Moreau',   'Karim',    'karim.moreau@autostrass.fr',   '0612000002', 'magasinier', 1, '$2b$10$mAwKLaKjH59dC.XnRA9qa.SDQ.soY1wz3Inr5n.1YlaX6TqNFmWXq'),
  ('Bernard',  'Sophie',   'sophie.bernard@autostrass.fr', '0612000003', 'caissier',   1, '$2b$10$mAwKLaKjH59dC.XnRA9qa.SDQ.soY1wz3Inr5n.1YlaX6TqNFmWXq'),
  ('Petit',    'Luc',      'luc.petit@autostrass.fr',     '0612000004', 'magasinier', 0, '$2b$10$mAwKLaKjH59dC.XnRA9qa.SDQ.soY1wz3Inr5n.1YlaX6TqNFmWXq')
ON DUPLICATE KEY UPDATE nom = VALUES(nom), role = VALUES(role), actif = VALUES(actif);

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
INSERT INTO clients (nom, prenom, telephone, email, adresse, ville, code_postal, type, numero_client)
VALUES
  ('Dupont',   'Jean',   '0611000101', 'jean.dupont@example.fr',   '12 rue de la Republique', 'Lyon',      '69001',    'particulier',    'CLI-0001'),
  ('Martin',   'Claire', '0611000102', 'claire.martin@example.fr', '5 avenue Jean Jaures',   'Villeurbanne', '69100', 'professionnel',  'CLI-0002'),
  ('Garcia',   'Miguel', '0611000103', 'miguel.garcia@example.fr', '27 cours Gambetta',      'Lyon',      '69003',    'professionnel',  'CLI-0003'),
  ('Roux',     'Nadia',  '0611000104', 'nadia.roux@example.fr',    '8 rue de la Part-Dieu',  'Lyon',      '69003',    'particulier',    'CLI-0004')
ON DUPLICATE KEY UPDATE email = VALUES(email), adresse = VALUES(adresse);

-- ---------------------------------------------------------------------------
-- Vehicules
-- ---------------------------------------------------------------------------
INSERT INTO vehicules (immatriculation, marque, modele, annee, type, kilometrage, proprietaire, statut)
VALUES
  ('AB-123-CD', 'Renault',    'Clio V',        2019, 'voiture',   84500, 'Martin Claire',      'disponible'),
  ('EF-456-GH', 'Peugeot',    '308 SW',        2021, 'voiture',   42300, 'Garcia Miguel',      'en service'),
  ('IJ-789-KL', 'Ford',       'Transit Custom', 2020, 'camionnette', 91000, 'Dupont Jean',       'en maintenance'),
  ('MN-012-OP', 'Mercedes',   'Sprinter 315',  2022, 'camionnette', 30800, 'Roux Nadia',        'disponible')
ON DUPLICATE KEY UPDATE marque = VALUES(marque), kilometrage = VALUES(kilometrage), statut = VALUES(statut);

-- ---------------------------------------------------------------------------
-- Commandes clients (+ lignes)
-- ---------------------------------------------------------------------------
-- `commandes` n'a pas de contrainte unique applicable au couple
-- (client, date) : on garde l'insertion idempotente via NOT EXISTS.
INSERT INTO commandes (client_id, date_commande, statut, date_livraison_prevue)
SELECT c.id, '2026-09-20', 'validée', '2026-09-28' FROM clients c
WHERE c.numero_client = 'CLI-0001'
  AND NOT EXISTS (
    SELECT 1 FROM commandes cmd WHERE cmd.client_id = c.id AND cmd.date_commande = '2026-09-20'
  );

INSERT INTO commande_lines (commande_id, ligne, reference, designation, quantite, prix_unitaire)
SELECT cmd.id, 1, 'PLA-2841', 'Plaquettes de frein avant', 2, 15.50
FROM commandes cmd
JOIN clients c ON c.id = cmd.client_id
WHERE c.numero_client = 'CLI-0001'
  AND cmd.date_commande = '2026-09-20'
ON DUPLICATE KEY UPDATE quantite = VALUES(quantite);

-- ---------------------------------------------------------------------------
-- Livraison liee a la commande ci-dessus
-- ---------------------------------------------------------------------------
-- `livraisons` n'a pas de cle unique non plus : garde-fou par NOT EXISTS.
INSERT INTO livraisons (commande_id, transporteur, date_expedition, date_livraison_prevue, adresse_livraison, statut, tracking)
SELECT cmd.id, 'Colissimo', '2026-09-22', '2026-09-28', '12 rue de la Republique, 69001 Lyon', 'en transit', '6A0000000012'
FROM commandes cmd
JOIN clients c ON c.id = cmd.client_id
WHERE c.numero_client = 'CLI-0001'
  AND cmd.date_commande = '2026-09-20'
  AND NOT EXISTS (SELECT 1 FROM livraisons l WHERE l.commande_id = cmd.id);

-- ---------------------------------------------------------------------------
-- Reception depuis un fournisseur
-- ---------------------------------------------------------------------------
INSERT INTO receptions (fournisseur, date_reception, notes)
SELECT 'Autopieces Distribution', '2026-09-22', 'Livraison hebdomadaire'
WHERE NOT EXISTS (
  SELECT 1 FROM receptions r WHERE r.fournisseur = 'Autopieces Distribution' AND r.date_reception = '2026-09-22'
);

INSERT INTO reception_lines (reception_id, ligne, reference, designation, quantite_recue, prix_unitaire)
SELECT r.id, 1, 'FIL-0920', 'Filtre a huile - Renault', 20, 8.20
FROM receptions r
WHERE r.fournisseur = 'Autopieces Distribution' AND r.date_reception = '2026-09-22'
ON DUPLICATE KEY UPDATE quantite_recue = VALUES(quantite_recue);

-- ---------------------------------------------------------------------------
-- Vente comptoir + retour partiel
-- ---------------------------------------------------------------------------
INSERT INTO ventes (client_id, date_vente, caissier, total_ht, montant_paye, monnaie, mode_paiement)
SELECT c.id, '2026-09-23 10:15:00', 'Sophie Bernard', 31.00, 50.00, 19.00, 'espèces'
FROM clients c WHERE c.numero_client = 'CLI-0002'
  AND NOT EXISTS (SELECT 1 FROM ventes v WHERE v.client_id = c.id AND v.date_vente = '2026-09-23 10:15:00');

INSERT INTO vente_lines (vente_id, ligne, reference, designation, quantite, prix_unitaire, montant)
SELECT v.id, 1, 'BAT-7710', 'Batterie 12V 70Ah', 1, 15.50, 15.50
FROM ventes v
JOIN clients c ON c.id = v.client_id
WHERE c.numero_client = 'CLI-0002' AND v.date_vente = '2026-09-23 10:15:00'
ON DUPLICATE KEY UPDATE quantite = VALUES(quantite);

INSERT INTO retours (vente_id, client_id, date_retour, motif, montant_rembourse)
SELECT v.id, c.id, '2026-09-25', 'Piece non conforme', 15.50
FROM ventes v
JOIN clients c ON c.id = v.client_id
WHERE c.numero_client = 'CLI-0002' AND v.date_vente = '2026-09-23 10:15:00'
  AND NOT EXISTS (SELECT 1 FROM retours r WHERE r.vente_id = v.id);

INSERT INTO retour_lines (retour_id, ligne, reference, designation, quantite, prix_unitaire)
SELECT r.id, 1, 'BAT-7710', 'Batterie 12V 70Ah', 1, 15.50
FROM retours r
WHERE r.date_retour = '2026-09-25'
ON DUPLICATE KEY UPDATE quantite = VALUES(quantite);
