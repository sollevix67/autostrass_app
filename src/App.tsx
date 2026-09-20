import { useEffect, useMemo, useState } from 'react'
import './App.css'
import './ModuleWorkspace.css'

type ModuleKey = 'Vue d’ensemble' | 'Stock' | 'Ventes' | 'Clients' | 'Réceptions' | 'Livraisons' | 'Retours' | 'Administration'
type StockRow = { reference: string; name: string; location: string; quantity: number; status: string; tone: string }
type Activity = { time: string; title: string; detail: string; color: string }
type DashboardPayload = { stock?: StockRow[]; stockItems?: Array<{ name: string; ref: string; location: string; stock: number; status: string }>; activities?: Array<{ time: string; title: string; detail: string; color?: string; tone?: string }>; }
const modules: { label: ModuleKey; icon: string; badge?: string }[] = [
  { label: 'Vue d’ensemble', icon: '⌂' }, { label: 'Stock', icon: '▦', badge: '24' }, { label: 'Ventes', icon: '▤' }, { label: 'Clients', icon: '♙' },
  { label: 'Réceptions', icon: '↓', badge: '3' }, { label: 'Livraisons', icon: '▰' }, { label: 'Retours', icon: '↶' }, { label: 'Administration', icon: '⚙' },
]
const fallbackStockRows: StockRow[] = [
  { reference: 'PLA-038-09', name: 'Plaquettes de frein avant', location: 'A-03 · E-02 · P-09', quantity: 12, status: 'En stock', tone: 'green' },
  { reference: 'FIL-5W30-5L', name: 'Huile moteur 5W30 · 5L', location: 'A-01 · E-01 · P-04', quantity: 4, status: 'Stock faible', tone: 'orange' },
  { reference: 'BAT-74AH-680', name: 'Batterie 74Ah · 680A', location: 'B-02 · E-04 · P-02', quantity: 0, status: 'Rupture', tone: 'red' },
  { reference: 'BAL-205-55R16', name: 'Pneu été 205/55 R16', location: 'C-01 · E-06 · P-12', quantity: 28, status: 'En stock', tone: 'green' },
]
const fallbackActivities: Activity[] = [
  { time: '09:42', title: 'Vente comptoir #V-1048', detail: 'Caisse 01 · 246,80 €', color: 'orange' }, { time: '09:18', title: 'Réception fournisseur', detail: 'Auto Pièces Nord · 18 lignes', color: 'blue' },
  { time: '08:55', title: 'Bon de livraison #BL-286', detail: 'Garage des Tilleuls · expédié', color: 'green' }, { time: '08:31', title: 'Retour enregistré #RT-019', detail: 'Filtre habitacle · contrôle requis', color: 'red' },
]

