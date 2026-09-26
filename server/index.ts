import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import { ArticleRepository } from './repositories/articleRepository.js'
import { notFound, sendValidationError, validateArticleBody, validateDelta } from './middleware/validation.js'
import { errorHandler } from './middleware/crud.js'
import { createAuthRouter } from './middleware/authRoutes.js'
import { createApiRouter } from './middleware/resourceRoutes.js'
import { securityHeaders } from './middleware/security.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const hasDatabaseConfig = Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD)

const pool = hasDatabaseConfig
  ? mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: 10,
      waitForConnections: true,
    })
  : null

const articles = pool ? new ArticleRepository(pool) : null

type LowStockItem = { reference: string; label: string; quantity: number; minimum: number; location: string }

const emptyDashboard = {
  stockValue: 0,
  references: 0,
  lowStock: 0,
  pendingOrders: 0,
  lowStockItems: [] as LowStockItem[],
  activity: [] as Array<{ type: string; title: string; detail: string; time: string }>,
}

app.use(express.json({ limit: '1mb' }))

// En-tetes de securite appliques AVANT toute route : ils doivent previsible
// figer les premieres reponses, y compris les 404 et les erreurs.
app.use(securityHeaders)

/**
 * Retourne le repository si la base est configuree, sinon repond 503.
 *
 * Utilise apres la validation d'entree : une erreur de validation (422) doit
 * primer sur l'absence de base (503), sinon le client recoit un message trompeur.
 */
function repositoryOr503(response: Response): ArticleRepository | null {
  if (!articles) {
    response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n est pas configuree.' })
    return null
  }
  return articles
}

/** Detecte une violation de contrainte UNIQUE (MySQL error 1062). */
function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY'
}

/**
 * Extrait un parametre de route comme chaine.
 * Express 5 type les params en `string | string[]` ; on refuse
 * explicitement les tableaux (route mal formee).
 */
function routeParam(request: Request, name: string): string | null {
  const value = request.params[name]
  return typeof value === 'string' ? value : null
}

app.get('/api/health', async (_request: Request, response: Response) => {
  let database: 'connected' | 'unavailable' | 'unconfigured' = 'unconfigured'
  if (pool) {
    try {
      await pool.query('SELECT 1')
      database = 'connected'
    } catch {
      database = 'unavailable'
    }
  }
  response.json({ status: 'ok', database, timestamp: new Date().toISOString() })
})

app.get('/api/dashboard', async (_request: Request, response: Response) => {
  if (!pool) {
    response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n est pas configuree.' })
    return
  }

  try {
    // `references` est un mot-cle reserve en MariaDB -> on evite l'alias.
    // `unit_price_ht` est expose par la vue sous le nom `prix_unitaire_ht`.
    const [rows] = await pool!.query<Array<RowDataPacket & { stock_value: number; total_references: number; low_stock: number; low_stock_items: string }>>(
      `SELECT
        COALESCE(SUM(quantity * prix_unitaire_ht), 0) AS stock_value,
        COUNT(*)                                        AS total_references,
        SUM(CASE WHEN quantity <= minimum THEN 1 ELSE 0 END) AS low_stock,
        COALESCE(JSON_ARRAYAGG(JSON_OBJECT(
          'reference', reference,
          'label',     designation,
          'quantity',  quantity,
          'minimum',   minimum,
          'location',  emplacement
        )), JSON_ARRAY()) AS low_stock_items
      FROM v_stock`,
    )

    const [movements] = await pool!.query<Array<RowDataPacket & { type: string; title: string; detail: string; created_at: Date }>>(
      `SELECT
        'INVENTAIRE' AS type,
        a.designation AS title,
        CONCAT('Quantite ajustee de ', m.delta) AS detail,
        m.created_at
      FROM stock_movements m
      JOIN articles a ON a.id = m.reference_id
      ORDER BY m.created_at DESC
      LIMIT 8`,
    )

    // JSON_ARRAYAGG ne supporte pas de filtre : on agrege tout puis on ne garde
    // que les lignes sous le seuil, ce qui evite une sous-requete corralee.
    const parsed: unknown = rows[0]?.low_stock_items
    const allItems: LowStockItem[] = Array.isArray(parsed)
      ? (parsed as Array<Record<string, unknown>>).map((item) => ({
          reference: String(item.reference ?? ''),
          label: String(item.label ?? ''),
          quantity: Number(item.quantity ?? 0),
          minimum: Number(item.minimum ?? 0),
          location: String(item.location ?? ''),
        }))
      : []

    const lowStockItems = allItems
      .filter((item) => item.quantity <= item.minimum)
      .sort((a, b) => a.quantity - b.quantity || a.minimum - b.minimum)
      .slice(0, 8)

    response.json({
      ...emptyDashboard,
      stockValue: Number(rows[0]?.stock_value ?? 0),
      references: Number(rows[0]?.total_references ?? 0),
      lowStock: Number(rows[0]?.low_stock ?? 0),
      lowStockItems,
      activity: movements.map((movement) => ({
        type: movement.type,
        title: movement.title,
        detail: movement.detail,
        time: new Date(movement.created_at).toISOString(),
      })),
    })
  } catch {
    response.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'Impossible de lire le dashboard depuis MariaDB.' })
  }
})

