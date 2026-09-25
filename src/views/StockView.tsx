import { useEffect, useState } from 'react'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { FormInput } from '../components/forms/FormFields'
import { useStock, type StockFilter } from '../hooks/useStock'
import { toNumber } from '../utils/coerce'
import type { Article } from '../types'

const currency = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const filters: Array<{ value: StockFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'low', label: 'Sous le seuil' },
  { value: 'ok', label: 'Stock OK' },
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
    editing,
    startEditing,
    updateEditing,
    cancelEditing,
    saveEditing,
    adjustQuantity,
    remove,
    metrics,
  } = useStock()

  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const [savingEdit, setSavingEdit] = useState(false)

  // Raccourci clavier : `Escape` ferme la modale d'edition.
  useEffect(() => {
    if (!editing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelEditing()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editing, cancelEditing])

  const handleDelete = (article: Article) => {
    confirm(
      `Retirer ${article.reference} du stock ?`,
      <>
        L'article <strong>{article.designation}</strong> sera supprime du catalogue.
        L'operation est irreversible.
      </>,
      async () => {
        const ok = await remove(article.reference)
        if (ok) toast.success(`Article ${article.reference} supprime du stock.`)
        else toast.error(`La suppression de ${article.reference} a echoue.`)
      },
    )
  }

  const handleSaveEdit = async () => {
    setSavingEdit(true)
    const ok = await saveEditing()
    setSavingEdit(false)
    if (ok) toast.success(`Stock mis a jour pour ${editing?.reference}.`)
    else toast.error('La mise a jour a echoue.')
  }

  const columns: ColumnDef<Article>[] = [
    {
      key: 'reference',
      header: 'REFERENCE',
      sortable: true,
      sortValue: (row) => row.reference,
      render: (row) => <b className="reference">{row.reference}</b>,
    },
    { key: 'designation', header: 'DESIGNATION', sortable: true, sortValue: (row) => row.designation, render: (row) => row.designation },
    { key: 'emplacement', header: 'EMPLACEMENT', sortable: true, sortValue: (row) => row.emplacement, render: (row) => <span className="location-tag">{row.emplacement}</span> },
    {
      key: 'quantite',
      header: 'DISPONIBLE',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.quantite,
      render: (row) => <b>{row.quantite}</b>,
    },
    {
      key: 'minimum',
      header: 'SEUIL MIN.',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.minimum,
      render: (row) => row.minimum,
    },
    {
      key: 'status',
      header: 'ETAT',
      render: (row) =>
        row.quantite <= row.minimum ? (
          <span className="status-badge status-rupture">Sous le seuil</span>
        ) : (
          <span className="status-badge status-disponible">OK</span>
        ),
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '132px',
      render: (row) => (
        <div className="actions-cell">
          <button className="action-btn" onClick={() => void adjustQuantity(row.reference, 1)} title="Ajouter 1" aria-label={`Ajouter 1 a ${row.reference}`} disabled={saving}>
            +1
          </button>
          <button
            className="action-btn"
            onClick={() => void adjustQuantity(row.reference, -1)}
            title="Retirer 1"
            aria-label={`Retirer 1 a ${row.reference}`}
            disabled={saving || row.quantite === 0}
          >
            -1
          </button>
          <button className="action-btn edit" onClick={() => startEditing(row)} title="Modifier" aria-label={`Modifier ${row.reference}`}>
            ✎
          </button>
          <button className="action-btn delete" onClick={() => handleDelete(row)} title="Supprimer" aria-label={`Supprimer ${row.reference}`} disabled={saving}>
            🗑
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageLayout
      eyebrow="STOCK"
      title="Gestion du stock"
      description="Suivez vos niveaux de stock et réapprovisionnez en un clin d'œil."
    >
      {offline && (
        <p className="info-banner" role="status">
          API stock indisponible : affichage des donnees de demonstration, ajustements locaux uniquement.
        </p>
      )}

      <section className="metric-grid" aria-label="Indicateurs du stock">
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
              aria-pressed={filter === item.value}
            >
              {item.label}
            </button>
          ))}
          <span className="saving-indicator">
            {visibleArticles.length} ligne{visibleArticles.length > 1 ? 's' : ''}
          </span>
        </div>

        {error && <p className="error-banner" role="alert">{error}</p>}

        <DataTable
          columns={columns}
          rows={visibleArticles}
          rowKey={(row) => row.reference}
          loading={loading}
          loadingMessage="Chargement du stock..."
          emptyMessage="Aucune ligne ne correspond aux filtres selectionnes."
          isRowActive={(row) => row.reference === editing?.reference}
          defaultSort={{ key: sortKey, direction: sortDirection }}
          caption="Niveaux de stock par article"
        />
      </div>

      {editing && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-edit-title"
          onMouseDown={(event) => { if (event.target === event.currentTarget) cancelEditing() }}
        >
          <div className="modal">
            <h2 id="stock-edit-title">Modifier {editing.reference}</h2>
            <FormInput
              label="Quantité"
              name="quantite"
              type="number"
              min="0"
              value={String(editing.quantite)}
              onChange={(_name, value) => updateEditing({ quantite: Math.max(0, toNumber(value)) })}
            />
            <FormInput
              label="Seuil minimum"
              name="minimum"
              type="number"
              min="0"
              value={String(editing.minimum)}
              onChange={(_name, value) => updateEditing({ minimum: Math.max(0, toNumber(value)) })}
            />
            <div className="form-actions">
              <button className="primary-button" onClick={() => void handleSaveEdit()} disabled={savingEdit || saving}>
                {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button className="secondary-button" onClick={cancelEditing}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} confirmLabel="Supprimer" destructive />
    </PageLayout>
  )
}
