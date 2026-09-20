import 'dotenv/config'
import express from 'express'
import mysql from 'mysql2/promise'

const app = express()
const port = Number(process.env.API_PORT ?? 3001)
const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'autostrass_test',
  waitForConnections: true,
  connectionLimit: 5,
})

app.use(express.json())

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1')
    response.json({ status: 'ok', database: process.env.DB_NAME ?? 'autostrass_test' })
  } catch (error) {
    console.error('MariaDB health check failed', error)
    response.status(503).json({ status: 'error', message: 'Connexion MariaDB indisponible' })
  }
})

app.get('/api/dashboard', async (_request, response) => {
  try {
    const [stockRows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT name, reference, location, stock_quantity, status FROM stock_items ORDER BY id',
    )
    const [activityRows] = await pool.query<mysql.RowDataPacket[]>(
      'SELECT title, detail, relative_time, tone FROM activities ORDER BY occurred_at DESC LIMIT 10',
    )
    response.json({
      stock: stockRows.map((row) => ({
        reference: row.reference,
        name: row.name,
        location: row.location,
        quantity: Number(row.stock_quantity),
        status: row.status === 'Critique' ? 'Stock faible' : 'En stock',
        tone: row.status === 'Critique' ? 'orange' : 'green',
      })),
      activities: activityRows.map((row) => ({
        time: row.relative_time,
        title: row.title,
        detail: row.detail,
        color: row.tone,
      })),
    })
  } catch (error) {
    console.error('Dashboard query failed', error)
    response.status(503).json({ status: 'error', message: 'Données MariaDB indisponibles' })
  }
})

app.listen(port, () => {
  console.log(`Autostrass API listening on http://localhost:${port}`)
})