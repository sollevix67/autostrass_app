import { useEffect, useRef } from 'react'
import { FormDialog } from '../../components/FormDialog'
import { Icon } from '../../components/Icon'
import { downloadPdfPreview } from '../../services/parametres'

export type PdfPreview = { url: string; file: Blob }

export default function DocumentsPdfPreview({ preview, onClose }: { preview: PdfPreview; onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const detachEscape = useRef<(() => void) | null>(null)
  useEffect(() => () => detachEscape.current?.(), [])

  function relayEscape() {
    detachEscape.current?.()
    try {
      const target = frame.current?.contentWindow
      if (!target) return
      const close = (event: KeyboardEvent) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
      }
      target.addEventListener('keydown', close, true)
      detachEscape.current = () => target.removeEventListener('keydown', close, true)
    } catch { /* Le lecteur natif garde ses contrôles ; Fermer reste disponible hors du lecteur. */ }
  }

  return <FormDialog open title="Aperçu fictif des documents PDF" size="wide" onClose={onClose}
    description="Document d’exemple créé avec votre saisie, avant son enregistrement."
    initialFocus=".documents-pdf-preview-close" showCancel={false}>
    <div className="documents-pdf-preview-toolbar">
      <button type="button" className="secondary-button documents-pdf-preview-close" onClick={onClose}>Fermer l’aperçu</button>
      <button type="button" className="secondary-button" onClick={() => downloadPdfPreview(preview.file)}><Icon name="download" size="sm" /> Télécharger l’aperçu</button>
      <a className="link-button" href={preview.url} target="_blank" rel="noopener noreferrer">Ouvrir dans un onglet</a>
    </div>
    <iframe ref={frame} className="documents-pdf-preview-frame" src={preview.url} title="Aperçu PDF fictif" onLoad={relayEscape} tabIndex={0} />
  </FormDialog>
}
