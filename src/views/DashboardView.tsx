import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

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

export default function DashboardView({ apiMode: initialApiMode }: { apiMode?: 'demo' | 'connected' }) {
  const [dashboard, setDashboard] = useState<DashboardData>(demoDashboard)
  const [apiMode, setApiMode] = useState<'demo' | 'connected'>(initialApiMode ?? 'demo')

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
    <>
      <section className="metric-grid" aria-label="Indicateurs du depot">
        <article className="metric-card accent-coral"><div className="metric-icon">€</div><p>Valeur du stock</p><strong>{dashboard.stockValue.toLocaleString('fr-FR')} €</strong><span className="metric-trend positive">↗ 8,4% <em>vs mois dernier</em></span></article>
        <article className="metric-card accent-blue"><div className="metric-icon">#</div><p>References actives</p><strong>{dashboard.references.toLocaleString('fr-FR')}</strong><span className="metric-trend positive">↗ 3,2% <em>vs mois dernier</em></span></article>
        <article className="metric-card accent-yellow"><div className="metric-icon">!</div><p>Stock a surveiller</p><strong>{dashboard.lowStock}</strong><span className="metric-trend warning">Action requise <em>seuil minimum atteint</em></span></article>
        <article className="metric-card accent-green"><div className="metric-icon">↗</div><p>Commandes en cours</p><strong>{dashboard.pendingOrders}</strong><span className="metric-trend neutral">3 a preparer <em>aujourd hui</em></span></article>
      </section>

      <div className="dashboard-grid">
        <section className="panel stock-panel">
          <div className="panel-heading">
            <div><p className="panel-kicker">A surveiller</p><h2>Stock a reapprovisionner</h2></div>
            <Link className="text-button" to="/stock">Voir tout <span>→</span></Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>REFERENCE</th><th>DESIGNATION</th><th>EMPLACEMENT</th><th>DISPONIBLE</th><th></th></tr>
              </thead>
              <tbody>
                {dashboard.lowStockItems.map((item) => (
                  <tr key={item.reference}>
                    <td><b className="reference">{item.reference}</b></td>
                    <td><span className="item-name">{item.label}</span></td>
                    <td><span className="location-tag">{item.location}</span></td>
                    <td>
                      <span className="stock-level"><i style={{ width: `${Math.min(100, item.quantity / item.minimum * 100)}%` }}></i></span>
                      <b className="quantity">{item.quantity} <small>/ {item.minimum}</small></b>
                    </td>
                    <td><Link className="row-action" to="/catalogue?edit={item.reference}" aria-label={`Commander ${item.label}`}>•••</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading"><div><p className="panel-kicker">En direct</p><h2>Activite recente</h2></div><Link className="icon-button" to="/receptions">↗</Link></div>
          <div className="activity-list">
            {dashboard.activity.map((item) => (
              <div className="activity-item" key={item.title}>
                <span className={`activity-icon activity-${item.type.toLowerCase()}`}>{item.type === 'VENTE' ? '€' : item.type === 'RECEPTION' ? '↓' : '⇄'}</span>
                <div><b>{item.title}</b><p>{item.detail}</p></div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
          <button className="activity-link">Ouvrir le journal d activite <span>→</span></button>
        </section>
      </div>

      <section className="quick-actions">
        <div><p className="panel-kicker">Acces rapide</p><h2>Que souhaitez-vous faire ?</h2></div>
        <div className="quick-action-list">
          <Link to="/catalogue">
            <span className="quick-icon coral">＋</span>
            <span><b>Ajouter une reference</b><small>Creer un article au catalogue</small></span>
            <span>→</span>
          </Link>
          <Link to="/receptions">
            <span className="quick-icon blue">↓</span>
            <span><b>Enregistrer une reception</b><small>Mettre du stock en entree</small></span>
            <span>→</span>
          </Link>
          <Link to="/ventes-comptoir">
            <span className="quick-icon yellow">€</span>
            <span><b>Ouvrir une caisse</b><small>Demarrer une session de vente</small></span>
            <span>→</span>
          </Link>
        </div>
      </section>
    </>
  )
}
