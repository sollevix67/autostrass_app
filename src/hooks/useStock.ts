import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, isAbortError, toErrorMessage } from '../services/api'
import { isApiUnavailable } from '../services/resilience'
import { SEED_ARTICLES } from './useCatalogue'
import type { Article } from '../types'

export type StockFilter = 'all' | 'low' | 'ok'
export type StockSortKey = 'reference' | 'designation' | 'quantite' | 'minimum' | 'emplacement'

type UseStockResult = {
  articles: Article[]
  visibleArticles: Article[]
  loading: boolean
  saving: boolean
  error: string | null
  offline: boolean
  filter: StockFilter
  setFilter: (filter: StockFilter) => void
  query: string
  setQuery: (query: string) => void
  sortKey: StockSortKey
  sortDirection: 'asc' | 'desc'
  toggleSort: (key: StockSortKey) => void
  editing: Article | null
  startEditing: (article: Article) => void
  updateEditing: (patch: Partial<Article>) => void
  cancelEditing: () => void
  saveEditing: () => Promise<boolean>
  adjustQuantity: (reference: string, delta: number) => Promise<void>
  remove: (reference: string) => Promise<boolean>
  metrics: {
    total: number
    lowStock: number
    healthy: number
    stockValue: number
  }
  reload: () => void
}

function compareArticles(a: Article, b: Article, key: StockSortKey): number {
  if (key === 'quantite' || key === 'minimum') return a[key] - b[key]
  return String(a[key]).localeCompare(String(b[key]), 'fr', { numeric: true })
}

/**
 * Table de stock : chargement, filtres, tri, ajustement des quantites et
 * edition en ligne. Bascule en mode local si l'API est indisponible.
 */
export function useStock(): UseStockResult {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [filter, setFilter] = useState<StockFilter>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<StockSortKey>('reference')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [editing, setEditing] = useState<Article | null>(null)
  const [nonce, setNonce] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    api
      .get<Article[]>('/stock', { signal: controller.signal })
      .then((data) => {
        setArticles(Array.isArray(data) ? data : [])
        setError(null)
        setOffline(false)
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return
        setArticles(SEED_ARTICLES)
        setError(toErrorMessage(cause))
        setOffline(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [nonce])

  const metrics = useMemo(
    () => ({
      total: articles.length,
      lowStock: articles.filter((item) => item.quantite <= item.minimum).length,
      healthy: articles.filter((item) => item.quantite > item.minimum).length,
      stockValue: articles.reduce((sum, item) => sum + item.quantite * item.prixUnitaireHT, 0),
    }),
    [articles],
  )

  const visibleArticles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = articles.filter((item) => {
      const matchesFilter =
        filter === 'all' ? true : filter === 'low' ? item.quantite <= item.minimum : item.quantite > item.minimum
      if (!matchesFilter) return false
      if (!needle) return true
      return (
        item.reference.toLowerCase().includes(needle) ||
        item.designation.toLowerCase().includes(needle) ||
        item.emplacement.toLowerCase().includes(needle)
      )
    })

    return filtered.sort((a, b) => {
      const result = compareArticles(a, b, sortKey)
      return sortDirection === 'asc' ? result : -result
    })
  }, [articles, filter, query, sortKey, sortDirection])

  const toggleSort = useCallback((key: StockSortKey) => {
    setSortKey((currentKey) => {
      if (currentKey !== key) {
        setSortDirection('asc')
        return key
      }
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))
      return currentKey
    })
  }, [])

  /**
   * Application optimiste : on affiche la nouvelle quantite immediatement,
   * puis on confirme cote API. En cas d'erreur metier (hors API indisponible),
   * on restaure la valeur precedente.
   */
  const adjustQuantity = useCallback(
    async (reference: string, delta: number) => {
      const current = articles.find((item) => item.reference === reference)
      if (!current) return

      const next: Article = { ...current, quantite: Math.max(0, current.quantite + delta) }
      setArticles((prev) => prev.map((item) => (item.reference === reference ? next : item)))

      try {
        await api.patch(`/articles/${encodeURIComponent(reference)}/quantite`, { delta })
        setError(null)
        setOffline(false)
      } catch (cause) {
        if (isAbortError(cause)) return
        if (isApiUnavailable(cause)) {
          setOffline(true)
          return
        }
        setArticles((prev) => prev.map((item) => (item.reference === reference ? current : item)))
        setError(toErrorMessage(cause))
      }
    },
    [articles],
  )

  const saveEditing = useCallback(async (): Promise<boolean> => {
    if (!editing) return false
    setSaving(true)
    try {
      const updated = await api.put<Article>(`/articles/${encodeURIComponent(editing.reference)}`, editing)
      setArticles((prev) => prev.map((item) => (item.reference === editing.reference ? updated : item)))
      setEditing(null)
      setError(null)
      setOffline(false)
      return true
    } catch (cause) {
      if (isAbortError(cause)) return false
      if (isApiUnavailable(cause)) {
        setArticles((prev) => prev.map((item) => (item.reference === editing.reference ? editing : item)))
        setEditing(null)
        setOffline(true)
        return true
      }
      setError(toErrorMessage(cause))
      return false
    } finally {
      setSaving(false)
    }
  }, [editing])

  const remove = useCallback(
    async (reference: string): Promise<boolean> => {
      setSaving(true)
      try {
        await api.delete(`/articles/${encodeURIComponent(reference)}`)
        setArticles((prev) => prev.filter((item) => item.reference !== reference))
        setError(null)
        setOffline(false)
        return true
      } catch (cause) {
        if (isAbortError(cause)) return false
        if (isApiUnavailable(cause)) {
          setArticles((prev) => prev.filter((item) => item.reference !== reference))
          setOffline(true)
          return true
        }
        setError(toErrorMessage(cause))
        return false
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  return {
    articles,
    visibleArticles,
    loading,
    saving,
    error,
    offline,
    filter,
    setFilter,
    query,
    setQuery,
    sortKey,
    sortDirection,
    toggleSort,
    editing,
    startEditing: setEditing,
    updateEditing: (patch: Partial<Article>) => setEditing((prev) => (prev ? { ...prev, ...patch } : prev)),
    cancelEditing: () => setEditing(null),
    saveEditing,
    adjustQuantity,
    remove,
    metrics,
    reload,
  }
}
