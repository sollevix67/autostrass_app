import { createInterface } from 'node:readline'
import { drizzle } from 'drizzle-orm/mysql2'
import * as schema from '../server/db/schema.js'
import { hashPassword, validatePasswordStrength } from '../server/middleware/auth.js'
import { utilisateurBodySchema } from '../server/middleware/schemas.js'
import { UtilisateurRepository } from '../server/repositories/utilisateurRepository.js'
import { withInstallationConnection } from './lib/installation.js'

async function readPassword(): Promise<string> {
  // En mode terminal, readline gère les frappes en mode brut. Sans flux de
  // sortie, la saisie ne s'affiche pas. Un gestionnaire de secrets peut aussi
  // fournir une ligne sur l'entrée standard.
  if (process.stdin.isTTY) process.stderr.write('Mot de passe du premier administrateur (saisie masquée) : ')
  const input = createInterface({ input: process.stdin, terminal: Boolean(process.stdin.isTTY), historySize: 0 })
  try {
    for await (const line of input) return line
    throw new Error('Mot de passe requis sur l’entrée standard.')
  } finally {
    input.close()
    if (process.stdin.isTTY) process.stderr.write('\n')
  }
}

try {
  const args = process.argv.slice(2)
  if (args.length !== 3) throw new Error('Usage : npm run db:admin -- "Prénom" "Nom" "email"')
  const [prenom, nom, email] = args
  const motDePasse = await readPassword()
  const parsed = utilisateurBodySchema.safeParse({ prenom, nom, email, motDePasse, role: 'admin', actif: true })
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('\n'))
  const passwordError = validatePasswordStrength(motDePasse)
  if (passwordError) throw new Error(passwordError)
  if (parsed.data.motDePasse !== motDePasse || Buffer.byteLength(motDePasse) > 72) {
    throw new Error('Utilisez un mot de passe de 72 octets maximum, sans caractère invisible ou de contrôle.')
  }

  await withInstallationConnection(async (connection) => {
    const db = drizzle(connection, { schema, mode: 'default' })
    const existing = await db.select({ id: schema.users.id }).from(schema.users).limit(1)
    if (existing.length) throw new Error('La base contient déjà des utilisateurs. Gérez les comptes dans Administration.')
    const repository = new UtilisateurRepository(db)
    await repository.create({
      prenom: parsed.data.prenom, nom: parsed.data.nom, email: parsed.data.email,
      role: 'admin', actif: true, passwordHash: hashPassword(motDePasse),
    })
  })
  console.log('Premier administrateur créé.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Échec de la création du premier administrateur.')
  process.exitCode = 1
}
