import { Router } from 'express'
import { requireAuth, requireRole, type AuthenticatedRequest } from './auth.js'
import { requireCsrf } from './csrf.js'
import { handler, parseBody, requireDb, requireId } from './crud.js'
import { devisCreateSchema, devisUpdateSchema, devisConversionSchema, devisPdfQuerySchema } from './devisSchemas.js'
import { DevisRepository } from '../repositories/devisRepository.js'
import { generateDevisPdf } from '../services/pdfDevis.js'
import { pool } from '../db/client.js'
import { RepositoryError } from '../repositories/simpleRepositories.js'
import { getSettings } from '../services/settingsStore.js'

export function createDevisRouter(): Router {
  const router = Router()
  const devis = Router()
  devis.use(requireAuth, requireCsrf, requireRole('caissier'))
  router.use('/devis', devis)

  devis.get('/', handler(async (_request, response) => {
    const db = requireDb(response)
    if (!db) return
    response.json(await new DevisRepository(pool!).list())
  }))

  devis.post('/', handler(async (request, response) => {
    const input = parseBody(devisCreateSchema, request.body)
    const db = requireDb(response)
    if (!db) return
    const user = (request as AuthenticatedRequest).user!
    response.status(201).json(await new DevisRepository(pool!).create(input, user))
  }))

  devis.get('/:id', handler(async (request, response) => {
    const id = requireId(request, response)
    if (id === null) return
    const db = requireDb(response)
    if (!db) return
    const found = await new DevisRepository(pool!).findById(id)
    if (!found) {
      response.status(404).json({ error: 'NOT_FOUND', message: 'Devis introuvable.' })
      return
    }
    response.json(found)
  }))

  devis.put('/:id', handler(async (request, response) => {
    const id = requireId(request, response)
    if (id === null) return
    const input = parseBody(devisUpdateSchema, request.body)
    const db = requireDb(response)
    if (!db) return
    const user = (request as AuthenticatedRequest).user!
    const updated = await new DevisRepository(pool!).update(id, input, user)
    if (!updated) {
      response.status(404).json({ error: 'NOT_FOUND', message: 'Devis introuvable.' })
      return
    }
    response.json(updated)
  }))

  devis.post('/:id/convertir', handler(async (request, response) => {
    const id = requireId(request, response)
    if (id === null) return
    const input = parseBody(devisConversionSchema, request.body)
    const db = requireDb(response)
    if (!db) return
    const user = (request as AuthenticatedRequest).user!
    const converted = await new DevisRepository(pool!).convertir(id, input, user)
    if (!converted) {
      response.status(404).json({ error: 'NOT_FOUND', message: 'Devis introuvable.' })
      return
    }
    response.json(converted)
  }))

  devis.get('/:id/pdf', handler(async (request, response) => {
    const id = requireId(request, response)
    if (id === null) return
    const query = parseBody(devisPdfQuerySchema, request.query)
    const db = requireDb(response)
    if (!db) return
    const found = await new DevisRepository(pool!).findById(id)
    if (!found) {
      response.status(404).json({ error: 'NOT_FOUND', message: 'Devis introuvable.' })
      return
    }
    if (query.version !== undefined && query.version !== found.version) {
      throw new RepositoryError(409, 'DEVIS_CONFLICT', 'Ce devis a changé. Actualisez la liste avant de télécharger ou partager son PDF.')
    }
    const buffer = await generateDevisPdf(found, getSettings().documentsPdf)
    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Disposition', `attachment; filename="devis-${found.numero}.pdf"`)
    response.setHeader('Cache-Control', 'no-store')
    response.send(buffer)
  }))

  router.get('/articles-a-commander', requireAuth, requireCsrf, requireRole('caissier', 'magasinier'), handler(async (_request, response) => {
    const db = requireDb(response)
    if (!db) return
    response.json(await new DevisRepository(pool!).listArticlesACommander())
  }))

  return router
}
