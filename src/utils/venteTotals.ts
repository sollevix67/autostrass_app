/** Calcul partagé : prix HT en centimes, TVA arrondie par ligne puis sommée. */
export type TaxedLine = { quantite: number; prixUnitaire: number; tauxTva: number }

export const MAX_AMOUNT_CENTS = 999_999_999_999

export function hasCentPrecision(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
}

export function venteTotals(lines: readonly TaxedLine[]) {
  let ht = 0
  let tva = 0
  for (const line of lines) {
    if (!Number.isInteger(line.quantite) || line.quantite < 1 || line.quantite > 9999
      || !hasCentPrecision(line.prixUnitaire) || line.prixUnitaire < 0 || line.prixUnitaire > 1_000_000
      || !hasCentPrecision(line.tauxTva) || line.tauxTva < 0 || line.tauxTva > 100) {
      throw new Error('Quantité, prix ou taux de TVA invalide.')
    }
    const montant = Math.round(line.prixUnitaire * 100) * line.quantite
    const taxe = Number((BigInt(montant) * BigInt(Math.round(line.tauxTva * 100)) + 5000n) / 10000n)
    ht += montant
    tva += taxe
    if (ht + tva > MAX_AMOUNT_CENTS) throw new Error('Le montant de la vente dépasse la capacité de stockage.')
  }
  return { totalHT: ht / 100, totalTVA: tva / 100, totalTTC: (ht + tva) / 100 }
}

export function ventePayment(totalTTC: number, modePaiement: string, montantPaye: number, monnaie?: number) {
  if (!hasCentPrecision(montantPaye) || montantPaye < 0 || Math.round(montantPaye * 100) > MAX_AMOUNT_CENTS) {
    throw new Error('Le montant payé doit être exprimé en centimes et respecter la limite autorisée.')
  }
  const paid = Math.round(montantPaye * 100)
  const total = Math.round(totalTTC * 100)
  if (paid < total) throw new Error('Le montant encaissé est inférieur au total TTC de la vente.')
  if (modePaiement !== 'espèces' && paid !== total) {
    throw new Error('Le paiement par carte ou chèque doit être égal au total TTC.')
  }
  const change = modePaiement === 'espèces' ? paid - total : 0
  if (monnaie !== undefined && (!hasCentPrecision(monnaie) || Math.round(monnaie * 100) !== change)) {
    throw new Error('La monnaie ne correspond pas au montant payé et au total TTC.')
  }
  return { montantPaye: paid / 100, monnaie: change / 100 }
}
