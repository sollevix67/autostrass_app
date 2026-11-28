import { Router } from 'express'
import { z } from 'zod'
import { FournisseurRepository } from '../repositories/referentielRepositories.js'
import { requireAuth, requireRole, type AuthenticatedRequest } from './auth.js'
import { requireCsrf } from './csrf.js'
import { handler, parseBody, requireDb, requireId } from './crud.js'

const horaireSchema = z.object({
  heureBlocage: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Indiquez une heure au format HH:mm.').nullable(),
  dureeBlocageMinutes: z.number({ message: 'Indiquez la durée en minutes.' }).int('La durée doit être entière.')
    .min(1, 'La durée minimale est d’une minute.').max(1439, 'La durée maximale est de 1 439 minutes.').nullable(),
}).strict().refine((value) => (value.heureBlocage === null) === (value.dureeBlocageMinutes === null), {
  path: ['dureeBlocageMinutes'], message: 'Renseignez ensemble l’heure de blocage et sa durée.',
})

export function createHorairesFournisseurRouter(): Router {
  const router = Router()
  router.use(requireAuth, requireCsrf, requireRole('magasinier'))
  router.get('/', handler(async (_request, response) => {
    const db = requireDb(response)
    if (db) response.json(await new FournisseurRepository(db).listHoraires())
  }))
  router.put('/:fournisseurId', requireRole('admin'), handler(async (request, response) => {
    const id = requireId(request, response, 'fournisseurId')
    if (id === null) return
    const input = parseBody(horaireSchema, request.body)
    const db = requireDb(response)
    if (!db) return
    const { user } = request as AuthenticatedRequest
    const updated = await new FournisseurRepository(db).updateHoraire(id, input, user!.id)
    if (updated) response.json(updated)
    else response.status(404).json({ error: 'NOT_FOUND', message: 'Fournisseur introuvable.' })
  }))
  return router
}
