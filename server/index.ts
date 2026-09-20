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

const demoDashboard = {
  stockValue: 128640,
  references: 2486,
  lowStock: 12,
  pendingOrders: 7,
  lowStockItems: [
    { reference: 'PLA-2841', label: 'Plaquettes de frein avant', quantity: 2, minimum: 6, location: 'A-03 / E-02 / P-14' },
    { reference: 'FIL-0920', label: 'Filtre a huile - Renault', quantity: 3, minimum: 8, location: 'B-01 / E-04 / P-02' },
    { reference: 'BAT-7710', label: 'Batterie 12V 70Ah', quantity: 1, minimum: 4, location: 'C-02 / E-01 / P-08' },
    { reference: 'HUI-5400', label: 'Huile moteur 5W30 - 5L', quantity: 4, minimum: 10, location: 'D-05 / E-03 / P-21' },
  ],
  activity: [
    { type: 'RECEPTION', title: 'Reception fournisseur', detail: 'Auto Pieces Nord - 24 lignes', time: 'Il y a 18 min' },
    { type: 'VENTE', title: 'Vente comptoir #C-10482', detail: 'Caisse 02 - 184,50 EUR', time: 'Il y a 32 min' },
    { type: 'TRANSFERT', title: 'Transfert de stock', detail: 'Allee A vers zone comptoir', time: 'Il y a 1 h' },
  ],
}

app.use(express.json())

app.get('/api/health', async (_request: Request, response: Response) => {
  let database = 'demo'
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
    response.json(demoDashboard)
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
    response.json({ ...demoDashboard, stockValue: Number(rows[0]?.stock_value ?? 0), references: Number(rows[0]?.references ?? 0), lowStock: Number(rows[0]?.low_stock ?? 0) })
  } catch {
    response.json(demoDashboard)
  }
})

app.use((_error: unknown, _request: Request, response: Response, _next: unknown) => {
  response.status(500).json({ error: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' })
})

app.listen(port, () => {
  console.log(`Autostrass API listening on http://localhost:${port}`)
})
