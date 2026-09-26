/**
 * Hook CRUD generique pour les ressources de l'API.
 *
 * Les 8 metiers du schema v2 ont le meme contrat (liste, lecture, creation,
 * mise a jour, suppression). Factorise ici plutot que dans chaque vue :
 * annulation au demontage, etat de chargement, et surtout le comportement
 * « mode degrade » deja en place sur le catalogue.
 *
 * Ce qui est specifique a un metier (validation Zod, transformation avant
 * envoi) reste dans la vue : le hook ne connait que le transport.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isAbortError, toErrorMessage, ApiError } from '../services/api'
import { isApiUnavailable } from '../services/resilience'

export type ResourceState<TRow> = {
  rows: TRow[]
  loading: boolean
  saving: boolean
  error: string | null
  /** `true` si l'API est injoignable : les ecritures restent locales. */
  offline: boolean
  reload: () => void
  create: (payload: unknown) => Promise<TRow | null>
  update: (id: number, payload: unknown) => Promise<TRow | null>
  remove: (id: number) => Promise<boolean>
}

type Options<TRow> = {
  /** Chemin de collection, par exemple `/clients`. */
  path: string
  /** Ligne de repli affichee si l'API est injoignable. */
  fallback?: TRow[]
  /** Tri applique a la liste renvoyee. */
  sort?: (rows: TRow[]) => TRow[]
}

/**
 * Determine si une erreur signifie « l'API n'existe pas » (mode degrade) ou
 * « l'operation a echoue » (erreur metier a afficher).
 *
 * Un 401 ou 403 doit remonter comme une erreur : ce n'est pas l'API qui est
 * absente, c'est l'utilisateur qui n'a pas le droit, et le faire passer en
 * mode local afficherait des donnees de demonstration a la place d'un refus.
 */
function shouldDegrade(error: unknown): boolean {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false
  return isApiUnavailable(error)
}

export function useResource<TRow extends { id: number }>(options: Options<TRow>): ResourceState<TRow> {
  const { path, fallback = [], sort } = options

  const [rows, setRows] = useState<TRow[]>([])
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
      .get<TRow[]>(path, { signal: controller.signal })
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setRows(sort ? sort(list) : list)
        setError(null)
        setOffline(false)
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return
        setRows(sort ? sort(fallback) : fallback)
        setError(toErrorMessage(cause))
        setOffline(shouldDegrade(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
    // `sort` est recree a chaque rendu par l'appelant : on l'exclut
    // deliberement, sinon la liste se rechargerait sans fin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce])

  /** Remplace la ligne `id` dans l'etat local, ou l'ajoute en fin de liste. */
  const applyUpsert = useCallback((row: TRow) => {
    setRows((current) => {
      const index = current.findIndex((item) => item.id === row.id)
      const next = index === -1 ? [...current, row] : current.map((item) => (item.id === row.id ? row : item))
      return sort ? sort(next) : next
    })
  }, [sort])

  /**
   * Execute une ecriture. Hors ligne, la reponse est consideree comme
   * reussie et l'etat local est mis a jour : l'UI reste utilisable si la
   * base est coupee, et le bandeau d'information previent l'utilisateur.
   */
  const write = useCallback(
    async <T,>(run: () => Promise<T>, apply: (result: T) => void, offlinePatch: T | null): Promise<T | null> => {
      setSaving(true)
      try {
        const result = await run()
        apply(result)
        setError(null)
        setOffline(false)
        return result
      } catch (cause) {
        if (isAbortError(cause)) return null
        if (shouldDegrade(cause) && offlinePatch !== null) {
          apply(offlinePatch)
          setOffline(true)
          return offlinePatch
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
    async (payload: unknown): Promise<TRow | null> => {
      const created = await write<TRow>(
        () => api.post<TRow>(path, payload),
        applyUpsert,
        // En mode local, on fabrique un identifiant negatif : les ids de
        // l'API restent positifs, donc pas de collision apres rechargement.
        { id: -Date.now(), ...(payload as object) } as TRow,
      )
      return created
    },
    [path, write, applyUpsert],
  )

  const update = useCallback(
    async (id: number, payload: unknown): Promise<TRow | null> => {
      const current = rows.find((item) => item.id === id) ?? null
      const merged = { ...(current ?? {}), ...(payload as object), id } as TRow
      return write<TRow>(
        () => api.put<TRow>(`${path}/${id}`, payload),
        applyUpsert,
        merged,
      )
    },
    [path, rows, write, applyUpsert],
  )

  const remove = useCallback(
    async (id: number): Promise<boolean> => {
      setSaving(true)
      try {
        await api.delete(`${path}/${id}`)
        setRows((current) => current.filter((item) => item.id !== id))
        setError(null)
        return true
      } catch (cause) {
        if (isAbortError(cause)) return false
        if (shouldDegrade(cause)) {
          setRows((current) => current.filter((item) => item.id !== id))
          setOffline(true)
          return true
        }
        setError(toErrorMessage(cause))
        return false
      } finally {
        setSaving(false)
      }
    },
    [path],
  )

  return { rows, loading, saving, error, offline, reload, create, update, remove }
}
