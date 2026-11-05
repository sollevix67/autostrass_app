import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../components/useAuth'
import { PageLayout } from '../../components/PageLayout'
import { Icon } from '../../components/Icon'
import { visibleParametres } from '../../parametres'
import '../../parametres.css'

function AccesRefuse() {
  return (
    <PageLayout eyebrow="ADMINISTRATION" title="Accès réservé" description="Votre rôle ne permet pas de consulter ces paramètres.">
      <p className="info-banner">Contactez un administrateur si vous avez besoin d’un accès à cette rubrique.</p>
    </PageLayout>
  )
}

/** Le contrôle précède le montage des vues et leurs requêtes. */
export function ParametresAdminGuard() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <Outlet /> : <AccesRefuse />
}

export default function ParametresLayout() {
  const { user } = useAuth()
  const sections = visibleParametres(user?.role)
  if (sections.length === 0) return <AccesRefuse />

  return (
    <div className="parametres-layout">
      <nav className="parametres-nav" aria-label="Rubriques des paramètres">
        <NavLink to="/parametres" end><Icon name="settings" />Vue d’ensemble</NavLink>
        {sections.map((section) => (
          <NavLink key={section.slug} to={`/parametres/${section.slug}`} end>
            <Icon name={section.icon} />{section.title}
          </NavLink>
        ))}
      </nav>
      <div className="parametres-content"><Outlet /></div>
    </div>
  )
}
