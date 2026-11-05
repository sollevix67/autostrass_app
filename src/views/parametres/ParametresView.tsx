import { Link } from 'react-router-dom'
import { PageLayout } from '../../components/PageLayout'
import { Icon } from '../../components/Icon'
import { useAuth } from '../../components/useAuth'
import { visibleParametres } from '../../parametres'

export default function ParametresView() {
  const { user } = useAuth()
  return (
    <PageLayout eyebrow="ADMINISTRATION" title="Paramètres" description="Retrouvez les réglages et les référentiels de votre dépôt.">
      <div className="parametres-cards">
        {visibleParametres(user?.role).map((section) => (
          <Link className="parametre-card" key={section.slug} to={`/parametres/${section.slug}`}>
            <div className="parametre-card-top">
              <span className="parametre-icon"><Icon name={section.icon} size="xl" /></span>
              <span className="status-badge status-disponible">{section.status}</span>
            </div>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <span className="parametre-card-action">Ouvrir la rubrique <Icon name="chevron-right" /></span>
          </Link>
        ))}
      </div>
    </PageLayout>
  )
}
