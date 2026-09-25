import { useState, type ReactNode } from 'react'

/**
 * Gere l'etat d'un dialogue de confirmation depuis un simple handler.
 *
 * Retourne les props a etaler sur `<ConfirmDialog />` plus la fonction
 * `confirm` a appeler depuis une action (suppression, annulation...).
 */
export function useConfirm() {
  const [request, setRequest] = useState<{
    title: string
    message: ReactNode
    onConfirm: () => void
  } | null>(null)

  return {
    dialogProps: {
      open: request !== null,
      title: request?.title ?? '',
      message: request?.message ?? '',
      onConfirm: () => {
        request?.onConfirm()
        setRequest(null)
      },
      onCancel: () => setRequest(null),
    },
    confirm: (title: string, message: ReactNode, onConfirm: () => void) =>
      setRequest({ title, message, onConfirm }),
  }
}
