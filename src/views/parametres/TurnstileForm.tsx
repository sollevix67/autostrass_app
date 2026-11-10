import { useRef, useState } from 'react'
import { FormInput } from '../../components/forms/FormFields'
import { FormDialog } from '../../components/FormDialog'
import { TurnstileWidget } from '../../components/TurnstileWidget'
import { useToast } from '../../components/useToast'
import { api, toErrorMessage } from '../../services/api'
import type { ApiParametres } from '../../services/contracts'
import { turnstileSettingsSchema } from '../../schemas/parametres'

export default function TurnstileForm({ data, onSaved }: { data: ApiParametres; onSaved: (data: ApiParametres) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [enabled, setEnabled] = useState(data.turnstile.enabled)
  const [siteKey, setSiteKey] = useState(data.turnstile.siteKey)
  const [secretKey, setSecretKey] = useState('')
  const [hostnames, setHostnames] = useState(data.turnstile.hostnames.join('\n'))
  const [token, setToken] = useState('')
  const [challengeError, setChallengeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const toast = useToast()
  async function save() {
    if (pending.current) return
    const parsed = turnstileSettingsSchema.safeParse({ enabled, siteKey, secretKey: secretKey || undefined, hostnames: hostnames.split(/[\s,;]+/).filter(Boolean), verificationToken: token })
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(' ')); return }
    pending.current = true; setBusy(true); setError(null)
    try {
      const result = await api.put<ApiParametres>('/parametres/turnstile', parsed.data)
      setSecretKey(''); onSaved(result); setDialogOpen(false); toast.success('Protection Turnstile enregistrée.')
    } catch (cause) { setError(toErrorMessage(cause)); setToken(''); setRevision((value) => value + 1) }
    finally { pending.current = false; setBusy(false) }
  }
  return (
    <section className="panel parametre-detail">
      <p>Protection Turnstile {data.turnstile.enabled ? 'activée' : 'désactivée'} à la connexion.</p>
      <p>Domaines : {data.turnstile.hostnames.join(', ') || 'Aucun domaine enregistré.'}</p>
      <button type="button" className="primary-button" aria-haspopup="dialog" onClick={() => { setEnabled(data.turnstile.enabled); setSiteKey(data.turnstile.siteKey); setSecretKey(''); setHostnames(data.turnstile.hostnames.join('\n')); setToken(''); setError(null); setChallengeError(null); setRevision((value) => value + 1); setDialogOpen(true) }}>Modifier Turnstile</button>
      <FormDialog open={dialogOpen} title="Configurer Turnstile" busy={busy} onClose={() => setDialogOpen(false)}>
        <form className="panel parametre-detail" onSubmit={(event) => { event.preventDefault(); void save() }}>
          {error && <p className="error-banner" role="alert">{error}</p>}
          <fieldset disabled={busy} className="parametre-fieldset">
            <label className="parametre-checkbox"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Activer Turnstile à la connexion</label>
            <FormInput name="siteKey" label="Clé publique du site" value={siteKey} onChange={(_, value) => setSiteKey(value)} />
            <FormInput name="secretKey" label="Clé secrète" type="password" value={secretKey} onChange={(_, value) => setSecretKey(value)} hint={data.turnstile.secretConfigured ? 'Laissez vide pour conserver la clé enregistrée.' : 'Aucune clé secrète enregistrée.'} />
            <div className="form-group"><label htmlFor="hostnames">Domaines autorisés</label><textarea id="hostnames" value={hostnames} onChange={(event) => setHostnames(event.target.value)} rows={3} placeholder="depot.example.fr" /><p className="form-hint">Un nom de domaine par ligne, sans protocole ni port. Utilisez les mêmes domaines dans Cloudflare.</p></div>
            {enabled && siteKey && <><p>Effectuez une vérification avec cette clé avant d’activer la protection.</p><TurnstileWidget siteKey={siteKey} action="settings" onToken={setToken} onError={setChallengeError} revision={revision} /></>}
            {challengeError && enabled && <p className="error-banner" role="alert">{challengeError}</p>}
            <div className="form-actions"><button className="primary-button" type="submit" disabled={enabled && !token}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
          </fieldset>
        </form>
      </FormDialog>
    </section>
  )
}
