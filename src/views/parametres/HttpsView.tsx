import { PageLayout } from '../../components/PageLayout'
import { useRemoteValue } from '../../hooks/useRemoteValue'
import type { ApiParametres } from '../../services/contracts'
import HttpsForm from './HttpsForm'

export default function HttpsView() {
  const { data, loading, error, reload, setData } = useRemoteValue<ApiParametres>('/parametres')
  return (
    <PageLayout eyebrow="PARAMÈTRES" title="Certificats HTTPS" description="Configurer les certificats et leur activation au prochain démarrage." actions={<button className="secondary-button" disabled={loading} onClick={reload}>Actualiser</button>}>
      {loading ? <p role="status">Chargement des paramètres…</p> : error ? <p className="error-banner" role="alert">{error}</p> : data && <HttpsForm key={data.updatedAt} data={data} onSaved={setData} />}
    </PageLayout>
  )
}
