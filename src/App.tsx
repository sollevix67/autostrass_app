import { useEffect, useState } from 'react'
import './App.css'

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

const navigation = ['Vue d ensemble', 'Catalogue', 'Stock', 'Receptions', 'Ventes comptoir', 'Commandes clients', 'Livraisons', 'Retours', 'Clients', 'Vehicules']

function App() {
  const [activeView, setActiveView] = useState('Vue d ensemble')
  const [dashboard, setDashboard] = useState<DashboardData>(demoDashboard)
  const [apiMode, setApiMode] = useState<'demo' | 'connected'>('demo')
  const [mobileNav, setMobileNav] = useState(false)

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

  const selectView = (label: string) => {
    setActiveView(label)
    setMobileNav(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark">A</span><span>AUTOSTRASS</span></div>
        <div className="workspace-switcher"><span className="workspace-dot"></span><span><b>Depot principal</b><small>Ouvert aujourd hui</small></span><span className="chevron">⌄</span></div>
        <nav aria-label="Navigation principale">
          <p className="nav-label">ESPACE DE TRAVAIL</p>
          {navigation.map((label, index) => <button className={`nav-item ${activeView === label ? 'active' : ''}`} key={label} onClick={() => selectView(label)}><span className={`nav-icon nav-icon-${index}`}></span><span>{label}</span>{label === 'Stock' && <span className="nav-badge">12</span>}</button>)}
          <p className="nav-label nav-label-bottom">ADMINISTRATION</p>
          <button className="nav-item" onClick={() => selectView('Utilisateurs')}><span className="nav-icon nav-icon-settings"></span><span>Utilisateurs & droits</span></button>
        </nav>
        <div className="sidebar-footer"><div className="profile-avatar">ML</div><div><b>Marie Laurent</b><small>Responsable depot</small></div><button className="more-button" aria-label="Options du profil">•••</button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Ouvrir le menu">☰</button><div className="breadcrumbs"><span>Accueil</span><span>/</span><strong>{activeView}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Rechercher">⌕</button><button className="icon-button notification" aria-label="Notifications">♢<i></i></button><div className="topbar-divider"></div><div className="topbar-profile"><span className="profile-avatar small">ML</span><span>Marie Laurent</span><span className="chevron">⌄</span></div></div></header>
        <div className="content-wrap">
          <div className="page-heading"><div><p className="eyebrow">LUNDI 20 SEPTEMBRE 2026</p><h1>Bonjour Marie <span className="wave">✦</span></h1><p className="heading-copy">Voici ce qui se passe dans votre depot aujourd hui.</p></div><button className="primary-button"><span>＋</span> Nouvelle operation <span className="button-chevron">⌄</span></button></div>
          <div className="status-line"><span className={`status-dot ${apiMode === 'connected' ? 'connected' : ''}`}></span>{apiMode === 'connected' ? 'Donnees MariaDB synchronisees' : 'Mode demonstration'}<span className="status-time">Derniere mise a jour : a l instant</span></div>

          <section className="metric-grid" aria-label="Indicateurs du depot"><article className="metric-card accent-coral"><div className="metric-icon">€</div><p>Valeur du stock</p><strong>{dashboard.stockValue.toLocaleString('fr-FR')} €</strong><span className="metric-trend positive">↗ 8,4% <em>vs mois dernier</em></span></article><article className="metric-card accent-blue"><div className="metric-icon">#</div><p>References actives</p><strong>{dashboard.references.toLocaleString('fr-FR')}</strong><span className="metric-trend positive">↗ 3,2% <em>vs mois dernier</em></span></article><article className="metric-card accent-yellow"><div className="metric-icon">!</div><p>Stock a surveiller</p><strong>{dashboard.lowStock}</strong><span className="metric-trend warning">Action requise <em>seuil minimum atteint</em></span></article><article className="metric-card accent-green"><div className="metric-icon">↗</div><p>Commandes en cours</p><strong>{dashboard.pendingOrders}</strong><span className="metric-trend neutral">3 a preparer <em>aujourd hui</em></span></article></section>

          <div className="dashboard-grid"><section className="panel stock-panel"><div className="panel-heading"><div><p className="panel-kicker">A surveiller</p><h2>Stock a reapprovisionner</h2></div><button className="text-button" onClick={() => selectView('Stock')}>Voir tout <span>→</span></button></div><div className="table-wrap"><table><thead><tr><th>REFERENCE</th><th>DESIGNATION</th><th>EMPLACEMENT</th><th>DISPONIBLE</th><th></th></tr></thead><tbody>{dashboard.lowStockItems.map((item) => <tr key={item.reference}><td><b className="reference">{item.reference}</b></td><td><span className="item-name">{item.label}</span></td><td><span className="location-tag">{item.location}</span></td><td><span className="stock-level"><i style={{ width: `${Math.min(100, item.quantity / item.minimum * 100)}%` }}></i></span><b className="quantity">{item.quantity} <small>/ {item.minimum}</small></b></td><td><button className="row-action" aria-label={`Commander ${item.label}`}>•••</button></td></tr>)}</tbody></table></div></section><section className="panel activity-panel"><div className="panel-heading"><div><p className="panel-kicker">En direct</p><h2>Activite recente</h2></div><button className="icon-button">↗</button></div><div className="activity-list">{dashboard.activity.map((item) => <div className="activity-item" key={item.title}><span className={`activity-icon activity-${item.type.toLowerCase()}`}>{item.type === 'VENTE' ? '€' : item.type === 'RECEPTION' ? '↓' : '⇄'}</span><div><b>{item.title}</b><p>{item.detail}</p></div><time>{item.time}</time></div>)}</div><button className="activity-link">Ouvrir le journal d activite <span>→</span></button></section></div>

          <section className="quick-actions"><div><p className="panel-kicker">Acces rapide</p><h2>Que souhaitez-vous faire ?</h2></div><div className="quick-action-list"><button onClick={() => selectView('Catalogue')}><span className="quick-icon coral">＋</span><span><b>Ajouter une reference</b><small>Creer un article au catalogue</small></span><span>→</span></button><button onClick={() => selectView('Receptions')}><span className="quick-icon blue">↓</span><span><b>Enregistrer une reception</b><small>Mettre du stock en entree</small></span><span>→</span></button><button onClick={() => selectView('Ventes comptoir')}><span className="quick-icon yellow">€</span><span><b>Ouvrir une caisse</b><small>Demarrer une session de vente</small></span><span>→</span></button></div></section>
        </div>
      </main>
    </div>
  )
}

export default App
