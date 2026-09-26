/**
 * Vue receptions : saisie des articles recus et historique.
 *
 * Branchee sur l'API (`/api/receptions`). Le formulaire suit le meme patron que
 * le catalogue : React Hook Form + Zod + `useFieldArray`, resume d'erreurs
 * focusable, et suppression confirmee par `ConfirmDialog`.
 *
 * Les lignes sont ecrites dans la meme transaction que l'entete par le
 * repository : une reception sans ses lignes laisse la base intacte. Le total
 * n'est jamais saisi, il est recalcule par le serveur a partir des lignes.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { Icon } from '../components/Icon'
import { ResourceBanners } from '../components/ResourceBanners'
import { FormInput, FormSelect, type FieldRegister } from '../components/forms/FormFields'
import { useResource } from '../hooks/useResource'
import { useAuth, canWrite } from '../components/useAuth'
import { receptionSchema, type ReceptionFormValues, type DocumentLineFormValues } from '../schemas'
import { SUPPLIER_OPTIONS, formatEuros, today } from '../options'
import type { ApiReception } from '../services/contracts'

/** Ligne vide : jamais de champ `undefined` dans un `useFieldArray`. */
const EMPTY_LINE: DocumentLineFormValues = { reference: '', designation: '', quantite: 1, prixUnitaire: 0 }

const EMPTY_RECEPTION: ReceptionFormValues = {
  fournisseur: '',
  dateReception: today(),
  notes: '',
  articles: [EMPTY_LINE],
}

const byDateDesc = (rows: ApiReception[]) =>
  [...rows].sort((a, b) => b.dateReception.localeCompare(a.dateReception))

