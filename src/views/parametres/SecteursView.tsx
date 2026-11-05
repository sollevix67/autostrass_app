import { PageLayout } from '../../components/PageLayout'
import { useRemoteValue } from '../../hooks/useRemoteValue'
import type { Referentiel } from '../../schemas/parametres'
import ReferentielEditor from './ReferentielEditor'
import SecteurClients from './SecteurClients'

export default function SecteursView() {
  const secteurs = useRemoteValue<Referentiel[]>('/secteurs')
  return <PageLayout eyebrow="PARAMÈTRES" title="Secteurs de livraison" description="Administrer les secteurs et les affecter aux clients.">
    <div className="parametres-stack">
      <ReferentielEditor path="secteurs" title="Secteurs" onChange={secteurs.reload} />
      {secteurs.error ? <p className="error-banner" role="alert">{secteurs.error}<button className="link-button" onClick={secteurs.reload}>Réessayer</button></p> : secteurs.data && <SecteurClients secteurs={secteurs.data} />}
    </div>
  </PageLayout>
}
