import { useContext } from 'react'
import { ToastContext, type ToastApi } from './toastContext'

/** Repli utilise quand aucun `ToastProvider` n'enveloppe le composant. */
const CONSOLE_FALLBACK: ToastApi = {
  success: (message: string) => console.info(message),
  error: (message: string) => console.error(message),
  info: (message: string) => console.info(message),
  dismiss: () => undefined,
}

/**
 * Acces aux notifications ephemeres.
 *
 * Le repli est une constante de module : le hook s'appelle donc
 * inconditionnellement, sans risque de violation de la regle des hooks
 * (un `useContext` suivi d'un `return` precoce casserait l'ordre des hooks).
 */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? CONSOLE_FALLBACK
}
