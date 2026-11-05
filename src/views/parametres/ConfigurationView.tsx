import { useRef, useState } from 'react'
import { PageLayout } from '../../components/PageLayout'
import { FormInput } from '../../components/forms/FormFields'
import { useRemoteValue } from '../../hooks/useRemoteValue'
import { useToast } from '../../components/useToast'
import { api, toErrorMessage } from '../../services/api'
import type { ApiParametres } from '../../services/contracts'
import { apiLimitsSchema, loginLimitsSchema, databaseSettingsSchema } from '../../schemas/parametres'

type Section = 'api' | 'connexion' | 'base-de-donnees'
const fields = {
  api: [{ key: 'maxRequests', label: 'Requêtes autorisées', type: 'number' }, { key: 'windowSeconds', label: 'Période (secondes)', type: 'number' }],
  connexion: [{ key: 'maxAttempts', label: 'Échecs autorisés par compte', type: 'number' }, { key: 'windowSeconds', label: 'Période de comptage (secondes)', type: 'number' }, { key: 'blockSeconds', label: 'Durée du blocage (secondes)', type: 'number' }],
  'base-de-donnees': [{ key: 'host', label: 'Serveur', type: 'text' }, { key: 'port', label: 'Port', type: 'number' }, { key: 'database', label: 'Nom de la base', type: 'text' }, { key: 'user', label: 'Utilisateur MariaDB', type: 'text' }, { key: 'password', label: 'Mot de passe', type: 'password' }],
} as const
const keys = { api: 'api', connexion: 'login', 'base-de-donnees': 'database' } as const
const schemas = { api: apiLimitsSchema, connexion: loginLimitsSchema, 'base-de-donnees': databaseSettingsSchema }

function ConfigurationForm({ section, data, onSaved }: { section: Section; data: ApiParametres; onSaved: (value: ApiParametres) => void }) {
  const toast = useToast()
  const source = data[keys[section]] as Record<string, unknown>
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields[section].map((field) => [field.key, String(source[field.key] ?? '')])))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)

  async function submit(testOnly = false) {
    if (pending.current) return
    const body = Object.fromEntries(fields[section].filter((field) => field.type !== 'password' || values[field.key] !== '').map((field) => [field.key, field.type === 'number' ? Number(values[field.key]) : values[field.key]]))
    const parsed = schemas[section].safeParse(body)
    if (!parsed.success) { setError(parsed.error.issues.map((issue) => `${fields[section].find((field) => field.key === issue.path[0])?.label ?? 'Champ'} : ${issue.message}`).join(' ')); return }
    pending.current = true
    setBusy(true)
    setError(null)
    try {
      if (testOnly) {
        await api.post('/parametres/base-de-donnees/test', parsed.data)
        toast.success('Connexion et présence du schéma vérifiées.')
      } else {
        const saved = await api.put<ApiParametres>(`/parametres/${section}`, parsed.data)
        setValues((previous) => ({ ...previous, password: '' }))
        onSaved(saved)
        toast.success(section === 'base-de-donnees' ? 'Connexion sauvegardée. Un redémarrage du serveur est nécessaire pour l’appliquer.' : 'Paramètres enregistrés et appliqués.')
      }
    } catch (cause) { setError(toErrorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }
  return (
    <form className="panel parametre-detail" onSubmit={(event) => { event.preventDefault(); void submit() }}>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <fieldset disabled={busy} className="parametre-fieldset">
        {fields[section].map((field) => <FormInput key={field.key} name={field.key} label={field.label} type={field.type} value={values[field.key]} onChange={(key, value) => setValues((previous) => ({ ...previous, [key]: value }))}
          hint={field.type === 'password' ? data.database.passwordConfigured ? 'Laissez vide pour conserver le mot de passe enregistré.' : 'Aucun mot de passe enregistré.' : undefined} />)}
        {section === 'base-de-donnees' ? <p>La connexion est testée avant sauvegarde. Elle sera utilisée au prochain redémarrage du serveur.</p> : <p>Les changements s’appliquent aux nouvelles requêtes. Les blocages de connexion déjà en cours restent valides jusqu’à leur échéance.</p>}
        <div className="form-actions">
          {section === 'base-de-donnees' && <button type="button" className="secondary-button" onClick={() => void submit(true)}>Tester la connexion</button>}
          <button className="primary-button" type="submit">{busy ? 'Traitement…' : 'Enregistrer'}</button>
        </div>
      </fieldset>
    </form>
  )
}

export default function ConfigurationView({ section, title, description }: { section: Section; title: string; description: string }) {
  const { data, loading, error, reload, setData } = useRemoteValue<ApiParametres>('/parametres')
  return (
    <PageLayout eyebrow="PARAMÈTRES" title={title} description={description} actions={<button className="secondary-button" disabled={loading} onClick={reload}>Actualiser</button>}>
      {loading ? <p role="status">Chargement des paramètres…</p> : error ? <p role="alert" className="error-banner">{error}</p> : data && <>
        {section === 'base-de-donnees' && data.database.restartRequired && <p className="info-banner">Une modification de connexion est en attente de redémarrage.</p>}
        <ConfigurationForm key={`${section}-${data.updatedAt}`} section={section} data={data} onSaved={setData} />
      </>}
    </PageLayout>
  )
}
