/** Classification pure puis arbres Node factices, hors base et hors dépôt. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { findDevProcesses, listProcesses, stopDevProcesses } from './lib/dev-processes.mjs'

let checks = 0
const check = (condition, label) => { assert.ok(condition, label); checks++ }
const root = 'C:\\Dépôt avec espace\\Autostrass'
const record = (pid, commandLine, extra = {}) => ({ pid, ppid: 1, commandLine, startedAt: `start-${pid}`, ...extra })
const vite = (base = root, suffix = '') => `node "${base}\\node_modules\\.bin\\..\\vite\\bin\\vite.js"${suffix}`
const tsx = (base = root) => `node "${base}\\node_modules\\tsx\\dist\\cli.mjs" server/index.ts`
const concurrent = (base = root) => `node "${base}\\node_modules\\concurrently\\dist\\bin\\index.js" --kill-others --names api,web "tsx server/index.ts" "vite --strictPort"`
const match = (entries, currentPid = 999) => findDevProcesses(entries, root, currentPid).map((entry) => entry.pid)

check(JSON.stringify(match([record(10, vite()), record(11, tsx()), record(12, concurrent())])) === '[10,11,12]', 'CLI du dépôt avec espaces et chemins .bin/..')
check(JSON.stringify(match([record(10, vite(root.toLowerCase()))])) === '[10]', 'Chemins Windows insensibles à la casse')
check(match([record(10, vite(root + '-voisin')), record(11, tsx('C:\\Autre projet'))]).length === 0, 'Autres dépôts et noms voisins conservés')
check(match([record(10, vite(root, ' preview')), record(11, vite(root, ' build'))]).length === 0, 'Preview et build conservés')
check(match([record(10, vite(root, ' "C:\\Autre projet"'))]).length === 0, 'Racine Vite explicite étrangère conservée')
check(match([record(10, vite(root, ' --strictPort "C:\\Autre projet"')), record(11, vite(root, ' --host 127.0.0.1 "C:\\Autre projet"'))]).length === 0, 'Racine Vite étrangère après options conservée')
check(JSON.stringify(match([record(10, vite(root, ' --port 5173 --strictPort')), record(11, vite(root, ` serve "${root}"`))])) === '[10,11]', 'Options Vite et racine explicite du dépôt reconnues')
check(match([record(10, 'node --import tsx server/index.ts'), record(11, 'node --import tsx scripts/test-api.ts')]).length === 0, 'Node relatif sans preuve et tests conservés')
check(match([record(10, `node -e "setInterval(() => {}, 1000)" -- "${root}\\node_modules\\vite\\bin\\vite.js"`), record(11, `node scripts/other.mjs "${root}\\node_modules\\vite\\bin\\vite.js"`)]).length === 0, 'Chemin CLI seulement passé en argument conservé')
check(match([record(10, `node "-esetInterval(() => {}, 1000)" -- "${root}\\node_modules\\vite\\bin\\vite.js"`)]).length === 0, 'Option eval courte concaténée conservée')
check(JSON.stringify(match([record(10, `node --no-warnings "${root}\\node_modules\\vite\\bin\\vite.js"`), record(11, `node --require module "${root}\\node_modules\\tsx\\dist\\cli.mjs" server/index.ts`)])) === '[10,11]', 'Vrai script Node après ses options reconnu')
check(match([record(10, vite(), { cwd: 'C:\\Autre projet' })]).length === 0, 'CWD étranger prioritaire sur le chemin du binaire')
check(match([record(10, vite(), { startedAt: '' }), record(11, '', { startedAt: 'now' })]).length === 0, 'Métadonnées insuffisantes conservées')
check(match([record(10, `node "${root}\\node_modules\\tsx\\dist\\cli.mjs" scripts/test-api.ts`)]).length === 0, 'CLI tsx de tests conservé')
check(match([record(10, `node "${root}\\node_modules\\tsx\\dist\\cli.mjs" --no-cache`)]).length === 0, 'CLI sans entrée ignoré')
check(match([record(10, `node "${root}\\node_modules\\tsx\\dist\\cli.mjs" scripts/test-api.ts server/index.ts`), record(11, `node "${root}\\node_modules\\tsx\\dist\\cli.mjs" --test server/index.ts`)]).length === 0, 'Argument ressemblant à une API et mode test conservés')
check(JSON.stringify(match([record(10, `node "${root}\\node_modules\\tsx\\dist\\cli.mjs" --tsconfig tsconfig.server.json server/index.ts`)])) === '[10]', 'Option tsconfig de l’API reconnue')
check(match([record(-1, vite()), record(0, vite()), record(1, vite())]).length === 0, 'PID invalides et système exclus')
check(JSON.stringify(match([record(10, concurrent()), record(11, tsx(), { ppid: 10 }), record(12, vite(), { ppid: 10 })])) === '[10]', 'Un seul arrêt pour l’arbre concurrently')
check(match([record(10, concurrent()), record(11, tsx(), { ppid: 10 }), record(999, 'node scripts/stop-dev.mjs', { ppid: 11 })]).length === 0, 'Courant et tous ses ancêtres protégés')
check(JSON.stringify(match([record(10, 'node "file:///C:/D%C3%A9p%C3%B4t%20avec%20espace/Autostrass/node_modules/vite/bin/vite.js"')])) === '[10]', 'URI de fichier normalisée')
check(match([record(10, concurrent().replace('"vite --strictPort"', '"vite preview"'))]).length === 0, 'Concurrently non consacré au développement conservé')
check(JSON.stringify(findDevProcesses([record(10, 'node node_modules/vite/bin/vite.js', { cwd: '/tmp/projet' })], '/tmp/projet', 999).map((entry) => entry.pid)) === '[10]', 'Chemin relatif POSIX avec CWD exact')

check(['--eval=setInterval(()=>{},1000)', '--print=1', '-esetInterval(()=>{},1000)', '-p1', '-e "setInterval(() => {}, 1000)"', '--eval "setInterval(() => {}, 1000)"']
  .every((option, index) => match([record(50 + index, `node "${root}\\node_modules\\tsx\\dist\\cli.mjs" ${option} server/index.ts`)]).length === 0), 'Expressions eval/print tsx conservées malgré un argument ressemblant à une API')

const directory = await mkdtemp(path.join(tmpdir(), 'autostrass-dev-processes-'))
const ownedRoot = path.join(directory, 'projet actif')
const foreignRoot = path.join(directory, 'projet actif voisin')
const children = []
const fakeSource = `
const { spawn } = require('node:child_process')
const { writeFileSync } = require('node:fs')
const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { windowsHide: true, stdio: 'ignore' })
writeFileSync('child.json', JSON.stringify({ pid: child.pid }))
setInterval(() => {}, 1000)
`
async function fixture(base) {
  const filename = path.join(base, 'node_modules/vite/bin/vite.js')
  await mkdir(path.dirname(filename), { recursive: true })
  await writeFile(filename, fakeSource)
  const child = spawn(process.execPath, [filename], { cwd: base, windowsHide: true, stdio: 'ignore' })
  const ended = once(child, 'exit')
  children.push({ base, child, ended })
  for (let attempt = 0; attempt < 30; attempt++) {
    try { return { child, worker: JSON.parse(await readFile(path.join(base, 'child.json'), 'utf8')).pid } } catch { await delay(100) }
  }
  throw new Error('Le processus factice ne s’est pas initialisé.')
}
try {
  const owned = await fixture(ownedRoot)
  const foreign = await fixture(foreignRoot)
  const snapshot = await listProcesses()
  check(snapshot.some((entry) => entry.pid === owned.child.pid && entry.startedAt), 'Inventaire réel avec identité de naissance')
  check(findDevProcesses(snapshot, ownedRoot).some((entry) => entry.pid === owned.child.pid), 'Processus factice du dépôt reconnu')
  check(!findDevProcesses(snapshot, ownedRoot).some((entry) => entry.pid === foreign.child.pid), 'Processus factice voisin exclu')
  const result = await stopDevProcesses(ownedRoot)
  const after = await listProcesses()
  check(result.stopped === 1 && !after.some((entry) => entry.pid === owned.child.pid || entry.pid === owned.worker), 'Arrêt réel de l’arbre ciblé et de son enfant')
  check(after.some((entry) => entry.pid === foreign.child.pid) && foreign.child.exitCode === null, 'Projet voisin toujours vivant')
  check((await stopDevProcesses(ownedRoot)).stopped === 0, 'Deuxième nettoyage sans effet')
  console.log(`${checks} contrôles de processus réussis ; arbres factices, aucune base.`)
} finally {
  for (const state of children) {
    await stopDevProcesses(state.base)
    if (state.child.exitCode === null) state.child.kill()
    await state.ended
  }
  assert.equal(path.dirname(directory), tmpdir())
  assert.ok(path.basename(directory).startsWith('autostrass-dev-processes-'))
  await rm(directory, { recursive: true, force: true })
}
