/** La numérotation et la validité des documents suivent la journée métier en France. */
export function todayParis(): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function devisExpired(dateValidite: string | null): boolean {
  return dateValidite !== null && dateValidite < todayParis()
}
