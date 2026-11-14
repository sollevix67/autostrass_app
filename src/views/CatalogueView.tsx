import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { Icon } from '../components/Icon'
import { ErrorSummary } from '../components/forms/ErrorSummary'
import { FormInput, FormSelect, FormTextarea } from '../components/forms/FormFields'
import { EMPTY_ARTICLE, useCatalogue } from '../hooks/useCatalogue'
import { articleSchema } from '../schemas'
import type { Article } from '../types'
import type { FieldRegister } from '../components/forms/FormFields'
import { useRemoteValue } from '../hooks/useRemoteValue'
import type { Referentiel, SousCategorie } from '../schemas/parametres'

interface Tva {
  id: number
  taux: number
  libelle: string
  defaut: boolean
  actif: boolean
  createdAt: string
  updatedAt: string
}

const currency = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CatalogueView() {
  const categories = useRemoteValue<Referentiel[]>('/categories')
  const sousCategories = useRemoteValue<SousCategorie[]>('/sous-categories')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  const articleDialogRef = useRef<HTMLDialogElement>(null)
  const pending = useRef(false)
  const { articles, loading, saving, error, offline, reload, create, update, remove } = useCatalogue()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const taxes = useRemoteValue<Tva[]>('/tva')

  const FIELD_LABELS = {
    sousCategorieId: 'Sous-catégorie',
    reference: 'Référence',
    designation: 'Désignation',
    category: 'Catégorie',
    prixUnitaireHT: 'Prix unitaire HT',
    tvaId: 'TVA',
    ean13: 'EAN13',
    delaiDisponibilite: 'Délai de disponibilité (jours)',
    forcerSurCommande: 'Forcer sur commande',
    emplacement: 'EMPLACEMENT',
    description: 'Description',
    quantite: 'Quantité',
    minimum: 'Seuil minimum',
  } as const

  const FIELD_ORDER = Object.keys(FIELD_LABELS)

  const {
    register: rhfRegister,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(articleSchema) as any,
    mode: 'onSubmit',
    defaultValues: EMPTY_ARTICLE,
  })

  /**
   * `register` de RHF est type sur les noms de champs du formulaire (contravariant),
   * ce que nos composants generiques ne peuvent pas declarer. On elargit donc
   * l'appel a `string` ici : le nom transmis reste identique a l'attribut `name`.
   */
  const register = rhfRegister as unknown as FieldRegister

  /** Reference en cours d'edition ; `null` = mode creation. */
  const isEditing = editingId !== null
  const busy = saving || isSubmitting
  const category = watch('category')
  const subId = watch('sousCategorieId')
  const selectedCategory = categories.data?.find((item) => item.code === category)

  useEffect(() => {
    const dialog = articleDialogRef.current
    if (!dialogOpen || !dialog) return

    const trigger = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    setFocus(isEditing ? 'designation' : 'reference')
    document.body.style.overflow = 'hidden'

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [dialogOpen, isEditing, setFocus])

  const handleCreate = () => {
    if (busy || pending.current) return
    reset(EMPTY_ARTICLE)
    setEditingId(null)
    setSubmitFailed(false)
    setDialogOpen(true)
  }

  const closeArticleDialog = useCallback(() => {
    if (busy || pending.current) return
    setDialogOpen(false)
    setEditingId(null)
    setSubmitFailed(false)
    reset(EMPTY_ARTICLE)
  }, [busy, reset])

  useEffect(() => {
    if (!dialogOpen) return
    // Compatibilité avec les aperçus relayant keydown sans cancel natif.
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      closeArticleDialog()
    }
    document.addEventListener('keydown', onEscape, true)
    return () => document.removeEventListener('keydown', onEscape, true)
  }, [dialogOpen, closeArticleDialog])

  const onSubmit = handleSubmit(async (values) => {
    if (saving || pending.current || !categories.data || !sousCategories.data || !taxes.data || categories.error || sousCategories.error || taxes.error || offline) return
    pending.current = true
    setSubmitFailed(false)
    try {
      // Le schéma transforme la référence en majuscules ; on aligne l'état local.
      const payload = { ...values, reference: editingId ?? values.reference, description: values.description ?? null, emplacement: values.emplacement ?? null } as any
      const saved = isEditing ? await update(payload) : await create(payload)

      if (!saved) {
        setSubmitFailed(true)
        toast.error("L'enregistrement a echoue. Verifiez la connexion a l'API.")
        return
      }

      toast.success(
        isEditing
          ? `Article ${payload.reference} mis a jour.`
          : `Article ${payload.reference} cree.`,
      )
      reset(EMPTY_ARTICLE)
      setEditingId(null)
      setDialogOpen(false)
    } finally {
      pending.current = false
    }
  })

  /** Ouvre le formulaire avec les valeurs de l'article sélectionné. */
  const handleEdit = (article: Article) => {
    if (busy || pending.current) return
    setEditingId(article.reference)
    reset({
      ...EMPTY_ARTICLE,
      ...article,
      reference: article.reference,
      designation: article.designation,
      category: article.category,
      prixUnitaireHT: article.prixUnitaireHT,
      quantite: article.quantite,
      minimum: article.minimum,
      emplacement: article.emplacement,
      description: article.description ?? '',
    })
    setSubmitFailed(false)
    setDialogOpen(true)
  }

  const handleDelete = (article: Article) => {
    confirm(
      `Supprimer ${article.reference} ?`,
      <>
        L'article <strong>{article.designation}</strong> et ses mouvements de stock seront
        definitivement supprimes. Cette action est irreversible.
      </>,
      async () => {
        const ok = await remove(article.reference)
        if (ok) {
          toast.success(`Article ${article.reference} supprime.`)
          if (editingId === article.reference) { reset(EMPTY_ARTICLE); setEditingId(null) }
        } else {
          toast.error(`La suppression de ${article.reference} a echoue.`)
        }
      },
    )
  }

  const columns: ColumnDef<Article>[] = [
    {
      key: 'reference',
      header: 'RÉFÉRENCE',
      sortable: true,
      sortValue: (row) => row.reference,
      render: (row) => <b className="reference">{row.reference}</b>,
    },
    { key: 'designation',     header: 'DÉSIGNATION', sortable: true, sortValue: (row) => row.designation, render: (row) => row.designation },
    { key: 'category', header: 'CATEGORIE', sortable: true, sortValue: (row) => row.category, render: (row) => categories.data?.find((item) => item.code === row.category)?.libelle ?? row.category },
    { key: 'sousCategorie', header: 'SOUS-CATÉGORIE', render: (row) => sousCategories.data?.find((item) => item.id === row.sousCategorieId)?.libelle ?? '—' },
    {
      key: 'prixUnitaireHT',
      header: 'PRIX HT',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.prixUnitaireHT,
      render: (row) => `${currency.format(row.prixUnitaireHT)} €`,
    },
    {
      key: 'prixUnitaireTTC',
      header: 'PRIX TTC',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.prixUnitaireTTC,
      render: (row) => `${currency.format(row.prixUnitaireTTC)} €`,
    },
    {
      key: 'tvaId',
      header: 'TVA',
      align: 'center',
      sortable: true,
      sortValue: (row) => row.tvaId,
      render: (row) => <span>TVA {row.tvaId}</span>,
    },
    {
      key: 'ean13',
      header: 'EAN13',
      sortable: false,
      sortValue: (row) => (row.ean13 ?? '') as string,
      render: (row) => row.ean13 ?? '',
    },
    {
      key: 'delaiDisponibilite',
      header: 'DISPO (J)',
      align: 'center',
      sortable: true,
      sortValue: (row) => row.delaiDisponibilite,
      render: (row) => row.delaiDisponibilite,
    },
    {
      key: 'forcerSurCommande',
      header: 'FORCER SC',
      align: 'center',
      sortable: true,
      sortValue: (row) => row.forcerSurCommande ? 1 : 0,
      render: (row) => (row.forcerSurCommande ? 'Oui' : 'Non'),
    },
    {
      key: 'quantite',
      header: 'STOCK',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.quantite,
      render: (row) => <b>{row.quantite}</b>,
    },
    {
      key: 'minimum',
      header: 'SEUIL',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.minimum,
      render: (row) => row.minimum,
    },
    { key: 'emplacement', header: 'EMPLACEMENT', sortable: true, sortValue: (row) => row.emplacement ?? '', render: (row) => <span className="location-tag">{row.emplacement ?? '-'}</span> },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '92px',
      render: (row) => (
        <div className="actions-cell">
          <button type="button" className="action-btn edit" disabled={busy} onClick={() => handleEdit(row)} title="Modifier" aria-label={`Modifier ${row.reference}`} aria-haspopup="dialog">
            <Icon name="edit" size="sm" />
          </button>
          <button type="button" className="action-btn delete" onClick={() => handleDelete(row)} title="Supprimer" aria-label={`Supprimer ${row.reference}`} disabled={saving}>
            <Icon name="trash" size="sm" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageLayout
      eyebrow="CATALOGUE"
      title="Gestion du catalogue"
      description="Ajouter, modifier ou supprimer des articles du catalogue."
      actions={
        <>
          <button type="button" className="secondary-button" disabled={loading || busy} onClick={reload}>
            <Icon name="rotate-ccw" size="sm" /> Actualiser
          </button>
          <button type="button" className="primary-button" disabled={busy} onClick={handleCreate} aria-haspopup="dialog">
            <Icon name="plus" size="sm" /> Nouvel article
          </button>
        </>
      }
    >
      {offline && (
        <p className="info-banner" role="status">
          API catalogue indisponible : l’enregistrement des articles est suspendu.
        </p>
      )}

      {error && !dialogOpen && <p className="error-banner" role="alert">{error}</p>}

      <dialog
        closedby="closerequest"
        ref={articleDialogRef}
        className="modal article-modal"
        aria-labelledby="article-dialog-title"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]',
          )
          const first = controls[0]
          const last = controls[controls.length - 1]
          if (!first) {
            event.preventDefault()
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }}
        onCancel={(event) => {
          event.preventDefault()
          closeArticleDialog()
        }}
      >
        <div className="article-modal-header">
          <h2 id="article-dialog-title">{isEditing ? `Modifier ${editingId}` : 'Nouvel article'}</h2>
          <button type="button" className="action-btn" aria-label="Fermer la fenêtre" onClick={closeArticleDialog} disabled={busy}>
            <Icon name="close" size="lg" />
          </button>
        </div>
        {offline && <p className="info-banner" role="status">L'enregistrement nécessite une connexion au serveur.</p>}
        {offline && <button type="button" className="secondary-button" disabled={loading || busy} onClick={reload}>Actualiser la connexion</button>}
        {submitFailed && error && <p className="error-banner" role="alert">{error}</p>}

        <form onSubmit={onSubmit} noValidate aria-busy={busy}>
          <ErrorSummary errors={errors} labels={FIELD_LABELS} order={FIELD_ORDER} />

          <fieldset className="article-form-fields" disabled={busy}>
            <legend className="sr-only">Informations de l'article</legend>
            <div className="form-grid-2">
              <FormInput
                label="Référence"
                name="reference"
                readOnly={isEditing}
                register={register}
                error={errors.reference?.message as string | undefined}
                required
                placeholder="ex: PLA-2841"
                hint={isEditing ? 'La référence reste stable après création.' : 'Lettres, chiffres, point, tiret, slash et underscore'}
              />
              <FormInput
                label="Désignation"
                name="designation"
                register={register}
                error={errors.designation?.message && typeof errors.designation.message === 'string' ? errors.designation.message : undefined}
                required
                placeholder="Nom de l'article"
              />
              <FormSelect
                label="Catégorie"
                name="category"
                options={(categories.data ?? []).filter((item) => item.actif || item.code === category).map((item) => ({ value: item.code, label: `${item.libelle}${item.actif ? '' : ' (inactive)'}` }))}
                value={category}
                onChange={(_, value) => { setValue('category', value); setValue('sousCategorieId', null) }}
                error={errors.category?.message && typeof errors.category.message === 'string' ? errors.category.message : undefined}
                required
              />
              <FormSelect label="Sous-catégorie" name="sousCategorieId" placeholder="Aucune sous-catégorie" value={subId == null ? '' : String(subId)}
                options={(sousCategories.data ?? []).filter((item) => item.categorieId === selectedCategory?.id && (item.actif || item.id === subId)).map((item) => ({ value: String(item.id), label: item.libelle }))}
                onChange={(_, value) => setValue('sousCategorieId', value ? Number(value) : null)} />
              <FormSelect
                label="TVA"
                name="tvaId"
                options={(taxes.data ?? []).map(tva => ({ value: tva.id.toString(), label: `TVA ${tva.taux}%` }))}
                register={register}
                error={errors.tvaId?.message && typeof errors.tvaId.message === 'string' ? errors.tvaId.message : undefined}
                required
              />
              <FormInput
                label="EAN13"
                name="ean13"
                register={register}
                error={errors.ean13?.message && typeof errors.ean13.message === 'string' ? errors.ean13.message : undefined}
                placeholder="ex: 3663456008006"
              />
              <FormInput
                label="Délai de disponibilité (jours)"
                name="delaiDisponibilite"
                type="number"
                min="0"
                register={register}
                error={errors.delaiDisponibilite?.message && typeof errors.delaiDisponibilite.message === 'string' ? errors.delaiDisponibilite.message : undefined}
                required
              />
              <FormInput
                label="Forcer sur commande"
                name="forcerSurCommande"
                type="checkbox"
                register={register}
              />
              <FormInput
                label="Emplacement"
                name="emplacement"
                register={register}
                error={errors.emplacement?.message && typeof errors.emplacement.message === 'string' ? errors.emplacement.message : undefined}
                placeholder="ex: A-03 / E-02"
              />
              <FormInput
                label="Prix unitaire HT (€)"
                name="prixUnitaireHT"
                type="number"
                step="0.01"
                min="0"
                register={register}
                error={errors.prixUnitaireHT ? String(errors.prixUnitaireHT.message) : undefined}
                required
              />
              <FormInput
                label="Quantité en stock"
                name="quantite"
                type="number"
                min="0"
                register={register}
                error={errors.quantite ? String(errors.quantite.message) : undefined}
                required
              />
              <FormInput
                label="Seuil minimum"
                name="minimum"
                type="number"
                min="0"
                register={register}
                error={errors.minimum?.message}
                required
                hint="Alerte de réapprovisionnement"
              />
              <FormTextarea
                label="Description"
                name="description"
                rows={2}
                register={register}
                error={errors.description?.message}
                placeholder="Optionnel"
              />
            </div>

            <div className="form-actions">
              <button type="button" className="secondary-button article-form-reset" onClick={() => {
                const article = articles.find((item) => item.reference === editingId)
                if (article) handleEdit(article)
                else reset(EMPTY_ARTICLE)
              }}>
                {isEditing ? 'Rétablir' : 'Effacer'}
              </button>
              <button type="button" className="secondary-button" onClick={closeArticleDialog}>Annuler</button>
              <button type="submit" className="primary-button" disabled={busy || offline || categories.loading || sousCategories.loading || taxes.loading || Boolean(categories.error || sousCategories.error || taxes.error)}>
                <Icon name={isEditing ? 'check' : 'plus'} size="sm" /> {busy ? 'Enregistrement…' : isEditing ? "Enregistrer l'article" : "Créer l'article"}
              </button>
            </div>
          </fieldset>
          {(categories.error || sousCategories.error) && <p className="error-banner" role="alert">Impossible de charger les catégories. <button type="button" className="link-button" onClick={() => { categories.reload(); sousCategories.reload() }}>Réessayer</button></p>}
          {taxes.error && <p className="error-banner" role="alert">Impossible de charger les taux de TVA. <button type="button" className="link-button" onClick={taxes.reload}>Réessayer</button></p>}
        </form>
      </dialog>

      <div className="form-card">
        <h2>Liste des articles {saving && <span className="saving-indicator">· synchronisation...</span>}</h2>
        <DataTable
          columns={columns}
          rows={articles}
          rowKey={(row) => row.reference}
          loading={loading}
          loadingMessage="Chargement du catalogue..."
          emptyMessage="Aucun article. Cliquez sur « Nouvel article » pour créer le premier."
          isRowActive={(row) => row.reference === editingId}
          defaultSort={{ key: 'reference', direction: 'asc' }}
          caption="Liste des articles du catalogue"
        />
      </div>

      <ConfirmDialog
        {...dialogProps}
        confirmLabel="Supprimer"
        destructive
        cancelLabel="Annuler"
      />
    </PageLayout>
  )
}
