import 'dotenv/config'
import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import mysql, { type Connection } from 'mysql2/promise'
import { splitStatements } from './sql.js'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export type TestEnvironment = {
  connection: Connection
  baseUrl: string
  restartApi(): Promise<void>
  runScript(path: string): Promise<void>
  close(): Promise<void>
}

type ManagedProcess = {
  child: ChildProcess
  finished: Promise<void>
  done: boolean
  output: string
  error: Error | null
}

async function findAvailablePort(): Promise<number> {
  const server = createServer()
  return new Promise((resolvePort, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Impossible de réserver un port pour l’API de test.'))
        return
      }
      server.close((error) => error ? reject(error) : resolvePort(address.port))
    })
  })
}

/** Crée une base neuve et une API isolée, sans utiliser DB_NAME comme cible. */
export async function createTestEnvironment(): Promise<TestEnvironment> {
  const host = process.env.TEST_DB_HOST ?? process.env.DB_HOST
  const user = process.env.TEST_DB_USER ?? process.env.DB_USER
  const password = process.env.TEST_DB_PASSWORD ?? process.env.DB_PASSWORD
  const port = process.env.TEST_DB_PORT ?? process.env.DB_PORT ?? '3306'
  if (!host || !user || !password) {
    throw new Error('TEST_DB_HOST, TEST_DB_USER et TEST_DB_PASSWORD (ou DB_*) sont requis pour créer la base de test jetable.')
  }

  const databaseName = `autostrass_transfer_test_${randomBytes(8).toString('hex')}`
  const jwtSecret = randomBytes(32).toString('hex')
  const secrets = [password, process.env.DB_PASSWORD, process.env.JWT_SECRET, jwtSecret]
    .filter((value): value is string => Boolean(value))
  const redact = (value: string): string => secrets.reduce(
    (message, secret) => message.replaceAll(secret, '[masqué]'), value,
  )
  const describeError = (error: unknown): string => redact(
    error instanceof Error ? error.message : String(error),
  )
  const credentials = {
    host,
    port: Number(port),
    user,
    password,
    connectTimeout: 5000,
  }

  let administration: Connection | undefined
  let connection: Connection | undefined
  let databaseCreated = false
  let api: ManagedProcess | undefined
  let cleanup: Promise<void> | undefined
  const processes = new Set<ManagedProcess>()

  function startProcess(args: string[], env: NodeJS.ProcessEnv, echo = false): ManagedProcess {
    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const state: ManagedProcess = {
      child,
      finished: Promise.resolve(),
      done: false,
      output: '',
      error: null,
    }
    state.finished = new Promise<void>((resolveFinished) => {
      child.once('error', (error) => { state.error = error })
      child.once('close', () => {
        state.done = true
        processes.delete(state)
        resolveFinished()
      })
    })
    const capture = (chunk: Buffer) => {
      const text = redact(chunk.toString('utf8'))
      state.output = (state.output + text).slice(-8000)
      if (echo) process.stdout.write(text)
    }
    child.stdout?.on('data', capture)
    child.stderr?.on('data', capture)
    processes.add(state)
    return state
  }

  async function stopProcess(state: ManagedProcess): Promise<void> {
    if (state.done) return
    state.child.kill('SIGTERM')
    const forceStop = setTimeout(() => state.child.kill('SIGKILL'), 3000)
    try {
      await Promise.race([
        state.finished,
        delay(6000, undefined, { ref: false }).then(() => {
          if (!state.done) throw new Error('Le processus de test ne s’est pas arrêté.')
        }),
      ])
    } finally {
      clearTimeout(forceStop)
    }
  }

  function close(): Promise<void> {
    cleanup ??= (async () => {
      const errors: string[] = []
      const stopped = await Promise.allSettled([...processes].map(stopProcess))
      for (const result of stopped) {
        if (result.status === 'rejected') errors.push(describeError(result.reason))
      }
      try {
        await connection?.end()
      } catch (error) {
        errors.push(describeError(error))
      }
      try {
        // Le nom est généré ici et le drapeau n'est posé qu'après CREATE réussi.
        if (databaseCreated && administration) {
          if (!/^autostrass_transfer_test_[a-f0-9]{16}$/.test(databaseName)) {
            throw new Error('Nom de base jetable invalide : suppression refusée.')
          }
          await administration.query(`DROP DATABASE \`${databaseName}\``)
          databaseCreated = false
        }
      } catch (error) {
        errors.push(describeError(error))
      } finally {
        try {
          await administration?.end()
        } catch (error) {
          errors.push(describeError(error))
        }
      }
      if (errors.length) throw new Error(`Nettoyage de l’environnement de test : ${errors.join('; ')}`)
    })()
    return cleanup
  }

  try {
    administration = await mysql.createConnection(credentials)
    // Aucun IF NOT EXISTS : même une collision ne permet pas de réutiliser une base.
    await administration.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    databaseCreated = true
    connection = await mysql.createConnection({ ...credentials, database: databaseName })

    async function applyFixture(path: string): Promise<void> {
      const source = await readFile(resolve(projectRoot, path), 'utf8')
      for (const statement of splitStatements(source)) {
        if (/^(?:CREATE\s+DATABASE|USE\s)/i.test(statement)) continue
        await connection!.query(statement)
      }
    }

    await applyFixture('database/schema.sql')
    await migrate(drizzle(connection), { migrationsFolder: resolve(projectRoot, 'database/drizzle') })
    await applyFixture('database/seed_v2.sql')
    await applyFixture('database/seed_v3.sql')

    const port = await findAvailablePort()
    const baseUrl = `http://127.0.0.1:${port}`
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: 'test',
      DB_HOST: host,
      DB_PORT: String(credentials.port),
      DB_USER: user,
      DB_PASSWORD: password,
      DB_NAME: databaseName,
      PORT: String(port),
      HTTPS_PORT: '0',
      JWT_SECRET: jwtSecret,
      API_URL: baseUrl,
    }

    async function restartApi(): Promise<void> {
      if (cleanup) throw new Error('L’environnement de test est déjà fermé.')
      if (api) await stopProcess(api)
      api = startProcess(['--import', 'tsx', 'server/index.ts'], env)
      const deadline = Date.now() + 15000
      while (Date.now() < deadline) {
        if (api.done || api.error) break
        try {
          const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1000) })
          const health = await response.json() as { database?: string }
          if (response.ok && health.database === 'connected' && !api.done && !api.error) return
        } catch {
          // Le serveur et ses imports sont encore en cours de démarrage.
        }
        await delay(100)
      }
      throw new Error(`L’API de test n’est pas disponible. ${api.error ? describeError(api.error) : ''}\n${api.output}`)
    }

    async function runScript(path: string): Promise<void> {
      if (cleanup) throw new Error('L’environnement de test est déjà fermé.')
      const script = startProcess(['--import', 'tsx', path], env, true)
      try {
        await Promise.race([
          script.finished,
          delay(120000, undefined, { ref: false }).then(() => {
            if (!script.done) throw new Error(`Délai de deux minutes dépassé pour ${path}.`)
          }),
        ])
      } catch (error) {
        await stopProcess(script)
        throw error
      }
      if (script.error || script.child.exitCode !== 0) {
        throw new Error(`Échec du script ${path} (${script.child.exitCode ?? 'arrêt'}). ${script.error ? describeError(script.error) : 'Voir la sortie ci-dessus.'}`)
      }
    }

    await restartApi()
    return { connection, baseUrl, restartApi, runScript, close }
  } catch (error) {
    let cleanupError = ''
    try {
      await close()
    } catch (failure) {
      cleanupError = `\n${describeError(failure)}`
    }
    throw new Error(`Création de l’environnement de test impossible : ${describeError(error)}${cleanupError}`)
  }
}
