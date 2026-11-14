import assert from 'node:assert/strict'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '../server/db/schema.js'
import { UtilisateurRepository } from '../server/repositories/utilisateurRepository.js'

const createdAt = new Date('2026-11-14T10:00:00.000Z')
const updatedAt = '2026-11-14T11:00:00.000Z'
const storedUser: Record<string, unknown> = {
  id: 7, nom: 'Durand', prenom: 'Marie', email: 'marie@example.test',
  telephone: null, role: 'admin', actif: 1, createdAt, updatedAt, passwordHash: 'test-hash',
}

// Simulate Drizzle's column aliases, not the raw SQL column names.
const db = {
  select(columns: Record<string, unknown>) {
    const rows = [Object.fromEntries(Object.keys(columns).map((key) => [key, storedUser[key]]))]
    return {
      from() {
        return {
          async orderBy() { return rows },
          where() { return { async limit() { return rows } } },
        }
      },
    }
  },
} as unknown as MySql2Database<typeof schema>

const repository = new UtilisateurRepository(db)
const listed = (await repository.list())[0]
const found = await repository.findById(7)
const authenticated = await repository.findByEmailWithSecret('marie@example.test')

for (const user of [listed, found, authenticated]) {
  assert.ok(user)
  assert.equal(user.createdAt, createdAt.toISOString())
  assert.equal(user.updatedAt, updatedAt)
  assert.equal(user.actif, true)
}
assert.ok(!('passwordHash' in listed))
assert.ok(found && !('passwordHash' in found))
assert.equal(authenticated?.passwordHash, 'test-hash')
console.log('Dates utilisateurs : liste, lecture et authentification conformes')
