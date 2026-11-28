import { Router } from 'express'
import { z } from 'zod'
import { MAX_STOCK } from '../../src/schemas/inventaire.js'
import { pool } from '../db/client.js'
import { ReceptionFournisseurRepository } from '../repositories/receptionFournisseurRepository.js'
import { requireAuth, requireRole, type AuthenticatedRequest } from './auth.js'
import { requireCsrf } from './csrf.js'
import { handler, parseBody, requireDb } from './crud.js'

const positiveInteger = z.number().int().positive().max(MAX_STOCK)
const receiptSchema = z.strictObject({
  cleOperation: z.uuid('La clé de réception est invalide.').toLowerCase(),
  articles: z.array(z.strictObject({ ligne: positiveInteger, quantite: positiveInteger }))
    .min(1, 'Renseignez au moins une quantité reçue.').max(200, 'Maximum 200 lignes par réception.')
    .refine((lines) => new Set(lines.map((line) => line.ligne)).size === lines.length,
      'Chaque ligne de commande ne peut figurer qu’une fois dans la réception.'),
})

export function createReceptionFournisseurRouter(): Router {
  const router = Router()
  router.post('/:id/receptions', requireAuth, requireRole('magasinier'), requireCsrf, handler(async (request, response) => {
    const param = String(request.params.id)
    if (!/^[1-9][0-9]*$/.test(param) || Number(param) > 4_294_967_295) {
      response.status(400).json({ error: 'INVALID_ID', message: 'Identifiant de commande fournisseur invalide.' })
      return
    }
    const input = parseBody(receiptSchema, request.body)
    if (!requireDb(response)) return
    const actor = (request as AuthenticatedRequest).user!
    const result = await new ReceptionFournisseurRepository(pool!).receive(Number(param), input, actor.id)
    response.status(201).json(result)
  }))
  return router
}
