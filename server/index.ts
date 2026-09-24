import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const hasDatabaseConfig = Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD)
const pool = hasDatabaseConfig ? mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionLimit: 10,
  waitForConnections: true,
}) : null

const emptyDashboard = {
  stockValue: 0,
  references: 0,
  lowStock: 0,
  pendingOrders: 0,
  lowStockItems: [] as Array<{ reference: string; label: string; quantity: number; minimum: number; location: string }>,
  activity: [] as Array<{ type: string; title: string; detail: string; time: string }>,
}

app.use(express.json())

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
    const [rows] = await pool.query<Array<RowDataPacket & { stock_value: number; references: number; low_stock: number }>>(
      `SELECT
        COALESCE(SUM(quantity * unit_price_ht), 0) AS stock_value,
        COUNT(DISTINCT reference_id) AS references,
        SUM(CASE WHEN quantity <= minimum_quantity THEN 1 ELSE 0 END) AS low_stock
      FROM stock_balances`,
    )
    response.json({
      ...emptyDashboard,
      stockValue: Number(rows[0]?.stock_value ?? 0),
      references: Number(rows[0]?.references ?? 0),
      lowStock: Number(rows[0]?.low_stock ?? 0),
    })
  } catch {
    response.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'Impossible de lire le dashboard depuis MariaDB.' })
  }
})

app.use((_error: unknown, _request: Request, response: Response, _next: unknown) => {
  response.status(500).json({ error: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' })
})

app.listen(port, () => {
  console.log(`Autostrass API listening on http://localhost:${port}`)
})
