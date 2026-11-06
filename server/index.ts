import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { existsSync } from 'fs'
import { join } from 'path'
import { createServer as createHttpsServer } from 'https'
import { createServer as createHttpServer } from 'http'
import { ArticleRepository } from './repositories/articleRepository.js'
import { notFound, sendValidationError, validateArticleBody, validateDelta, validateEmplacementBody, validateEmplacementPatch, validateTransfertBody } from './middleware/validation.js'
import { errorHandler } from './middleware/crud.js'
import { createAuthRouter } from './middleware/authRoutes.js'
import { createApiRouter } from './middleware/resourceRoutes.js'
import { createComplianceRouter } from './middleware/complianceRoutes.js'
import { securityHeaders } from './middleware/security.js'
import { requireAuth, requireRole, type AuthenticatedRequest } from './middleware/auth.js'
import { requireCsrf } from './middleware/csrf.js'
import { rateLimit } from './middleware/rateLimit.js'
import { pool } from './db/client.js'
import { createSettingsRouter } from './middleware/settingsRoutes.js'
import { startupSettings } from './services/settingsStore.js'
import { validateCertificate } from './services/httpsSettings.js'
import { createReferentielSettingsRouter } from './middleware/referentielSettingsRoutes.js'
import { createInventaireRouter } from './middleware/inventaireRoutes.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)

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

// En-têtes de sécurité appliqués AVANT toute route : ils doivent prévisible
// figer les premières réponses, y compris les 404 et les erreurs.
app.use(securityHeaders)

