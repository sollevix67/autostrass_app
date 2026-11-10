import type { ReactNode } from 'react'
import { FormDialog } from './FormDialog'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmation native, également utilisable au-dessus d'un formulaire ouvert. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler', destructive = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return <FormDialog open={open} title={title} description={message} onClose={onCancel} initialFocus=".confirm-cancel" showClose={false} showCancel={false} size="small" className="confirm-modal">
    <div className="form-actions">
      <button className="secondary-button confirm-cancel" type="button" onClick={onCancel}>{cancelLabel}</button>
      <button className={destructive ? 'danger-button' : 'primary-button'} type="button" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </FormDialog>
}
