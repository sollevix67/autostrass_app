import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import './App.css'
import './auth.css'
import { useDashboard } from './hooks/useDashboard'
import { ToastProvider } from './components/Toast'
import { Icon, type IconName } from './components/Icon'
import { AuthProvider } from './components/AuthProvider'
import { useAuth } from './components/useAuth'
import { LoginView } from './views/LoginView'
import DashboardView from './views/DashboardView'
import CatalogueView from './views/CatalogueView'
import StockView from './views/StockView'
import ReceptionsView from './views/ReceptionsView'
import VentesComptoirView from './views/VentesComptoirView'
import CaisseView from './views/CaisseView'
import CommandesClientsView from './views/CommandesClientsView'
import LivraisonsView from './views/LivraisonsView'
import RetoursView from './views/RetoursView'
import ClientsView from './views/ClientsView'
import VehiculesView from './views/VehiculesView'
import UtilisateursView from './views/UtilisateursView'

const navigation = [
  { label: 'Vue d’ensemble', path: '/', icon: 'grid' },
  { label: 'Catalogue', path: '/catalogue', icon: 'clipboard' },
  { label: 'Stock', path: '/stock', icon: 'box' },
  { label: 'Receptions', path: '/receptions', icon: 'download' },
  { label: 'Ventes comptoir', path: '/ventes-comptoir', icon: 'cart' },
  { label: 'Caisse', path: '/caisse', icon: 'clipboard' },
  { label: 'Commandes clients', path: '/commandes-clients', icon: 'layers' },
  { label: 'Livraisons', path: '/livraisons', icon: 'truck' },
  { label: 'Retours', path: '/retours', icon: 'rotate-ccw' },
  { label: 'Clients', path: '/clients', icon: 'users' },
  { label: 'Vehicules', path: '/vehicules', icon: 'car' }
] as const satisfies ReadonlyArray<{ label: string; path: string; icon: IconName }>

