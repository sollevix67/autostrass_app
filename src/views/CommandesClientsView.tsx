/**
 * Vue commandes clients : saisie, suivi de statut et historique.
 *
 * Branchee sur l'API (`/api/commandes`). Le formulaire suit le meme patron que
 * le catalogue : React Hook Form + Zod + `useFieldArray`, resume d'erreurs
 * focusable, et suppression confirmee par `ConfirmDialog`.
 *
 * Ecart avec la version precedente : une commande sans ligne n'existe pas
 * cote API (`documentLines` exige au moins une ligne). Le formulaire comporte
 * donc les lignes, comme la reception.
 *
 * Le statut se change depuis le tableau : c'est le geste le plus frequent du
 * depot, et il ne meritait pas de passer par le formulaire de creation.
 */

import { useState } from 'react'
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
import { useClientOptions } from '../hooks/useReferentials'
import { useAuth, canWrite } from '../components/useAuth'
import { commandeSchema, type CommandeFormValues, type DocumentLineFormValues } from '../schemas'
import { ORDER_STATUS_OPTIONS, formatEuros, today } from '../options'
import type { ApiCommande } from '../services/contracts'

const EMPTY_LINE: DocumentLineFormValues = { reference: '', designation: '', quantite: 1, prixUnitaire: 0 }

const EMPTY_COMMANDE: CommandeFormValues = {
  clientId: 0,
  dateCommande: today(),
  statut: 'en attente',
  dateLivraisonPrevue: '',
  articles: [EMPTY_LINE],
}

const byDateDesc = (rows: ApiCommande[]) =>
  [...rows].sort((a, b) => b.dateCommande.localeCompare(a.dateCommande))

