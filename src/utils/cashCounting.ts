export type CashCountLine = { denomination: number; quantite: number }

/** Additionner des centimes entiers évite les écarts dus aux décimales. */
export function totalCashCount(lines: readonly CashCountLine[]): number {
  return lines.reduce((sum, line) => sum + Math.round(line.denomination * 100) * line.quantite, 0) / 100
}
