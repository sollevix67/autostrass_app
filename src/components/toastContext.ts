import { createContext } from 'react'

/**
 * Contexte des notifications ephemeres.
 *
 * Isole de `Toast.tsx` pour que ce fichier n'exporte qu'un composant :
 * le fast refresh de Vite ne fonctionne que si un module n'exporte que des
 * composants React.
 */

export type ToastTone = 'success' | 'error' | 'info'

export type Toast = {
  id: number
  tone: ToastTone
  message: string
}

export type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  dismiss: (id: number) => void
}

export const ToastContext = createContext<ToastApi | null>(null)
