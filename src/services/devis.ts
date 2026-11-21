import { api, ApiError } from './api'
import type { ApiDevis, ApiDevisConversion, DevisInput, DevisUpdateInput } from './contracts'

export const devisApi = {
  list: (signal?: AbortSignal) => api.get<ApiDevis[]>('/devis', { signal }),
  create: (payload: DevisInput) => api.post<ApiDevis>('/devis', payload),
  update: (id: number, payload: DevisUpdateInput) => api.put<ApiDevis>(`/devis/${id}`, payload),
  convert: (id: number, version: number, dateLivraisonPrevue?: string) =>
    api.post<ApiDevisConversion>(`/devis/${id}/convertir`, { version, dateLivraisonPrevue: dateLivraisonPrevue || undefined }),
  pdf: async (id: number, signal?: AbortSignal, version?: number) => {
    const blob = await api.getBlob(`/devis/${id}/pdf`, {
      signal, query: { version }, headers: { Accept: 'application/pdf' },
    })
    if (blob.size === 0 || blob.type.split(';')[0].trim().toLowerCase() !== 'application/pdf') {
      throw new ApiError(502, 'INVALID_PDF', 'Le serveur n’a pas renvoyé un PDF valide. Actualisez les données puis réessayez.')
    }
    return blob
  },
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