// Rate limiting global sur l'API : 100 requêtes / 15 min par IP.
// Appliqué AVANT les routes d'authentification (qui ont leur propre limite plus stricte).
// Les suites d'intégration dépassent 100 appels sur leur API jetable.
// Seul NODE_ENV=test relève ce plafond global ; les limites d'auth restent actives.
app.use('/api', rateLimit(false, process.env.NODE_ENV === 'test' ? 1000 : undefined))

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
    // `references` est un mot-clé réservé en MariaDB → on évite l'alias.
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
        CASE WHEN m.reason = 'TRANSFERT' THEN 'TRANSFERT' ELSE 'INVENTAIRE' END AS type,
        a.designation AS title,
        CASE WHEN m.reason = 'TRANSFERT' THEN 'Transfert entre emplacements'
             ELSE CONCAT('Quantite ajustee de ', m.delta) END AS detail,
        m.created_at
      FROM stock_movements m
      JOIN articles a ON a.id = m.reference_id
      ORDER BY m.created_at DESC
      LIMIT 8`,
    )

    // JSON_ARRAYAGG ne supporte pas de filtre : on agrege tout puis on ne garde
    // que les lignes sous le seuil, ce qui évite une sous-requête corrélée.
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

/**
 * Emplacements et stock cumule de leurs descendants.
 *
 * Le CTE recursif somme le stock des descendants jusqu'au niveau place et
 * limite la profondeur au schema metier allee → etagere → place.
 */
app.get('/api/emplacements', requireAuth, async (_request: Request, response: Response) => {
  if (!pool) {
    response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n est pas configuree.' })
    return
  }

  try {
    const [rows] = await pool.query<Array<RowDataPacket & {
      id: number | string
      niveau: string
      parent_id: number | string | null
      code: string
      libelle: string | null
      capacite: number | string
      actif: number | boolean | string
      chemin: string
      quantite: number | string | null
      nombre_references: number | string
    }>>(
      `WITH RECURSIVE descendants AS (
        SELECT id AS emplacement_racine, id AS emplacement_descendant, 0 AS profondeur
         FROM emplacements
         UNION ALL
        SELECT descendants.emplacement_racine, enfant.id, descendants.profondeur + 1
         FROM descendants
        JOIN emplacements parent ON parent.id = descendants.emplacement_descendant
        JOIN emplacements enfant
          ON enfant.parent_id = parent.id
         AND (
           (parent.niveau = 'allee' AND enfant.niveau = 'etagere')
           OR (parent.niveau = 'etagere' AND enfant.niveau = 'place')
         )
        WHERE descendants.profondeur < 2
       ),
       stock_agrege AS (
         SELECT descendants.emplacement_racine,
                COALESCE(SUM(stock.quantite), 0) AS quantite,
                COUNT(DISTINCT stock.reference_id) AS nombre_references
         FROM descendants
         LEFT JOIN stock_par_emplacements stock
           ON stock.emplacement_id = descendants.emplacement_descendant
         GROUP BY descendants.emplacement_racine
       )
       SELECT emplacement.id,
              emplacement.niveau,
              emplacement.parent_id,
              emplacement.code,
              emplacement.libelle,
              emplacement.capacite,
              emplacement.actif,
              CASE emplacement.niveau
                WHEN 'allee' THEN emplacement.code
                WHEN 'etagere' THEN CONCAT(parent.code, ' / ', emplacement.code)
                WHEN 'place' THEN CONCAT_WS(' / ', grand_parent.code, parent.code, emplacement.code)
                ELSE emplacement.code
              END AS chemin,
              stock_agrege.quantite,
              stock_agrege.nombre_references
       FROM emplacements emplacement
       LEFT JOIN emplacements parent ON parent.id = emplacement.parent_id
       LEFT JOIN emplacements grand_parent ON grand_parent.id = parent.parent_id
       LEFT JOIN stock_agrege ON stock_agrege.emplacement_racine = emplacement.id
       ORDER BY COALESCE(grand_parent.code, parent.code, emplacement.code),
                COALESCE(parent.code, emplacement.code),
                emplacement.code`,
    )

    response.json(rows.map((row) => ({
      id: Number(row.id),
      niveau: row.niveau,
      parentId: row.parent_id === null ? null : Number(row.parent_id),
      code: row.code,
      libelle: row.libelle,
      capacite: Number(row.capacite),
      actif: row.actif === true || row.actif === 1 || row.actif === '1',
      chemin: row.chemin,
      quantite: Number(row.quantite ?? 0),
      nombreReferences: Number(row.nombre_references),
    })))
  } catch {
    response.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'Impossible de lire les emplacements.' })
  }
})

// --- Emplacements : creation -------------------------------------------------
app.post('/api/emplacements', requireAuth, requireCsrf, requireRole('magasinier'), async (request: Request, response: Response) => {
  if (!pool) {
    response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n est pas configuree.' })
    return
  }

  const validation = validateEmplacementBody(request.body)
  if (!validation.ok) {
    sendValidationError(response, validation.errors)
    return
  }

  const { niveau, parent_id, code, libelle, capacite } = validation.value

  // Verifier l'existance du parent si un parent est specifie
  if (parent_id !== null) {
    try {
      const [parentRows] = await pool.query<RowDataPacket[]>(
        'SELECT id, niveau FROM emplacements WHERE id = ?',
        [parent_id],
      )
      if (parentRows.length === 0) {
        response.status(400).json({ error: 'INVALID_PARENT', message: 'Emplacement parent introuvable.' })
        return
      }
      const parentNiveau = parentRows[0].niveau as string
      if (niveau === 'etagere' && parentNiveau !== 'allee') {
        response.status(400).json({ error: 'INVALID_HIERARCHY', message: 'Une etagere doit dependre d une allee.' })
        return
      }
      if (niveau === 'place' && parentNiveau !== 'etagere') {
        response.status(400).json({ error: 'INVALID_HIERARCHY', message: 'Une place doit dependre d une etagere.' })
        return
      }
    } catch {
      response.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'Impossible de verifier l emplacement parent.' })
      return
    }
  } else if (niveau !== 'allee') {
    response.status(400).json({ error: 'INVALID_HIERARCHY', message: 'Une allee n a pas de parent.' })
    return
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO emplacements (niveau, parent_id, code, libelle, capacite, actif)
       VALUES (?, ?, ?, ?, ?, true)`,
      [niveau, parent_id ?? null, code, libelle ?? null, capacite],
    )
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, niveau, parent_id, code, libelle, capacite, actif FROM emplacements WHERE id = ?',
      [result.insertId],
    )
    response.status(201).json(rows[0])
  } catch (error) {
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'ALREADY_EXISTS', message: 'Cet emplacement existe deja.' })
      return
    }
    response.status(500).json({ error: 'INTERNAL_ERROR', message: "Echec de la creation de l'emplacement." })
  }
})

