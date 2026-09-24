import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import './App.css'
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

type DashboardData = {
  stockValue: number
  references: number
  lowStock: number
  pendingOrders: number
  lowStockItems: Array<{ reference: string; label: string; quantity: number; minimum: number; location: string }>
  activity: Array<{ type: string; title: string; detail: string; time: string }>
}

type ApiDashboard = Partial<DashboardData> & {
  stockItems?: Array<{ ref: string; name: string; location: string; stock: number; minimum: number }>
  activities?: Array<{ type: string; title: string; detail: string; time: string }>
}

const demoDashboard: DashboardData = {
  stockValue: 128640,
  references: 2486,
  lowStock: 12,
  pendingOrders: 7,
  lowStockItems: [
    { reference: 'PLA-2841', label: 'Plaquettes de frein avant', quantity: 2, minimum: 6, location: 'A-03 / E-02 / P-14' },
    { reference: 'FIL-0920', label: 'Filtre a huile - Renault', quantity: 3, minimum: 8, location: 'B-01 / E-04 / P-02' },
    { reference: 'BAT-7710', label: 'Batterie 12V 70Ah', quantity: 1, minimum: 4, location: 'C-02 / E-01 / P-08' },
    { reference: 'HUI-5400', label: 'Huile moteur 5W30 - 5L', quantity: 4, minimum: 10, location: 'D-05 / E-03 / P-21' },
  ],
  activity: [
    { type: 'RECEPTION', title: 'Reception fournisseur', detail: 'Auto Pieces Nord - 24 lignes', time: 'Il y a 18 min' },
    { type: 'VENTE', title: 'Vente comptoir #C-10482', detail: 'Caisse 02 - 184,50 EUR', time: 'Il y a 32 min' },
    { type: 'TRANSFERT', title: 'Transfert de stock', detail: 'Allee A vers zone comptoir', time: 'Il y a 1 h' },
  ],
}

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
]

function App() {
  const [dashboard, setDashboard] = useState<DashboardData>(demoDashboard)
  const [apiMode, setApiMode] = useState<'demo' | 'connected'>('demo')
  const [mobileNav, setMobileNav] = useState(false)
  const location = useLocation()

  useEffect(() => {
    fetch('/api/dashboard')
      .then((response) => response.ok ? response.json() as Promise<ApiDashboard> : Promise.reject(new Error('API unavailable')))
      .then((data) => {
        const lowStockItems = data.lowStockItems ?? data.stockItems?.map((item) => ({ reference: item.ref, label: item.name, quantity: item.stock, minimum: item.minimum, location: item.location }))
        setDashboard({ ...demoDashboard, ...data, lowStockItems: lowStockItems ?? demoDashboard.lowStockItems, activity: data.activity ?? data.activities ?? demoDashboard.activity })
        setApiMode('connected')
      })
      .catch(() => setApiMode('demo'))
  }, [])

  return (
    <BrowserRouter>
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
            <div className="status-line"><span className={`status-dot ${apiMode === 'connected' ? 'connected' : ''}`}></span>{apiMode === 'connected' ? 'Donnees MariaDB synchronisees' : 'Mode demonstration'}<span className="status-time">Derniere mise a jour : a l instant</span></div>

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
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App