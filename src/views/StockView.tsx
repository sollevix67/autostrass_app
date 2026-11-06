import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { canWrite, useAuth } from '../components/useAuth'
import { Icon } from '../components/Icon'
import { useStock, type StockFilter } from '../hooks/useStock'
import { useEmplacements } from '../hooks/useEmplacements'
import { EmplacementsManager } from '../components/EmplacementsManager'
import { api, isAbortError, toErrorMessage } from '../services/api'
import type { ApiArticleEmplacements, StockTransfertInput } from '../services/contracts'
import type { Article } from '../types'
import { FormInput } from '../components/forms/FormFields'

const filters: Array<{ value: StockFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'low', label: 'Sous le seuil' },
  { value: 'ok', label: 'Stock OK' },
]

type TransfertForm = {
  reference: string
  quantite: string
  sourceId: string
  destinationId: string | null
}

const STOCK_NON_AFFECTE = 'non-affecte'

export default function StockView() {
  const {
    visibleArticles,
    loading,
    saving,
    offline,
    filter,
    setFilter,
    query,
    setQuery,
    editing,
    startEditing,
    updateEditing,
    cancelEditing,
    saveEditing,
    adjustQuantity,
    remove,
    metrics,
    reload,
  } = useStock()

  const toast = useToast()
  const { user } = useAuth()
  const canTransfer = canWrite(user?.role, 'depot')
  const { dialogProps, confirm } = useConfirm()
  const [savingEdit, setSavingEdit] = useState(false)

  /* ---------- Emplacements ---------- */
  const { emplacements, loading: emplacementsLoading, error: emplacementsError, reload: loadEmplacements } = useEmplacements()

  /* ---------- Modals ---------- */
  const [openTransfertModal, setOpenTransfertModal] = useState(false)
  const [transfertForm, setTransfertForm] = useState<TransfertForm>({
    reference: '',
    quantite: '1',
    sourceId: '',
    destinationId: null,
  })
  const [transfertFormError, setTransfertFormError] = useState<string | null>(null)
  const [savingTransfert, setSavingTransfert] = useState(false)
  const [transfertStock, setTransfertStock] = useState<ApiArticleEmplacements | null>(null)
  const [transfertStockError, setTransfertStockError] = useState<{ reference: string; message: string } | null>(null)
  const transfertReference = transfertForm.reference.trim()
  const currentTransfertStock = transfertStock?.reference === transfertReference ? transfertStock : null
  const currentTransfertStockError = transfertStockError?.reference === transfertReference ? transfertStockError.message : null
  const transfertStockLoading = openTransfertModal && !!transfertReference && !currentTransfertStock && !currentTransfertStockError
  const transfertSources = currentTransfertStock
    ? [
      ...currentTransfertStock.emplacements
        .filter((item) => item.quantite > 0)
        .map((item) => ({ id: String(item.emplacementId), label: item.chemin, quantite: item.quantite })),
      ...(currentTransfertStock.quantiteNonAffectee > 0
        ? [{ id: STOCK_NON_AFFECTE, label: 'Stock non affecté', quantite: currentTransfertStock.quantiteNonAffectee }]
        : []),
    ]
    : []
  const transfertSource = transfertSources.find((item) => item.id === transfertForm.sourceId)
  const transfertStockInconsistent = !!currentTransfertStock && (
    currentTransfertStock.quantiteTotale < 0 ||
    currentTransfertStock.quantiteNonAffectee < 0 ||
    currentTransfertStock.emplacements.some((item) => item.quantite < 0) ||
    currentTransfertStock.emplacements.reduce((sum, item) => sum + item.quantite, 0) > currentTransfertStock.quantiteTotale
  )

  useEffect(() => {
    if (!openTransfertModal || !transfertReference) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api.get<ApiArticleEmplacements>(`/articles/${encodeURIComponent(transfertReference)}/emplacements`, { signal: controller.signal })
        .then((stock) => {
          if (controller.signal.aborted) return
          // La réponse reste liée à la référence saisie, même si sa casse diffère en base.
          setTransfertStock({ ...stock, reference: transfertReference })
          setTransfertStockError(null)
          const sourceIds = stock.emplacements.filter((item) => item.quantite > 0).map((item) => String(item.emplacementId))
          if (stock.quantiteNonAffectee > 0) sourceIds.push(STOCK_NON_AFFECTE)
          setTransfertForm((current) => current.reference.trim() === transfertReference
            ? { ...current, sourceId: sourceIds.length === 1 ? sourceIds[0] : '' }
            : current)
        })
        .catch((err) => {
          if (controller.signal.aborted || isAbortError(err)) return
          setTransfertStockError({ reference: transfertReference, message: toErrorMessage(err) })
        })
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [openTransfertModal, transfertReference])

  /* ---------- Raccourcis clavier ---------- */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (openTransfertModal) setOpenTransfertModal(false)
        if (editing) cancelEditing()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openTransfertModal, editing, cancelEditing])

  /* ---------- Helpers ---------- */
  const handleDelete = (article: Article) => {
    confirm(
      `Supprimer ${article.reference}`,
      `Etes-vous sur de vouloir supprimer l'article "${article.reference}" ? Cette action est definitive.`,
      async () => {
        const ok = await remove(article.reference)
        if (ok) {
          toast.success(`Article ${article.reference} supprime`)
          reload()
        } else {
          toast.error(`Echec de la suppression de ${article.reference}`)
        }
      },
    )
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    setSavingEdit(true)
    const ok = await saveEditing()
    setSavingEdit(false)
    if (ok) {
      toast.success(`Article ${editing.reference} mis a jour`)
    } else {
      toast.error(`Echec de la mise a jour de ${editing.reference}`)
    }
  }

  /* ---------- Transfert ---------- */
  const openTransfert = (row: Article) => {
    setTransfertForm({ reference: row.reference, quantite: '1', sourceId: '', destinationId: null })
    setTransfertFormError(null)
    setTransfertStock(null)
    setTransfertStockError(null)
    setOpenTransfertModal(true)
  }

  const resetTransfertForm = () => {
    setTransfertForm({ reference: '', quantite: '1', sourceId: '', destinationId: null })
    setTransfertFormError(null)
    setTransfertStock(null)
    setTransfertStockError(null)
  }

  const handleTransfertSave = async () => {
    if (savingTransfert || !canTransfer || offline) return
    setTransfertFormError(null)
    const { reference, quantite, sourceId, destinationId } = transfertForm

    if (!reference.trim()) {
      setTransfertFormError('La reference est obligatoire')
      return
    }
    const q = Number(quantite)
    if (!Number.isInteger(q) || q <= 0 || q > 2_147_483_647) {
      setTransfertFormError('La quantité doit être un entier positif inférieur ou égal à 2 147 483 647')
      return
    }
    if (!currentTransfertStock || !transfertSource || transfertStockInconsistent) {
      setTransfertFormError('Sélectionnez un stock de départ valide')
      return
    }
    if (q > transfertSource.quantite) {
      setTransfertFormError('La quantité dépasse le stock disponible au départ')
      return
    }
    const emplacementId = destinationId === null ? null : Number(destinationId)
    if (emplacementId !== null && (!Number.isInteger(emplacementId) || emplacementId < 1)) {
      setTransfertFormError('Sélectionnez un emplacement de destination valide')
      return
    }

    const payload: StockTransfertInput = {
      source_emplacement_id: sourceId === STOCK_NON_AFFECTE ? null : Number(sourceId),
      emplacement_id: emplacementId,
      quantite: q,
    }
    setSavingTransfert(true)
    try {
      await api.post(`/articles/${encodeURIComponent(reference.trim())}/transfert`, payload)
      toast.success(`Transfert de ${q} unite(s) de ${reference} effectue`)
      setOpenTransfertModal(false)
      loadEmplacements()
      reload()
    } catch (err) {
      setTransfertFormError(toErrorMessage(err) || 'Echec du transfert')
    } finally {
      setSavingTransfert(false)
    }
  }

  /* ---------- Colonnes ---------- */
  const articlesColumns: ColumnDef<Article>[] = [
    {
      key: 'reference',
      header: 'REFERENCE',
      sortable: true,
      sortValue: (row) => row.reference,
      render: (row) => <span className="stock-reference">{row.reference}</span>,
    },
    {
      key: 'designation',
      header: 'DESIGNATION',
      sortable: true,
      sortValue: (row) => row.designation,
      render: (row) => row.designation,
    },
    {
      key: 'emplacement',
      header: 'EMPLACEMENT',
      sortable: true,
      sortValue: (row) => row.emplacement ?? '-',
      render: (row) => (
        <span className="stock-emplacement-badge">
          {row.emplacement ? row.emplacement : '-'}
        </span>
      ),
    },
    {
      key: 'quantite',
      header: 'QUANTITE',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.quantite,
      render: (row) => <span>{row.quantite}</span>,
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
      width: '150px',
      render: (row) => (
        <div className="actions-cell">
          <button className="action-btn" onClick={() => void adjustQuantity(row.reference, 1)} title="Ajouter 1" aria-label={`Ajouter 1 a ${row.reference}`} disabled={saving}>
            <Icon name="chevron-down" size="sm" />{" "}
            <span className="visually-hidden">Ajouter 1</span>
          </button>
          <button
            className="action-btn"
            onClick={() => void adjustQuantity(row.reference, -1)}
            title="Retirer 1"
            aria-label={`Retirer 1 a ${row.reference}`}
            disabled={saving || row.quantite === 0}
          >
            <Icon name="chevron-right" size="sm" />{" "}
            <span className="visually-hidden">Retirer 1</span>
          </button>
          <button className="action-btn edit" onClick={() => startEditing(row)} title="Modifier" aria-label={`Modifier ${row.reference}`}>
            <Icon name="edit" size="sm" />
          </button>
          {canTransfer && !offline && <Link className="action-btn" to={`/stock/inventaire?reference=${encodeURIComponent(row.reference)}`} title="Compter" aria-label={`Compter ${row.reference}`}><Icon name="clipboard" size="sm" /></Link>}
          <button className="action-btn transfert" onClick={() => openTransfert(row)} title="Transférer" aria-label={`Transférer ${row.reference}`} disabled={!canTransfer || offline || savingTransfert}>
            <Icon name="truck" size="sm" />
          </button>
          <button className="action-btn delete" onClick={() => handleDelete(row)} title="Supprimer" aria-label={`Supprimer ${row.reference}`} disabled={saving}>
            <Icon name="trash" size="sm" />
          </button>
        </div>
      ),
    },
  ]

  /* ---------- Rendu ---------- */
  return (
    <PageLayout
      eyebrow="STOCK"
      title="Gestion du stock"
      description={
        offline
          ? 'Mode hors ligne — les modifications seront synchronisees a la reconnexion'
          : 'Consultez, ajustez et organisez votre stock par emplacement'
      }
      actions={(
        <>
          {canTransfer && <Link className="primary-button" to="/stock/inventaire"><Icon name="clipboard" size="sm" /> Inventaire physique</Link>}
          <button
            className="secondary-button"
            onClick={() => {
              resetTransfertForm()
              setOpenTransfertModal(true)
            }}
            aria-label="Transfert d'article"
            disabled={!canTransfer || offline || savingTransfert}
          >
            <Icon name="truck" size="sm" /> Transfert
          </button>
        </>
      )}
    >
      {/* Metriques rapides */}
      <div className="stock-metrics">
        <div className="metric-card">
          <span className="metric-label">References</span>
          <span className="metric-value">{metrics.total}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Sous le seuil</span>
          <span className="metric-value status-rupture">{metrics.lowStock}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Emplacements</span>
          <span className="metric-value">{emplacements.length}</span>
        </div>
        {offline && (
          <div className="metric-card offline">
            <span className="metric-label">Connexion</span>
            <span className="metric-value status-rupture">Hors ligne</span>
          </div>
        )}
      </div>

      <div className="stock-grid">
        {/* Articles, puis gestion des emplacements en pleine largeur */}
        <section className="stock-panel">
          <div className="panel-header">
            <h3>Articles en stock</h3>
            <div className="panel-controls">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as StockFilter)}
                aria-label="Filtrer par etat de stock"
                className="filter-select"
              >
                {filters.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <input
                type="search"
                placeholder="Rechercher reference ou designation..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher un article"
                className="search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="stock-empty">
              <Icon name="bell" size="lg" />
              <p>Chargement des articles...</p>
            </div>
          ) : visibleArticles.length === 0 ? (
            <div className="stock-empty">
              <Icon name="box" size="lg" />
              <p>Aucun article correspondant</p>
              <p className="stock-empty-hint">
                Essayez d'elargir votre recherche ou creez un nouvel article dans le catalogue.
              </p>
            </div>
          ) : (
            <DataTable
              columns={articlesColumns}
              rows={visibleArticles}
              rowKey={(r) => r.reference}
              defaultSort={{ key: 'reference', direction: 'asc' }}
              emptyMessage="Aucun article en stock."
              loading={false}
              isRowActive={(r) => editing?.reference === r.reference}
              caption="Liste des articles en stock"
            />
          )}

          {editing && (
            <div className="stock-edit-panel">
              <h4>Modifier {editing.reference}</h4>
              <FormInput
                label="Quantite"
                name="quantite"
                type="number"
                min="0"
                value={String(editing.quantite)}
                onChange={(name, value) => updateEditing({ [name]: Number(value) })}
                error={editing.quantite < 0 ? 'La quantite ne peut pas etre negative' : undefined}
              />
              <FormInput
                label="Seuil minimum"
                name="minimum"
                type="number"
                min="0"
                value={String(editing.minimum)}
                onChange={(name, value) => updateEditing({ [name]: Number(value) })}
                error={editing.minimum < 0 ? 'Le seuil ne peut pas etre negatif' : undefined}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  Enregistrer
                </button>
                <button type="button" className="secondary-button" onClick={cancelEditing}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>

        <EmplacementsManager emplacements={emplacements} loading={emplacementsLoading} error={emplacementsError} reload={loadEmplacements} />
      </div>

      {/* Modal : Transfert d'article */}
      <div
        className="modal-overlay"
        onMouseDown={() => setOpenTransfertModal(false)}
        style={{ display: openTransfertModal ? 'flex' : 'none' }}
      >
        <div
          className="modal transfert-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfert-modal-title"
          aria-describedby="transfert-modal-desc"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2 id="transfert-modal-title">Transfert d'article</h2>
          <p id="transfert-modal-desc" className="modal-desc">
            Déplacez une quantité d'un article vers un nouvel emplacement.
          </p>

          {transfertFormError && (
            <div className="stock-alert error" role="alert">
              <Icon name="alert" size="sm" />
              <span>{transfertFormError}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleTransfertSave() }} className="modal-form">
            <FormInput
              label="Référence de l'article"
              name="transfert-reference"
              value={transfertForm.reference}
              onChange={(_, v) => {
                const referenceChanged = v.trim() !== transfertReference
                setTransfertForm({ ...transfertForm, reference: v, sourceId: referenceChanged ? '' : transfertForm.sourceId })
                if (referenceChanged) {
                  setTransfertStock(null)
                  setTransfertStockError(null)
                }
                setTransfertFormError(null)
              }}
              placeholder="Ex: REF-1234"
              required
            />
            <div className="form-group">
              <label className="form-label" htmlFor="transfert-source">Stock de départ</label>
              <select
                id="transfert-source"
                name="source_emplacement_id"
                value={transfertForm.sourceId}
                onChange={(event) => setTransfertForm({ ...transfertForm, sourceId: event.target.value })}
                className="form-select"
                disabled={!currentTransfertStock || transfertStockInconsistent || savingTransfert}
                aria-describedby="transfert-stock-status"
                required
              >
                <option value="">Sélectionnez le stock de départ</option>
                {transfertSources.map((item) => (
                  <option key={item.id} value={item.id}>{item.label} — {item.quantite} unité(s)</option>
                ))}
              </select>
              <p id="transfert-stock-status" className="form-hint" role="status">
                {transfertStockLoading
                  ? 'Chargement du stock disponible...'
                  : currentTransfertStockError
                    ? `Impossible de charger le stock : ${currentTransfertStockError}`
                    : transfertStockInconsistent
                      ? 'La répartition du stock est incohérente. Faites vérifier les quantités avant de transférer.'
                      : !transfertReference
                        ? "Saisissez la référence de l'article."
                        : currentTransfertStock && transfertSources.length === 0
                          ? 'Aucun stock disponible pour cet article.'
                          : transfertSource
                            ? `${transfertSource.quantite} unité(s) disponible(s) au départ.`
                            : 'Choisissez l’emplacement ou le stock non affecté à déplacer.'}
              </p>
            </div>
            <FormInput
              label="Quantité à transférer"
              name="transfert-quantite"
              type="number"
              min="1"
              step="1"
              max={transfertSource?.quantite ?? 2_147_483_647}
              value={transfertForm.quantite}
              onChange={(_, v) => setTransfertForm({ ...transfertForm, quantite: v })}
              required
            />
            <div className="form-group">
              <label className="form-label" htmlFor="transfert-destination">Emplacement destination</label>
              <select
                id="transfert-destination"
                name="emplacement_id"
                value={transfertForm.destinationId ?? ''}
                onChange={(e) =>
                  setTransfertForm({ ...transfertForm, destinationId: e.target.value || null })
                }
                className="form-select"
                disabled={savingTransfert}
              >
                <option value="">Aucun (stock non affecté)</option>
                {emplacements.filter((item) => item.actif).map((e) => (
                  <option key={e.id} value={e.id}>{e.chemin}</option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setOpenTransfertModal(false)}>
                Annuler
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={savingTransfert || !canTransfer || offline || !transfertSource || transfertStockLoading || transfertStockInconsistent}
              >
                {savingTransfert ? 'Transfert en cours...' : 'Effectuer le transfert'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog {...dialogProps} />
    </PageLayout>
  )
}
