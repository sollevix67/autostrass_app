import { ApiError, toErrorMessage } from './api'

/**
 * `true` si l'echec vient de l'API indisponible, et non d'une erreur metier.
 *
 * Dans ce cas la vue bascule en mode local : la donnee reste en memoire et
 * l'utilisateur continue a travailler au lieu de voir une erreur bloquante.
 */
export function isApiUnavailable(error: unknown): boolean {
  if (error instanceof ApiError) {
    // 0 = reseau injoignable, 404 = endpoint absent, 502/503/504 = service down
    return error.status === 0 || error.status === 404 || error.status === 502 || error.status === 503 || error.status === 504
  }
  return error instanceof TypeError // fetch a echoue : DNS, CORS, serveur arrete
}

/** Message affichable, quelle que soit l'origine de l'erreur. */
export { toErrorMessage }
