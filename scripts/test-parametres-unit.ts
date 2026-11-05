import { deepEqual, equal, ok, rejects, throws } from 'node:assert/strict'
import { mkdtemp, readFile, rename, mkdir, rmdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import selfsigned from 'selfsigned'

const directory = await mkdtemp(join(tmpdir(), 'autostrass-settings-unit-'))
process.env.AUTOSTRASS_SETTINGS_FILE = join(directory, 'settings.json')
const { getSettings, updateSettings, publicSettings, settingsFile } = await import('../server/services/settingsStore.js')
const { validateCertificate } = await import('../server/services/httpsSettings.js')
const { verifyTurnstile } = await import('../server/services/turnstile.js')
const { rateLimit } = await import('../server/middleware/rateLimit.js')
const { rateLimit: loginLimit } = await import('../server/middleware/csrf.js')
let checks = 0
function pass(label: string) { checks++; console.log(`OK ${label}`) }

try {
  await Promise.all([
    updateSettings((previous) => ({ ...previous, api: { maxRequests: 10, windowSeconds: 10 } }), 1),
    updateSettings((previous) => ({ ...previous, login: { maxAttempts: 3, windowSeconds: 10, blockSeconds: 10 } }), 2),
    updateSettings((previous) => ({ ...previous, turnstile: { enabled: false, siteKey: 'public-test', secretKey: 'private-test', hostnames: ['localhost'] } }), 3),
  ])
  equal(getSettings().api.maxRequests, 10)
  equal(getSettings().login.maxAttempts, 3)
  equal(getSettings().turnstile.secretKey, 'private-test')
  deepEqual(JSON.parse(await readFile(settingsFile, 'utf8')), getSettings())
  ok(!JSON.stringify(publicSettings()).includes('private-test'))
  const copy = getSettings(); copy.api.maxRequests = 999
  equal(getSettings().api.maxRequests, 10)
  pass('Écritures concurrentes préservées, fichier persistant, secrets masqués et état isolé')

  const previous = getSettings()
  await rename(settingsFile, `${settingsFile}.backup`)
  await mkdir(settingsFile)
  await rejects(updateSettings((value) => ({ ...value, api: { maxRequests: 20, windowSeconds: 10 } }), 1), /Impossible de sauvegarder/)
  deepEqual(getSettings(), previous)
  await rmdir(settingsFile)
  await rename(`${settingsFile}.backup`, settingsFile)
  pass('Échec disque sans publication d’un état non sauvegardé')

  const certificate = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { keySize: 2048 })
  const tls = { enabled: true, port: 3443, httpMode: 'serve' as const, publicOrigin: '', certificatePem: certificate.cert, privateKeyPem: certificate.private }
  ok(validateCertificate(tls).fingerprint)
  const second = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { keySize: 2048 })
  throws(() => validateCertificate({ ...tls, privateKeyPem: second.private }), /incompatible/)
  throws(() => validateCertificate({ ...tls, certificatePem: 'invalide' }), /invalide/)
  pass('Certificat valide accepté ; paire incompatible et PEM invalide refusés')

  const settings = { enabled: true, siteKey: 'site', secretKey: 'secret', hostnames: ['localhost'] }
  const respond = (body: unknown) => (async () => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })) as typeof fetch
  await verifyTurnstile(settings, 'single-use-token', 'login', respond({ success: true, hostname: 'localhost', action: 'login' }))
  for (const body of [{ success: false }, { success: true, hostname: 'evil.example', action: 'login' }, { success: true, hostname: 'localhost', action: 'settings' }]) {
    await rejects(verifyTurnstile(settings, 'token', 'login', respond(body)))
  }
  await rejects(verifyTurnstile(settings, undefined, 'login'))
  await rejects(verifyTurnstile(settings, 'token', 'login', (async () => { throw new Error('timeout') }) as typeof fetch), /indisponible/)
  await verifyTurnstile({ ...settings, enabled: false }, undefined, 'login')
  pass('Turnstile : réussite, absence, refus, hostname/action incorrects et panne externe')

  const app = express()
  app.use(express.json())
  app.get('/api', rateLimit(), (_request, response) => response.json({ ok: true }))
  app.post('/login', loginLimit(), (request, response) => response.status(request.body.success ? 200 : 401).json({ ok: Boolean(request.body.success) }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  try {
    for (let i = 0; i < 10; i++) equal((await fetch(`${base}/api`)).status, 200)
    const limited = await fetch(`${base}/api`)
    equal(limited.status, 429); ok(limited.headers.get('retry-after'))
    await updateSettings((value) => ({ ...value, api: { ...value.api, maxRequests: 20 } }), 1)
    equal((await fetch(`${base}/api`)).status, 200)
    const attempt = (email: string, success = false) => fetch(`${base}/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, success }) })
    equal((await attempt('one@example.test')).status, 401)
    equal((await attempt('one@example.test', true)).status, 200)
    for (let i = 0; i < 3; i++) equal((await attempt('one@example.test')).status, 401)
    equal((await attempt('ONE@example.test')).status, 429)
    equal((await attempt('two@example.test', true)).status, 200)
    pass('Quotas appliqués à chaud, réussite réinitialisant les échecs, comptes distincts derrière la même IP')
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())) }
} finally {
  await unlink(settingsFile).catch(() => {})
  await rmdir(directory)
}
console.log(`${checks} groupes de contrôles Paramètres réussis.`)
