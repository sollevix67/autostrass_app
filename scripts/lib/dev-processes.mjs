import { execFile } from 'node:child_process'
import { readFile, readlink } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'

const run = promisify(execFile)
const windowsSnapshot = `
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-CimInstance Win32_Process | ForEach-Object {
  [PSCustomObject]@{
    pid = $_.ProcessId
    ppid = $_.ParentProcessId
    commandLine = $_.CommandLine
    startedAt = if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { '' }
  }
} | ConvertTo-Json -Compress
`

/** Inventaire en mémoire ; les lignes de commande ne sont jamais journalisées. */
export async function listProcesses() {
  if (process.platform === 'win32') {
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsSnapshot], {
      windowsHide: true, timeout: 10000, maxBuffer: 8 * 1024 * 1024,
    })
    const entries = JSON.parse(stdout.trim() || '[]')
    return (Array.isArray(entries) ? entries : [entries]).map((entry) => ({
      ...entry, commandLine: entry.commandLine || '', startedAt: entry.startedAt || '',
    }))
  }
  const { stdout } = await run('ps', ['-axww', '-o', 'pid=,ppid=,lstart=,command='], { timeout: 10000, maxBuffer: 8 * 1024 * 1024 })
  const entries = stdout.split('\n').flatMap((line) => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+[\d:]+\s+\d+)\s+(.*)$/)
    return match ? [{ pid: Number(match[1]), ppid: Number(match[2]), startedAt: match[3], commandLine: match[4] }] : []
  })
  if (process.platform !== 'linux') return entries
  return Promise.all(entries.map(async (entry) => {
    if (!/node|npm|tsx|vite|concurrently/.test(entry.commandLine)) return entry
    try {
      const [cwd, commandLine, stat] = await Promise.all([
        readlink(`/proc/${entry.pid}/cwd`), readFile(`/proc/${entry.pid}/cmdline`, 'utf8'), readFile(`/proc/${entry.pid}/stat`, 'utf8'),
      ])
      return { ...entry, cwd, args: commandLine.split('\0').filter(Boolean), startedAt: `linux:${stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19]}` }
    } catch { return entry }
  }))
}

function argumentsOf(commandLine) {
  const args = []
  let value = '', quote = '', started = false
  for (let index = 0; index < commandLine.length; index++) {
    const char = commandLine[index]
    if (char === '\\' && quote !== "'") {
      let end = index
      while (commandLine[end] === '\\') end++
      const count = end - index
      if (commandLine[end] === '"') {
        value += '\\'.repeat(Math.floor(count / 2))
        if (count % 2) value += '"'
        else quote = quote === '"' ? '' : '"'
        index = end
      } else { value += '\\'.repeat(count); index = end - 1 }
      started = true
    } else if (char === '"' || char === "'") {
      if (!quote) quote = char
      else if (quote === char) quote = ''
      else value += char
      started = true
    } else if (/\s/.test(char) && !quote) {
      if (started) args.push(value)
      value = ''; started = false
    } else { value += char; started = true }
  }
  if (started) args.push(value)
  return args
}

function pathsFor(root) {
  const windows = /^[a-z]:[\\/]|^\\\\/i.test(root)
  const api = windows ? path.win32 : path.posix
  const normalize = (value) => {
    if (value.startsWith('file://')) {
      try {
        const url = new URL(value)
        value = decodeURIComponent(url.pathname)
        if (windows && /^\/[a-z]:/i.test(value)) value = value.slice(1)
        if (url.hostname && url.hostname !== 'localhost') value = windows ? `\\\\${url.hostname}${value}` : `//${url.hostname}${value}`
      } catch { return '' }
    }
    const result = api.normalize(api.resolve(root, value))
    return windows ? result.toLowerCase() : result
  }
  const absolute = (value) => value.startsWith('file://') || api.isAbsolute(value)
  return { normalize, absolute, base: normalize(root), api }
}

const isEvaluationOption = (arg) => ['--eval', '--print'].includes(arg) || /^-[ep]/.test(arg)
  || arg.startsWith('--eval=') || arg.startsWith('--print=')

function nodeScriptIndex(args) {
  const valuedOptions = new Set(['-r', '--require', '--import', '--loader', '--experimental-loader', '-C', '--conditions', '--inspect-port'])
  for (let index = 1; index < args.length; index++) {
    const arg = args[index]
    if (isEvaluationOption(arg)) return -1
    if (arg === '--') return index + 1 < args.length ? index + 1 : -1
    if (!arg.startsWith('-')) return index
    if (valuedOptions.has(arg)) index++
  }
  return -1
}