// --- Emplacements : mise a jour ----------------------------------------------
app.put('/api/emplacements/:id', requireAuth, requireCsrf, requireRole('magasinier'), async (request: Request, response: Response) => {
  if (!pool) {
    response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n est pas configuree.' })
    return
  }

  const idRaw = request.params.id
  const id = typeof idRaw === 'string' ? Number.parseInt(idRaw, 10) : null
  if (!id || !Number.isInteger(id)) {
    response.status(400).json({ error: 'INVALID_ID', message: 'Identifiant invalide.' })
    return
  }

  const validation = validateEmplacementPatch(request.body)
  if (!validation.ok) {
    sendValidationError(response, validation.errors)
    return
  }

  const { code, libelle, capacite, actif } = validation.value
  const sets: string[] = []
  const values: unknown[] = []

  if (code !== undefined) { sets.push('code = ?'); values.push(code) }
  if (libelle !== undefined) { sets.push('libelle = ?'); values.push(libelle) }
  if (capacite !== undefined) { sets.push('capacite = ?'); values.push(capacite) }
  if (actif !== undefined) { sets.push('actif = ?'); values.push(actif) }

  if (sets.length === 0) {
    response.status(400).json({ error: 'NO_CHANGES', message: 'Aucun champ a mettre a jour.' })
    return
  }

  values.push(id)

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE emplacements SET ${sets.join(', ')} WHERE id = ?`,
      values,
    )
    if (result.affectedRows === 0) {
      response.status(404).json({ error: 'NOT_FOUND', message: 'Emplacement introuvable.' })
      return
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, niveau, parent_id, code, libelle, capacite, actif FROM emplacements WHERE id = ?',
      [id],
    )
    response.json(rows[0])
  } catch (error) {
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'ALREADY_EXISTS', message: 'Cet emplacement existe deja.' })
      return
    }
    response.status(500).json({ error: 'INTERNAL_ERROR', message: "Echec de la mise a jour de l'emplacement." })
  }
})

// --- Emplacements : suppression ----------------------------------------------
app.delete('/api/emplacements/:id', requireAuth, requireCsrf, requireRole('magasinier'), async (request: Request, response: Response) => {
  if (!pool) {
    response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n est pas configuree.' })
    return
  }

  const idRaw = request.params.id
  const id = typeof idRaw === 'string' ? Number.parseInt(idRaw, 10) : null
  if (!id || !Number.isInteger(id)) {
    response.status(400).json({ error: 'INVALID_ID', message: 'Identifiant invalide.' })
    return
  }

  // Le verrou commun au transfert évite de supprimer une destination entre
  // la vérification de son stock et l'arrivée d'une nouvelle allocation.
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [locations] = await connection.query<RowDataPacket[]>('SELECT id FROM emplacements WHERE id = ? FOR UPDATE', [id])
    if (locations.length === 0) {
      await connection.rollback()
      response.status(404).json({ error: 'NOT_FOUND', message: 'Emplacement introuvable.' })
      return
    }
    const [children] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS nb FROM emplacements WHERE parent_id = ?',
      [id],
    )
    if (Number(children[0].nb) > 0) {
      await connection.rollback()
      response.status(400).json({ error: 'HAS_CHILDREN', message: 'Impossible de supprimer un emplacement contenant des sous-emplacements.' })
      return
    }

    // Verifier qu il n est pas utilise par du stock
    const [stock] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS nb FROM stock_par_emplacements WHERE emplacement_id = ?',
      [id],
    )
    if (Number(stock[0].nb) > 0) {
      await connection.rollback()
      response.status(400).json({ error: 'IN_USE', message: 'Emplacement utilise par du stock : suppression imposible.' })
      return
    }

    await connection.query<ResultSetHeader>(
      'DELETE FROM emplacements WHERE id = ?',
      [id],
    )
    await connection.commit()
    response.status(204).end()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
})

// --- Repartition d un article : choix de la source du transfert ---------------
app.get('/api/articles/:reference/emplacements', requireAuth, async (request: Request, response: Response) => {
  if (!pool) {
    response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n est pas configuree.' })
    return
  }

  const reference = routeParam(request, 'reference')
  if (reference === null) {
    notFound(response, 'Article')
    return
  }

  // Une seule requete assure une vue coherente du solde et des allocations.
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.reference, s.quantity, spe.emplacement_id, spe.quantite,
            CASE e.niveau
              WHEN 'allee' THEN e.code
              WHEN 'etagere' THEN CONCAT_WS(' / ', parent.code, e.code)
              WHEN 'place' THEN CONCAT_WS(' / ', grand_parent.code, parent.code, e.code)
              ELSE CONCAT('Emplacement #', spe.emplacement_id)
            END AS chemin
     FROM articles a
     JOIN stock_balances s ON s.reference_id = a.id
     LEFT JOIN stock_par_emplacements spe ON spe.reference_id = a.id
     LEFT JOIN emplacements e ON e.id = spe.emplacement_id
     LEFT JOIN emplacements parent ON parent.id = e.parent_id
     LEFT JOIN emplacements grand_parent ON grand_parent.id = parent.parent_id
     WHERE a.reference = ?
     ORDER BY chemin, spe.emplacement_id`,
    [reference],
  )
  if (rows.length === 0) {
    notFound(response, 'Article')
    return
  }

  const quantiteTotale = Number(rows[0].quantity)
  const emplacements = rows.filter((row) => row.emplacement_id !== null).map((row) => ({
    emplacementId: Number(row.emplacement_id),
    chemin: String(row.chemin),
    quantite: Number(row.quantite),
  }))
  response.json({
    reference: String(rows[0].reference),
    quantiteTotale,
    quantiteNonAffectee: quantiteTotale - emplacements.reduce((total, row) => total + row.quantite, 0),
    emplacements,
  })
})

