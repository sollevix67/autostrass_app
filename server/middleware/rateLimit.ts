import type { RequestHandler } from 'express'
import { getSettings } from '../services/settingsStore.js'

/** Limiteur global par IP, indépendant du compteur d'échecs de connexion. */
export function rateLimit(_useLoginIdentity = false, testMax?: number): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number; windowSeconds: number }>()
  const sweeper = setInterval(() => {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= Date.now()) buckets.delete(key)
  }, 60_000)
  sweeper.unref()
  return (request, response, next) => {
    const { maxRequests: configuredMax, windowSeconds } = getSettings().api
    const maxRequests = testMax ?? configuredMax
    const key = request.ip ?? request.socket.remoteAddress ?? 'unknown'
    const now = Date.now()
    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now || bucket.windowSeconds !== windowSeconds) {
      bucket = { count: 0, resetAt: now + windowSeconds * 1000, windowSeconds }
      buckets.set(key, bucket)
    }
    bucket.count++
    response.setHeader('RateLimit-Limit', String(maxRequests))
    response.setHeader('RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)))
    response.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))
    if (bucket.count > maxRequests) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))))
      response.status(429).json({ error: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez après le délai indiqué.' })
      return
    }
    next()
  }
}
