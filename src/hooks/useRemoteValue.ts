import { useCallback, useEffect, useState } from 'react'
import { api, isAbortError, toErrorMessage } from '../services/api'

/** Lecture sans repli local : les paramètres affichés viennent toujours du serveur. */
export function useRemoteValue<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => { setLoading(true); setRevision((value) => value + 1) }, [])
  useEffect(() => {
    const controller = new AbortController()
    api.get<T>(path, { signal: controller.signal }).then((value) => {
      if (!controller.signal.aborted) { setData(value); setError(null) }
    }).catch((cause) => {
      if (!controller.signal.aborted && !isAbortError(cause)) { setError(toErrorMessage(cause)); setData(null) }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [path, revision])
  return { data, setData, loading, error, reload }
}
