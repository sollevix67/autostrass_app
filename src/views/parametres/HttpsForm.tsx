import { useRef, useState } from 'react'
import { FormInput } from '../../components/forms/FormFields'
import { FormDialog } from '../../components/FormDialog'
import { useToast } from '../../components/useToast'
import { api, toErrorMessage } from '../../services/api'
import type { ApiParametres } from '../../services/contracts'
import { httpsSettingsSchema } from '../../schemas/parametres'

export default function HttpsForm({ data, onSaved }: { data: ApiParametres; onSaved: (data: ApiParametres) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [values, setValues] = useState({ ...data.https, certificatePem: '', privateKeyPem: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [hasInvalidFiles, setHasInvalidFiles] = useState(false)
  const reads = useRef(0)
  const invalidFiles = useRef(new Set<string>())
  const pending = useRef(false)
  const toast = useToast()
  function setFileInvalid(key: string, invalid: boolean) {
    if (invalid) invalidFiles.current.add(key)
    else invalidFiles.current.delete(key)
    setHasInvalidFiles(invalidFiles.current.size > 0)
  }
  async function readCertificate(file: File | undefined, key: 'certificatePem' | 'privateKeyPem') {
    setFileInvalid(key, false)
    setValues((previous) => ({ ...previous, [key]: '' }))
    if (!file) { if (!invalidFiles.current.size) setError(null); return }
    if (file.size > (key === 'certificatePem' ? 65536 : 16384)) { setFileInvalid(key, true); setError('Le fichier est trop volumineux.'); return }
    reads.current++; setReading(true)
    try { const value = await file.text(); setValues((previous) => ({ ...previous, [key]: value })); if (!invalidFiles.current.size) setError(null) }
    catch { setFileInvalid(key, true); setError('Impossible de lire le fichier sélectionné.') }
    finally { reads.current--; setReading(reads.current > 0) }
  }
  async function save() {
    if (pending.current || reads.current || invalidFiles.current.size) return
    const parsed = httpsSettingsSchema.safeParse(values)
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(' ')); return }
    pending.current = true; setBusy(true); setError(null)
    try {
      const result = await api.put<ApiParametres>('/parametres/https', parsed.data)
      setValues((previous) => ({ ...previous, certificatePem: '', privateKeyPem: '' })); onSaved(result); setDialogOpen(false)
      toast.success('Configuration HTTPS sauvegardée. Redémarrez le serveur pour l’appliquer.')
    } catch (cause) { setError(toErrorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }
  return (
    <section className="panel parametre-detail">
      <p>HTTPS {data.https.active ? 'actif au démarrage' : 'désactivé au démarrage'}{data.https.restartRequired ? ' — modification en attente de redémarrage.' : '.'}</p>
      {data.https.certificate && <p>Certificat enregistré : {data.https.certificate.subject}</p>}
      <button type="button" className="primary-button" aria-haspopup="dialog" onClick={() => { setValues({ ...data.https, certificatePem: '', privateKeyPem: '' }); setError(null); invalidFiles.current.clear(); setHasInvalidFiles(false); setDialogOpen(true) }}>Modifier HTTPS</button>
      <FormDialog open={dialogOpen} title="Configurer HTTPS" busy={busy || reading} onClose={() => setDialogOpen(false)}>
        <form className="panel parametre-detail" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <p>HTTPS {data.https.active ? 'actif au démarrage' : 'désactivé au démarrage'}{data.https.restartRequired ? ' — modification en attente de redémarrage.' : '.'}</p>
          {data.https.certificate && <dl className="parametre-facts"><div><dt>Certificat enregistré</dt><dd>{data.https.certificate.subject}</dd></div><div><dt>Expiration</dt><dd>{new Date(data.https.certificate.validTo).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</dd></div></dl>}
          {error && <p className="error-banner" role="alert">{error}</p>}
          <fieldset disabled={busy || reading} className="parametre-fieldset">
            <label className="parametre-checkbox"><input type="checkbox" checked={values.enabled} onChange={(event) => setValues({ ...values, enabled: event.target.checked })} />Activer HTTPS</label>
            <FormInput name="port" label="Port HTTPS" type="number" min={1} max={65535} value={String(values.port)} onChange={(_, value) => setValues({ ...values, port: Number(value) })} />
            <div className="form-group"><label htmlFor="httpMode">Accès HTTP</label><select id="httpMode" value={values.httpMode} onChange={(event) => setValues({ ...values, httpMode: event.target.value as 'serve' | 'redirect' })}><option value="serve">Conserver l’accès HTTP</option><option value="redirect">Rediriger vers HTTPS</option></select></div>
            <FormInput name="publicOrigin" label="Adresse publique HTTPS" value={values.publicOrigin} onChange={(_, value) => setValues({ ...values, publicOrigin: value })} placeholder="https://depot.example.fr" hint="Requise pour la redirection HTTP. Le site et l’API seront servis à cette adresse." />
            <div className="form-group"><label htmlFor="certificatePem">Certificat et chaîne au format PEM</label><input id="certificatePem" type="file" accept=".pem,.crt,.cer" onChange={(event) => void readCertificate(event.target.files?.[0], 'certificatePem')} /></div>
            <div className="form-group"><label htmlFor="privateKeyPem">Clé privée au format PEM</label><input id="privateKeyPem" type="file" accept=".pem,.key" onChange={(event) => void readCertificate(event.target.files?.[0], 'privateKeyPem')} /><p className="form-hint">Laissez les fichiers vides pour conserver la paire enregistrée. Une nouvelle paire est validée avant sauvegarde.</p></div>
            <p>Les changements s’appliqueront au redémarrage du serveur. Utilisez un certificat reconnu par les postes et terminaux du dépôt.</p>
            <div className="form-actions"><button className="primary-button" type="submit" disabled={hasInvalidFiles}>{reading ? 'Lecture des fichiers…' : busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
          </fieldset>
        </form>
      </FormDialog>
    </section>
  )
}
