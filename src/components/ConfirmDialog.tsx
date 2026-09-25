import { useEffect, useId, useRef, type ReactNode } from 'react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Met le bouton de confirmation en rouge (action destructive). */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Dialogue de confirmation accessible, en remplacement de `window.confirm`.
 *
 * Points d'accessibilite :
 * - `role="dialog"` + `aria-modal` + `aria-labelledby` / `aria-describedby`
 * - focus deplace sur le bouton d'annulation (action non destructive)
 * - piegeage du focus (Tab / Shift+Tab) a l'interieur du dialogue
 * - fermeture sur Echap
 * - focus restaure sur l'element declencheur a la fermeture
 * - defilement de l'arriere-plan bloque tant que le dialogue est ouvert
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const uid = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocus.current = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus()
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <div
        ref={dialogRef}
        className="modal confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-message`}
      >
        <h2 id={`${uid}-title`}>{title}</h2>
        <div id={`${uid}-message`} className="confirm-message">{message}</div>
        <div className="form-actions">
          <button ref={cancelRef} type="button" className="secondary-button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? 'danger-button' : 'primary-button'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
