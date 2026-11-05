import { PageLayout } from '../../components/PageLayout'
import { useRemoteValue } from '../../hooks/useRemoteValue'
import type { Referentiel } from '../../schemas/parametres'
import ReferentielEditor from './ReferentielEditor'

export default function CategoriesView() {
  const parents = useRemoteValue<Referentiel[]>('/categories')
  return <PageLayout eyebrow="PARAMÈTRES" title="Catégories d’articles" description="Gérer les catégories et sous-catégories proposées dans le catalogue.">
    <div className="parametres-stack">
      <ReferentielEditor path="categories" title="Catégories" onChange={parents.reload} />
      {parents.error ? <p className="error-banner" role="alert">{parents.error}<button className="link-button" onClick={parents.reload}>Réessayer</button></p> : parents.data && <ReferentielEditor path="sous-categories" title="Sous-catégories" parents={parents.data} />}
    </div>
  </PageLayout>
}