/** Initiales pour l'avatar : premiere lettre du prenom et du nom. */
function initials(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

/** Libelle lisible du role, pour le pied de la barre laterale. */
function roleLabel(role: string): string {
  if (role === 'admin') return 'Administrateur'
  if (role === 'magasinier') return 'Magasinier'
  if (role === 'caissier') return 'Caissier'
  return role
}

function AppContent() {
  const { dashboard, apiMode, error, lastUpdated, refresh } = useDashboard()
  const { user, status, signOut } = useAuth()
  const [mobileNav, setMobileNav] = useState(false)
  const location = useLocation()

  // Tant que la session n'est pas verifiee, on n'affiche ni le depot ni
  // l'ecran de connexion : sans cette attente, un rechargement de page fait
  // clignoter le formulaire de connexion avant de retrouver la session.
  if (status === 'checking') {
    return (
      <div className="boot-screen" role="status" aria-live="polite">
        <span className="boot-spinner" aria-hidden="true" />
        <p>Verification de la session...</p>
      </div>
    )
  }

  if (status === 'anonymous' || user === null) {
    return <LoginView />
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark">A</span><span>AUTOSTRASS</span></div>
        <div className="workspace-switcher"><span className="workspace-dot"></span><span><b>Depot principal</b><small>Ouvert aujourd hui</small></span><span className="chevron">⌄</span></div>
        <nav aria-label="Navigation principale">
          <p className="nav-label">ESPACE DE TRAVAIL</p>
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              to={item.path}
              key={item.label}
              end
            >
              <Icon name={item.icon} size="sm" />
              <span>{item.label}</span>
              {item.label === 'Stock' && <span className="nav-badge">12</span>}
            </NavLink>
          ))}
          <p className="nav-label nav-label-bottom">ADMINISTRATION</p>
          <NavLink
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            to="/utilisateurs"
            end
          >
            <Icon name="settings" size="sm" />
            <span>Utilisateurs & droits</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer"><div className="profile-avatar">{initials(user.prenom, user.nom)}</div><div><b>{user.prenom} {user.nom}</b><small>{roleLabel(user.role)}</small></div><button className="more-button" aria-label="Se deconnecter" onClick={() => void signOut()}><Icon name="chevron-right" size="lg" /></button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Ouvrir le menu"><Icon name="menu" size="lg" /></button><div className="breadcrumbs"><span>Accueil</span><span>/</span><strong>{navigation.find(n => n.path === location.pathname)?.label ?? location.pathname.slice(1).replace(/-/g, ' ')}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Rechercher"><Icon name="search" size="lg" /></button><button className="icon-button notification" aria-label="Notifications"><Icon name="bell" size="lg" /><i></i></button><div className="topbar-divider"></div><div className="topbar-profile"><span className="profile-avatar small">{initials(user.prenom, user.nom)}</span><span>{user.prenom} {user.nom}</span><Icon name="chevron-down" size="sm" /></div></div></header>
        <div className="content-wrap">
          <div className="page-heading"><div><p className="eyebrow">LUNDI 20 SEPTEMBRE 2026</p><h1>Bonjour {user.prenom} <Icon name="star" size="sm" /></h1><p className="heading-copy">Voici ce qui se passe dans votre depot aujourd hui.</p></div><button className="primary-button"><Icon name="plus" size="sm" /> Nouvelle operation <Icon name="chevron-down" size="sm" /></button></div>
          <div className="status-line">
            <span className={`status-dot ${apiMode === 'connected' ? 'connected' : apiMode === 'error' ? 'error' : ''}`}></span>
            {apiMode === 'connected'
              ? 'Donnees MariaDB synchronisees'
              : apiMode === 'loading'
                ? 'Connexion a MariaDB...'
                : 'Erreur de connexion a la base de donnees MariaDB'}
            <span className="status-time">
              {lastUpdated
                ? `Derniere mise a jour : ${lastUpdated.toLocaleTimeString('fr-FR')}`
                : 'Derniere mise a jour : en cours'}
            </span>
            <button className="link-button" onClick={refresh} disabled={apiMode === 'loading'}>
              {apiMode === 'loading' ? 'Actualisation...' : 'Actualiser'}
            </button>
          </div>
          {error && apiMode === 'error' && (
            <p className="error-banner" role="alert">{error}</p>
          )}

          <Routes>
            <Route path="/" element={<DashboardView dashboard={dashboard} apiMode={apiMode} />} />
            <Route path="/catalogue" element={<CatalogueView />} />
            <Route path="/stock" element={<StockView />} />
            <Route path="/receptions" element={<ReceptionsView />} />
            <Route path="/ventes-comptoir" element={<VentesComptoirView />} />
            <Route path="/caisse" element={<CaisseView />} />
            <Route path="/caisse" element={<CaisseView />} />
            <Route path="/commandes-clients" element={<CommandesClientsView />} />
            <Route path="/livraisons" element={<LivraisonsView />} />
            <Route path="/retours" element={<RetoursView />} />
            <Route path="/clients" element={<ClientsView />} />
            <Route path="/vehicules" element={<VehiculesView />} />
            <Route path="/utilisateurs" element={<UtilisateursView />} />
            <Route path="*" element={<h1>404 - Page non trouvée</h1>} />
          </Routes>
        </div>

        <footer className="app-footer" role="status" aria-live="polite">
          <div className="footer-status">
            <span className={`status-dot ${apiMode === 'connected' ? 'connected' : apiMode === 'error' ? 'error' : 'loading'}`}></span>
            <span className="status-text">
              {apiMode === 'connected'
                ? 'MariaDB connectee'
                : apiMode === 'loading'
                  ? 'Connexion a MariaDB en cours...'
                  : 'MariaDB deconnectee'}
            </span>
            <span className="status-divider" aria-hidden="true">|</span>
            <time className="status-time" dateTime={new Date().toISOString()}>
              Derniere mise a jour : {new Date().toLocaleTimeString('fr-FR')}
            </time>
          </div>
          <div className="footer-version">
            <small>Autostrass Depot v0.1.0</small>
          </div>
        </footer>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
