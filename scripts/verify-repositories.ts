/**
 * Verification des repositories Drizzle contre la base reelle.
 *
 * Usage : `npx tsx scripts/verify-repositories.ts`
 *
 * Ce script n'est pas un test : il lit les donnees du schema v2 et affiche ce
 * que chaque repository renvoie reellement. Il sert a reperer les problemes de
 * conversion (DECIMAL renvoye en chaine, DATE decalee d'un jour, ENUM mal
 * mappe) que le typage statique ne peut pas voir.
 */

import { db } from '../server/db/client.js'
import {
  ClientRepository,
  VehiculeRepository,
} from '../server/repositories/referentielRepositories.js'
import { UtilisateurRepository } from '../server/repositories/utilisateurRepository.js'
import { LivraisonRepository } from '../server/repositories/livraisonRepository.js'
import {
  createReceptionRepository,
  createVenteRepository,
  createCommandeRepository,
  createRetourRepository,
} from '../server/repositories/documentRepositories.js'

if (!db) {
  console.error('Base non configuree : renseignez DB_* dans .env.')
  process.exit(1)
}

const clients = new ClientRepository(db)
const vehicules = new VehiculeRepository(db)
const users = new UtilisateurRepository(db)
const livraisons = new LivraisonRepository(db)
const receptions = createReceptionRepository(db)
const ventes = createVenteRepository(db)
const commandes = createCommandeRepository(db)
const retours = createRetourRepository(db)

const clientList = await clients.list()
console.log('clients:', clientList.length)
console.log('  premier:', clientList[0]?.numeroClient, '|', clientList[0]?.ville, '| type', typeof clientList[0]?.codePostal)

const parc = await vehicules.listOrdered()
console.log('vehicules:', parc.map((v) => v.immatriculation).join(', '))

const userList = await users.list()
console.log('utilisateurs:', userList.length)
console.log('  ', userList.map((u) => `${u.email}:${u.role}:${u.actif ? 'actif' : 'inactif'}`).join(' | '))

// Controle de securite : le hash ne doit apparaitre dans aucune forme.
const leaked = userList.some((u) => 'passwordHash' in u || 'password_hash' in u)
console.log('  hash expose dans la liste ?', leaked ? 'OUI (BUG)' : 'non')

const livraisonList = await livraisons.listOrdered()
console.log(
  'livraisons:',
  livraisonList.map((l) => `${l.commandeId}/${l.statut}/${l.tracking ?? 'sans-tracking'}`).join(', '),
)

const receptionList = await receptions.list()
const reception = receptionList[0]
console.log('receptions:', receptionList.length)
if (reception) {
  console.log('  ', reception.fournisseur, '|', reception.dateReception, '| lignes', reception.articles.length, '| total', reception.totalHT, `(typeof ${typeof reception.totalHT})`)
}

const venteList = await ventes.list()
const vente = venteList[0]
console.log('ventes:', venteList.length)
if (vente) {
  console.log('  ', vente.caissier, '|', vente.modePaiement, '| total', vente.totalHT, '| lignes', vente.articles.length)
}

const commandeList = await commandes.list()
const commande = commandeList[0]
console.log('commandes:', commandeList.length)
if (commande) {
  console.log('  ', commande.statut, '| livraison', commande.dateLivraisonPrevue, '| lignes', commande.articles.length)
}

const retourList = await retours.list()
const retour = retourList[0]
console.log('retours:', retourList.length)
if (retour) {
  console.log('  ', retour.motif, '| rembourse', retour.montantRembourse, '| lignes', retour.articles.length)
}

process.exit(0)