export default function ReceptionsView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const { rows, loading, saving, error, offline, reload, create, remove } = useResource<ApiReception>({
    path: '/receptions',
    sort: byDateDesc,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReceptionFormValues>({
    resolver: zodResolver(receptionSchema),
    mode: 'onSubmit',
    defaultValues: EMPTY_RECEPTION,
  })

  /**
   * `useFieldArray` gere les cles de ligne et l'insertion/suppression. La cle
   * qu'il genere (`field.id`) est stable entre deux rendus : c'est elle qui
   * evite qu'une ligne d'erreur se deplace quand on saisit une quantite.
   */
  const { fields, append, remove: removeLine } = useFieldArray({ control, name: 'articles' })

  // `register` est type sur les noms de champs du formulaire ; on l'elargit
  // pour nos composants generiques (le nom reste identique a l'attribut name).
  const reg = register as unknown as FieldRegister

  const watchedArticles = watch('articles')
  const totalHT = (watchedArticles ?? []).reduce(
    (sum, line) => sum + (line.quantite || 0) * (line.prixUnitaire || 0),
    0,
  )

  const canEdit = canWrite(user?.role, 'depot')

  const onSubmit = handleSubmit(async (values) => {
    const created = await create({
      fournisseur: values.fournisseur,
      dateReception: values.dateReception,
      notes: values.notes,
      articles: values.articles,
    })
    if (created === null) return
    reset(EMPTY_RECEPTION)
    toast.success(
      `Reception enregistree (${created.articles.length} ligne(s), ${formatEuros(created.totalHT)} HT).`,
    )
  })

  const handleDeleteHistory = (reception: ApiReception) => {
    confirm(
      `Supprimer la reception du ${reception.dateReception} ?`,
      <>
        La reception chez <strong>{reception.fournisseur}</strong> ({reception.articles.length}
        ligne(s), {formatEuros(reception.totalHT)}) sera retirees de l'historique.
      </>,
      () => {
        void remove(reception.id).then((deleted) => {
          if (deleted) toast.success('Reception supprimee de l\'historique.')
        })
      },
    )
  }

  const columns: ColumnDef<ApiReception>[] = [
    {
      key: 'fournisseur',
      header: 'FOURNISSEUR',
      sortable: true,
      sortValue: (row) => row.fournisseur,
      render: (row) => <b>{row.fournisseur}</b>,
    },
    {
      key: 'dateReception',
      header: 'DATE',
      sortable: true,
      sortValue: (row) => row.dateReception,
      render: (row) => row.dateReception,
    },
    {
      key: 'articles',
      header: 'ARTICLES',
      align: 'right',
      sortValue: (row) => row.articles.length,
      render: (row) => `${row.articles.length} ligne(s)`,
    },
    {
      key: 'totalHT',
      header: 'TOTAL HT',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.totalHT,
      render: (row) => <b>{formatEuros(row.totalHT)}</b>,
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '60px',
      render: (row) =>
        canEdit ? (
          <button
            type="button"
            className="action-btn delete"
            onClick={() => handleDeleteHistory(row)}
            disabled={saving}
            title="Supprimer"
            aria-label={`Supprimer la reception du ${row.dateReception}`}
          >
            <Icon name="trash" size="sm" />
          </button>
        ) : null,
    },
  ]

  return (
    <PageLayout
      eyebrow="RECEPTIONS"
      title="Enregistrer une reception"
      description="Ajoutez les articles recus de vos fournisseurs."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      <ResourceBanners
        error={error}
        offline={offline}
        readOnly={canEdit ? null : 'La saisie des receptions est reservee au depot. Consultez l\'historique ci-dessous.'}
        resource="receptions"
      />

      {canEdit && (
        <section className="form-card">
          <h2>Nouvelle reception</h2>
          <form onSubmit={onSubmit} noValidate>
            {/*
              Erreur de collection : Zod la place sur `articles`. On affiche un
              resume global au-dessus des lignes ; chaque ligne garde son
              erreur inline, qui est la source la plus utile pour l'utilisateur.
            */}
            {errors.articles && (
              <p className="error-banner" role="alert">
                {typeof errors.articles.message === 'string'
                  ? errors.articles.message
                  : "Completez chaque ligne d'article avant d'enregistrer la reception."}
              </p>
            )}

            <div className="form-grid-2">
              <FormSelect
                label="Fournisseur"
                name="fournisseur"
                options={SUPPLIER_OPTIONS}
                register={reg}
                error={errors.fournisseur?.message}
                required
              />
              <FormInput
                label="Date de reception"
                name="dateReception"
                type="date"
                register={reg}
                error={errors.dateReception?.message}
                required
              />
            </div>

            <h3 className="sub-heading">Articles recus</h3>

            {fields.map((field, index) => {
              const lineErrors = errors.articles?.[index]
              return (
                <div key={field.id} className="reception-article">
                  <div className="form-grid-2">
                    <FormInput
                      label="Reference"
                      name={`articles.${index}.reference`}
                      register={reg}
                      error={lineErrors?.reference?.message}
                      required
                      placeholder="ex: BRK-0428"
                    />
                    <FormInput
                      label="Designation"
                      name={`articles.${index}.designation`}
                      register={reg}
                      error={lineErrors?.designation?.message}
                      required
                    />
                    <FormInput
                      label="Quantite recue"
                      name={`articles.${index}.quantite`}
                      type="number"
                      min="1"
                      register={reg}
                      error={lineErrors?.quantite?.message}
                      required
                    />
                    <FormInput
                      label="Prix unitaire"
                      name={`articles.${index}.prixUnitaire`}
                      type="number"
                      step="0.01"
                      min="0"
                      register={reg}
                      error={lineErrors?.prixUnitaire?.message}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="action-btn delete"
                    onClick={() => removeLine(index)}
                    aria-label={`Retirer la ligne ${index + 1}`}
                    disabled={fields.length === 1}
                    title={fields.length === 1 ? 'Une ligne minimum est requise' : 'Retirer cette ligne'}
                  >
                    <Icon name="close" size="sm" />
                  </button>
                </div>
              )
            })}

            <button
              type="button"
              className="secondary-button"
              onClick={() => append(EMPTY_LINE)}
              disabled={fields.length >= 200}
              title={fields.length >= 200 ? 'Maximum 200 lignes par document' : undefined}
            >
              <Icon name="plus" size="sm" /> Ajouter un article
            </button>

            <div className="reception-total">
              <strong>Total HT : {formatEuros(totalHT)}</strong>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={saving}>
                <Icon name="check" size="sm" /> {saving ? 'Enregistrement...' : 'Enregistrer la reception'}
              </button>
              <button type="button" className="secondary-button" onClick={() => reset(EMPTY_RECEPTION)}>
                Effacer
              </button>
            </div>
          </form>
        </section>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        emptyMessage="Aucune reception enregistree."
        loading={loading}
        defaultSort={{ key: 'dateReception', direction: 'desc' }}
        caption="Historique des receptions fournisseurs"
      />

      <ConfirmDialog {...dialogProps} confirmLabel="Supprimer" destructive />
    </PageLayout>
  )
}