function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('Vue d’ensemble')
  const [search, setSearch] = useState('')
  const [showNotification, setShowNotification] = useState(false)
  const [showQuickSale, setShowQuickSale] = useState(false)
  const [stockRows, setStockRows] = useState<StockRow[]>(fallbackStockRows)
  const [activities, setActivities] = useState<Activity[]>(fallbackActivities)
  const [isLoading, setIsLoading] = useState(true)
  const [apiError, setApiError] = useState(false)
  useEffect(() => {
    fetch('/api/dashboard').then(async (response) => {
      if (!response.ok) throw new Error('API unavailable')
      return response.json() as Promise<DashboardPayload>
    }).then((data) => {
      const remoteStock = data.stock ?? data.stockItems?.map((row) => ({
        reference: row.ref,
        name: row.name,
        location: row.location,
        quantity: row.stock,
        status: row.status === 'Critique' ? 'Stock faible' : 'En stock',
        tone: row.status === 'Critique' ? 'orange' : 'green',
      }))
      const remoteActivities = data.activities?.map((activity) => ({ ...activity, color: activity.color ?? activity.tone ?? 'blue' }))
      if (!remoteStock || !remoteActivities) throw new Error('Invalid API payload')
      setStockRows(remoteStock)
      setActivities(remoteActivities)
      setApiError(false)
    }).catch(() => setApiError(true)).finally(() => setIsLoading(false))
  }, [])
  const filteredRows = useMemo(() => stockRows.filter((row) => `${row.reference} ${row.name} ${row.location}`.toLowerCase().includes(search.toLowerCase())), [search, stockRows])
  const title = activeModule === 'Vue d’ensemble' ? 'Bonjour Marc, voici votre activité.' : activeModule
  const subtitle = activeModule === 'Vue d’ensemble' ? 'Mardi 12 mars 2024 · Atelier Central' : `Gérez votre module ${activeModule.toLowerCase()} depuis cet espace.`
  const navigate = (module: ModuleKey) => setActiveModule(module)

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">A</span><span>autostrass<span className="brand-dot">.</span></span></div><div className="workspace-switcher"><span className="workspace-avatar">AC</span><span><strong>Atelier Central</strong><small>Site principal</small></span><span className="chevron">⌄</span></div><nav className="main-nav" aria-label="Navigation principale"><span className="nav-label">PILOTAGE</span>{modules.slice(0, 1).map((module) => <NavItem key={module.label} module={module} activeModule={activeModule} navigate={navigate} />)}<span className="nav-label">OPÉRATIONS</span>{modules.slice(1, 7).map((module) => <NavItem key={module.label} module={module} activeModule={activeModule} navigate={navigate} />)}<span className="nav-label">PARAMÈTRES</span>{modules.slice(7).map((module) => <NavItem key={module.label} module={module} activeModule={activeModule} navigate={navigate} />)}</nav><div className="sidebar-footer"><div className="help-icon">?</div><div><strong>Besoin d’aide ?</strong><small>Consulter le centre d’aide</small></div><span>›</span></div><div className="user-card"><div className="user-avatar">MD</div><div><strong>Marc Dupont</strong><small>Administrateur</small></div><button aria-label="Menu du compte">•••</button></div></aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>Atelier Central</span><b>/</b><strong>{activeModule}</strong></div><div className="top-actions"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une référence, un client..." /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setShowNotification((value) => !value)}>♢<i /></button><button className="avatar-button">MD</button></div>{showNotification && <div className="notification-popover"><strong>Notifications</strong><p>3 commandes attendent une réception.</p><p>La batterie BAT-74AH-680 est en rupture.</p></div>}</header><div className="page-content"><div className="page-heading"><div><p className="eyebrow">TABLEAU DE BORD</p><h1>{title}</h1><p className="page-subtitle">{subtitle}</p>{apiError && <p className="api-status warning">Mode hors connexion · données locales affichées</p>}{!apiError && !isLoading && <p className="api-status connected">● MariaDB synchronisée</p>}</div><button className="primary-button" onClick={() => setShowQuickSale(true)}><span>＋</span> Nouvelle vente</button></div>{activeModule === 'Vue d’ensemble' ? <Dashboard filteredRows={filteredRows} activities={activities} isLoading={isLoading} navigate={navigate} setShowQuickSale={setShowQuickSale} /> : <ModuleWorkspace activeModule={activeModule} stockRows={stockRows} setStockRows={setStockRows} navigate={navigate} search={search} />}</div></main>
    {showQuickSale && <div className="modal-backdrop" onClick={() => setShowQuickSale(false)}><section className="sale-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowQuickSale(false)}>×</button><p className="eyebrow">VENTE COMPTOIR</p><h2>Nouvelle vente</h2><p className="modal-copy">Choisissez une caisse pour commencer un nouveau ticket.</p><div className="registers"><button><span className="register-number">01</span><span><strong>Caisse principale</strong><small>Marc Dupont · ouverte</small></span><b>→</b></button><button><span className="register-number muted">02</span><span><strong>Caisse atelier</strong><small>Disponible</small></span><b>→</b></button></div></section></div>}
  </div>
}

