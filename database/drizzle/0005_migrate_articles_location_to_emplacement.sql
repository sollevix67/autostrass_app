-- Create default allee if not exists
INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite, actif)
SELECT 'allee', NULL, 'DEFAULT_ALLEE', 'Default Allee', 0, true
WHERE NOT EXISTS (SELECT 1 FROM emplacements WHERE code = 'DEFAULT_ALLEE' AND niveau = 'allee');
--> statement-breakpoint

-- Create default etagere under the default allee if not exists
INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite, actif)
SELECT 'etagere', e.id, 'DEFAULT_ETAGERE', 'Default Etagere', 0, true
FROM emplacements e
WHERE e.code = 'DEFAULT_ALLEE' AND e.niveau = 'allee'
AND NOT EXISTS (SELECT 1 FROM emplacements WHERE code = 'DEFAULT_ETAGERE' AND niveau = 'etagere' AND parent_id = e.id);
--> statement-breakpoint

-- Now, for each distinct location in articles, create a place under the default etagere if it doesn't exist.
-- We'll use a temporary table to store the distinct trimmed locations.
CREATE TEMPORARY TABLE IF NOT EXISTS temp_locations AS (SELECT DISTINCT TRIM(location) AS loc FROM articles WHERE TRIM(location) IS NOT NULL AND TRIM(location) != '');
--> statement-breakpoint

-- We'll insert places for each location in the temp table.
INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite, actif)
SELECT 'place', etagere.id, LEFT(loc, 32), loc, 0, true
FROM temp_locations
JOIN emplacements etagere ON etagere.code = 'DEFAULT_ETAGERE' AND etagere.niveau = 'etagere'
WHERE NOT EXISTS (
    SELECT 1 FROM emplacements e2
    WHERE e2.niveau = 'place'
    AND e2.parent_id = etagere.id
    AND e2.code = LEFT(loc, 32)
);
--> statement-breakpoint

-- Now update the articles table to set the emplacement_id to the place that matches the location.
UPDATE articles a
JOIN emplacements e ON e.code = LEFT(TRIM(a.location), 32) AND e.niveau = 'place' AND e.parent_id = (
    SELECT id FROM emplacements WHERE code = 'DEFAULT_ETAGERE' AND niveau = 'etagere'
)
SET a.emplacement_id = e.id
WHERE TRIM(a.location) IS NOT NULL AND TRIM(a.location) != ''
  AND a.emplacement_id IS NULL;
--> statement-breakpoint

-- Clean up
DROP TEMPORARY TABLE IF EXISTS temp_locations;
