import 'dotenv/config'
import express from 'express'
import mysql from 'mysql2/promise'

type StockItem = {
  name: string
  ref: string
  location: string
  stock: number
  minimum: number
  status: 'Critique' | 'Disponible'
}

type Activity = {
  type: 'Réception' | 'Vente' | 'Retour'
  title: string
  detail: string
  time: string
  tone: 'green' | 'blue' | 'orange'
}

const requiredEnvironment = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key])

if (missingEnvironment.length > 0) {
  throw new Error(`Variables d'environnement manquantes : ${missingEnvironment.join(', ')}`)
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 5,
})

const app = express()
app.use(express.json())

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1')
    response.json({ status: 'ok', database: 'connected' })
  } catch {
    response.status(503).json({ status: 'error', database: 'unavailable' })
  }
})

app.get('/api/dashboard', async (_request, response) => {
  try {
    const [stockRows] = await pool.query(
      'SELECT name, reference AS ref, location, stock_quantity AS stock, minimum_quantity AS minimum, status FROM stock_items ORDER BY stock_quantity / NULLIF(minimum_quantity, 0), name',
    )
    const [activityRows] = await pool.query(
      'SELECT activity_type AS type, title, detail, relative_time AS time, tone FROM activities ORDER BY occurred_at DESC LIMIT 10',
    )

    response.json({ stockItems: stockRows as StockItem[], activities: activityRows as Activity[] })
  } catch (error) {
    console.error('Erreur de lecture du dashboard', error)
    response.status(503).json({ message: 'Les données du dashboard sont indisponibles.' })
  }
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`API autostrass disponible sur http://localhost:${port}`)
})