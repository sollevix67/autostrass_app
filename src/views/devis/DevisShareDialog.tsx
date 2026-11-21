import { useEffect, useRef, useState } from 'react'
import { FormDialog } from '../../components/FormDialog'
import { Icon } from '../../components/Icon'
import { formatEuros } from '../../options'
import { isAbortError, toErrorMessage } from '../../services/api'
import { devisApi, devisPdfFilename, downloadDevisPdf } from '../../services/devis'
import type { ApiDevis } from '../../services/contracts'

function whatsappPhone(telephone: string): string {
  const digits = telephone.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.length === 10 && digits.startsWith('0')) return `33${digits.slice(1)}`
  return digits.length >= 8 ? digits : ''
}

function canShareFile(file: File | null): boolean {
  try { return file !== null && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }) }
  catch { return false }
}

/** Le PDF est prêt avant le clic pour conserver l'activation exigée par le partage natif. */
export function DevisShareDialog({ devis, onClose }: { devis: ApiDevis; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const pending = useRef(false)
  const filename = devisPdfFilename(devis)

  useEffect(() => {
    const controller = new AbortController()
    void devisApi.pdf(devis.id, controller.signal, devis.version).then((blob) => {
      if (!controller.signal.aborted) { setFile(new File([blob], filename, { type: 'application/pdf' })); setError(null) }
    }).catch((cause) => {
      if (!controller.signal.aborted && !isAbortError(cause)) setError(toErrorMessage(cause))
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [devis.id, devis.version, filename, revision])

  const snapshot = devis.clientSnapshot
  const message = `Bonjour ${snapshot.prenom} ${snapshot.nom},\nVoici votre devis ${devis.numero} du ${devis.dateDevis}, d’un montant de ${formatEuros(devis.totalTTC)} TTC.${devis.dateValidite ? `\nIl est valable jusqu’au ${devis.dateValidite}.` : ''}`
  const emailUrl = `mailto:${encodeURIComponent(snapshot.email)}?subject=${encodeURIComponent(`Devis ${devis.numero}`)}&body=${encodeURIComponent(message)}`
  const whatsappUrl = `https://wa.me/${whatsappPhone(snapshot.telephone)}?text=${encodeURIComponent(message)}`
  const shareSupported = canShareFile(file)

  async function share() {
    if (!file || pending.current) return
    pending.current = true
    setSharing(true)
    setError(null)
    try { await navigator.share({ files: [file], title: `Devis ${devis.numero}`, text: message }) }
    catch (cause) { if (!isAbortError(cause)) setError(toErrorMessage(cause)) }
    finally { pending.current = false; setSharing(false) }
  }

  return <FormDialog open title={`Partager le devis ${devis.numero}`} size="small" cancelLabel="Fermer"
    description="Choisissez votre application de messagerie ou préparez un message pour le client." busy={sharing}
    onClose={() => { if (!pending.current) onClose() }}>
    {loading && <p role="status">Préparation du PDF…</p>}
    {error && <p className="error-banner" role="alert">{error}</p>}
    {!loading && !file && <button type="button" className="secondary-button" onClick={() => { setLoading(true); setError(null); setRevision((value) => value + 1) }}>Réessayer</button>}
    <p className="devis-share-recipient"><b>{snapshot.prenom} {snapshot.nom}</b><br />{snapshot.email}<br />{snapshot.telephone}</p>
    {shareSupported && <button type="button" className="primary-button" disabled={!file || sharing} onClick={() => void share()}>
      <Icon name="share" size="sm" /> {sharing ? 'Partage en cours…' : 'Partager le PDF'}
    </button>}
    <p className="form-hint">Pour l’email ou WhatsApp ci-dessous, téléchargez d’abord le PDF, puis joignez-le au message dans votre application. L’ouverture d’un message ne confirme pas son envoi.</p>
    <div className="form-actions devis-share-actions">
      <button type="button" className="secondary-button" disabled={!file || sharing} onClick={() => { if (file) downloadDevisPdf(file, filename) }}>
        <Icon name="download" size="sm" /> Télécharger le PDF
      </button>
      {file && !sharing && <>
        {snapshot.email && <a className="secondary-button" href={emailUrl}><Icon name="mail" size="sm" /> Ouvrir l’email</a>}
        <a className="secondary-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp</a>
      </>}
    </div>
    <p className="form-hint">Après transmission, vous pouvez choisir le statut « Envoyé » dans la modification du devis.</p>
  </FormDialog>
}
