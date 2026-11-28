import { useEffect, useState } from 'react'
import { toErrorMessage } from '../services/api'
import { FormDialog } from './FormDialog'
import { Icon } from './Icon'
import { PdfReader } from './PdfReader'

export type PdfPreviewRequest = {
  title: string
  filename: string
  loadFile: (signal: AbortSignal) => Promise<Blob>
}

type PdfPreviewProps = Pick<PdfPreviewRequest, 'title' | 'filename'> & (
  | { loadFile: PdfPreviewRequest['loadFile']; file?: never }
  | { file: Blob; loadFile?: never }
) & {
  onClose: () => void
  description?: string
  downloadLabel?: string
  showOpenInTab?: boolean
}

type PdfSource = Blob | PdfPreviewRequest['loadFile']
type PdfResult = { source: PdfSource } & ({ file: Blob; url: string } | { error: string })

export function PdfPreviewDialog({ title, filename, loadFile, file, onClose, description,
  downloadLabel = 'Télécharger le PDF', showOpenInTab = false }: PdfPreviewProps) {
  const source = file !== undefined ? file : loadFile
  const [response, setResponse] = useState<PdfResult | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let url: string | undefined
    // Une ouverture déjà annulée ne doit pas demander la génération d'un PDF au serveur.
    queueMicrotask(async () => {
      if (controller.signal.aborted) return
      try {
        const pdf = typeof source === 'function' ? await source(controller.signal) : source
        if (controller.signal.aborted) return
        url = URL.createObjectURL(pdf)
        setResponse({ source, file: pdf, url })
      } catch (cause) {
        if (!controller.signal.aborted) setResponse({ source, error: toErrorMessage(cause) })
      }
    })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [source, attempt])

  const result = response?.source === source ? response : null
  const ready = result && 'file' in result ? result : null
  function retry() {
    setResponse(null)
    setAttempt((value) => value + 1)
  }
  return <FormDialog open title={title} description={description} size="wide" className="pdf-preview-dialog"
    initialFocus=".pdf-preview-close" onClose={onClose} showCancel={false}>
    <div className="pdf-preview-actions">
      <button type="button" className="secondary-button pdf-preview-close" onClick={onClose}>Fermer l’aperçu</button>
      {ready && <a className="secondary-button" href={ready.url} download={filename}>
        <Icon name="download" size="sm" /> {downloadLabel}
      </a>}
      {ready && showOpenInTab && <a className="link-button" href={ready.url} target="_blank" rel="noopener noreferrer">Ouvrir dans un onglet</a>}
    </div>
    {!result && <p role="status">Chargement du PDF…</p>}
    {result && 'error' in result && <>
      <p className="error-banner" role="alert">{result.error}</p>
      <button type="button" className="secondary-button" onClick={retry}>Réessayer</button>
    </>}
    {ready && <PdfReader file={ready.file} />}
  </FormDialog>
}
