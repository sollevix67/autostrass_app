import { api } from './api'
import type { ApiDevis, ApiDevisConversion, DevisInput, DevisUpdateInput } from './contracts'

export const devisApi = {
  list: (signal?: AbortSignal) => api.get<ApiDevis[]>('/devis', { signal }),
  create: (payload: DevisInput) => api.post<ApiDevis>('/devis', payload),
  update: (id: number, payload: DevisUpdateInput) => api.put<ApiDevis>(`/devis/${id}`, payload),
  convert: (id: number, version: number, dateLivraisonPrevue?: string) =>
    api.post<ApiDevisConversion>(`/devis/${id}/convertir`, { version, dateLivraisonPrevue: dateLivraisonPrevue || undefined }),
  pdf: (id: number, signal?: AbortSignal, version?: number) =>
    api.getPdf(`/devis/${id}/pdf`, { signal, query: { version } }),
}

/** Le lien temporaire permet de télécharger le fichier avec la session HTTP actuelle. */
export function downloadDevisPdf(file: Blob, filename: string): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function devisPdfFilename(devis: Pick<ApiDevis, 'numero'>): string {
  return `devis-${devis.numero}.pdf`
}
