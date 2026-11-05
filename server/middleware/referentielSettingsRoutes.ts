import { Router } from 'express'
import { requireAuth, requireRole } from './auth.js'
import { requireCsrf } from './csrf.js'
import { handler, parseBody, requireId } from './crud.js'
import { pool } from '../db/client.js'
import { referentielSchema, categorieUpdateSchema, sousCategorieSchema } from '../../src/schemas/parametres.js'
import { listTva, ParametreRepository, type ReferentielKind } from '../repositories/parametreRepository.js'
import { settingsError } from '../services/settingsStore.js'
import { toRepositoryError } from '../repositories/simpleRepositories.js'

export function createReferentielSettingsRouter() {
  const router = Router()
  router.use(requireAuth, requireCsrf)
  router.get('/tva', handler(async (_request, response) => {
    if (!pool) throw settingsError('MariaDB indisponible.', 503, 'DATABASE_UNAVAILABLE')
    response.json(await listTva(pool))
  }))
  for (const kind of ['categories', 'sous-categories', 'secteurs'] as ReferentielKind[]) {
    const repository = () => {
      if (!pool) throw settingsError('MariaDB indisponible.', 503, 'DATABASE_UNAVAILABLE')
      return new ParametreRepository(pool, kind)
    }
    router.get(`/${kind}`, handler(async (_request, response) => response.json(await repository().list())))
    router.post(`/${kind}`, requireRole('admin'), handler(async (request, response) => {
      const input = parseBody(kind === 'sous-categories' ? sousCategorieSchema : referentielSchema, request.body)
      try { response.status(201).json(await repository().save(input)) }
      catch (error) { if ((error as { status?: number }).status) throw error; throw toRepositoryError(error) }
    }))
    router.put(`/${kind}/:id`, requireRole('admin'), handler(async (request, response) => {
      const id = requireId(request, response)
      if (id === null) return
      const input = parseBody(kind === 'sous-categories' ? sousCategorieSchema : kind === 'categories' ? categorieUpdateSchema : referentielSchema, request.body)
      try { response.json(await repository().save(input, id)) }
      catch (error) { if ((error as { status?: number }).status) throw error; throw toRepositoryError(error) }
    }))
    router.delete(`/${kind}/:id`, requireRole('admin'), handler(async (request, response) => {
      const id = requireId(request, response)
      if (id === null) return
      try { await repository().remove(id); response.status(204).end() }
      catch (error) { if ((error as { status?: number }).status) throw error; throw toRepositoryError(error) }
    }))
  }
  return router
}