// --- Articles : catalogue + stock -----------------------------------------

app.get('/api/articles', async (_request: Request, response: Response) => {
  const repository = repositoryOr503(response)
  if (!repository) return
  try {
    response.json(await repository.list())
  } catch {
    response.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'Impossible de lire le catalogue.' })
  }
})

/** Le stock expose exactement la meme forme que le catalogue. */
app.get('/api/stock', async (_request: Request, response: Response) => {
  const repository = repositoryOr503(response)
  if (!repository) return
  try {
    response.json(await repository.list())
  } catch {
    response.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'Impossible de lire le stock.' })
  }
})

app.get('/api/articles/:reference', async (request: Request, response: Response) => {
  const reference = routeParam(request, 'reference')
  if (reference === null) {
    notFound(response, 'Article')
    return
  }

  const repository = repositoryOr503(response)
  if (!repository) return

  try {
    const found = await repository.findByReference(reference)
    if (!found) {
      notFound(response, 'Article')
      return
    }
    response.json(found)
  } catch {
    response.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'Impossible de lire cet article.' })
  }
})

app.post('/api/articles', async (request: Request, response: Response) => {
  const validation = validateArticleBody(request.body)
  if (!validation.ok) {
    sendValidationError(response, validation.errors)
    return
  }

  const repository = repositoryOr503(response)
  if (!repository) return

  try {
    response.status(201).json(await repository.create(validation.value))
  } catch (error) {
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'ALREADY_EXISTS', message: 'Cette reference existe deja.' })
      return
    }
    response.status(500).json({ error: 'INTERNAL_ERROR', message: "Echec de l'enregistrement." })
  }
})

app.put('/api/articles/:reference', async (request: Request, response: Response) => {
  const reference = routeParam(request, 'reference')
  if (reference === null) {
    notFound(response, 'Article')
    return
  }

  const validation = validateArticleBody(request.body)
  if (!validation.ok) {
    sendValidationError(response, validation.errors)
    return
  }

  const repository = repositoryOr503(response)
  if (!repository) return

  try {
    const updated = await repository.update(reference, validation.value)
    if (!updated) {
      notFound(response, 'Article')
      return
    }
    response.json(updated)
  } catch (error) {
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'ALREADY_EXISTS', message: 'Cette reference existe deja.' })
      return
    }
    response.status(500).json({ error: 'INTERNAL_ERROR', message: 'Echec de la mise a jour.' })
  }
})

app.patch('/api/articles/:reference/quantite', async (request: Request, response: Response) => {
  const reference = routeParam(request, 'reference')
  if (reference === null) {
    notFound(response, 'Article')
    return
  }

  const validation = validateDelta(request.body)
  if (!validation.ok) {
    sendValidationError(response, validation.errors)
    return
  }

  const repository = repositoryOr503(response)
  if (!repository) return

  try {
    const quantity = await repository.adjustQuantity(reference, validation.value)
    if (quantity === null) {
      notFound(response, 'Article')
      return
    }
    response.json({ reference, quantite: quantity })
  } catch {
    response.status(500).json({ error: 'INTERNAL_ERROR', message: "Echec de l'ajustement." })
  }
})

app.delete('/api/articles/:reference', async (request: Request, response: Response) => {
  const reference = routeParam(request, 'reference')
  if (reference === null) {
    notFound(response, 'Article')
    return
  }

  const repository = repositoryOr503(response)
  if (!repository) return

  try {
    const deleted = await repository.remove(reference)
    if (!deleted) {
      notFound(response, 'Article')
      return
    }
    response.status(204).end()
  } catch {
    response.status(500).json({ error: 'INTERNAL_ERROR', message: 'Echec de la suppression.' })
  }
})

// --- Schema v2 : authentification et metiers -------------------------------
// `/api/auth` est monte avant `requireAuth` : la connexion ne peut pas
// exiger un jeton qu'elle n'a pas encore.
app.use('/api/auth', createAuthRouter())
app.use('/api', createApiRouter())

// 404 puis gestionnaire d'erreurs : l'ordre compte, les routes `/api/*` sont
// toutes tryees. Le gestionnaire traduit les erreurs en JSON homogene.
app.use((_request: Request, response: Response) => {
  response.status(404).json({ error: 'NOT_FOUND', message: 'Route inconnue.' })
})

app.use(errorHandler)

app.listen(port, () => {
  console.log(`Autostrass API listening on http://localhost:${port}`)
  if (!pool) console.warn('Warning: DB_* non configurees, /api/dashboard et /api/articles repondront 503.')
})

export { app }
