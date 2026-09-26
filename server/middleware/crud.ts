/**
 * Fabrique de routes CRUD, partagee par les 8 metiers.
 *
 * Chaque ressource expose les memes operations (liste, lecture, creation,
 * mise a jour, suppression) avec le meme contrat d'erreur. Ecrire la
 * validation et la traduction d'erreur une seule fois evite que deux metiers
 * ne divergent sur un detail (un 422 sur l'un, un 500 sur l'autre).
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { z } from 'zod'
import { db, hasDatabaseConfig } from '../db/client.js'
import { parseId } from '../repositories/mapping.js'
import { AuthError, requireRole } from './auth.js'
import { RepositoryError } from '../repositories/simpleRepositories.js'
import type { UserRole } from '../db/schema.js'

/** Client Drizzle non nul. */
export type Db = NonNullable<typeof db>

/** Erreur de validation, traduite en 422 avec le detail par champ. */
export class ValidationError extends Error {
  constructor(readonly errors: Record<string, string>) {
    super('Donnees invalides.')
    this.name = 'ValidationError'
  }
}

/**
 * Valide un corps de requete et retourne la valeur typee.
 *
 * Le detail reprend les messages Zod : ils sont deja rediges en francais et
 * destines a l'utilisateur final. Un seul message par champ, le premier :
 * c'est le plus explicite.
 */
export function parseBody<TSchema extends z.ZodType>(schema: TSchema, body: unknown): z.output<TSchema> {
  const result = schema.safeParse(body)
  if (!result.success) {
    const errors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : 'body'
      if (!(key in errors)) errors[key] = issue.message
    }
    throw new ValidationError(errors)
  }
  return result.data
}

/** Repond 503 si la base n'est pas configuree ; sinon renvoie le client. */
export function requireDb(response: Response): Db | null {
  if (!hasDatabaseConfig || !db) {
    response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n est pas configuree.' })
    return null
  }
  return db
}

/**
 * Lit un identifiant de route. Un identifiant non numerique n'est pas une
 * erreur de validation du corps : c'est une URL invalide -> 400.
 */
export function requireId(request: Request, response: Response, name = 'id'): number | null {
  const id = parseId(request.params[name])
  if (id === null) {
    response.status(400).json({ error: 'INVALID_ID', message: 'Identifiant invalide.' })
    return null
  }
  return id
}

/** Enveloppe un handler pour centraliser la traduction des erreurs. */
export function handler(fn: (request: Request, response: Response) => Promise<unknown>): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    void Promise.resolve(fn(request, response)).catch(next)
  }
}

/**
 * Middleware global de traduction d'erreur, a monter apres les routes.
 *
 * Ordre important : la validation d'entree prime sur l'absence de base, sinon
 * le client recoit « MariaDB n est pas configuree » pour une adresse email
 * invalide, ce qui l'a induit en erreur.
 */
export function errorHandler(error: unknown, request: Request, response: Response, next: NextFunction): void {
  if (response.headersSent) {
    next(error)
    return
  }

  if (error instanceof ValidationError) {
    response.status(422).json({ error: 'VALIDATION_ERROR', message: error.message, details: error.errors })
    return
  }

  if (error instanceof AuthError) {
    response.status(error.status).json({ error: error.code, message: error.message })
    return
  }

  // Erreurs porteuses d'un `code` par nos propres middlewares (CSRF, limite
  // de tentatives). Elles ne sont ni des `AuthError` ni des `RepositoryError`,
  // mais elles sont intentionnellement structurees.
  const coded = error as { code?: unknown; status?: unknown; message?: unknown }
  if (typeof coded.code === 'string' && typeof coded.status === 'number' && typeof coded.message === 'string') {
    response.status(coded.status).json({ error: coded.code, message: coded.message })
    return
  }

  if (error instanceof RepositoryError) {
    response.status(error.status).json({ error: error.code, message: error.message })
    return
  }

  // Inconnue : on journalise pour conserver la cause, mais on ne renvoie jamais
  // le detail technique au client (fuite d'information).
  console.error(`[api] ${request.method} ${request.originalUrl}`, error)
  response.status(500).json({ error: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' })
}

/**
 * Contrat attendu d'un repository par la fabrique CRUD.
 *
 * La sortie est volontairement `unknown` : les repositories Drizzle
 * transforment la ligne SQL en forme exposee par l'API, dont le type n'a rien
 * a voir avec l'entree d'ecriture. La relation entre les deux est verifiee par
 * le type `TWrite` de la fabrique, pas par cette interface.
 */
export type CrudRepository<TWrite, TPatch> = {
  list: () => Promise<unknown[]>
  findById: (id: number) => Promise<unknown>
  create: (input: TWrite) => Promise<unknown>
  update: (id: number, patch: TPatch) => Promise<unknown>
  remove: (id: number) => Promise<boolean>
}

/**
 * Construit les routes CRUD d'une ressource et les monte sur `router`.
 *
 * Les schemas sont passes **appliques** (`z.input` -> validation) et la
 * conversion vers la forme du repository est explicite : c'est ce qui evite
 * de faire transiter du JSON en clair dans une couche metier.
 */
export function crudRoutes<TWrite, TPatch>(options: {
  /** Nom lisible pour les messages : « Client », « Vehicule »… */
  resource: string
  router: import('express').Router
  factory: (client: Db) => CrudRepository<TWrite, TPatch>
  createSchema: z.ZodType<TWrite>
  patchSchema: z.ZodType<TPatch>
  /**
   * Roles autorises a creer, modifier et supprimer. La lecture reste ouverte a
   * tout utilisateur authentifie. Sans cette option, la ressource serait
   * accessible en ecriture par tout le monde — c'etait le cas des clients et
   * des vehicules avant ce correctif.
   */
  rolesWrite: readonly UserRole[]
}): void {
  const { router, resource, factory, createSchema, patchSchema, rolesWrite } = options
  // `admin` passe partout : la fabrique ne filtre que les roles metier.
  const canWrite = requireRole(...rolesWrite)

  router.get(
    '/',
    handler(async (_request, response) => {
      const client = requireDb(response)
      if (!client) return
      response.json(await factory(client).list())
    }),
  )

  router.get(
    '/:id',
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      const found = await factory(client).findById(id)
      if (found === null) {
        response.status(404).json({ error: 'NOT_FOUND', message: `${resource} introuvable.` })
        return
      }
      response.json(found)
    }),
  )

  router.post(
    '/',
    canWrite,
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const value = parseBody(createSchema, request.body)
      response.status(201).json(await factory(client).create(value))
    }),
  )

  router.put(
    '/:id',
    canWrite,
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      // Le corps est valide avant la lecture : un corps invalide doit repondre
      // 422, pas 404, meme si l'identifiant n'existe pas.
      const patch = parseBody(patchSchema, request.body)
      const updated = await factory(client).update(id, patch)
      if (updated === null) {
        response.status(404).json({ error: 'NOT_FOUND', message: `${resource} introuvable.` })
        return
      }
      response.json(updated)
    }),
  )

  router.delete(
    '/:id',
    canWrite,
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      const deleted = await factory(client).remove(id)
      if (!deleted) {
        response.status(404).json({ error: 'NOT_FOUND', message: `${resource} introuvable.` })
        return
      }
      response.status(204).end()
    }),
  )
}
