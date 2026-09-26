/**
 * Routes REST des 8 metiers du schema v2.
 *
 * Toute la surface metier est derriere `requireAuth` : meme la lecture exige
 * un jeton valide. Les droits sont affines par metier :
 * - lecture        : tout utilisateur authentifie
 * - ecriture depot : admin, magasinier
 * - caisse         : admin, caissier
 * - administration : admin seul
 *
 * `admin` passe partout : c'est le role de supervision du depot, pas un role
 * metier parmi d'autres.
 */

import { Router, type Request } from 'express'
import { requireAuth, requireRole, hashPassword, validatePasswordStrength, AuthError } from './auth.js'
import { crudRoutes, handler, parseBody, requireDb, requireId, type CrudRepository } from './crud.js'
import { requireCsrf } from './csrf.js'
import { documentRoutes } from './documentRoutes.js'
import {
  clientBodySchema,
  clientPatchSchema,
  commandeBodySchema,
  commandeHeadPatchSchema,
  livraisonBodySchema,
  livraisonPatchSchema,
  receptionBodySchema,
  receptionHeadPatchSchema,
  retourBodySchema,
  retourHeadPatchSchema,
  utilisateurBodySchema,
  utilisateurPatchSchema,
  venteBodySchema,
  venteHeadPatchSchema,
  vehiculeBodySchema,
  vehiculePatchSchema,
  type ClientInput,
  type ClientPatch,
  type LivraisonInput,
  type LivraisonPatch,
  type VenteInput,
  type VehiculeInput,
  type VehiculePatch,
} from './schemas.js'
import { ClientRepository, VehiculeRepository } from '../repositories/referentielRepositories.js'
import { UtilisateurRepository } from '../repositories/utilisateurRepository.js'
import { LivraisonRepository } from '../repositories/livraisonRepository.js'
import {
  createCommandeRepository,
  createReceptionRepository,
  createRetourRepository,
  createVenteRepository,
} from '../repositories/documentRepositories.js'
import type { UserRole } from '../db/schema.js'

/** Roles autorises a ecrire dans le depot. */
const DEPOT_WRITE: readonly UserRole[] = ['magasinier']
/** Roles autorises a encaisser. */
const CAISSE_WRITE: readonly UserRole[] = ['caissier']

/** Vrai si la requete vise le compte authentifie lui-meme. */
function isSelf(request: Request, id: number): boolean {
  return (request as Request & { user?: { id: number } }).user?.id === id
}

