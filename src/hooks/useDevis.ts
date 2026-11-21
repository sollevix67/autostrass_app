import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError, toErrorMessage } from '../services/api'
import { devisApi } from '../services/devis'
import type { ApiDevis, DevisInput, DevisUpdateInput } from '../services/contracts'

const sortDevis = (rows: ApiDevis[]) => [...rows].sort((a, b) =>
  b.dateDevis.localeCompare(a.dateDevis) || b.id - a.id)

/** Les écritures et la conversion ne modifient la liste qu'après confirmation de l'API. */
export function useDevis() {
  const [rows, setRows] = useState<ApiDevis[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const pending = useRef(false)
  const reload = useCallback(() => { setLoading(true); setRevision((value) => value + 1) }, [])
  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    const controller = new AbortController()
    void devisApi.list(controller.signal).then((data) => {
      if (!controller.signal.aborted) { setRows(sortDevis(data)); setError(null) }
    }).catch((cause) => {
      if (!controller.signal.aborted && !isAbortError(cause)) setError(toErrorMessage(cause))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])

  const upsert = useCallback((devis: ApiDevis) => {
    setRows((current) => sortDevis([...current.filter((row) => row.id !== devis.id), devis]))
  }, [])

  const write = useCallback(async <T,>(run: () => Promise<T>, apply: (result: T) => void): Promise<T | null> => {
    if (pending.current) return null
    pending.current = true
    setSaving(true)
    setError(null)
    try {
      const result = await run()
      apply(result)
      return result
    } catch (cause) {
      if (!isAbortError(cause)) setError(toErrorMessage(cause))
      return null
    } finally { pending.current = false; setSaving(false) }
  }, [])

  const create = useCallback((payload: DevisInput) => write(() => devisApi.create(payload), upsert), [write, upsert])
  const update = useCallback((id: number, payload: DevisUpdateInput) =>
    write(() => devisApi.update(id, payload), upsert), [write, upsert])
  const convert = useCallback((id: number, version: number, dateLivraisonPrevue?: string) =>
    write(() => devisApi.convert(id, version, dateLivraisonPrevue), (result) => upsert(result.devis)), [write, upsert])

  return { rows, loading, saving, error, reload, clearError, create, update, convert }
}
