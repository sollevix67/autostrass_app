const minute = 60_000
const jour = 1440 * minute
const horlogeParis = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/** Encode les chiffres de l'heure parisienne sur une échelle civile sans fuseau. */
function heureCivile(instant: number) {
  const parts = Object.fromEntries(horlogeParis.formatToParts(instant).map(({ type, value }) => [type, Number(value)]))
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
}

function debutDuBlocage(heureLocale: number) {
  const veille = heureLocale - jour
  const premier = heureLocale - (heureCivile(veille) - veille)
  const ecart = heureCivile(premier) - heureLocale
  if (ecart === 0) return premier
  const ajuste = premier - ecart
  // À l'automne, prendre la première occurrence. Au printemps, décaler l'heure
  // inexistante de la durée du saut (02 h 30 devient 03 h 30).
  return heureCivile(ajuste) === heureLocale ? ajuste : premier
}

export function isSupplierOrderBlocked(heureSql: string | null, dureeMinutes: number | null, now = new Date()) {
  if (heureSql === null || dureeMinutes === null) return false
  const [heures, minutes] = heureSql.split(':').map(Number)
  const instant = now.getTime()
  const minuitLocal = Math.floor(heureCivile(instant) / jour) * jour
  const debutAujourdhui = minuitLocal + (60 * heures + minutes) * minute
  return [debutAujourdhui, debutAujourdhui - jour].some((heureLocale) => {
    const ecoule = instant - debutDuBlocage(heureLocale)
    return ecoule >= 0 && ecoule < dureeMinutes * minute
  })
}