export function createApiRouter(): Router {
  const router = Router()

  // Toute la surface metier exige un jeton valide.
  router.use(requireAuth)

  // `SameSite=Lax` sur le cookie de session n'interdit pas les requetes
  // emanant du meme site. Le double-soumission CSRF ferme ce reste : toute
  // ecriture doit aussi porter un `X-CSRF-Token` egal au cookie. Montre
  // apres `requireAuth` : inutile de verifier un jeton sur une requete qui va
  // de toute facon etre refusee.
  router.use(requireCsrf)

  // --- Clients ------------------------------------------------------------
  // `Router()` doit etre cree dans une variable puis monte : `router.use()`
  // renvoie le routeur PARENT, pas le sous-routeur. Passer sa valeur a
  // `crudRoutes` enregistrait les routes a la racine `/api`, d'ou un
  // « 400 Identifiant invalide » sur `GET /api/clients` (id vaut « clients »)
  // et des 404 sur `POST /api/clients`.
  const clientsRouter = Router()
  router.use('/clients', clientsRouter)

  // Recherche par numero de dossier, enregistree AVANT le CRUD : sinon
  // `GET /:id` avalerait le segment « numero ».
  clientsRouter.get(
    '/numero/:numero',
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const found = await new ClientRepository(client).findByNumber(String(request.params.numero ?? ''))
      if (found === null) {
        response.status(404).json({ error: 'NOT_FOUND', message: 'Client introuvable.' })
        return
      }
      response.json(found)
    }),
  )

  crudRoutes<ClientInput, ClientPatch>({
    resource: 'Client',
    router: clientsRouter,
    factory: (client) =>
      new ClientRepository(client) as unknown as CrudRepository<ClientInput, ClientPatch>,
    createSchema: clientBodySchema,
    patchSchema: clientPatchSchema,
    // Le referentiel client est gere par le depot, pas par la caisse.
    rolesWrite: DEPOT_WRITE,
  })

  // --- Vehicules ---------------------------------------------------------
  const vehiculesRouter = Router()
  router.use('/vehicules', vehiculesRouter)
  crudRoutes<VehiculeInput, VehiculePatch>({
    resource: 'Vehicule',
    router: vehiculesRouter,
    factory: (client) =>
      new VehiculeRepository(client) as unknown as CrudRepository<VehiculeInput, VehiculePatch>,
    createSchema: vehiculeBodySchema,
    patchSchema: vehiculePatchSchema,
    rolesWrite: DEPOT_WRITE,
  })

  // --- Utilisateurs (administration) --------------------------------------
  // Ces routes sont ecrites explicitement plutot que via `crudRoutes` : le
  // mot de passe doit etre hashe, et un administrateur ne doit pas pouvoir se
  // supprimer, se desactiver ou se retirer ses propres droits. Enregistrement
  // de la fabrique plus bas, les ecritures ecrivaient deux fois la meme URL et
  // la premiere servie l'emportait : le garde-fou etait contourne.
  const utilisateursRouter = Router()
  router.use('/utilisateurs', utilisateursRouter)

  utilisateursRouter.get(
    '/',
    handler(async (_request, response) => {
      const client = requireDb(response)
      if (!client) return
      response.json(await new UtilisateurRepository(client).list())
    }),
  )

  utilisateursRouter.get(
    '/:id',
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      const found = await new UtilisateurRepository(client).findById(id)
      if (found === null) {
        response.status(404).json({ error: 'NOT_FOUND', message: 'Utilisateur introuvable.' })
        return
      }
      response.json(found)
    }),
  )

  /**
   * Le hash du mot de passe est traite ici : le schema fournit le mot de passe
   * en clair, le repository ne connait que le hash. Il ne figure jamais dans
   * la reponse — le type `UtilisateurRow` ne contient pas ce champ.
   */
  utilisateursRouter.post(
    '/',
    requireRole('admin'),
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const value = parseBody(utilisateurBodySchema, request.body)

      const weak = validatePasswordStrength(value.motDePasse)
      if (weak !== null) {
        response.status(422).json({ error: 'VALIDATION_ERROR', message: 'Donnees invalides.', details: { motDePasse: weak } })
        return
      }

      const created = await new UtilisateurRepository(client).create({
        nom: value.nom,
        prenom: value.prenom,
        email: value.email,
        telephone: value.telephone || null,
        role: value.role,
        actif: value.actif ?? true,
        passwordHash: hashPassword(value.motDePasse),
      })
      response.status(201).json(created)
    }),
  )

  utilisateursRouter.put(
    '/:id',
    requireRole('admin'),
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      const value = parseBody(utilisateurPatchSchema, request.body)

      if (value.motDePasse !== undefined) {
        const weak = validatePasswordStrength(value.motDePasse)
        if (weak !== null) {
          response.status(422).json({ error: 'VALIDATION_ERROR', message: 'Donnees invalides.', details: { motDePasse: weak } })
          return
        }
      }

      const repository = new UtilisateurRepository(client)
      const current = await repository.findById(id)
      if (current === null) {
        response.status(404).json({ error: 'NOT_FOUND', message: 'Utilisateur introuvable.' })
        return
      }

      // Un administrateur ne doit pas pouvoir se retirer ses propres droits :
      // le depot resterait sans personne pour le gerer.
      if (isSelf(request, id) && (value.actif === false || (value.role !== undefined && value.role !== 'admin'))) {
        response.status(409).json({ error: 'SELF_LOCKOUT', message: 'Vous ne pouvez pas retirer vos propres droits.' })
        return
      }

      const updated = await repository.update(id, {
        ...(value.nom !== undefined && { nom: value.nom }),
        ...(value.prenom !== undefined && { prenom: value.prenom }),
        ...(value.email !== undefined && { email: value.email }),
        ...(value.telephone !== undefined && { telephone: value.telephone || null }),
        ...(value.role !== undefined && { role: value.role }),
        ...(value.actif !== undefined && { actif: value.actif }),
        ...(value.motDePasse !== undefined && { passwordHash: hashPassword(value.motDePasse) }),
      })
      if (updated === null) {
        response.status(404).json({ error: 'NOT_FOUND', message: 'Utilisateur introuvable.' })
        return
      }
      response.json(updated)
    }),
  )

  utilisateursRouter.delete(
    '/:id',
    requireRole('admin'),
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      if (isSelf(request, id)) {
        response.status(409).json({ error: 'SELF_LOCKOUT', message: 'Vous ne pouvez pas supprimer votre propre compte.' })
        return
      }
      const deleted = await new UtilisateurRepository(client).remove(id)
      if (!deleted) {
        response.status(404).json({ error: 'NOT_FOUND', message: 'Utilisateur introuvable.' })
        return
      }
      response.status(204).end()
    }),
  )

  // --- Receptions --------------------------------------------------------
  documentRoutes({
    router,
    path: '/receptions',
    resource: 'Reception',
    repository: createReceptionRepository,
    rolesWrite: DEPOT_WRITE,
    createSchema: receptionBodySchema,
    headPatch: receptionHeadPatchSchema,
    toHead: (value) => ({
      fournisseur: value.fournisseur,
      date_reception: value.dateReception,
      notes: (value.notes as string | undefined) || null,
    }),
    toHeadPatch: (value) => ({
      ...(value.fournisseur !== undefined && { fournisseur: value.fournisseur }),
      ...(value.dateReception !== undefined && { date_reception: value.dateReception }),
      ...(value.notes !== undefined && { notes: value.notes || null }),
    }),
  })

  // --- Ventes ------------------------------------------------------------
  documentRoutes({
    router,
    path: '/ventes',
    resource: 'Vente',
    repository: createVenteRepository,
    rolesWrite: CAISSE_WRITE,
    createSchema: venteBodySchema,
    headPatch: venteHeadPatchSchema,
    toHead: (value) => {
      const articles = value.articles as VenteInput['articles']
      // Le total est un champ physique de la table : on le calcule ici pour
      // qu'il soit coherent des la premiere ecriture. Le repository le
      // recalcule de toute facon a la lecture, c'est la source de verite.
      const total = articles.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0)
      return {
        client_id: (value.clientId as number | null | undefined) ?? null,
        date_vente: new Date(String(value.dateVente)),
        caissier: value.caissier,
        total_ht: total.toFixed(2),
        montant_paye: Number(value.montantPaye).toFixed(2),
        monnaie: Number(value.monnaie ?? 0).toFixed(2),
        mode_paiement: value.modePaiement,
      }
    },
    toHeadPatch: (value) => ({
      ...(value.clientId !== undefined && { client_id: value.clientId }),
      ...(value.dateVente !== undefined && { date_vente: new Date(String(value.dateVente)) }),
      ...(value.caissier !== undefined && { caissier: value.caissier }),
      ...(value.modePaiement !== undefined && { mode_paiement: value.modePaiement }),
      ...(value.montantPaye !== undefined && { montant_paye: Number(value.montantPaye).toFixed(2) }),
      ...(value.monnaie !== undefined && { monnaie: Number(value.monnaie).toFixed(2) }),
    }),
  })

  // --- Commandes clients -------------------------------------------------
  documentRoutes({
    router,
    path: '/commandes',
    resource: 'Commande',
    repository: createCommandeRepository,
    rolesWrite: CAISSE_WRITE,
    createSchema: commandeBodySchema,
    headPatch: commandeHeadPatchSchema,
    toHead: (value) => ({
      client_id: value.clientId,
      date_commande: value.dateCommande,
      statut: (value.statut as string | undefined) ?? 'en attente',
      date_livraison_prevue: (value.dateLivraisonPrevue as string | undefined) || null,
    }),
    toHeadPatch: (value) => ({
      ...(value.clientId !== undefined && { client_id: value.clientId }),
      ...(value.dateCommande !== undefined && { date_commande: value.dateCommande }),
      ...(value.statut !== undefined && { statut: value.statut }),
      ...(value.dateLivraisonPrevue !== undefined && {
        date_livraison_prevue: (value.dateLivraisonPrevue as string) || null,
      }),
    }),
  })

  // --- Livraisons --------------------------------------------------------
  const livraisonsRouter = Router()
  router.use('/livraisons', livraisonsRouter)

  // Filtre par commande, enregistre avant `GET /:id` du CRUD.
  livraisonsRouter.get(
    '/commande/:commandeId',
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const commandeId = requireId(request, response, 'commandeId')
      if (commandeId === null) return
      response.json(await new LivraisonRepository(client).listByCommande(commandeId))
    }),
  )

  crudRoutes<LivraisonInput, LivraisonPatch>({
    resource: 'Livraison',
    router: livraisonsRouter,
    factory: (client) => new LivraisonRepository(client) as unknown as CrudRepository<LivraisonInput, LivraisonPatch>,
    createSchema: livraisonBodySchema,
    patchSchema: livraisonPatchSchema,
    rolesWrite: CAISSE_WRITE,
  })

  // --- Retours -----------------------------------------------------------
  documentRoutes({
    router,
    path: '/retours',
    resource: 'Retour',
    repository: createRetourRepository,
    rolesWrite: CAISSE_WRITE,
    createSchema: retourBodySchema,
    headPatch: retourHeadPatchSchema,
    toHead: (value) => ({
      vente_id: (value.venteId as number | null | undefined) ?? null,
      client_id: value.clientId,
      date_retour: value.dateRetour,
      motif: value.motif,
      // `montant_rembourse` est NOT NULL : on ecrit 0, le repository recalcule
      // la somme des lignes a la lecture.
      montant_rembourse: '0.00',
    }),
    toHeadPatch: (value) => ({
      ...(value.venteId !== undefined && { vente_id: value.venteId }),
      ...(value.clientId !== undefined && { client_id: value.clientId }),
      ...(value.dateRetour !== undefined && { date_retour: value.dateRetour }),
      ...(value.motif !== undefined && { motif: value.motif }),
    }),
  })

  return router
}

export { AuthError }
