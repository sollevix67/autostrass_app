/**
 * Client HTTP centralise pour l'API Autostrass.
 *
 * Objectifs :
 * - une seule source de verite pour les URLs (`/api/...`) ;
 * - gestion d'erreur unifiee via `ApiError` ;
 * - support `AbortSignal` pour annuler les requetes au demontage ;
 * - reponse deja typee, aucun `as` necessaire cote appelant.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** Message affichable a l'utilisateur final. */
  get userMessage(): string {
    switch (this.code) {
      case 'DATABASE_UNCONFIGURED':
        return "La base de donnees n'est pas configuree sur le serveur."
      case 'DATABASE_UNAVAILABLE':
        return 'La base de donnees est injoignable. Verifiez la connexion MariaDB.'
      case 'NOT_FOUND':
        return "L'element demande est introuvable."
      case 'VALIDATION_ERROR':
        return this.message
      case 'NETWORK_ERROR':
        return "Impossible de joindre le serveur. Verifiez que l'API est demarree."
      default:
        return this.status === 0
          ? "Impossible de joindre le serveur."
          : this.message
    }
  }
}

type RequestOptions = Omit<RequestInit, 'signal'> & {
  signal?: AbortSignal
  query?: Record<string, string | number | boolean | undefined | null>
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const search = new URLSearchParams()

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      search.set(key, String(value))
    }
  }

  const qs = search.toString()
  return `${BASE_URL}${normalized}${qs ? `?${qs}` : ''}`
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { signal, query, headers, ...rest } = options
  let response: Response

  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_ERROR', "Impossible de joindre le serveur.")
  }

  const body = await parseBody(response)

  if (!response.ok) {
    const payload = (body ?? {}) as { error?: string; message?: string; details?: unknown }
    throw new ApiError(
      response.status,
      payload.error ?? 'UNKNOWN_ERROR',
      payload.message ?? `Erreur ${response.status} sur ${method} ${path}`,
      payload.details,
    )
  }

  return body as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}

/** Message normalise pour n'importe quelle erreur attrapee. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.userMessage
  if (error instanceof Error) return error.message
  return 'Erreur inconnue.'
}

/** `true` si l'erreur vient d'une annulation (a ne pas afficher). */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
