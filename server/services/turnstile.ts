import type { TurnstileSettings } from '../../src/schemas/parametres.js'
import { settingsError } from './settingsStore.js'

/** Siteverify consomme le jeton une seule fois ; aucun résultat n'est mis en cache. */
export async function verifyTurnstile(settings: TurnstileSettings, token: string | undefined, action: 'login' | 'settings', fetcher: typeof fetch = fetch) {
  if (!settings.enabled) return
  if (!token || !settings.secretKey) throw settingsError('Effectuez la vérification de sécurité.', 403, 'TURNSTILE_REQUIRED')
  let result: { success?: boolean; hostname?: string; action?: string }
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: settings.secretKey, response: token }), signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error()
    result = await response.json() as typeof result
  } catch { throw settingsError('Le service de vérification est indisponible. Réessayez.', 503, 'TURNSTILE_UNAVAILABLE') }
  if (!result.success || result.action !== action || !result.hostname || !settings.hostnames.includes(result.hostname.toLowerCase())) {
    throw settingsError('La vérification a échoué ou a expiré. Recommencez.', 403, 'TURNSTILE_INVALID')
  }
}
