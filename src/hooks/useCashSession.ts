/**
 * Hook de la caisse : session courante, ouverture, cloture, journal.
 *
 * Distinct de `useResource` parce que la caisse n'est pas une collection CRUD.
 * L'etat utile est **la session ouverte du caissier connecte**, qui peut
 * simplement ne pas exister : ce cas est le plus frequent au demarrage d'une
 * journee, et il doit s'afficher comme un etat normal (« vous n'avez pas de
 * caisse ouverte »), pas comme une erreur ou une liste vide.
 *
 * La reponse de `GET /caisse/actuelle` est `null` quand il n'y a pas de
 * session : `ApiError` ne szerait pas publie, d'ou le type `| null`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isAbortError, toErrorMessage } from '../services/api'
import type { ApiCashMovement, ApiCashSession } from '../services/contracts'

export type CashState = {
  /** Session ouverte, ou `null` si le caissier n'en a pas. */
  session: ApiCashSession | null
  loading: boolean
  saving: boolean
  error: string | null
  reload: () => void
  /** Ouvre une caisse. Renvoie la session, ou `null` en cas d'echec. */
  open: (fondsCaisse: number, notes?: string) => Promise<ApiCashSession | null>
  /** Cloture apres comptage. Renvoie la session close, ou `null`. */
  close: (comptage: Array<{ denomination: number; quantite: number }>, notes?: string) => Promise<ApiCashSession | null>
}

export function useCashSession(): CashState {
  const [session, setSession] = useState<ApiCashSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    api
      .get<ApiCashSession | null>('/caisse/actuelle', { signal: controller.signal })
      .then((data) => {
        setSession(data)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return
        setError(toErrorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [nonce])

  const reload = useCallback(() => {
    setLoading(true)
    setNonce((value) => value + 1)
  }, [])

  /**
   * Execute une ecriture de caisse.
   *
   * En mode degrade, une ouverture « locale » serait un piege : le caissier
   * verrait sa caisse ouverte alors que la base ne l'a pas enregistre, et ses
   * ventes echoueraient ensuite. Le hook remonte donc l'erreur au lieu de
   * simuler une reussite, contrairement a `useResource` qui, lui, sert des
   * donnees de demonstration en lecture.
   */
  const write = useCallback(async <T,>(run: () => Promise<T>, apply: (result: T) => void): Promise<T | null> => {
    setSaving(true)
    try {
      const result = await run()
      apply(result)
      setError(null)
      return result
    } catch (cause) {
      if (isAbortError(cause)) return null
      setError(toErrorMessage(cause))
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const open = useCallback(
    (fondsCaisse: number, notes?: string) =>
      write(
        () => api.post<ApiCashSession>('/caisse/ouvrir', { fondsCaisse, notes }),
        (created) => setSession(created),
      ),
    [write],
  )

  const close = useCallback(
    (comptage: Array<{ denomination: number; quantite: number }>, notes?: string) =>
      write(
        () =>
          api.post<ApiCashSession>(`/caisse/${session?.id ?? 0}/cloturer`, { comptage, notes }),
        // Apres cloture, le caissier n'a plus de session ouverte : on remet
        // l'etat a `null` plutot que de garder une session fermee affichee
        // comme si elle l'etait encore.
        () => setSession(null),
      ),
    [session, write],
  )

  return { session, loading, saving, error, reload, open, close }
}

/**
 * Journal des mouvements d'une session.
 *
 * Charge a la demande : un depot n'a pas besoin de l'historique de caisse tant
 * qu'il ne consulte pas l'ecart d'une cloture. Un `useResource` ici
 * declencherait une requete sur chaque poste a l'ouverture de la vue.
 */
export function useCashMovements(sessionId: number | null): {
  movements: ApiCashMovement[]
  loading: boolean
  error: string | null
} {
  // L'etat ne porte que la reponse du reseau, avec le session concernee :
  // l'identifiant permet de savoir si une reponse parvenue apres le
  // changement de session est encore pertinente.
  const [fetched, setFetched] = useState<{ sessionId: number; rows: ApiCashMovement[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestedRef = useRef<number | null>(null)

  useEffect(() => {
    if (sessionId === null || requestedRef.current === sessionId) return

    const controller = new AbortController()
    requestedRef.current = sessionId
    setLoading(true)

    api
      .get<ApiCashMovement[]>(`/caisse/${sessionId}/mouvements`, { signal: controller.signal })
      .then((data) => {
        setFetched({ sessionId, rows: Array.isArray(data) ? data : [] })
        setError(null)
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return
        setError(toErrorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [sessionId])

  // Une reponse arrivee pour une autre session ne doit jamais s'afficher dans
  // le journal de la session courante.
  const movements = fetched?.sessionId === sessionId ? fetched.rows : []
  return { movements, loading, error }
}
