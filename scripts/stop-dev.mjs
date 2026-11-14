import 'dotenv/config'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveConfig } from 'vite'
import { stopDevProcesses } from './lib/dev-processes.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function apiPorts() {
  const ports = [{ label: 'API HTTP', port: Number(process.env.PORT ?? 3001) }]
  const settingsFile = resolve(process.env.AUTOSTRASS_SETTINGS_FILE ?? join(root, 'config/runtime/settings.json'))
  if (existsSync(settingsFile)) {
    let settings
    try { settings = JSON.parse(readFileSync(settingsFile, 'utf8')) }
    catch { throw new Error('Le fichier des paramètres est illisible ou invalide.') }
    if (settings.https?.enabled) ports.push({ label: 'API HTTPS', port: Number(settings.https.port ?? 3443) })
  } else if (!process.env.AUTOSTRASS_SETTINGS_FILE
    && existsSync(join(root, 'config/ssl/localhost.crt')) && existsSync(join(root, 'config/ssl/localhost.key'))) {
    ports.push({ label: 'API HTTPS', port: Number(process.env.HTTPS_PORT ?? 3443) })
  }
  return ports
}

function checkPort({ label, port }) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`Port invalide pour ${label}.`)
  if (port === 0) return Promise.resolve()
  return new Promise((resolveCheck, reject) => {
    const server = createServer()
    server.once('error', (error) => {
      reject(error.code === 'EADDRINUSE'
        ? new Error(`Le port ${port} (${label}) est occupé par un processus dont l'appartenance au dépôt n'est pas confirmée. Arrêtez ce service ou choisissez un autre port.`)
        : new Error(`Impossible de vérifier le port ${port} (${label}) : ${error.message}`))
    })
    server.listen(port, () => server.close((error) => error ? reject(error) : resolveCheck()))
  })
}

try {
  const configuration = await resolveConfig({ root }, 'serve')
  const ports = [...apiPorts(), { label: 'Vite', port: configuration.server.port ?? 5173 }]
  const fixedPorts = ports.filter(({ port }) => port !== 0)
  if (new Set(fixedPorts.map(({ port }) => port)).size !== fixedPorts.length) {
    throw new Error('Les ports de Vite, HTTP et HTTPS doivent être distincts.')
  }
  const { stopped } = await stopDevProcesses(root)
  if (stopped) console.log(`[dev] ${stopped} ancienne(s) instance(s) de ce dépôt arrêtée(s).`)
  for (const port of ports) await checkPort(port)
} catch (error) {
  console.error(`[dev] ${error.message}`)
  process.exitCode = 1
}