function isDevProcess(entry, root) {
  if (!entry.commandLine || !entry.startedAt) return false
  const args = entry.args || argumentsOf(entry.commandLine)
  const paths = pathsFor(root)
  if (!/^node(?:\.exe)?$/i.test(paths.api.basename(args[0] || ''))) return false
  const cwdMatches = entry.cwd && paths.normalize(entry.cwd) === paths.base
  if (entry.cwd && !cwdMatches) return false
  const scriptIndex = nodeScriptIndex(args)
  const toolIndex = (tool) => scriptIndex >= 0 && (paths.absolute(args[scriptIndex]) || cwdMatches)
    && paths.normalize(args[scriptIndex]) === paths.normalize(`node_modules/${tool}`) ? scriptIndex : -1
  const isEntry = (arg) => typeof arg === 'string' && (arg === 'server/index.ts' || arg === 'server\\index.ts'
    || paths.absolute(arg) && paths.normalize(arg) === paths.normalize('server/index.ts'))
  const concurrently = toolIndex('concurrently/dist/bin/index.js')
  if (concurrently >= 0) {
    const commands = args.slice(concurrently + 1).map(argumentsOf)
    return commands.some((command) => command[0] === 'tsx' && isEntry(command[1]))
      && commands.some((command) => command[0] === 'vite' && command.slice(1).every((arg) => arg === '--strictPort'))
  }
  const tsx = toolIndex('tsx/dist/cli.mjs')
  if (tsx >= 0) {
    const options = args.slice(tsx + 1)
    if (options.includes('--test') || options.some(isEvaluationOption)) return false
    while (options[0]?.startsWith('-')) {
      const option = options.shift()
      if (option === '--tsconfig') options.shift()
    }
    if (options[0] === 'watch') options.shift()
    if (isEntry(options[0])) return true
  }
  const vite = toolIndex('vite/bin/vite.js')
  if (vite < 0) return false
  const options = args.slice(vite + 1)
  if (options.some((arg) => ['preview', 'build', 'optimize'].includes(arg))) return false
  if (options[0] === 'dev' || options[0] === 'serve') options.shift()
  const valuedOptions = new Set(['--host', '--port', '--base', '--mode', '--config', '--configLoader', '--logLevel'])
  let explicitRoot
  for (let index = 0; index < options.length; index++) {
    const arg = options[index]
    if (arg.startsWith('-')) {
      if (valuedOptions.has(arg) && options[index + 1] && !options[index + 1].startsWith('-')) index++
    } else {
      if (explicitRoot) return false
      explicitRoot = arg
    }
  }
  return !explicitRoot || paths.normalize(explicitRoot) === paths.base
}

/** Racines des seuls arbres de développement attribuables au dépôt. */
export function findDevProcesses(processes, root, currentPid = process.pid) {
  const byPid = new Map(processes.map((entry) => [entry.pid, entry]))
  const protectedPids = new Set()
  for (let pid = currentPid; pid && !protectedPids.has(pid); pid = byPid.get(pid)?.ppid) protectedPids.add(pid)
  const selected = processes.filter((entry) => Number.isSafeInteger(entry.pid) && entry.pid > 1
    && !protectedPids.has(entry.pid) && isDevProcess(entry, root))
  const selectedPids = new Set(selected.map((entry) => entry.pid))
  return selected.filter((entry) => {
    const visited = new Set([entry.pid])
    for (let pid = entry.ppid; pid && !visited.has(pid); pid = byPid.get(pid)?.ppid) {
      if (selectedPids.has(pid)) return false
      visited.add(pid)
    }
    return true
  })
}

const sameProcess = (left, right) => left && right && left.pid === right.pid
  && left.startedAt && left.startedAt === right.startedAt && left.commandLine === right.commandLine

function descendantsOf(processes, root) {
  const result = [root]
  const ids = new Set([root.pid])
  for (let index = 0; index < result.length; index++) {
    for (const entry of processes) {
      if (entry.ppid === result[index].pid && !ids.has(entry.pid)) { ids.add(entry.pid); result.push(entry) }
    }
  }
  return result
}

async function signalVerified(entries, signal) {
  const current = new Map((await listProcesses()).map((entry) => [entry.pid, entry]))
  for (const entry of entries) {
    if (!sameProcess(entry, current.get(entry.pid))) continue
    try { process.kill(entry.pid, signal) } catch (error) { if (error.code !== 'ESRCH') throw error }
  }
}

async function waitForExit(entries, timeout) {
  const deadline = Date.now() + timeout
  do {
    const current = new Map((await listProcesses()).map((entry) => [entry.pid, entry]))
    if (entries.every((entry) => !sameProcess(entry, current.get(entry.pid)))) return true
    await delay(150)
  } while (Date.now() < deadline)
  return false
}

export async function stopDevProcesses(root, currentPid = process.pid) {
  const selected = findDevProcesses(await listProcesses(), root, currentPid)
  let stopped = 0
  for (const entry of selected) {
    const snapshot = await listProcesses()
    const current = snapshot.find((candidate) => candidate.pid === entry.pid)
    if (!sameProcess(entry, current) || !findDevProcesses(snapshot, root, currentPid).some((candidate) => candidate.pid === entry.pid)) continue
    const tree = descendantsOf(snapshot, current)
    if (process.platform === 'win32') {
      try {
        await run('taskkill.exe', ['/PID', String(entry.pid), '/T', '/F'], { windowsHide: true, timeout: 6000, maxBuffer: 1024 * 1024 })
      } catch {
        if (!(await waitForExit(tree, 500))) throw new Error(`Impossible d'arrêter l'ancienne instance de développement (PID ${entry.pid}).`)
      }
    } else {
      await signalVerified(tree, 'SIGTERM')
      if (!(await waitForExit(tree, 1500))) await signalVerified(tree, 'SIGKILL')
    }
    if (!(await waitForExit(tree, 3000))) throw new Error(`L'ancienne instance de développement ne s'est pas arrêtée (PID ${entry.pid}).`)
    stopped++
  }
  return { stopped }
}