export default function CommandesClientsView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const clients = useClientOptions()
  const { rows, loading, saving, error, offline, reload, create, update, remove } = useResource<ApiCommande>({
    path: '/commandes',
    sort: byDateDesc,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CommandeFormValues>({
    resolver: zodResolver(commandeSchema),
    mode: 'onSubmit',
    defaultValues: EMPTY_COMMANDE,
  })

  const { fields, append, remove: removeLine } = useFieldArray({ control, name: 'articles' })
  const reg = register as unknown as FieldRegister

  const [patching, setPatching] = useState<number | null>(null)

  const canEdit = canWrite(user?.role, 'caisse')

  const watchedArticles = watch('articles')
  const totalHT = (watchedArticles ?? []).reduce(
    (sum, line) => sum + (line.quantite || 0) * (line.prixUnitaire || 0),
    0,
  )

  const onSubmit = handleSubmit(async (values) => {
    const created = await create(values)
    if (created === null) return
    reset(EMPTY_COMMANDE)
    toast.success(`Commande enregistree (${created.articles.length} ligne(s), ${formatEuros(totalHT)} HT).`)
  })

  /**
   * Change le statut depuis le tableau.
   *
   * L'API expose un `PUT` d'entete ou toutes les clefs sont optionnelles : on
   * n'envoie donc que le statut, et le serveur conserve le reste.
   */
  async function changeStatut(commande: ApiCommande, statut: ApiCommande['statut']) {
    if (commande.statut === statut) return
    setPatching(commande.id)
    const updated = await update(commande.id, { statut })
    setPatching(null)
    if (updated !== null) toast.success(`Commande du ${commande.dateCommande} : ${statut}.`)
  }

  const handleDelete = (commande: ApiCommande) => {
    confirm(
      'Supprimer cette commande ?',
      <>
        La commande du <strong>{commande.dateCommande}</strong> ({commande.articles.length} ligne(s))
        sera supprimee. Une livraison qui la reference doit d'abord etre supprimee.
      </>,
      () => {
        void remove(commande.id).then((deleted) => {
          if (deleted) toast.success('Commande supprimee.')
        })
      },
    )
  }

  const columns: ColumnDef<ApiCommande>[] = [
    {
      key: 'dateCommande',
      header: 'DATE',
      sortable: true,
      sortValue: (row) => row.dateCommande,
      render: (row) => <b>{row.dateCommande}</b>,
    },
    {
      key: 'clientId',
      header: 'CLIENT',
      sortable: true,
      sortValue: (row) => row.clientId,
      render: (row) => {
        const client = clients.find((item) => item.id === row.clientId)
        return client ? `${client.nom} ${client.prenom}` : `Client #${row.clientId}`
      },
    },
    {
      key: 'articles',
      header: 'ARTICLES',
      align: 'right',
      sortValue: (row) => row.articles.length,
      render: (row) => `${row.articles.length} ligne(s)`,
    },
    {
      key: 'total',
      header: 'TOTAL HT',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.articles.reduce((sum, line) => sum + line.montant, 0),
      render: (row) => (
        <b>{formatEuros(row.articles.reduce((sum, line) => sum + line.montant, 0))}</b>
      ),
    },
    {
      key: 'dateLivraisonPrevue',
      header: 'LIVRAISON',
      sortable: true,
      sortValue: (row) => row.dateLivraisonPrevue ?? '',
      render: (row) => row.dateLivraisonPrevue || '—',
    },
    {
      key: 'statut',
      header: 'STATUT',
      sortable: true,
      sortValue: (row) => row.statut,
      render: (row) =>
        canEdit ? (
          <select
            className="status-select"
            value={row.statut}
            disabled={saving || patching === row.id}
            aria-label={`Statut de la commande du ${row.dateCommande}`}
            onChange={(event) => {
              void changeStatut(row, event.target.value as ApiCommande['statut'])
            }}
          >
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <span className="type-badge">{row.statut}</span>
        ),
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
            aria-label={`Supprimer la commande du ${row.dateCommande}`}
          >
            <Icon name="trash" size="sm" />
          </button>
        ) : null,
    },
  ]

  return (
    <PageLayout
      eyebrow="COMMANDES CLIENTS"
      title="Commandes clients"
      description="Suivez et gérez les commandes de vos clients."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      <ResourceBanners
        error={error}
        offline={offline}
        readOnly={canEdit ? null : 'La saisie des commandes est reservee a la caisse. Consultez la liste ci-dessous.'}
        resource="commandes"
      />

      {canEdit && (
        <section className="form-card">
          <h2>Nouvelle commande</h2>
          <form onSubmit={onSubmit} noValidate>
            {errors.articles && (
              <p className="error-banner" role="alert">
                {typeof errors.articles.message === 'string'
                  ? errors.articles.message
                  : "Completez chaque ligne avant d'enregistrer la commande."}
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
              <FormInput
                label="Date de commande"
                name="dateCommande"
                type="date"
                register={reg}
                error={errors.dateCommande?.message}
                required
              />
              <FormSelect
                label="Statut"
                name="statut"
                options={ORDER_STATUS_OPTIONS}
                register={reg}
                error={errors.statut?.message}
                placeholder={null}
                required
              />
              <FormInput
                label="Date de livraison prevue"
                name="dateLivraisonPrevue"
                type="date"
                register={reg}
                error={errors.dateLivraisonPrevue?.message}
              />
            </div>

            <h3 className="sub-heading">Articles commandes</h3>

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
                      placeholder="ex: PLA-2841"
                    />
                    <FormInput
                      label="Designation"
                      name={`articles.${index}.designation`}
                      register={reg}
                      error={lineErrors?.designation?.message}
                      required
                    />
                    <FormInput
                      label="Quantite"
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
                <Icon name="check" size="sm" /> {saving ? 'Enregistrement...' : 'Creer la commande'}
              </button>
              <button type="button" className="secondary-button" onClick={() => reset(EMPTY_COMMANDE)}>
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
        emptyMessage="Aucune commande enregistree."
        loading={loading}
        defaultSort={{ key: 'dateCommande', direction: 'desc' }}
        caption="Liste des commandes clients"
      />

      <ConfirmDialog {...dialogProps} confirmLabel="Supprimer" destructive />
    </PageLayout>
  )
}
