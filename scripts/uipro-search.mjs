/**
 * Lecteur minimal du dataset ui-ux-pro-max (recherche BM25 simplifiee).
 *
 * Utile quand Python 3 n'est pas installe : on interroge directement les CSV
 * du skill pour obtenir les memes recommandations qu'avec `search.py`.
 *
 *   node scripts/uipro-search.mjs "<requete>" --domain ux
 *   node scripts/uipro-search.mjs "dashboard inventaire" --design-system
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'prompts', 'ui-ux-pro-max')
const DATA = join(ROOT, 'data')

/** Analyse un CSV gerant les guillemets et les retours a la ligne dans les cellules. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1 } else { inQuotes = false }
      } else field += char
      continue
    }
    if (char === '"') { inQuotes = true; continue }
    if (char === ',') { row.push(field); field = ''; continue }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    if (char === '\r') continue
    field += char
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  if (rows.length === 0) return []

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''))
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h.trim(), (cells[i] ?? '').trim()])))
}

const tokenize = (text) =>
  text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2)

/** Score BM25 sur l'ensemble des champs, avec boost sur `keywords`. */
function score(row, tokens, fields, k1 = 1.5, b = 0.75) {
  let total = 0
  for (const [field, weight] of fields) {
    const value = String(row[field] ?? '').toLowerCase()
    if (!value) continue
    const words = tokenize(value)
    if (words.length === 0) continue
    const avg = field === 'keywords' ? 6 : 14
    tokens.forEach((token) => {
      const tf = words.filter((w) => w === token).length
      if (tf > 0) total += weight * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (words.length / avg))))
    })
  }
  return total
}

const DOMAINS = {
  ux: {
    file: 'ux-guidelines.csv',
    label: (r) => `${r.Issue} (${r.Category})`,
    detail: (r) => `${r.Description}\n   Do: ${r['Do']}\n   Don't: ${r["Don't"]}  [${r.Platform}, severite ${r.Severity}]`,
    fields: [['Issue', 3], ['Category', 1.5], ['Description', 2], ['Do', 1.5], ["Don't", 1], ['Platform', 0.8]],
  },
  style: {
    file: 'styles.csv',
    label: (r) => r['Style Category'],
    detail: (r) => `Mots-cles: ${r.Keywords}\n   Pour: ${r['Best For']}\n   A eviter pour: ${r['Do Not Use For']}`,
    fields: [['Style Category', 3], ['Keywords', 2.5], ['Best For', 2], ['Do Not Use For', 1.5], ['Effects & Animation', 1], ['Accessibility', 1], ['Performance', 1]],
  },
  color: {
    file: 'colors.csv',
    label: (r) => r['Product Type'],
    detail: (r) => `Primaire: ${r.Primary}  Secondaire: ${r.Secondary}  Accent: ${r.Accent}`,
    fields: [['Product Type', 3], ['Primary', 1.5], ['Secondary', 1.5], ['Accent', 1.5]],
  },
  typography: {
    file: 'typography.csv',
    label: (r) => r['Font Pairing Name'],
    detail: (r) => `${r['Heading Font']} / ${r['Body Font']}\n   Mood: ${r['Mood/Style Keywords']}\n   Pour: ${r['Best For']}`,
    fields: [['Font Pairing Name', 3], ['Mood/Style Keywords', 2.5], ['Best For', 2], ['Heading Font', 1.2], ['Body Font', 1.2], ['Category', 1]],
  },
  chart: {
    file: 'charts.csv',
    label: (r) => r['Best Chart Type'],
    detail: (r) => `${r['When to Use']}\n   Quand NE PAS l'utiliser: ${r['When NOT to Use']}`,
    fields: [['Best Chart Type', 3], ['Keywords', 2.5], ['Data Type', 2], ['When to Use', 2], ['Secondary Options', 1.2]],
  },
  product: {
    file: 'products.csv',
    label: (r) => r['Product Type'],
    detail: (r) => `Style: ${r['Primary Style Recommendation']}\n   Pattern: ${r['Landing Page Pattern']}\n   Couleurs: ${r['Color Palette Focus']}`,
    fields: [['Product Type', 3], ['Keywords', 2.5], ['Primary Style Recommendation', 2], ['Landing Page Pattern', 1.5], ['Dashboard Style (if applicable)', 1.5], ['Color Palette Focus', 1.5]],
  },
  react: {
    file: 'react-performance.csv',
    label: (r) => `${r.Issue} (${r.Category})`,
    detail: (r) => `${r.Description}\n   Do: ${r.Do}\n   Don't: ${r["Don't"]}`,
    fields: [['Issue', 3], ['Category', 1.5], ['Description', 2], ['Do', 1.5], ["Don't", 1], ['Keywords', 2.5]],
  },
  icons: {
    file: 'icons.csv',
    label: (r) => r['Icon Name'],
    detail: (r) => `${r.Library} — ${r.Usage}\n   ${r['Import Code']}`,
    fields: [['Icon Name', 3], ['Category', 1.5], ['Keywords', 2.5], ['Usage', 1.5], ['Best For', 1.5], ['Library', 1]],
  },
}

function search(domain, query, limit = 5) {
  const config = DOMAINS[domain]
  if (!config) throw new Error(`Domaine inconnu: ${domain}. Disponibles: ${Object.keys(DOMAINS).join(', ')}`)
  const rows = parseCsv(readFileSync(join(DATA, config.file), 'utf8'))
  const tokens = tokenize(query)
  return rows
    .map((row) => ({ row, value: score(row, tokens, config.fields) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

const args = process.argv.slice(2)
const query = args[0] ?? ''
const domainIndex = args.indexOf('--domain')
const limitIndex = args.indexOf('-n')

if (!query) {
  console.error(`Usage: node scripts/uipro-search.mjs "<requete>" --domain <${Object.keys(DOMAINS).join('|')}> [-n <limite>]`)
  process.exit(1)
}

const limit = limitIndex === -1 ? 5 : Number(args[limitIndex + 1] ?? 5)

if (domainIndex === -1) {
  console.error('Specifiez --domain (voir liste).')
  process.exit(1)
}

const results = search(args[domainIndex + 1], query, limit)
const config = DOMAINS[args[domainIndex + 1]]
console.log(`\n"${query}" — ${results.length} resultat(s)\n`)
results.forEach(({ row, value }, i) => {
  console.log(`${i + 1}. ${config.label(row)}   [score ${value.toFixed(2)}]`)
  console.log(config.detail(row))
  console.log('')
})
