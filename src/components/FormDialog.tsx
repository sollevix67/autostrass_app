import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

type FormDialogProps = {
  open: boolean
  title: string
  description?: ReactNode
  children: ReactNode
  onClose: () => void
  busy?: boolean
  className?: string
  initialFocus?: string
  cancelLabel?: string
  showCancel?: boolean
  showClose?: boolean
  size?: 'small' | 'normal' | 'wide'
}

let activeDialogs = 0
let previousOverflow = ''

/** Dialogue natif commun : focus contenu, retour au déclencheur et saisie protégée. */
export function FormDialog({ open, title, description, children, onClose, busy = false,
  className = '', initialFocus = 'input:not([type="hidden"]), select, textarea',
  cancelLabel = 'Annuler', showCancel = true, showClose = true, size = 'normal',
}: FormDialogProps) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (activeDialogs++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
    dialog.showModal()
    const focus = [...dialog.querySelectorAll<HTMLElement>(initialFocus)].find((node) => !node.matches(':disabled') && node.getClientRects().length)
    focus?.focus()
    return () => {
      dialog.close()
      if (--activeDialogs === 0) document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open, initialFocus])

  if (!open) return null
  return <dialog ref={dialogRef} className={`modal form-dialog form-dialog-${size} ${className}`}
    aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if (!busy) onClose() }}
    onClick={(event) => {
      if (busy || event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab' || event.defaultPrevented || event.currentTarget.querySelector('dialog[open]')) return
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((node) => !node.matches(':disabled') && node.getClientRects().length)
      const first = focusable[0], last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
    <div className="form-dialog-header">
      <h2 id={`${id}-title`}>{title}</h2>
      {showClose && <button type="button" className="action-btn" aria-label="Fermer la fenêtre" disabled={busy} onClick={() => { if (!busy) onClose() }}><Icon name="close" /></button>}
    </div>
    {description && <div id={`${id}-description`} className="modal-desc">{description}</div>}
    <fieldset className="form-dialog-fields" disabled={busy}>{children}</fieldset>
    {showCancel && <div className="form-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => { if (!busy) onClose() }}>{cancelLabel}</button></div>}
  </dialog>
}
