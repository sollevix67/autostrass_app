import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import type { RowDataPacket } from 'mysql2/promise'
import { createTestEnvironment } from './lib/test-environment.js'

const env = await createTestEnvironment({ seed: false })
const query = async (sql: string) => (await env.connection.query<RowDataPacket[]>(sql))[0]
const migrationJournal = () => query('SELECT hash, created_at FROM __drizzle_migrations ORDER BY id')
const run = (path: string) => env.runScript(path, { echo: false })

try {
  assert.match((await query('SELECT DATABASE() AS name'))[0].name, /^autostrass_transfer_test_[a-f0-9]{16}$/)
  const migrationsFolder = fileURLToPath(new URL('../database/drizzle', import.meta.url))
  const expected = readMigrationFiles({ migrationsFolder }).map(({ hash, folderMillis }) => ({ hash, created_at: folderMillis }))
  assert.deepEqual(await migrationJournal(), expected)
  for (const table of ['articles', 'stock_balances', 'stock_movements', 'v_stock', 'users', 'clients', 'ventes', 'commandes']) {
    assert.equal((await query(`SELECT COUNT(*) AS n FROM ${table}`))[0].n, 0, table)
  }
  console.log('OK Migration complète de la base vierge et absence de données de démonstration')

  const motDePasse = randomBytes(24).toString('hex')
  const createAdmin = (email: string, password: string) => env.runScript('scripts/create-first-admin.ts', {
    args: ['Camille', 'Installation', email], input: password + '\n', echo: false,
  })
  await assert.rejects(createAdmin('essai@example.test', 'demo1234'), /reserve aux comptes de demonstration/)
  const results = await Promise.allSettled([
    createAdmin('installation-a@example.test', motDePasse), createAdmin('installation-b@example.test', motDePasse),
  ])
  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1)
  const rejected = results.find((result) => result.status === 'rejected')
  assert.match(String(rejected?.reason), /contient déjà des utilisateurs/)
  const users = await query('SELECT email, role FROM users')
  assert.equal(users.length, 1)
  assert.equal(users[0].role, 'admin')
  const login = await fetch(`${env.baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: users[0].email, motDePasse }),
  })
  assert.equal(login.status, 200)
  const { token } = await login.json() as { token: string }
  const me = await fetch(`${env.baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(me.status, 200)
  console.log('OK Premier administrateur unique en concurrence et connexion réelle sans démonstration')

  await query("INSERT INTO articles (reference, designation) VALUES ('INSTALL-CLIENT', 'Article existant')")
  await query("INSERT INTO stock_balances (reference_id, quantity) SELECT id, 7 FROM articles WHERE reference='INSTALL-CLIENT'")
  await query("CREATE OR REPLACE VIEW v_stock AS SELECT reference, designation, 42 AS temoin FROM articles WHERE reference='INSTALL-CLIENT'")
  await run('scripts/migrate.ts')
  assert.deepEqual(await migrationJournal(), expected)
  assert.deepEqual(await query('SELECT * FROM v_stock'), [{ reference: 'INSTALL-CLIENT', designation: 'Article existant', temoin: 42 }])
  assert.deepEqual(await query('SELECT email, role FROM users'), users)
  console.log('OK Rejeu du migrateur avec conservation du catalogue, de la vue, des comptes et du journal')

  await query("CREATE TRIGGER installation_seed_rollback BEFORE INSERT ON fournisseurs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='TEST_ROLLBACK_DEMO'")
  await assert.rejects(run('scripts/seed.ts'), /TEST_ROLLBACK_DEMO/)
  assert.deepEqual(await query('SELECT email, role FROM users'), users)
  assert.equal((await query('SELECT COUNT(*) AS n FROM articles'))[0].n, 1)
  await query('DROP TRIGGER installation_seed_rollback')
  console.log('OK Échec en cours de chargement avec annulation des écritures de démonstration')

  const other = await createTestEnvironment({ seed: false })
  try {
    const { host, port, user, password, database } = env.connection.config
    await writeFile(other.settingsPath, JSON.stringify({ database: { host, port, user, password, database } }), { mode: 0o600, flag: 'wx' })
    // Les DB_* de cette commande désignent l'autre base jetable.
    await other.runScript('scripts/seed.ts', { echo: false })
    const [rows] = await other.connection.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM users')
    assert.equal(rows[0].n, 0)
    assert.equal((await query('SELECT COUNT(*) AS n FROM users'))[0].n, 5)
  } finally {
    await other.close()
  }
  console.log('OK Chargement sur la base des paramètres de l’instance quand DB_NAME désigne une autre base')
  const catalogue = () => query(`SELECT a.reference, a.prix_unitaire_ttc, s.quantity, s.minimum_quantity,
    (SELECT SUM(p.quantite) FROM stock_par_emplacements p WHERE p.reference_id = a.id) AS affecte
    FROM articles a JOIN stock_balances s ON s.reference_id = a.id ORDER BY a.reference`)
  const seeded = await catalogue()
  assert.deepEqual(seeded.map((row) => [row.reference, Number(row.prix_unitaire_ttc), row.quantity, row.minimum_quantity]), [
    ['BAT-7710', 54, 6, 4], ['FIL-0920', 9.84, 3, 8], ['HUI-5400', 26.4, 14, 10],
    ['INSTALL-CLIENT', 0, 7, 0], ['PLA-2841', 18.6, 12, 6],
  ])
  for (const row of seeded) {
    if (row.reference === 'INSTALL-CLIENT') assert.equal(row.affecte, null)
    else assert.equal(Number(row.affecte), row.quantity)
  }
  await query("UPDATE articles SET unit_price_ht=20, prix_unitaire_ttc=24 WHERE reference='PLA-2841'")
  // Le magasinier a ajouté huit plaquettes au non-affecté et y a transféré
  // toutes les batteries. Une partie du stock métier a été rangée.
  await query("UPDATE stock_balances s JOIN articles a ON a.id=s.reference_id SET s.quantity=20 WHERE a.reference='PLA-2841'")
  await query("DELETE p FROM stock_par_emplacements p JOIN articles a ON a.id=p.reference_id WHERE a.reference='BAT-7710'")
  await query(`INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite)
    SELECT a.id, (SELECT MIN(id) FROM emplacements WHERE niveau='place'), 2 FROM articles a WHERE a.reference='INSTALL-CLIENT'`)
  const modified = await catalogue()
  const allocations = () => query('SELECT reference_id, emplacement_id, quantite FROM stock_par_emplacements ORDER BY reference_id, emplacement_id')
  const positions = await allocations()
  await run('scripts/seed.ts')
  assert.deepEqual(await catalogue(), modified)
  assert.deepEqual(await allocations(), positions)
  assert.equal((await query('SELECT COUNT(*) AS n FROM users'))[0].n, 5)
  console.log('OK Conservation des prix, du stock non affecté et des répartitions partielles au rejeu')

  for (const invalid of [21, -1]) {
    await env.connection.execute("UPDATE stock_par_emplacements p JOIN articles a ON a.id=p.reference_id SET p.quantite=? WHERE a.reference='PLA-2841'", [invalid])
    const before = await allocations()
    await assert.rejects(run('scripts/seed.ts'), /Répartition de stock invalide/)
    assert.deepEqual(await allocations(), before)
  }
  console.log('OK Répartitions excédentaires ou négatives signalées sans correction implicite')
} finally {
  await env.close()
}
