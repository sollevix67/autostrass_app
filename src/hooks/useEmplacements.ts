import { useCallback, useEffect, useState } from 'react'
import { api, isAbortError, toErrorMessage } from '../services/api'
import type { ApiStockEmplacement } from '../services/contracts'

/** Lecture commune à Stock et Paramètres, sans données de remplacement. */
export function useEmplacements() {
  const [emplacements, setEmplacements] = useState<ApiStockEmplacement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => {
    setLoading(true)
    setRevision((value) => value + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api.get<ApiStockEmplacement[]>('/emplacements', { signal: controller.signal })
      .then((rows) => {
        if (controller.signal.aborted) return
        setEmplacements(rows)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return
        setEmplacements([])
        setError(toErrorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [revision])

  return { emplacements, loading, error, reload }
}
