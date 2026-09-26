/**
 * Vue retours : articles repris et remboursement.
 *
 * Branchee sur l'API (`/api/retours`). Meme patron que les autres modules :
 * React Hook Form + Zod + `useFieldArray`, resume d'erreurs focusable, tableau
 * triable et suppression confirmee par `ConfirmDialog`.
 *
 * Ecart avec la version precedente : le montant rembourse n'est plus saisi.
 * Il vaut la somme des lignes et le serveur le recalcule a la lecture — le
 * saisir laissait la possibility d'accorder un remboursement incoherent avec le
 * detail, qui est justement la piece demandee a un client.
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
import { useClientOptions, useVenteOptions } from '../hooks/useReferentials'
import { useAuth, canWrite } from '../components/useAuth'
import { retourSchema, type RetourFormValues, type DocumentLineFormValues } from '../schemas'
import { RETURN_REASON_OPTIONS, formatEuros, today } from '../options'
import type { ApiRetour } from '../services/contracts'

const EMPTY_LINE: DocumentLineFormValues = { reference: '', designation: '', quantite: 1, prixUnitaire: 0 }

const EMPTY_RETOUR: RetourFormValues = {
  venteId: null,
  clientId: 0,
  dateRetour: today(),
  motif: '',
  articles: [EMPTY_LINE],
}

const byDateDesc = (rows: ApiRetour[]) =>
  [...rows].sort((a, b) => b.dateRetour.localeCompare(a.dateRetour))

export default function RetoursView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const clients = useClientOptions()
  const ventes = useVenteOptions()
  const { rows, loading, saving, error, offline, reload, create, remove } = useResource<ApiRetour>({
    path: '/retours',
    sort: byDateDesc,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RetourFormValues>({
    resolver: zodResolver(retourSchema),
    mode: 'onSubmit',
    defaultValues: EMPTY_RETOUR,
  })

  const { fields, append, remove: removeLine } = useFieldArray({ control, name: 'articles' })
  const reg = register as unknown as FieldRegister

  const canEdit = canWrite(user?.role, 'caisse')

  const watchedArticles = watch('articles')
  const totalRembourse = (watchedArticles ?? []).reduce(
    (sum, line) => sum + (line.quantite || 0) * (line.prixUnitaire || 0),
    0,
  )

  const onSubmit = handleSubmit(async (values) => {
    const created = await create(values)
    if (created === null) return
    reset(EMPTY_RETOUR)
    toast.success(`Retour enregistre (${formatEuros(created.montantRembourse)}).`)
  })

  const handleDelete = (retour: ApiRetour) => {
    confirm(
      'Supprimer ce retour ?',
      <>
        Le retour du <strong>{retour.dateRetour}</strong> ({retour.motif},{' '}
        {formatEuros(retour.montantRembourse)}) sera efface de l'historique.
      </>,
      () => {
        void remove(retour.id).then((deleted) => {
          if (deleted) toast.success('Retour supprime.')
        })
      },
    )
  }

  const clientLabel = (clientId: number) => {
    const client = clients.find((item) => item.id === clientId)
    return client ? `${client.nom} ${client.prenom}` : `Client #${clientId}`
  }

  const columns: ColumnDef<ApiRetour>[] = [
    {
      key: 'dateRetour',
      header: 'DATE',
      sortable: true,
      sortValue: (row) => row.dateRetour,
      render: (row) => <b>{row.dateRetour}</b>,
    },
    {
      key: 'clientId',
      header: 'CLIENT',
      sortable: true,
      sortValue: (row) => clientLabel(row.clientId),
      render: (row) => clientLabel(row.clientId),
    },
    {
      key: 'venteId',
      header: 'VENTE',
      sortable: true,
      sortValue: (row) => row.venteId ?? 0,
      render: (row) => (row.venteId === null ? '—' : `Vente #${row.venteId}`),
    },
    { key: 'motif', header: 'MOTIF', sortable: true, sortValue: (row) => row.motif, render: (row) => row.motif },
    {
      key: 'articles',
      header: 'ARTICLES',
      align: 'right',
      sortValue: (row) => row.articles.length,
      render: (row) => `${row.articles.length} ligne(s)`,
    },
    {
      key: 'montantRembourse',
      header: 'REMBOURSE',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.montantRembourse,
      render: (row) => <b>{formatEuros(row.montantRembourse)}</b>,
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
            onClick={() => handleDelete(row)}
            disabled={saving}
            title="Supprimer"
            aria-label={`Supprimer le retour du ${row.dateRetour}`}
          >
            <Icon name="trash" size="sm" />
          </button>
        ) : null,
    },
  ]

  return (
    <PageLayout
      eyebrow="RETOURS"
      title="Gestion des retours"
      description="Enregistrez et suivez les retours clients."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      <ResourceBanners
        error={error}
        offline={offline}
        readOnly={canEdit ? null : 'La saisie des retours est reservee a la caisse. Consultez l\'historique ci-dessous.'}
        resource="retours"
      />

      {canEdit && (
        <section className="form-card">
          <h2>Nouveau retour</h2>
          <form onSubmit={onSubmit} noValidate>
            {errors.articles && (
              <p className="error-banner" role="alert">
                {typeof errors.articles.message === 'string'
                  ? errors.articles.message
                  : "Completez chaque ligne avant d'enregistrer le retour."}
              </p>
            )}

            <div className="form-grid-2">
              <FormSelect
                label="Client"
                name="clientId"
                options={clients.map((client) => ({
                  value: String(client.id),
                  label: `${client.numeroClient} - ${client.nom} ${client.prenom}`,
                }))}
                register={reg}
                error={errors.clientId?.message}
                required
              />
              <FormSelect
                label="Vente d'origine"
                name="venteId"
                options={ventes.map((vente) => ({
                  value: String(vente.id),
                  label: `Vente #${vente.id} du ${new Date(vente.dateVente).toLocaleDateString('fr-FR')}`,
                }))}
                register={reg}
                error={errors.venteId?.message}
                placeholder="Aucune vente precisee"
              />
              <FormInput
                label="Date du retour"
                name="dateRetour"
                type="date"
                register={reg}
                error={errors.dateRetour?.message}
                required
              />
              <FormSelect
                label="Motif"
                name="motif"
                options={RETURN_REASON_OPTIONS}
                register={reg}
                error={errors.motif?.message}
                placeholder="Selectionner un motif..."
                required
              />
            </div>

            <h3 className="sub-heading">Articles repris</h3>

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
                      placeholder="ex: BAT-7710"
                    />
                    <FormInput
                      label="Designation"
                      name={`articles.${index}.designation`}
                      register={reg}
                      error={lineErrors?.designation?.message}
                      required
                    />
                    <FormInput
                      label="Quantite reprise"
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
              <strong>Montant rembourse : {formatEuros(totalRembourse)}</strong>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={saving}>
                <Icon name="check" size="sm" /> {saving ? 'Enregistrement...' : 'Enregistrer le retour'}
              </button>
              <button type="button" className="secondary-button" onClick={() => reset(EMPTY_RETOUR)}>
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
        emptyMessage="Aucun retour enregistre."
        loading={loading}
        defaultSort={{ key: 'dateRetour', direction: 'desc' }}
        caption="Historique des retours clients"
      />

      <ConfirmDialog {...dialogProps} confirmLabel="Supprimer" destructive />
    </PageLayout>
  )
}
