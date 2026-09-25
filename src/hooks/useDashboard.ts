import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isAbortError, toErrorMessage } from '../services/api'
import type { Activity, ApiDashboard, ApiMode, DashboardData, LowStockItem } from '../types'

const INITIAL_DASHBOARD: DashboardData = {
  stockValue: 0,
  references: 0,
  lowStock: 0,
  pendingOrders: 0,
  lowStockItems: [],
  activity: [],
}

const REFRESH_INTERVAL_MS = 60_000

/** Normalise les deux formes de payload acceptees par l'API historique. */
function mapDashboardPayload(data: ApiDashboard): DashboardData {
  const lowStockItems: LowStockItem[] = data.lowStockItems ?? data.stockItems?.map((item) => ({
    reference: item.ref,
    label: item.name,
    quantity: item.stock,
    minimum: item.minimum,
    location: item.location,
  })) ?? []

  const activity: Activity[] = data.activity ?? data.activities ?? []

  return {
    stockValue: data.stockValue ?? INITIAL_DASHBOARD.stockValue,
    references: data.references ?? INITIAL_DASHBOARD.references,
    lowStock: data.lowStock ?? INITIAL_DASHBOARD.lowStock,
    pendingOrders: data.pendingOrders ?? INITIAL_DASHBOARD.pendingOrders,
    lowStockItems,
    activity,
  }
}

type UseDashboardResult = {
  dashboard: DashboardData
  apiMode: ApiMode
  error: string | null
  lastUpdated: Date | null
  refresh: () => void
}

/**
 * Charge le dashboard et le rafraichit periodiquement.
 * La requete est annulee au demontage ou a chaque refresh concurrent.
 */
export function useDashboard(pollIntervalMs: number | null = REFRESH_INTERVAL_MS): UseDashboardResult {
  const [dashboard, setDashboard] = useState<DashboardData>(INITIAL_DASHBOARD)
  const [apiMode, setApiMode] = useState<ApiMode>('loading')
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [nonce, setNonce] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    setApiMode('loading')
    setNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    api
      .get<ApiDashboard>('/dashboard', { signal: controller.signal })
      .then((data) => {
        setDashboard(mapDashboardPayload(data))
        setApiMode('connected')
        setError(null)
        setLastUpdated(new Date())
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) return
        setDashboard(INITIAL_DASHBOARD)
        setApiMode('error')
        setError(toErrorMessage(cause))
      })

    return () => controller.abort()
  }, [nonce])

  useEffect(() => {
    if (pollIntervalMs === null) return
    const timer = window.setInterval(refresh, pollIntervalMs)
    return () => window.clearInterval(timer)
  }, [pollIntervalMs, refresh])

  return { dashboard, apiMode, error, lastUpdated, refresh }
}