// --- Transfert d article entre emplacements ----------------------------------
app.post('/api/articles/:reference/transfert', requireAuth, requireCsrf, requireRole('magasinier'), async (request: AuthenticatedRequest, response: Response) => {
  if (!pool) {
    response.status(503).json({ error: 'DATABASE_UNCONFIGURED', message: 'MariaDB n est pas configuree.' })
    return
  }

  const reference = routeParam(request, 'reference')
  if (reference === null) {
    notFound(response, 'Article')
    return
  }

  const validation = validateTransfertBody(request.body)
  if (!validation.ok) {
    sendValidationError(response, validation.errors)
    return
  }

  const { emplacement_id, quantite, motif, source_emplacement_id } = validation.value

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // Le verrou article serialise les transferts avec les ajustements de stock.
    const [articleRows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM articles WHERE reference = ? FOR UPDATE',
      [reference],
    )
    if (articleRows.length === 0) {
      await connection.rollback()
      response.status(404).json({ error: 'NOT_FOUND', message: 'Article introuvable.' })
      return
    }
    const articleId = Number(articleRows[0].id)

    const [balanceRows] = await connection.query<RowDataPacket[]>(
      'SELECT quantity FROM stock_balances WHERE reference_id = ? FOR UPDATE',
      [articleId],
    )
    const [stockRows] = await connection.query<RowDataPacket[]>(
      `SELECT emplacement_id, quantite FROM stock_par_emplacements
       WHERE reference_id = ? ORDER BY emplacement_id FOR UPDATE`,
      [articleId],
    )
    const totalQuantity = Number(balanceRows[0]?.quantity)
    const allocatedQuantity = stockRows.reduce((total, row) => total + Number(row.quantite), 0)
    const unallocatedQuantity = totalQuantity - allocatedQuantity
    if (!Number.isInteger(totalQuantity) || totalQuantity < 0 || unallocatedQuantity < 0
      || stockRows.some((row) => !Number.isInteger(Number(row.quantite)) || Number(row.quantite) < 0)) {
      await connection.rollback()
      response.status(409).json({ error: 'INCONSISTENT_STOCK', message: 'La repartition du stock est incoherente. Verifiez les allocations avant de transferer.' })
      return
    }

    let sourceEmplacementId = source_emplacement_id
    if (sourceEmplacementId === undefined) {
      const occupiedRows = stockRows.filter((row) => Number(row.quantite) > 0)
      if (occupiedRows.length + (unallocatedQuantity > 0 ? 1 : 0) > 1) {
        await connection.rollback()
        response.status(409).json({ error: 'SOURCE_REQUIRED', message: 'Choisissez l emplacement source du transfert.' })
        return
      }
      sourceEmplacementId = occupiedRows.length === 1 ? Number(occupiedRows[0].emplacement_id) : null
    }

    const sourceRow = stockRows.find((row) => Number(row.emplacement_id) === sourceEmplacementId)
    if (sourceEmplacementId !== null && !sourceRow) {
      await connection.rollback()
      response.status(400).json({ error: 'INVALID_SOURCE', message: 'Cet article n est pas affecte a l emplacement source.' })
      return
    }
    const sourceQuantity = sourceEmplacementId === null ? unallocatedQuantity : Number(sourceRow?.quantite)
    if (sourceQuantity < quantite) {
      await connection.rollback()
      response.status(400).json({ error: 'INSUFFICIENT_STOCK', message: 'Stock insuffisant a l emplacement source.' })
      return
    }

    // Le verrou empeche la suppression ou la desactivation de la destination
    // pendant le transfert (le schema historique ne porte pas cette FK).
    if (emplacement_id !== null) {
      const [locRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM emplacements WHERE id = ? AND actif = true FOR UPDATE',
        [emplacement_id],
      )
      if (locRows.length === 0) {
        await connection.rollback()
        response.status(400).json({ error: 'INVALID_LOCATION', message: 'Emplacement cible invalide ou inactif.' })
        return
      }
    }

    // Un transfert sur la meme source ne modifie ni allocations ni journaux.
    if (sourceEmplacementId === emplacement_id) {
      await connection.commit()
      response.json({ reference, source_emplacement_id: sourceEmplacementId, emplacement_id, quantite, motif })
      return
    }

    if (sourceEmplacementId !== null) {
      await connection.execute(
        `UPDATE stock_par_emplacements SET quantite = quantite - ?
         WHERE reference_id = ? AND emplacement_id = ?`,
        [quantite, articleId, sourceEmplacementId],
      )
      await connection.execute(
        `DELETE FROM stock_par_emplacements
         WHERE reference_id = ? AND emplacement_id = ? AND quantite = 0`,
        [articleId, sourceEmplacementId],
      )
    }

    // Le stock non affecte reste la difference entre solde global et allocations.
    if (emplacement_id !== null) {
      await connection.execute(
        `INSERT INTO stock_par_emplacements (reference_id, emplacement_id, quantite)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantite = quantite + VALUES(quantite)`,
        [articleId, emplacement_id, quantite],
      )
    }

    // Les allocations remplacent désormais l'ancien emplacement unique.
    // Éviter son réaffichage lorsque le dernier emplacement est vidé.
    await connection.execute('UPDATE articles SET location = ?, emplacement_id = NULL WHERE id = ?', ['', articleId])

    // Aucun changement de solde global : delta = 0. Le detail du deplacement
    // est conserve dans le journal d audit existant, dans la meme transaction.
    await connection.execute(
      `INSERT INTO stock_movements (reference_id, delta, reason) VALUES (?, 0, 'TRANSFERT')`,
      [articleId],
    )
    await connection.execute(
      `INSERT INTO journal_actions (utilisateur_id, entite, entite_id, action, details)
       VALUES (?, 'article', ?, 'modification', ?)`,
      [request.user!.id, reference, JSON.stringify({
        type: 'TRANSFERT',
        source_emplacement_id: sourceEmplacementId,
        destination_emplacement_id: emplacement_id,
        quantite,
        motif,
      })],
    )

    await connection.commit()
    response.json({ reference, source_emplacement_id: sourceEmplacementId, emplacement_id, quantite, motif })
  } catch (error) {
    await connection.rollback()
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'ALREADY_EXISTS', message: 'Conflit lors du transfert.' })
      return
    }
    throw error
  } finally {
    connection.release()
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

app.post('/api/articles', requireAuth, requireCsrf, requireRole('magasinier'), async (request: Request, response: Response) => {
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
    if ((error as { status?: number }).status === 422) { response.status(422).json({ error: 'VALIDATION_ERROR', message: (error as Error).message }); return }
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'ALREADY_EXISTS', message: 'Cette reference existe deja.' })
      return
    }
    response.status(500).json({ error: 'INTERNAL_ERROR', message: "Echec de l'enregistrement." })
  }
})

