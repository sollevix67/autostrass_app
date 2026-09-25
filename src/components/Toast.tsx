import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type Toast, type ToastApi } from './toastContext'

const AUTO_DISMISS_MS = 5000
const MAX_VISIBLE = 3

/**
 * Provider de notifications ephemeres.
 *
 * Le conteneur utilise `role="status"` + `aria-live="polite"` afin que les
 * messages soient annonces par les lecteurs d'ecran sans interrompre la
 * lecture en cours. L'auto-fermeture est suspendue au survol, pour laisser
 * le temps de lire un message d'erreur.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (tone: Toast['tone'], message: string) => {
      const id = nextId.current
      nextId.current += 1

      setToasts((current) => [...current, { id, tone, message }].slice(-MAX_VISIBLE))
      timers.current.set(id, window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS))
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.tone}`}
            onMouseEnter={() => {
              const timer = timers.current.get(toast.id)
              if (timer) window.clearTimeout(timer)
            }}
            onMouseLeave={() => {
              timers.current.set(toast.id, window.setTimeout(() => dismiss(toast.id), 2000))
            }}
          >
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Fermer la notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
