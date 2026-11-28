import { api, ApiError, isAbortError } from './api'
import type { ApiParametres } from './contracts'
import type { DocumentsPdfSettings } from '../schemas/parametres'

const PREVIEW_TIMEOUT_MS = 15000
const MAX_PREVIEW_BYTES = 10 * 1024 * 1024

export const documentsPdfApi = {
  save: (values: DocumentsPdfSettings) => api.put<ApiParametres>('/parametres/documents-pdf', values),
  preview: async (values: DocumentsPdfSettings, signal?: AbortSignal): Promise<Blob> => {
    const controller = new AbortController()
    let timedOut = false
    const cancel = () => controller.abort()
    if (signal?.aborted) controller.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    const timer = globalThis.setTimeout(() => { timedOut = true; controller.abort() }, PREVIEW_TIMEOUT_MS)
    try {
      const file = await api.postBlob('/parametres/documents-pdf/apercu', values, {
        signal: controller.signal, headers: { Accept: 'application/pdf' },
      })
      if (timedOut) throw new ApiError(408, 'PDF_PREVIEW_TIMEOUT', 'L’aperçu prend trop de temps. Réessayez.')
      if (signal?.aborted) throw new DOMException('Aperçu annulé.', 'AbortError')
      if (file.size === 0 || file.size > MAX_PREVIEW_BYTES || file.type.split(';')[0].trim().toLowerCase() !== 'application/pdf') {
        throw new ApiError(502, 'INVALID_PDF_PREVIEW', 'Le fichier d’aperçu PDF est invalide. Réessayez.')
      }
      return file
    } catch (cause) {
      if (timedOut && isAbortError(cause)) {
        throw new ApiError(408, 'PDF_PREVIEW_TIMEOUT', 'L’aperçu prend trop de temps. Réessayez.')
      }
      throw cause
    } finally {
      globalThis.clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
    }
  },
}