app.put('/api/articles/:reference', requireAuth, requireCsrf, requireRole('magasinier'), async (request: Request, response: Response) => {
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
    if ((error as { status?: number }).status === 422) { response.status(422).json({ error: 'VALIDATION_ERROR', message: (error as Error).message }); return }
    if (isDuplicateKey(error)) {
      response.status(409).json({ error: 'ALREADY_EXISTS', message: 'Cette reference existe deja.' })
      return
    }
    response.status(500).json({ error: 'INTERNAL_ERROR', message: 'Echec de la mise a jour.' })
  }
})

app.patch('/api/articles/:reference/quantite', requireAuth, requireCsrf, requireRole('magasinier'), async (request: Request, response: Response) => {
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

app.delete('/api/articles/:reference', requireAuth, requireCsrf, requireRole('magasinier'), async (request: Request, response: Response) => {
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
// Rate limiting spécifique aux tentatives de connexion : 10 essais / 15 min par login.
app.use('/api/auth', createAuthRouter())
app.use('/api/parametres', createSettingsRouter())
app.use('/api', createReferentielSettingsRouter())
// Conformité NF525 : le routeur porte lui-même `requireAuth`, ce qui évite de
// dependre de l'ordre de montage de `createApiRouter`.
app.use('/api', createComplianceRouter())
app.use('/api/inventaires', createInventaireRouter())
app.use('/api', createApiRouter())

// 404 puis gestionnaire d'erreurs : l'ordre compte, les routes `/api/*` sont
// toutes tryees. Le gestionnaire traduit les erreurs en JSON homogene.
const frontendPath = join(process.cwd(), 'dist')
if (existsSync(join(frontendPath, 'index.html'))) {
  app.use(express.static(frontendPath))
  app.get('/{*path}', (request, response, next) => {
    if (request.path.startsWith('/api')) return next()
    response.sendFile(join(frontendPath, 'index.html'))
  })
}

app.use((_request: Request, response: Response) => {
  response.status(404).json({ error: 'NOT_FOUND', message: 'Route inconnue.' })
})

app.use(errorHandler)

const tls = startupSettings.https
if (tls.enabled) {
  validateCertificate(tls)
  const httpsPort = tls.port
  createHttpsServer({
    key: tls.privateKeyPem,
    cert: tls.certificatePem,
    minVersion: 'TLSv1.2',
  }, app).listen(httpsPort, () => {
    console.log(`Autostrass API listening on https://localhost:${httpsPort}`)
  })
  // Keep HTTP redirect/listener on the configured port
  createHttpServer(tls.httpMode === 'redirect' ? (request, response) => {
    response.writeHead(308, { Location: `${tls.publicOrigin.replace(/\/$/, '')}${request.url?.startsWith('/') ? request.url : '/'}` })
    response.end()
  } : app).listen(port, () => {
    console.log(`Autostrass API (HTTP) listening on http://localhost:${port}`)
  })
  if (!pool) console.warn('Warning: DB_* non configurees, /api/dashboard et /api/articles repondront 503.')
} else {
  app.listen(port, () => {
    console.log(`Autostrass API listening on http://localhost:${port}`)
    if (!pool) console.warn('Warning: DB_* non configurees, /api/dashboard et /api/articles repondront 503.')
    console.warn('Warning: No SSL certificates found in config/ssl/. HTTPS is disabled.')
  })
}

export { app }
