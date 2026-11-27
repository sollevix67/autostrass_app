import { Link } from 'react-router-dom'
import type { ApiMode, DashboardData } from '../types'
import { Icon, type IconName } from '../components/Icon'
import { formatEuros } from '../options'

/** Iconographie du journal d'activite, indexee par type de mouvement. */
const ACTIVITY_ICONS: Record<string, IconName> = {
  RECEPTION: 'download',
  VENTE: 'cart',
  TRANSFERT: 'truck',
  INVENTAIRE: 'arrow-down',
}

type DashboardViewProps = {
  dashboard: DashboardData
  apiMode: ApiMode
}

export default function DashboardView({ dashboard, apiMode }: DashboardViewProps) {
  const connected = apiMode === 'connected'

  return (
    <>
      <section className="metric-grid" aria-label="Indicateurs du dépôt" aria-busy={apiMode === 'loading'}>
        <article className="metric-card accent-coral">
          <div className="metric-icon" aria-hidden="true">€</div>
          <p>Valeur du stock</p>
          <strong>{connected ? formatEuros(dashboard.stockValue) : '—'}</strong>
        </article>
        <article className="metric-card accent-blue">
          <div className="metric-icon" aria-hidden="true">#</div>
          <p>Références actives</p>
          <strong>{connected ? dashboard.references.toLocaleString('fr-FR') : '—'}</strong>
        </article>
        <article className="metric-card accent-yellow">
          <div className="metric-icon" aria-hidden="true">!</div>
          <p>Stock à surveiller</p>
          <strong>{connected ? dashboard.lowStock.toLocaleString('fr-FR') : '—'}</strong>
          {connected && dashboard.lowStock > 0 && <span className="metric-trend warning">Seuil minimum atteint</span>}
        </article>
        <article className="metric-card accent-green">
          <div className="metric-icon" aria-hidden="true">↗</div>
          <p>Commandes en cours</p>
          <strong>{connected ? dashboard.pendingOrders.toLocaleString('fr-FR') : '—'}</strong>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel stock-panel">
          <div className="panel-heading">
            <div><p className="panel-kicker">À surveiller</p><h2>Stock à réapprovisionner</h2></div>
            <Link className="text-button" to="/stock">Voir tout <span>→</span></Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>REFERENCE</th><th>DESIGNATION</th><th>EMPLACEMENT</th><th>DISPONIBLE</th><th></th></tr>
              </thead>
              <tbody>
                {dashboard.lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <p className="empty-state">
                        {apiMode === 'loading'
                          ? 'Chargement du stock depuis MariaDB...'
                          : apiMode === 'error'
                            ? 'Impossible de charger le stock. Verifiez la connexion MariaDB.'
                            : 'Aucun article sous le seuil minimum.'}
                      </p>
                    </td>
                  </tr>
                ) : dashboard.lowStockItems.map((item) => (
                  <tr key={item.reference}>
                    <td><b className="reference">{item.reference}</b></td>
                    <td><span className="item-name">{item.label}</span></td>
                    <td><span className="location-tag">{item.location || '—'}</span></td>
                    <td>
                      <span className="stock-level"><i style={{ width: `${item.minimum > 0 ? Math.min(100, item.quantity / item.minimum * 100) : 0}%` }}></i></span>
                      <b className="quantity">{item.quantity} <small>/ {item.minimum}</small></b>
                    </td>
                    <td><Link className="row-action" to={`/catalogue?edit=${encodeURIComponent(item.reference)}`} aria-label={`Modifier ${item.label}`}>•••</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading"><div><p className="panel-kicker">En direct</p><h2>Activite recente</h2></div><Link className="icon-button" to="/receptions" aria-label="Voir les réceptions"><Icon name="chevron-right" size="sm" /></Link></div>
          <div className="activity-list">
            {dashboard.activity.length === 0 ? (
              <p className="empty-state">
                {apiMode === 'loading'
                  ? 'Chargement de l activite...'
                  : apiMode === 'error'
                    ? 'Activite indisponible.'
                    : 'Aucune activite recente.'}
              </p>
            ) : dashboard.activity.map((item, index) => (
              // Deux mouvements du meme article a la meme seconde partagent
              // type/title/time : l'index est necessaire pour une cle unique.
              <div className="activity-item" key={`${item.type}-${item.title}-${item.time}-${index}`}>
                <span className={`activity-icon activity-${item.type.toLowerCase()}`}>
                  <Icon name={ACTIVITY_ICONS[item.type] ?? 'arrow-down'} size="sm" />
                </span>
                <div><b>{item.title}</b><p>{item.detail}</p></div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
          <button className="activity-link">Ouvrir le journal d activite <Icon name="chevron-right" size="sm" /></button>
        </section>
      </div>

      <section className="quick-actions">
        <div><p className="panel-kicker">Acces rapide</p><h2>Que souhaitez-vous faire ?</h2></div>
        <div className="quick-action-list">
          <Link to="/catalogue">
            <span className="quick-icon coral"><Icon name="plus" size="sm" /></span>
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
