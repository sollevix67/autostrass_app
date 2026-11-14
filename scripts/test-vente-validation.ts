import { deepEqual, equal, ok, throws } from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { venteBodySchema } from '../server/middleware/schemas.js'
import { venteTotals, ventePayment, hasCentPrecision } from '../src/utils/venteTotals.js'
import { toHttpError } from '../server/repositories/mapping.js'

const line = { reference: 'TEST', designation: 'Test', quantite: 1, prixUnitaire: 31, tauxTva: 20 }
deepEqual(venteTotals([line]), { totalHT: 31, totalTVA: 6.2, totalTTC: 37.2 })
deepEqual(venteTotals([line, { ...line, quantite: 3, prixUnitaire: 0.1, tauxTva: 5.5 }]), { totalHT: 31.3, totalTVA: 6.22, totalTTC: 37.52 })
deepEqual(venteTotals([{ ...line, prixUnitaire: 0.05, tauxTva: 10 }]), { totalHT: 0.05, totalTVA: 0.01, totalTTC: 0.06 })
deepEqual(ventePayment(37.2, 'espèces', 50), { montantPaye: 50, monnaie: 12.8 })
deepEqual(ventePayment(37.2, 'carte', 37.2, 0), { montantPaye: 37.2, monnaie: 0 })
for (const mode of ['carte', 'chèque']) throws(() => ventePayment(37.2, mode, 50), /égal/)
throws(() => ventePayment(37.2, 'espèces', 31), /inférieur/)
for (const monnaie of [37.2, 50, 99]) throws(() => ventePayment(37.2, 'espèces', 50, monnaie), /monnaie/)
throws(() => ventePayment(37.2, 'espèces', 50.001), /centimes/)
throws(() => venteTotals([{ ...line, prixUnitaire: 0.015 }]), /invalide/)
throws(() => venteTotals(Array.from({ length: 2 }, () => ({ ...line, quantite: 9999, prixUnitaire: 1_000_000 }))), /capacité/)
for (const price of [0.29, 19.99, 999999.99]) ok(hasCentPrecision(price))
const body = { dateVente: '2026-11-14T10:00:00Z', modePaiement: 'espèces', montantPaye: 50, articles: [line] }
equal(venteBodySchema.safeParse({ ...body, articles: [{ ...line, prixUnitaire: 0.015 }] }).success, false)
equal(venteBodySchema.safeParse(body).success, true)
console.log('Montants : TTC, taux mixtes, arrondis, rendu, précision et plafond conformes.')

// Pool créé sans connexion : le repository est remplacé avant toute lecture.
process.env.AUTOSTRASS_SETTINGS_FILE = resolve(tmpdir(), `autostrass-auth-unit-${randomBytes(8).toString('hex')}.json`)
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_PORT: '1', DB_USER: 'unit', DB_PASSWORD: 'unit', DB_NAME: 'autostrass_unit', JWT_SECRET: randomBytes(32).toString('hex') })
const { requireAuth, issueToken, AuthError } = await import('../server/middleware/auth.js')
const { UtilisateurRepository } = await import('../server/repositories/utilisateurRepository.js')
const { pool } = await import('../server/db/client.js')
const original = UtilisateurRepository.prototype.findById
const user = { id: 1, email: 'unit@example.fr', nom: 'Test', prenom: 'Unit', role: 'caissier' as const }
const token = await issueToken(user)
async function auth(headers: Record<string, string>): Promise<unknown> {
  let result: unknown
  await requireAuth({ headers } as never, {} as never, (error?: unknown) => { result = error })
  return result
}
try {
  for (const code of ['ECONNREFUSED', 'ETIMEDOUT']) {
    UtilisateurRepository.prototype.findById = async () => { throw Object.assign(new Error('Database unavailable'), { code }) }
    deepEqual(toHttpError(await auth({ authorization: `Bearer ${token}` })), { status: 503, code: 'DATABASE_UNAVAILABLE' })
  }
  ok(await auth({ authorization: 'Bearer invalide' }) instanceof AuthError)
  ok(await auth({ cookie: 'autostrass_token=%ZZ' }) instanceof AuthError)
  console.log('Authentification : JWT réel, pannes SQL préservées en 503, jetons invalides en 401.')
} finally {
  UtilisateurRepository.prototype.findById = original
  await pool?.end()
}
