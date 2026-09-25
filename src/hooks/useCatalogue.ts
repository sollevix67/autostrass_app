import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isAbortError, toErrorMessage } from '../services/api'
import { isApiUnavailable } from '../services/resilience'
import type { Article } from '../types'

/** Jeu de donnees de repli utilise quand l'API catalogue est indisponible. */
export const SEED_ARTICLES: Article[] = [
  {
    reference: 'PLA-2841',
    designation: 'Plaquettes de frein avant',
    category: 'freins',
    prixUnitaireHT: 15.5,
    quantite: 12,
    minimum: 6,
    emplacement: 'A-03 / E-02 / P-14',
  },
  {
    reference: 'FIL-0920',
    designation: "Filtre a huile - Renault",
    category: 'filtres',
    prixUnitaireHT: 8.2,
    quantite: 3,
    minimum: 8,
    emplacement: 'B-01 / E-04 / P-02',
  },
  {
    reference: 'BAT-7710',
    designation: 'Batterie 12V 70Ah',
    category: 'batteries',
    prixUnitaireHT: 45,
    quantite: 6,
    minimum: 4,
    emplacement: 'C-02 / E-01 / P-08',
  },
  {
    reference: 'HUI-5400',
    designation: 'Huile moteur 5W30 - 5L',
    category: 'huiles',
    prixUnitaireHT: 22,
    quantite: 14,
    minimum: 10,
    emplacement: 'D-05 / E-03 / P-21',
  },
]

export const EMPTY_ARTICLE: Article = {
  reference: '',
  designation: '',
  category: '',
  prixUnitaireHT: 0,
  quantite: 0,
  minimum: 0,
  emplacement: '',
  description: '',
}

type UseCatalogueResult = {
  articles: Article[]
  loading: boolean
  saving: boolean
  error: string | null
  /** `true` si l'API catalogue est indisponible : les ecritures restent locales. */
  offline: boolean
  reload: () => void
  create: (article: Article) => Promise<Article | null>
  update: (article: Article) => Promise<Article | null>
  remove: (reference: string) => Promise<boolean>
}

function upsertByReference(list: Article[], article: Article): Article[] {
  const index = list.findIndex((item) => item.reference === article.reference)
  if (index === -1) return [...list, article]
  const next = [...list]
  next[index] = article
  return next
}

/**
 * CRUD articles : charge la liste, cree, met a jour et supprime.
 *
 * Si l'API est injoignable (503, 404, reseau coupe), le hook bascule en mode
 * local : les modifications restent en memoire et l'UI previent l'utilisateur.
 */
export function useCatalogue(): UseCatalogueResult {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
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
      .get<Article[]>('/articles', { signal: controller.signal })
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

  /**
   * Execute une ecriture et bascule en mode local si l'API est indisponible.
   * `apply` est appele en cas de succes reseau, ou avec `fallback` en mode local.
   */
  const write = useCallback(
    async <T,>(run: () => Promise<T>, apply: (result: T) => void, fallback: T): Promise<T | null> => {
      setSaving(true)
      try {
        const result = await run()
        apply(result)
        setError(null)
        setOffline(false)
        return result
      } catch (cause) {
        if (isAbortError(cause)) return null
        if (isApiUnavailable(cause)) {
          apply(fallback)
          setOffline(true)
          return fallback
        }
        setError(toErrorMessage(cause))
        return null
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  const create = useCallback(
    (article: Article) =>
      write(
        () => api.post<Article>('/articles', article),
        (created) => setArticles((prev) => upsertByReference(prev, created)),
        article,
      ),
    [write],
  )

  const update = useCallback(
    (article: Article) =>
      write(
        () => api.put<Article>(`/articles/${encodeURIComponent(article.reference)}`, article),
        (updated) => setArticles((prev) => upsertByReference(prev, updated)),
        article,
      ),
    [write],
  )

  const remove = useCallback(
    (reference: string) =>
      write<boolean>(
        () => api.delete(`/articles/${encodeURIComponent(reference)}`).then(() => true),
        () => setArticles((prev) => prev.filter((item) => item.reference !== reference)),
        true,
      ).then((result) => result ?? false),
    [write],
  )

  return { articles, loading, saving, error, offline, reload, create, update, remove }
}
