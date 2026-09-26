/**
 * Adaptateur entre un schema Zod de document et un `DocumentRepository`.
 *
 * Les documents (receptions, ventes, commandes, retours) partagent la meme
 * structure : une entete datee, un statut eventuel, et des lignes. Le schema
 * Zod et le repository ont des vocabulaires differents (camelCase expose,
 * snake_case stocke) : cet adaptateur est le seul endroit ou la traduction
 * est ecrite, ce qui evite de la repeter dans chaque route.
 */

import type { z } from 'zod'
import { handler, parseBody, requireDb, requireId, type Db } from './crud.js'
import type { DocumentRepository, DocumentLine, Transaction } from '../repositories/documentRepositories.js'
import type { UserRole } from '../db/schema.js'
import { requireRole } from './auth.js'
import type { Request, RequestHandler, Router } from 'express'

/** Ligne de document telle que le formulaire l'emet, sans le rang. */
export type LinePayload = {
  reference: string
  designation: string
  quantite: number
  prixUnitaire: number
}

/** Valeurs d'un document apres validation. */
type DocumentValue = {
  articles: LinePayload[]
} & Record<string, unknown>

/** Patch d'entete : objet de clefs inconnues, converti par la route. */
type HeadPatch = Record<string, unknown>

/**
 * Construit l'ensemble des routes d'un metier documentaire.
 *
 * @param createSchema schema de creation complet (entete + lignes)
 * @param headPatch    schema de mise a jour de l'entete seule
 * @param toHead       conversion des valeurs validees vers la table d'entete
 * @param toHeadPatch  conversion d'un patch d'entete vers la table
 * @param rolesWrite   roles autorises a creer le document
 */
export function documentRoutes<TRow extends { id: number }>(options: {
  router: Router
  /** Prefixe monte, par exemple `/receptions`. */
  path: string
  resource: string
  repository: (client: Db) => DocumentRepository<TRow>
  /**
   * Schema de creation complet. Doit etre un `ZodObject` exposant un champ
   * `articles` : la route de remplacement des lignes en extrait la liste via
   * `createSchema.pick({ articles: true })`.
   */
  createSchema: z.ZodObject<{ articles: z.ZodType }>
  headPatch: z.ZodType<HeadPatch>
  toHead: (value: DocumentValue) => Record<string, unknown>
  toHeadPatch: (value: HeadPatch) => Record<string, unknown>
  rolesWrite: readonly UserRole[]
  /**
   * Crochets de transaction pour une entete dont la creation depend d'un etat
   * externe.
   *
   * `beforeCreate` s'execute **dans la transaction**, avant l'insertion, et
   * renvoie les colonnes supplementaires a ecrire. C'est ce crochet qui permet
   * a une vente de resoudre sa session de caisse et d'ecrire le mouvement
   * d'encaissement : les deux doivent etre atomiques, sinon une vente sans
   * mouvement de caisse inventerait un ecart a la cloture. Lever une erreur
   * metier ici annule la vente entiere, session et mouvements compris.
   */
  createHooks?: (value: DocumentValue, request: Request) => {
    before: (tx: Transaction) => Promise<Record<string, unknown>>
    after: (tx: Transaction, headId: number) => Promise<void>
  }
}): void {
  const { router, path, resource, repository, createSchema, headPatch, toHead, toHeadPatch } = options

  router.get(
    path,
    handler(async (_request, response) => {
      const client = requireDb(response)
      if (!client) return
      response.json(await repository(client).list())
    }),
  )

  router.get(
    `${path}/:id`,
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      const found = await repository(client).findById(id)
      if (found === null) {
        response.status(404).json({ error: 'NOT_FOUND', message: `${resource} introuvable.` })
        return
      }
      response.json(found)
    }),
  )

  // La creation est protegee par role : un caissier ne saisit pas une reception.
  const create: RequestHandler[] = [
    requireRole(...options.rolesWrite),
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const value = parseBody(createSchema, request.body) as DocumentValue
      const hooks = options.createHooks?.(value, request)
      const created = await repository(client).create(toHead(value), value.articles, hooks)
      response.status(201).json(created)
    }),
  ]

  router.post(path, ...create)

  // Mise a jour de l'entete : ne touche pas aux lignes, donc pas de desync
  // possible entre le detail et l'affichage.
  router.put(
    `${path}/:id`,
    requireRole(...options.rolesWrite),
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      const patch = parseBody(headPatch, request.body)
      const updated = await repository(client).updateHead(id, toHeadPatch(patch))
      if (updated === null) {
        response.status(404).json({ error: 'NOT_FOUND', message: `${resource} introuvable.` })
        return
      }
      response.json(updated)
    }),
  )

  /**
   * Remplacement des lignes. Le total est recalcule par le repository, donc
   * une ligne modifiee ne peut pas laisser un total incoherent.
   */
  router.put(
    `${path}/:id/lignes`,
    requireRole(...options.rolesWrite),
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      const value = parseBody(createSchema.pick({ articles: true }), request.body) as { articles: LinePayload[] }
      const updated = await repository(client).replaceLines(id, value.articles)
      if (updated === null) {
        response.status(404).json({ error: 'NOT_FOUND', message: `${resource} introuvable.` })
        return
      }
      response.json(updated)
    }),
  )

  router.delete(
    `${path}/:id`,
    requireRole(...options.rolesWrite),
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      const deleted = await repository(client).remove(id)
      if (!deleted) {
        response.status(404).json({ error: 'NOT_FOUND', message: `${resource} introuvable.` })
        return
      }
      response.status(204).end()
    }),
  )
}

/**
 * Regroupe les lignes d'un payload en lignes exposes.
 * Utilise par le script de verification pour comparer au repository.
 */
export function toDocumentLines(articles: readonly LinePayload[]): DocumentLine[] {
  return articles.map((line, index) => ({
    ligne: index + 1,
    reference: line.reference,
    designation: line.designation,
    quantite: line.quantite,
    prixUnitaire: line.prixUnitaire,
    montant: Math.round(line.quantite * line.prixUnitaire * 100) / 100,
  }))
}

export type { DocumentValue }
export type { Request } from 'express'
