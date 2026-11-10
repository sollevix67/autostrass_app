import { PageLayout } from '../../components/PageLayout'
import { useRemoteValue } from '../../hooks/useRemoteValue'
import type { ApiParametres } from '../../services/contracts'
import TurnstileForm from './TurnstileForm'

export default function TurnstileView() {
  const { data, loading, error, reload, setData } = useRemoteValue<ApiParametres>('/parametres')
  return (
    <PageLayout eyebrow="PARAMÈTRES" title="Cloudflare Turnstile" description="Configurer la vérification de sécurité à la connexion." actions={<button className="secondary-button" disabled={loading} onClick={reload}>Actualiser</button>}>
      {loading ? <p role="status">Chargement des paramètres…</p> : error ? <p className="error-banner" role="alert">{error}</p> : data && <TurnstileForm data={data} onSaved={setData} />}
    </PageLayout>
  )
}
