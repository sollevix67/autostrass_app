import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/client.js'
import { InventaireRepository } from '../repositories/inventaireRepository.js'
import { requireAuth, requireRole, type AuthenticatedRequest } from './auth.js'
import { requireCsrf } from './csrf.js'
import { parseBody } from './crud.js'
import { sanitizeText } from './sanitize.js'
import { inventaireSchema } from '../../src/schemas/inventaire.js'

const bodySchema = inventaireSchema.safeExtend({
  motif: z.string().transform((value, ctx) => {
    try { return sanitizeText(value, 255, 'Le motif') }
    catch (error) { ctx.addIssue({ code: 'custom', message: (error as Error).message }); return z.NEVER }
  }).pipe(inventaireSchema.shape.motif),
})
const querySchema = z.object({
  reference: z.string().min(1).max(64).optional(),
  before: z.string().regex(/^[1-9][0-9]*$/).transform(Number).pipe(z.number().int().max(4_294_967_295)).optional(),
})

export function createInventaireRouter(): Router {
  const router = Router()
  const repository = pool ? new InventaireRepository(pool) : null
  router.use(requireAuth, requireRole('magasinier'))
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store')
    if (!repository) { response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n’est pas configurée.' }); return }
    next()
  })
  router.get('/', async (request, response) => {
    const query = parseBody(querySchema, request.query)
    response.json(await repository!.list(query.reference, query.before))
  })
  router.get('/:reference', async (request, response) => {
    const reference = parseBody(z.string().min(1).max(64), request.params.reference)
    response.json(await repository!.prepare(reference))
  })
  router.post('/:reference', requireCsrf, async (request: AuthenticatedRequest, response) => {
    const reference = parseBody(z.string().min(1).max(64), request.params.reference)
    const input = parseBody(bodySchema, request.body)
    response.status(201).json(await repository!.record(reference, input, request.user!))
  })
  return router
}
