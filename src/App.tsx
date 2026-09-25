import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import './App.css'
import { useDashboard } from './hooks/useDashboard'
import DashboardView from './views/DashboardView'
import CatalogueView from './views/CatalogueView'
import StockView from './views/StockView'
import ReceptionsView from './views/ReceptionsView'
import VentesComptoirView from './views/VentesComptoirView'
import CommandesClientsView from './views/CommandesClientsView'
import LivraisonsView from './views/LivraisonsView'
import RetoursView from './views/RetoursView'
import ClientsView from './views/ClientsView'
import VehiculesView from './views/VehiculesView'
import UtilisateursView from './views/UtilisateursView'

const navigation = [
  { label: 'Vue d ensemble', path: '/' },
  { label: 'Catalogue', path: '/catalogue' },
  { label: 'Stock', path: '/stock' },
  { label: 'Receptions', path: '/receptions' },
  { label: 'Ventes comptoir', path: '/ventes-comptoir' },
  { label: 'Commandes clients', path: '/commandes-clients' },
  { label: 'Livraisons', path: '/livraisons' },
  { label: 'Retours', path: '/retours' },
  { label: 'Clients', path: '/clients' },
  { label: 'Vehicules', path: '/vehicules' }
] as const

function AppContent() {
  const { dashboard, apiMode, error, lastUpdated, refresh } = useDashboard()
  const [mobileNav, setMobileNav] = useState(false)
  const location = useLocation()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark">A</span><span>AUTOSTRASS</span></div>
        <div className="workspace-switcher"><span className="workspace-dot"></span><span><b>Depot principal</b><small>Ouvert aujourd hui</small></span><span className="chevron">⌄</span></div>
        <nav aria-label="Navigation principale">
          <p className="nav-label">ESPACE DE TRAVAIL</p>
          {navigation.map((item, index) => (
            <NavLink
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              to={item.path}
              key={item.label}
              end
            >
              <span className={`nav-icon nav-icon-${index}`}></span>
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
            <span className="nav-icon nav-icon-settings"></span>
            <span>Utilisateurs & droits</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer"><div className="profile-avatar">ML</div><div><b>Marie Laurent</b><small>Responsable depot</small></div><button className="more-button" aria-label="Options du profil">•••</button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Ouvrir le menu">☰</button><div className="breadcrumbs"><span>Accueil</span><span>/</span><strong>{navigation.find(n => n.path === location.pathname)?.label ?? location.pathname.slice(1).replace(/-/g, ' ')}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Rechercher">⌕</button><button className="icon-button notification" aria-label="Notifications">♢<i></i></button><div className="topbar-divider"></div><div className="topbar-profile"><span className="profile-avatar small">ML</span><span>Marie Laurent</span><span className="chevron">⌄</span></div></div></header>
        <div className="content-wrap">
          <div className="page-heading"><div><p className="eyebrow">LUNDI 20 SEPTEMBRE 2026</p><h1>Bonjour Marie <span className="wave">✦</span></h1><p className="heading-copy">Voici ce qui se passe dans votre depot aujourd hui.</p></div><button className="primary-button"><span>＋</span> Nouvelle operation <span className="button-chevron">⌄</span></button></div>
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
      <AppContent />
    </BrowserRouter>
  )
}

export default App
