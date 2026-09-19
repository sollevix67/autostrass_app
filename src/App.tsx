import { useEffect, useState } from 'react'
import './App.css'

type NavItem = { label: string; icon: string }
type StockItem = { name: string; ref: string; location: string; stock: number; minimum: number; status: 'Critique' | 'Disponible' }
type Activity = { type: 'Réception' | 'Vente' | 'Retour'; title: string; detail: string; time: string; tone: 'green' | 'blue' | 'orange' }

const navItems: NavItem[] = [
  { label: 'Vue d’ensemble', icon: '⌂' }, { label: 'Stock & pièces', icon: '▦' },
  { label: 'Réceptions', icon: '↓' }, { label: 'Ventes', icon: '▣' },
  { label: 'Livraisons', icon: '⇢' }, { label: 'Retours', icon: '↶' },
]
function App() {
  const [activeNav, setActiveNav] = useState('Vue d’ensemble')
  const [notice, setNotice] = useState('')
  const [showAllStock, setShowAllStock] = useState(false)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const handleAction = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3200) }

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (!response.ok) throw new Error('dashboard unavailable')
        const data: { stockItems: StockItem[]; activities: Activity[] } = await response.json()
        setStockItems(data.stockItems)
        setActivities(data.activities)
      } catch {
        setLoadError('Impossible de charger les données MariaDB.')
      } finally {
        setIsLoading(false)
      }
    }
    void loadDashboard()
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar"><div className="brand"><span className="brand-mark">A</span><span>autostrass</span></div><div className="workspace-switcher"><span className="workspace-dot" /> Atelier Lyon <span className="chevron">⌄</span></div><nav className="main-nav" aria-label="Navigation principale"><span className="nav-caption">Espace de travail</span>{navItems.map((item) => <button className={activeNav === item.label ? 'nav-item active' : 'nav-item'} key={item.label} onClick={() => setActiveNav(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}{item.label === 'Stock & pièces' && <span className="nav-count">{stockItems.length}</span>}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item"><span className="nav-icon">⚙</span>Paramètres</button><div className="user-chip"><span className="avatar">CM</span><span><strong>Clara Martin</strong><small>Administratrice</small></span><span className="more">•••</span></div></div></aside>
      <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>Opérations</span><b>/</b><strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Rechercher">⌕</button><button className="icon-button notification" aria-label="Notifications">♧<i /></button><div className="top-avatar">CM</div></div></header>
        {notice && <div className="toast" role="status">✓ {notice}</div>}
        <div className="page-content"><section className="page-heading"><div><p className="eyebrow">Mardi 24 septembre 2024 <span className="live-dot" /> {isLoading ? 'Connexion à la base…' : loadError ? 'Base indisponible' : 'Données à jour'}</p><h1>Bonjour Clara, <em>voici votre journée.</em></h1><p className="subtitle">Gardez un œil sur vos flux et vos pièces critiques.</p></div><button className="primary-button" onClick={() => handleAction('Nouvelle réception créée')}><span>＋</span> Nouvelle opération <b>⌄</b></button></section>
          {loadError && <div className="toast" role="alert">⚠ {loadError}</div>}
          <section className="metric-grid" aria-label="Indicateurs clés"><article className="metric-card accent-green"><div className="metric-top"><span>Chiffre d'affaires</span><span className="metric-icon">↗</span></div><strong>24 680 €</strong><p><span className="positive">↑ 12,8 %</span> vs mois dernier</p><div className="sparkline green"><i /><i /><i /><i /><i /><i /><i /></div></article><article className="metric-card"><div className="metric-top"><span>Commandes en cours</span><span className="metric-icon blue-icon">▣</span></div><strong>38</strong><p><span className="positive">↑ 8,2 %</span> cette semaine</p><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /><i /></div></article><article className="metric-card accent-orange"><div className="metric-top"><span>À expédier aujourd'hui</span><span className="metric-icon orange-icon">⇢</span></div><strong>12</strong><p><span className="neutral">4 prioritaires</span> avant 16h</p><div className="progress-line"><span /></div></article><article className="metric-card accent-red"><div className="metric-top"><span>Stock sous seuil</span><span className="metric-icon red-icon">!</span></div><strong>4</strong><p><span className="negative">2 critiques</span> nécessitent une action</p><div className="progress-line red-line"><span /></div></article></section>
          <section className="quick-actions"><div className="section-label">Actions rapides</div><div className="quick-grid"><button onClick={() => handleAction('Ouverture de la réception fournisseur')}><span className="quick-icon purple">↓</span><span><strong>Réceptionner</strong><small>Entrer du stock</small></span><b>→</b></button><button onClick={() => handleAction('Nouvelle vente initiée')}><span className="quick-icon yellow">＋</span><span><strong>Créer une vente</strong><small>Commande comptoir</small></span><b>→</b></button><button onClick={() => handleAction('Ouverture du module retours')}><span className="quick-icon orange">↶</span><span><strong>Gérer un retour</strong><small>Contrôle & avoir</small></span><b>→</b></button></div></section>
          <div className="dashboard-grid"><section className="panel stock-panel"><div className="panel-header"><div><span className="panel-kicker">Surveillance</span><h2>Stock à surveiller</h2></div><button className="text-button" onClick={() => setShowAllStock(!showAllStock)}>{showAllStock ? 'Réduire' : 'Voir tout'} <span>→</span></button></div><div className="table-wrap"><table><thead><tr><th>Pièce</th><th>Emplacement</th><th>En stock</th><th>État</th><th /></tr></thead><tbody>{isLoading ? <tr><td colSpan={5}>Chargement du stock…</td></tr> : stockItems.slice(0, showAllStock ? stockItems.length : 3).map((item) => <tr key={item.ref}><td><div className="part-name"><span className="part-icon">⚙</span><span><strong>{item.name}</strong><small>{item.ref}</small></span></div></td><td className="muted">{item.location}</td><td><strong className={item.stock <= item.minimum ? 'stock-low' : ''}>{item.stock}</strong><small className="stock-unit"> / {item.minimum} min.</small></td><td><span className={item.status === 'Critique' ? 'status critical' : 'status available'}><i />{item.status}</span></td><td><button className="row-menu" aria-label={`Actions pour ${item.name}`}>•••</button></td></tr>)}</tbody></table></div></section><section className="panel activity-panel"><div className="panel-header"><div><span className="panel-kicker">Journal d'activité</span><h2>Derniers mouvements</h2></div><button className="icon-button">•••</button></div><div className="activity-list">{isLoading ? <p>Chargement des mouvements…</p> : activities.map((activity) => <div className="activity-item" key={activity.title}><span className={`activity-icon ${activity.tone}`}>{activity.type === 'Réception' ? '↓' : activity.type === 'Vente' ? '▣' : '↶'}</span><div><strong>{activity.title}</strong><p>{activity.detail}</p><small>{activity.time}</small></div></div>)}</div><button className="activity-footer" onClick={() => handleAction('Historique complet ouvert')}>Voir l'historique complet <span>→</span></button></section></div>
        </div></main>
    </div>
  )
}

export default App
