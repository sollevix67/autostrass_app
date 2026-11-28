import { Router } from 'express'
import { z } from 'zod'
import { hasCentPrecision } from '../../src/utils/venteTotals.js'
import { pool } from '../db/client.js'
import { DELIVERY_MODES } from '../db/schema.js'
import { CommandeFournisseurRepository } from '../repositories/commandeFournisseurRepository.js'
import { requireAuth, requireRole, type AuthenticatedRequest } from './auth.js'
import { handler, parseBody, requireDb } from './crud.js'
import { requireCsrf } from './csrf.js'

const id = z.number({ message: 'Identifiant requis.' }).int().positive().max(4_294_967_295)
const idParam = z.string().regex(/^[1-9]\d{0,9}$/).transform(Number).pipe(id)
const affectationSchema = z.object({
  fournisseurId: id,
  modeLivraison: z.enum(DELIVERY_MODES, { message: 'Choisissez un mode de livraison valide.' }),
}).strict()

const commandeSchema = affectationSchema.extend({
  cleCommande: z.uuid({ message: 'La clé de la commande est invalide.' }).transform((key) => key.toLowerCase()),
  articles: z.array(z.object({
    besoinId: id,
    quantite: z.number({ message: 'La quantité est requise.' }).int('La quantité doit être entière.')
      .min(1, 'La quantité doit être positive.').max(9999, 'Maximum 9 999 unités par ligne.'),
    prixUnitaire: z.number({ message: 'Le prix d’achat HT est requis.' }).min(0, 'Le prix d’achat doit être positif ou nul.')
      .max(1_000_000, 'Maximum 1 000 000 € par unité.').refine(hasCentPrecision, 'Le prix d’achat doit être exprimé en centimes.'),
  }).strict()).min(1, 'Sélectionnez au moins un besoin.').max(200, 'Maximum 200 lignes par commande.')
    .refine((lines) => new Set(lines.map((line) => line.besoinId)).size === lines.length, 'Un besoin ne peut apparaître qu’une fois par commande.'),
}).strict()

export function createCommandeFournisseurRouter(): Router {
  const router = Router()
  const depot = [requireAuth, requireCsrf, requireRole('magasinier')]

  router.get('/commandes-fournisseurs', ...depot, handler(async (_request, response) => {
    if (!requireDb(response)) return
    response.setHeader('Cache-Control', 'no-store')
    response.json(await new CommandeFournisseurRepository(pool!).list())
  }))

  router.put('/articles-a-commander/:id', ...depot, handler(async (request, response) => {
    const parsed = idParam.safeParse(request.params.id)
    if (!parsed.success) {
      response.status(400).json({ error: 'INVALID_ID', message: 'Identifiant du besoin invalide.' })
      return
    }
    const input = parseBody(affectationSchema, request.body)
    if (!requireDb(response)) return
    const user = (request as AuthenticatedRequest).user!
    response.json(await new CommandeFournisseurRepository(pool!).assign(parsed.data, input, user.id))
  }))

  router.post('/commandes-fournisseurs', ...depot, handler(async (request, response) => {
    const input = parseBody(commandeSchema, request.body)
    if (!requireDb(response)) return
    const user = (request as AuthenticatedRequest).user!
    response.status(201).json(await new CommandeFournisseurRepository(pool!).create(input, user.id))
  }))
  return router
}
