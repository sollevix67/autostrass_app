import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { ErrorSummary } from '../components/forms/ErrorSummary'
import { FormInput, FormSelect, FormTextarea, type FieldRegister } from '../components/forms/FormFields'
import { EMPTY_ARTICLE, useCatalogue } from '../hooks/useCatalogue'
import { articleSchema, type ArticleFormValues, type ArticleFormOutput } from '../schemas'
import type { Article } from '../types'

const categories = [
  { value: 'freins', label: 'Freins' },
  { value: 'filtres', label: 'Filtres' },
  { value: 'batteries', label: 'Batteries' },
  { value: 'huiles', label: 'Huiles' },
  { value: 'pneus', label: 'Pneus' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'carrosserie', label: 'Carrosserie' },
]

const currency = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const FIELD_LABELS = {
  reference: 'Référence',
  designation: 'Désignation',
  category: 'Catégorie',
  prixUnitaireHT: 'Prix unitaire HT',
  quantite: 'Quantité',
  minimum: 'Seuil minimum',
  emplacement: 'Emplacement',
  description: 'Description',
} as const

const FIELD_ORDER = Object.keys(FIELD_LABELS)

export default function CatalogueView() {
  const { articles, loading, saving, error, offline, create, update, remove } = useCatalogue()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()

  const {
    register: rhfRegister,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    mode: 'onBlur',
    defaultValues: EMPTY_ARTICLE,
  })

  /**
   * `register` de RHF est type sur les noms de champs du formulaire (contravariant),
   * ce que nos composants generiques ne peuvent pas declarer. On elargit donc
   * l'appel a `string` ici : le nom transmis reste identique a l'attribut `name`.
   */
  const register = rhfRegister as unknown as FieldRegister

  /** Reference en cours d'edition ; `null` = mode creation. */
  const editingReference = watch('reference')
  const isEditing = editingReference.length > 0

  const onSubmit = handleSubmit(async (values) => {
    // Le schema transforme la reference en majuscules ; on aligne l'etat local.
    const payload = { ...values } as ArticleFormOutput
    const saved = isEditing ? await update(payload) : await create(payload)

    if (!saved) {
      toast.error("L'enregistrement a echoue. Verifiez la connexion a l'API.")
      return
    }

    toast.success(
      isEditing
        ? `Article ${payload.reference} mis a jour.`
        : offline
          ? `Article ${payload.reference} ajoute en local (non persiste).`
          : `Article ${payload.reference} cree.`,
    )
    reset(EMPTY_ARTICLE)
  })

  /** Charge un article dans le formulaire et place le focus sur la reference. */
  const handleEdit = (article: Article) => {
    reset({
      reference: article.reference,
      designation: article.designation,
      category: article.category,
      prixUnitaireHT: article.prixUnitaireHT,
      quantite: article.quantite,
      minimum: article.minimum,
      emplacement: article.emplacement,
      description: article.description ?? '',
    })
    document.getElementById('reference')?.focus()
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
          if (editingReference === article.reference) reset(EMPTY_ARTICLE)
        } else {
          toast.error(`La suppression de ${article.reference} a echoue.`)
        }
      },
    )
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
    { key: 'category', header: 'CATEGORIE', sortable: true, sortValue: (row) => row.category, render: (row) => row.category },
    {
      key: 'prixUnitaireHT',
      header: 'PRIX HT',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.prixUnitaireHT,
      render: (row) => `${currency.format(row.prixUnitaireHT)} €`,
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
    { key: 'emplacement', header: 'EMPLACEMENT', sortable: true, sortValue: (row) => row.emplacement, render: (row) => <span className="location-tag">{row.emplacement}</span> },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '92px',
      render: (row) => (
        <div className="actions-cell">
          <button type="button" className="action-btn edit" onClick={() => handleEdit(row)} title="Charger dans le formulaire" aria-label={`Modifier ${row.reference}`}>
            ✎
          </button>
          <button type="button" className="action-btn delete" onClick={() => handleDelete(row)} title="Supprimer" aria-label={`Supprimer ${row.reference}`} disabled={saving}>
            🗑
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
        isEditing ? (
          <button type="button" className="secondary-button" onClick={() => reset(EMPTY_ARTICLE)}>
            Annuler la modification
          </button>
        ) : undefined
      }
    >
      {offline && (
        <p className="info-banner" role="status">
          API catalogue indisponible : les modifications restent en memoire et seront perdues au rechargement.
        </p>
      )}

      <form className="form-card" onSubmit={onSubmit} noValidate>
        <h2>{isEditing ? `Modifier ${editingReference}` : 'Nouvel article'}</h2>

        <ErrorSummary errors={errors} labels={FIELD_LABELS} order={FIELD_ORDER} />

        <div className="form-grid-2">
          <FormInput
            label="Référence"
            name="reference"
            register={register}
            error={errors.reference?.message}
            required
            placeholder="ex: PLA-2841"
            hint="Lettres, chiffres, point, tiret, slash et undescore"
          />
          <FormInput
            label="Désignation"
            name="designation"
            register={register}
            error={errors.designation?.message}
            required
            placeholder="Nom de l'article"
          />
          <FormSelect
            label="Catégorie"
            name="category"
            options={categories}
            register={register}
            error={errors.category?.message}
            required
          />
          <FormInput
            label="Emplacement"
            name="emplacement"
            register={register}
            error={errors.emplacement?.message}
            required
            placeholder="ex: A-03 / E-02"
          />
          <FormInput
            label="Prix unitaire HT (€)"
            name="prixUnitaireHT"
            type="number"
            step="0.01"
            min="0"
            register={register}
            error={errors.prixUnitaireHT?.message}
            required
          />
          <FormInput
            label="Quantité en stock"
            name="quantite"
            type="number"
            min="0"
            register={register}
            error={errors.quantite?.message}
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
          <button type="submit" className="primary-button" disabled={isSubmitting || saving}>
            <span>＋</span> {isSubmitting || saving ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer'} l'article
          </button>
          <button type="button" className="secondary-button" onClick={() => reset(EMPTY_ARTICLE)}>
            Effacer
          </button>
        </div>
        {error && <p className="error-banner" role="alert">{error}</p>}
      </form>

      <div className="form-card">
        <h2>Liste des articles {saving && <span className="saving-indicator">· synchronisation...</span>}</h2>
        <DataTable
          columns={columns}
          rows={articles}
          rowKey={(row) => row.reference}
          loading={loading}
          loadingMessage="Chargement du catalogue..."
          emptyMessage="Aucun article. Utilisez le formulaire ci-dessus pour creer le premier."
          isRowActive={(row) => row.reference === editingReference}
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