function NavItem({ module, activeModule, navigate }: { module: typeof modules[number]; activeModule: ModuleKey; navigate: (module: ModuleKey) => void }) { return <button className={`nav-item ${activeModule === module.label ? 'active' : ''}`} onClick={() => navigate(module.label)}><span className="nav-icon">{module.icon}</span>{module.label}{module.badge && <span className="nav-badge">{module.badge}</span>}</button> }

function Dashboard({ filteredRows, activities, isLoading, navigate, setShowQuickSale }: { filteredRows: StockRow[]; activities: Activity[]; isLoading: boolean; navigate: (module: ModuleKey) => void; setShowQuickSale: (show: boolean) => void }) {
  return <><section className="metric-grid" aria-label="Indicateurs clés"><Metric icon="▤" color="orange" label="Chiffre d’affaires du jour" value="4 286,40 €"><small className="positive">↑ 12,8 % <em>vs. mardi dernier</em></small></Metric><Metric icon="▦" color="blue" label="Articles en stock" value={isLoading ? '...' : String(filteredRows.reduce((total, row) => total + row.quantity, 0))}><small><b className="warning-dot" />{filteredRows.filter((row) => row.tone === 'orange' || row.tone === 'red').length} à réapprovisionner</small></Metric><Metric icon="♙" color="green" label="Clients actifs" value="386"><small className="positive">↑ 4,2 % <em>ce mois-ci</em></small></Metric></section><section className="dashboard-grid"><StockPanel filteredRows={filteredRows} navigate={navigate} /><ActivityPanel activities={activities} /></section><section className="bottom-grid"><CashPanel /><QuickPanel setShowQuickSale={setShowQuickSale} navigate={navigate} /></section></>
}
function Metric({ icon, color, label, value, children }: { icon: string; color: string; label: string; value: string; children: React.ReactNode }) { return <article className="metric-card"><div className={`metric-icon ${color}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong>{children}</div><div className={`mini-chart ${color}-chart`}><i /><i /><i /><i /><i /><i /><i /></div></article> }
function StockPanel({ filteredRows, navigate }: { filteredRows: StockRow[]; navigate: (module: ModuleKey) => void }) { return <article className="panel stock-panel"><div className="panel-header"><div><h2>Stock à surveiller</h2><p>Les références qui nécessitent votre attention</p></div><button className="text-button" onClick={() => navigate('Stock')}>Voir le stock <span>→</span></button></div><div className="table-wrap"><table><thead><tr><th>RÉFÉRENCE</th><th>EMPLACEMENT</th><th>QUANTITÉ</th><th>STATUT</th><th /></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.reference}><td><strong>{row.reference}</strong><span>{row.name}</span></td><td><span className="location-tag">⌖ {row.location}</span></td><td><strong>{row.quantity}</strong> <span>unités</span></td><td><span className={`status ${row.tone}`}><b />{row.status}</span></td><td><button className="row-menu" aria-label={`Actions pour ${row.reference}`}>•••</button></td></tr>)}</tbody></table>{filteredRows.length === 0 && <div className="empty-state">Aucune référence ne correspond à votre recherche.</div>}</div></article> }
function ActivityPanel({ activities }: { activities: Activity[] }) { return <article className="panel activity-panel"><div className="panel-header"><div><h2>Activité récente</h2><p>Les dernières opérations enregistrées</p></div><button className="more-button" aria-label="Plus d'options">•••</button></div><div className="activity-list">{activities.map((activity) => <div className="activity-row" key={activity.time + activity.title}><div className={`activity-dot ${activity.color}`} /><div><strong>{activity.title}</strong><span>{activity.detail}</span></div><time>{activity.time}</time></div>)}</div><button className="activity-link">Voir toute l’activité <span>→</span></button></article> }
function CashPanel() { return <article className="panel cash-panel"><div className="panel-header"><div><h2>Ventes par caisse</h2><p>Suivi de la journée en cours</p></div><button className="date-chip">Aujourd’hui⌄</button></div><div className="cash-total"><strong>4 286,40 €</strong><span>+ 12,8 %</span></div><div className="bar-chart">{[42, 56, 38, 78, 62, 91].map((height, index) => <div key={height}><i style={{ height: `${height}%` }} /><span>{8 + index * 2}h</span></div>)}</div></article> }
function QuickPanel({ setShowQuickSale, navigate }: { setShowQuickSale: (show: boolean) => void; navigate: (module: ModuleKey) => void }) { return <article className="panel quick-panel"><div className="panel-header"><div><h2>Accès rapides</h2><p>Les actions les plus utilisées</p></div></div><div className="quick-actions"><button onClick={() => setShowQuickSale(true)}><span className="quick-icon orange">＋</span><span><strong>Nouvelle vente</strong><small>Créer un ticket comptoir</small></span><b>→</b></button><button onClick={() => navigate('Réceptions')}><span className="quick-icon blue">↓</span><span><strong>Réception fournisseur</strong><small>Enregistrer une livraison</small></span><b>→</b></button><button onClick={() => navigate('Clients')}><span className="quick-icon green">♙</span><span><strong>Nouveau client</strong><small>Ajouter au carnet d’adresses</small></span><b>→</b></button></div></article> }

type EditableRecord = { id: string; title: string; detail: string; status: string }
const initialClients: EditableRecord[] = [
  { id: 'CLI-1042', title: 'Garage des Tilleuls', detail: 'Professionnel · 03 20 48 12 90', status: 'Actif' },
  { id: 'CLI-1098', title: 'Sophie Martin', detail: 'Particulier · sophie.martin@email.fr', status: 'Actif' },
]
const initialModuleRecords: Record<Exclude<ModuleKey, 'Vue d’ensemble' | 'Stock' | 'Clients'>, EditableRecord[]> = {
  Ventes: [{ id: 'V-1048', title: 'Vente comptoir', detail: 'Caisse 01 · 246,80 €', status: 'En cours' }],
  Réceptions: [{ id: 'REC-2481', title: 'Commande fournisseur', detail: 'Central Auto Parts · 12 lignes', status: 'À contrôler' }],
  Livraisons: [{ id: 'BL-286', title: 'Garage des Tilleuls', detail: 'Bon de livraison · 8 articles', status: 'Expédié' }],
  Retours: [{ id: 'RET-109', title: 'Alternateur', detail: 'Contrôle qualité requis', status: 'À traiter' }],
  Administration: [{ id: 'USR-001', title: 'Marc Dupont', detail: 'Administrateur · connecté', status: 'Actif' }],
}

function ModuleWorkspace({ activeModule, stockRows, setStockRows, navigate, search }: { activeModule: Exclude<ModuleKey, 'Vue d’ensemble'>; stockRows: StockRow[]; setStockRows: (rows: StockRow[]) => void; navigate: (module: ModuleKey) => void; search: string }) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState({ title: '', detail: '', status: 'Actif' })
  const [clients, setClients] = useState(initialClients)
  const [records, setRecords] = useState<EditableRecord[]>(activeModule === 'Stock' ? [] : activeModule === 'Clients' ? initialClients : initialModuleRecords[activeModule])
  const isStock = activeModule === 'Stock'
  const rows = isStock ? stockRows.map((row) => ({ id: row.reference, title: row.reference, detail: `${row.name} · ${row.location}`, status: row.quantity === 0 ? 'Rupture' : row.quantity <= 6 ? 'Stock faible' : 'En stock' })) : activeModule === 'Clients' ? clients : records
  const visibleRows = rows.filter((row) => `${row.id} ${row.title} ${row.detail}`.toLowerCase().includes(search.toLowerCase()))
  const updateStock = (reference: string, field: 'quantity' | 'location', value: string) => setStockRows(stockRows.map((row) => row.reference === reference ? { ...row, [field]: field === 'quantity' ? Number(value) : value } : row))
  const saveRecord = () => {
    if (!draft.title.trim()) return
    if (isStock) setStockRows([...stockRows, { reference: draft.title.toUpperCase(), name: draft.detail || 'Nouvelle référence', location: 'A-01-01', quantity: 0, status: 'Rupture', tone: 'red' }])
    else if (activeModule === 'Clients') setClients([...clients, { id: `CLI-${1100 + clients.length}`, title: draft.title, detail: draft.detail || 'Nouveau contact', status: draft.status }])
    else setRecords([...records, { id: `${activeModule.slice(0, 3).toUpperCase()}-${records.length + 1}`, title: draft.title, detail: draft.detail || 'Nouvel élément', status: draft.status }])
    setDraft({ title: '', detail: '', status: 'Actif' }); setShowForm(false)
  }
  return <section className="module-workspace"><div className="module-toolbar"><div><p className="eyebrow">ESPACE DE TRAVAIL</p><h2>{activeModule}</h2><p>Consultez et modifiez les éléments de ce module.</p></div><div className="module-toolbar-actions"><button className="secondary-button" onClick={() => navigate('Vue d’ensemble')}>← Tableau de bord</button><button className="primary-button" onClick={() => setShowForm((value) => !value)}><span>＋</span>{isStock ? 'Nouvelle référence' : activeModule === 'Clients' ? 'Nouveau client' : 'Nouvelle entrée'}</button></div></div>{showForm && <div className="editor-panel panel"><div><h3>{isStock ? 'Ajouter une référence' : activeModule === 'Clients' ? 'Ajouter un contact' : 'Ajouter un élément'}</h3><p>Les champs marqués sont nécessaires pour créer l’élément.</p></div><div className="editor-fields"><label><span>{isStock ? 'Référence' : 'Nom / intitulé'}</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={isStock ? 'PLA-038-09' : 'Nom de l’élément'} /></label><label><span>{isStock ? 'Désignation / contact' : 'Détails'}</span><input value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} placeholder={isStock ? 'Plaquettes de frein avant' : 'Informations complémentaires'} /></label>{!isStock && <label><span>Statut</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option>Actif</option><option>À traiter</option><option>En cours</option><option>À contrôler</option></select></label>}<button className="primary-button" onClick={saveRecord}>Enregistrer</button></div></div>}<div className="module-list panel"><div className="panel-header"><div><h2>{visibleRows.length} élément{visibleRows.length > 1 ? 's' : ''}</h2><p>Dernière synchronisation avec vos données</p></div><span className="module-filter">⌕ {search || 'Tous les éléments'}</span></div>{isStock ? <div className="editable-table"><div className="editable-head"><span>RÉFÉRENCE</span><span>EMPLACEMENT</span><span>QUANTITÉ</span><span>STATUT</span></div>{visibleRows.map((row) => { const source = stockRows.find((item) => item.reference === row.id); return source ? <div className="editable-row" key={row.id}><div><strong>{source.reference}</strong><small>{source.name}</small></div><input aria-label={`Emplacement ${source.reference}`} value={source.location} onChange={(event) => updateStock(source.reference, 'location', event.target.value)} /><input className="quantity-input" aria-label={`Quantité ${source.reference}`} type="number" min="0" value={source.quantity} onChange={(event) => updateStock(source.reference, 'quantity', event.target.value)} /><span className={`status ${source.tone}`}><b />{row.status}</span></div> : null })}</div> : <div className="record-list">{visibleRows.map((row) => <div className="record-row" key={row.id}><span className="record-icon">{activeModule === 'Clients' ? '♙' : activeModule === 'Administration' ? '⚙' : '▤'}</span><div><strong>{row.title}</strong><small>{row.id} · {row.detail}</small></div><span className="record-status">{row.status}</span><button className="row-menu" aria-label={`Actions pour ${row.title}`}>•••</button></div>)}</div>}{visibleRows.length === 0 && <div className="empty-state">Aucun élément ne correspond à votre recherche.</div>}</div></section>
}

export default App