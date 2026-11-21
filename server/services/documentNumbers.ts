import { randomInt } from 'node:crypto'

const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Date civile de l'établissement, indépendante du fuseau du processus. */
export function dateParis(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

/** Le numéro reste associé à sa date ; l'unicité est aussi imposée en SQL. */
export function generateDocumentNumber(type: 'D' | 'C', date = dateParis()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date de document invalide.')
  const suffix = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('')
  return `${date.replaceAll('-', '')}-${type}-${suffix}`
}
