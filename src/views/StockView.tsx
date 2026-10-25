import { useCallback, useEffect, useState } from 'react'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { Icon } from '../components/Icon'
import { useStock, type StockFilter } from '../hooks/useStock'
import { api, isAbortError, toErrorMessage } from '../services/api'
import type { ApiStockEmplacement } from '../services/contracts'
import type { Article } from '../types'
import { FormInput } from '../components/forms/FormFields'

const filters: Array<{ value: StockFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'low', label: 'Sous le seuil' },
  { value: 'ok', label: 'Stock OK' },
]

type EmplacementForm = {
  code: string
  libelle: string
  niveau: 'allee' | 'etagere' | 'place'
  capacite: string
  parentId: string | null
}

type TransfertForm = {
  reference: string
  quantite: string
  destinationId: string | null
}

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
  const { dialogProps, confirm } = useConfirm()
  const [savingEdit, setSavingEdit] = useState(false)

  /* ---------- Emplacements ---------- */
  const [emplacements, setEmplacements] = useState<ApiStockEmplacement[]>([])
  const [emplacementsLoading, setEmplacementsLoading] = useState(true)
  const [emplacementsError, setEmplacementsError] = useState<string | null>(null)

  /* ---------- Modals ---------- */
  const [openEmplacementModal, setOpenEmplacementModal] = useState(false)
  const [emplacementModalMode, setEmplacementModalMode] = useState<'create' | 'edit'>('create')
  const [emplacementModalItem, setEmplacementModalItem] = useState<ApiStockEmplacement | null>(null)
  const [emplacementForm, setEmplacementForm] = useState<EmplacementForm>({
    code: '',
    libelle: '',
    niveau: 'place',
    capacite: '',
    parentId: null,
  })
  const [emplacementFormError, setEmplacementFormError] = useState<string | null>(null)
  const [savingEmplacement, setSavingEmplacement] = useState(false)

  const [openTransfertModal, setOpenTransfertModal] = useState(false)
  const [transfertForm, setTransfertForm] = useState<TransfertForm>({
    reference: '',
    quantite: '1',
    destinationId: null,
  })
  const [transfertFormError, setTransfertFormError] = useState<string | null>(null)
  const [savingTransfert, setSavingTransfert] = useState(false)

  /* ---------- Chargement des emplacements ---------- */
  const loadEmplacements = useCallback(() => {
    const controller = new AbortController()
    api
      .get<ApiStockEmplacement[]>('/emplacements', { signal: controller.signal })
      .then((emplacements) => {
        setEmplacements(emplacements)
        setEmplacementsLoading(false)
        setEmplacementsError(null)
      })
      .catch((err) => {
        if (isAbortError(err)) return
        setEmplacementsError(toErrorMessage(err))
        setEmplacementsLoading(false)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    loadEmplacements()
  }, [loadEmplacements])

  /* ---------- Raccourcis clavier ---------- */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (openEmplacementModal) setOpenEmplacementModal(false)
        if (openTransfertModal) setOpenTransfertModal(false)
        if (editing) cancelEditing()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openEmplacementModal, openTransfertModal, editing, cancelEditing])

  /* ---------- Helpers ---------- */
  const niveauLabel = (n: string) => (n === 'allee' ? 'Allée' : n === 'etagere' ? 'Etagère' : 'Place')
  const emplacementDepth = (n: string) => (n === 'allee' ? 0 : n === 'etagere' ? 1 : 2)
  const niveauColor = (n: string) =>
    n === 'allee' ? 'status-emplacement-allee' : n === 'etagere' ? 'status-emplacement-etagere' : 'status-emplacement-place'

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

  /* ---------- Formulaire emplacement ---------- */
  const resetEmplacementForm = () => {
    setEmplacementForm({ code: '', libelle: '', niveau: 'place', capacite: '', parentId: null })
    setEmplacementFormError(null)
  }

  const openEmplacementEdit = (item: ApiStockEmplacement) => {
    setEmplacementModalMode('edit')
    setEmplacementModalItem(item)
    setEmplacementForm({
      code: item.code,
      libelle: item.libelle ?? '',
      niveau: item.niveau as 'allee' | 'etagere' | 'place',
      capacite: String(item.capacite ?? ''),
      parentId: item.parentId ? String(item.parentId) : null,
    })
    setEmplacementFormError(null)
    setOpenEmplacementModal(true)
  }

  const handleEmplacementSave = async () => {
    setEmplacementFormError(null)
    const { code, libelle, niveau, capacite, parentId } = emplacementForm

    if (!code.trim()) {
      setEmplacementFormError('Le code est obligatoire')
      return
    }
    if (!libelle.trim()) {
      setEmplacementFormError('Le libelle est obligatoire')
      return
    }
    const capNum = Number(capacite)
    if (capacite && (isNaN(capNum) || capNum < 0)) {
      setEmplacementFormError('La capacite doit etre un nombre positif')
      return
    }

    setSavingEmplacement(true)
    try {
      if (emplacementModalMode === 'create') {
        await api.post('/emplacements', {
          code: code.trim(),
          libelle: libelle.trim(),
          niveau,
          capacite: capNum || null,
          parent_id: parentId || null,
        })
        toast.success(`Emplacement "${code}" cree`)
      } else if (emplacementModalItem) {
        await api.put(`/emplacements/${emplacementModalItem.id}`, {
          code: code.trim(),
          libelle: libelle.trim(),
          niveau,
          capacite: capNum || null,
          parent_id: parentId || null,
        })
        toast.success(`Emplacement "${code}" mis a jour`)
      }
      setOpenEmplacementModal(false)
      loadEmplacements()
    } catch (err) {
      const msg = isAbortError(err) ? '' : toErrorMessage(err)
      setEmplacementFormError(msg || 'Echec de l enregistrement')
    } finally {
      setSavingEmplacement(false)
    }
  }

  const handleEmplacementDelete = (item: ApiStockEmplacement) => {
    confirm(
      `Supprimer l'emplacement ${item.code}`,
      `Etes-vous sur de vouloir supprimer "${item.chemin}" ? Cette action est definitive et supprimera aussi les emplacements enfants.`,
      async () => {
        try {
          await api.delete(`/emplacements/${item.id}`)
          toast.success(`Emplacement ${item.code} supprime`)
          loadEmplacements()
        } catch (err) {
          toast.error(toErrorMessage(err) || 'Echec de la suppression')
        }
      },
    )
  }

  /* ---------- Transfert ---------- */
  const openTransfert = (row: Article) => {
    setTransfertForm({ reference: row.reference, quantite: '1', destinationId: null })
    setTransfertFormError(null)
    setOpenTransfertModal(true)
  }

  const resetTransfertForm = () => {
    setTransfertForm({ reference: '', quantite: '1', destinationId: null })
    setTransfertFormError(null)
  }

  const handleTransfertSave = async () => {
    setTransfertFormError(null)
    const { reference, quantite, destinationId } = transfertForm

    if (!reference.trim()) {
      setTransfertFormError('La reference est obligatoire')
      return
    }
    const q = Number(quantite)
    if (isNaN(q) || q <= 0) {
      setTransfertFormError('La quantite doit etre un nombre positif')
      return
    }

    setSavingTransfert(true)
    try {
      await api.post(`/articles/${reference.trim()}/transfert`, {
        quantite: q,
        destination_id: destinationId || null,
      })
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
          <button className="action-btn transfert" onClick={() => openTransfert(row)} title="Transférer" aria-label={`Transférer ${row.reference}`}>
            <Icon name="truck" size="sm" />
          </button>
          <button className="action-btn delete" onClick={() => handleDelete(row)} title="Supprimer" aria-label={`Supprimer ${row.reference}`} disabled={saving}>
            <Icon name="trash" size="sm" />
          </button>
        </div>
      ),
    },
  ]

  const emplacementColumns: ColumnDef<ApiStockEmplacement>[] = [
    {
      key: 'chemin',
      header: 'EMPLACEMENT',
      sortable: true,
      sortValue: (row) => row.chemin,
      render: (row) => (
        <div className="emplacement-row">
          <span className="emplacement-indent" style={{ paddingLeft: emplacementDepth(row.niveau) * 18 }}></span>
          <Icon name="box" size="sm" />
          <span className="emplacement-chemin">{row.chemin}</span>
        </div>
      ),
    },
    {
      key: 'niveau',
      header: 'NIVEAU',
      render: (row) => (
        <span className={`status-badge ${niveauColor(row.niveau)}`}>{niveauLabel(row.niveau)}</span>
      ),
    },
    {
      key: 'quantite',
      header: 'STOCK',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.quantite,
      render: (row) => row.quantite,
    },
    {
      key: 'nombreReferences',
      header: 'REFERENCES',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.nombreReferences,
      render: (row) => row.nombreReferences,
    },
    {
      key: 'capacite',
      header: 'CAPACITE',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.capacite,
      render: (row) => (row.capacite != null ? row.capacite : '-'),
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '110px',
      render: (row) => (
        <div className="actions-cell">
          <button className="action-btn edit" onClick={() => openEmplacementEdit(row)} title="Modifier" aria-label={`Modifier ${row.code}`}>
            <Icon name="edit" size="sm" />
          </button>
          <button className="action-btn delete" onClick={() => handleEmplacementDelete(row)} title="Supprimer" aria-label={`Supprimer ${row.code}`}>
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
          <button
            className="primary-button"
            onClick={() => {
              resetEmplacementForm()
              setEmplacementModalMode('create')
              setEmplacementModalItem(null)
              setOpenEmplacementModal(true)
            }}
            aria-label="Nouvel emplacement"
          >
            <Icon name="plus" size="sm" /> Nouvel emplacement
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              resetTransfertForm()
              setOpenTransfertModal(true)
            }}
            aria-label="Transfert d'article"
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

      {/* Erreur de chargement emplacements */}
      {emplacementsError && (
        <div className="stock-alert error">
          <Icon name="alert" size="sm" />
          <span>Impossible de charger les emplacements : {emplacementsError}</span>
        </div>
      )}

      <div className="stock-grid">
        {/* Panel gauche : Articles */}
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

        {/* Panel droit : Emplacements */}
        <section className="stock-panel">
          <div className="panel-header">
            <h3>Emplacements</h3>
          </div>

          {emplacementsLoading ? (
            <div className="stock-empty">
              <Icon name="bell" size="lg" />
              <p>Chargement des emplacements...</p>
            </div>
          ) : emplacements.length === 0 ? (
            <div className="stock-empty">
              <Icon name="layers" size="lg" />
              <p>Aucun emplacement cree</p>
              <p className="stock-empty-hint">
                Creez une allee, puis des etageres et des places pour organiser votre stock.
              </p>
            </div>
          ) : (
            <DataTable
              columns={emplacementColumns}
              rows={emplacements}
              rowKey={(r) => r.id.toString()}
              defaultSort={{ key: 'chemin', direction: 'asc' }}
              emptyMessage="Aucun emplacement."
              loading={false}
              caption="Liste des emplacements de stockage"
            />
          )}
        </section>
      </div>

      {/* Modal : Creation/edition d'emplacement */}
      <div
        className="modal-overlay"
        onMouseDown={() => setOpenEmplacementModal(false)}
        style={{ display: openEmplacementModal ? 'block' : 'none' }}
      >
        <div
          className="modal emplacement-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emplacement-modal-title"
          aria-describedby="emplacement-modal-desc"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2 id="emplacement-modal-title">
            {emplacementModalMode === 'create' ? 'Nouvel emplacement' : 'Modifier l emplacement'}
          </h2>
          <p id="emplacement-modal-desc" className="modal-desc">
            {emplacementModalMode === 'create'
              ? 'Creez un emplacement (allee, etagere ou place) pour ranger vos articles.'
              : 'Modifiez les informations de cet emplacement.'}
          </p>

          {emplacementFormError && (
            <div className="stock-alert error">
              <Icon name="alert" size="sm" />
              <span>{emplacementFormError}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleEmplacementSave() }} className="modal-form">
            <FormInput
              label="Code"
              name="code"
              value={emplacementForm.code}
              onChange={(_, v) => setEmplacementForm({ ...emplacementForm, code: v })}
              placeholder="Ex: A-01-05"
              required
            />
            <FormInput
              label="Libelle"
              name="libelle"
              value={emplacementForm.libelle}
              onChange={(_, v) => setEmplacementForm({ ...emplacementForm, libelle: v })}
              placeholder="Ex: Allee A - Etagere 1 - Place 5"
              required
            />
            <div className="form-group">
              <label className="form-label">Niveau</label>
              <select
                value={emplacementForm.niveau}
                onChange={(e) =>
                  setEmplacementForm({ ...emplacementForm, niveau: e.target.value as 'allee' | 'etagere' | 'place' })
                }
                className="form-select"
              >
                <option value="allee">Allée</option>
                <option value="etagere">Etagère</option>
                <option value="place">Place</option>
              </select>
              <p className="form-hint">
                Une allee est racine. Une etagere depend d'une allee. Une place depend d'une etagere.
              </p>
            </div>
            <FormInput
              label="Capacite (unites)"
              name="capacite"
              type="number"
              min="0"
              value={emplacementForm.capacite}
              onChange={(_, v) => setEmplacementForm({ ...emplacementForm, capacite: v })}
              hint="Nombre maximal d unites pouvant etre stockees"
            />
            <div className="form-group">
              <label className="form-label">Emplacement parent</label>
              <select
                value={emplacementForm.parentId ?? ''}
                onChange={(e) =>
                  setEmplacementForm({ ...emplacementForm, parentId: e.target.value || null })
                }
                className="form-select"
              >
                <option value="">Aucun (racine)</option>
                {emplacements
                  .filter((e) => (emplacementModalItem ? e.id !== emplacementModalItem.id : true))
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.chemin}</option>
                  ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setOpenEmplacementModal(false)}>
                Annuler
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={savingEmplacement}
              >
                {savingEmplacement
                  ? 'Enregistrement...'
                  : emplacementModalMode === 'create'
                    ? 'Creer'
                    : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal : Transfert d'article */}
      <div
        className="modal-overlay"
        onMouseDown={() => setOpenTransfertModal(false)}
        style={{ display: openTransfertModal ? 'block' : 'none' }}
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
            Deplacez une quantite d'un article vers un nouvel emplacement.
          </p>

          {transfertFormError && (
            <div className="stock-alert error">
              <Icon name="alert" size="sm" />
              <span>{transfertFormError}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleTransfertSave() }} className="modal-form">
            <FormInput
              label="Reference de l'article"
              name="reference"
              value={transfertForm.reference}
              onChange={(_, v) => setTransfertForm({ ...transfertForm, reference: v })}
              placeholder="Ex: REF-1234"
              required
            />
            <FormInput
              label="Quantite a transferer"
              name="quantite"
              type="number"
              min="1"
              value={transfertForm.quantite}
              onChange={(_, v) => setTransfertForm({ ...transfertForm, quantite: v })}
              required
            />
            <div className="form-group">
              <label className="form-label">Emplacement destination</label>
              <select
                value={transfertForm.destinationId ?? ''}
                onChange={(e) =>
                  setTransfertForm({ ...transfertForm, destinationId: e.target.value || null })
                }
                className="form-select"
              >
                <option value="">Aucun (stock non alloue)</option>
                {emplacements.map((e) => (
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
                disabled={savingTransfert}
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
