import { Link } from 'react-router-dom'
import { FormInput } from '../components/forms/FormFields'
import { useStock, type StockFilter, type StockSortKey } from '../hooks/useStock'
import type { Article } from '../types'

const currency = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const filters: Array<{ value: StockFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'low', label: 'Sous le seuil' },
  { value: 'ok', label: 'Stock OK' },
]

const columns: Array<{ key: StockSortKey; label: string }> = [
  { key: 'reference', label: 'REFERENCE' },
  { key: 'designation', label: 'DESIGNATION' },
  { key: 'emplacement', label: 'EMPLACEMENT' },
  { key: 'quantite', label: 'DISPONIBLE' },
  { key: 'minimum', label: 'SEUIL MIN.' },
]

export default function StockView() {
  const {
    visibleArticles,
    loading,
    saving,
    error,
    offline,
    filter,
    setFilter,
    query,
    setQuery,
    sortKey,
    sortDirection,
    toggleSort,
    editing,
    startEditing,
    updateEditing,
    cancelEditing,
    saveEditing,
    adjustQuantity,
    remove,
    metrics,
  } = useStock()

  const handleDelete = async (article: Article) => {
    if (!window.confirm(`Supprimer ${article.reference} du stock ?`)) return
    await remove(article.reference)
  }

  const sortClass = (key: StockSortKey) =>
    `sortable ${sortKey === key ? `sort-${sortDirection}` : ''}`.trim()

  return (
    <div className="page-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">STOCK</p>
          <h1>Gestion du stock</h1>
          <p className="heading-copy">Suivez vos niveaux de stock et réapprovisionnez en un clin d'œil.</p>
        </div>
      </div>

      {offline && (
        <p className="info-banner">
          API stock indisponible : affichage des donnees de demonstration, ajustements locaux uniquement.
        </p>
      )}

      <section className="metric-grid">
        <article className="metric-card accent-yellow">
          <div className="metric-icon">!</div>
          <p>Articles en rupture</p>
          <strong>{metrics.lowStock}</strong>
          <span className="metric-trend warning">Action requise</span>
        </article>
        <article className="metric-card accent-green">
          <div className="metric-icon">✓</div>
          <p>Articles OK</p>
          <strong>{metrics.healthy}</strong>
          <span className="metric-trend positive">Tout est OK</span>
        </article>
        <article className="metric-card accent-blue">
          <div className="metric-icon">#</div>
          <p>Total références</p>
          <strong>{metrics.total}</strong>
          <span className="metric-trend neutral">au catalogue</span>
        </article>
        <article className="metric-card accent-coral">
          <div className="metric-icon">€</div>
          <p>Valeur estimée</p>
          <strong>{currency.format(metrics.stockValue)} €</strong>
          <span className="metric-trend neutral">total HT</span>
        </article>
      </section>

      <div className="form-card">
        <h2>Ajuster les quantités {saving && <span className="saving-indicator">· synchronisation...</span>}</h2>

        <div className="filter-bar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une reference, un nom, une zone..."
            aria-label="Rechercher dans le stock"
          />
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`filter-tab ${filter === item.value ? 'active' : ''}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && <p className="error-banner" role="alert">{error}</p>}

        {loading ? (
          <p className="table-state">Chargement du stock...</p>
        ) : visibleArticles.length === 0 ? (
          <p className="table-state">Aucune ligne ne correspond aux filtres selectionnes.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={sortClass(column.key)}
                      onClick={() => toggleSort(column.key)}
                      aria-sort={sortKey === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {visibleArticles.map((article) => (
                  <tr key={article.reference} className={article.quantite <= article.minimum ? 'row-warning' : ''}>
                    <td><b className="reference">{article.reference}</b></td>
                    <td>{article.designation}</td>
                    <td><span className="location-tag">{article.emplacement}</span></td>
                    <td><b>{article.quantite}</b></td>
                    <td>{article.minimum}</td>
                    <td className="actions-cell">
                      <button className="action-btn" onClick={() => void adjustQuantity(article.reference, 1)} title="Ajouter 1" disabled={saving}>+1</button>
                      <button className="action-btn" onClick={() => void adjustQuantity(article.reference, -1)} title="Retirer 1" disabled={saving || article.quantite === 0}>-1</button>
                      <button className="action-btn edit" onClick={() => startEditing(article)} title="Modifier">✎</button>
                      <button className="action-btn delete" onClick={() => void handleDelete(article)} title="Supprimer" disabled={saving}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Modifier ${editing.reference}`}>
          <div className="modal">
            <h2>Modifier {editing.reference}</h2>
            <FormInput
              label="Quantité"
              name="quantite"
              type="number"
              value={String(editing.quantite)}
              onChange={(_name, value) => updateEditing({ quantite: Math.max(0, Number.parseInt(value, 10) || 0) })}
            />
            <FormInput
              label="Seuil minimum"
              name="minimum"
              type="number"
              value={String(editing.minimum)}
              onChange={(_name, value) => updateEditing({ minimum: Math.max(0, Number.parseInt(value, 10) || 0) })}
            />
            <div className="form-actions">
              <button className="primary-button" onClick={() => void saveEditing()} disabled={saving}>Enregistrer</button>
              <button className="secondary-button" onClick={cancelEditing}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <Link className="back-link" to="/">← Retour au dashboard</Link>
    </div>
  )
}
