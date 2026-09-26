/**
 * Vue livraisons : expeditions clients professionnels et suivi.
 *
 * Branchee sur l'API (`/api/livraisons`). Meme patron que les autres modules :
 * React Hook Form + Zod, resume d'erreurs focusable, tableau triable et
 * suppression confirmee par `ConfirmDialog`.
 *
 * Ecart avec la version precedente : la commande de rattachement se choisit
 * dans une liste issue de l'API et non par un identifiant saisi a la main.
 * Un numero de commande errone n'existe pas, et l'API repond 422 ; la saisie
 * libre laissait croire a un rattachement valide.
 */

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { Icon } from '../components/Icon'
import { ResourceBanners } from '../components/ResourceBanners'
import { ErrorSummary } from '../components/forms/ErrorSummary'
import { FormInput, FormSelect, type FieldRegister } from '../components/forms/FormFields'
import { useResource } from '../hooks/useResource'
import { useCommandeOptions } from '../hooks/useReferentials'
import { useAuth, canWrite } from '../components/useAuth'
import { livraisonSchema, type LivraisonFormValues } from '../schemas'
import { CARRIER_OPTIONS, DELIVERY_STATUS_OPTIONS, today } from '../options'
import type { ApiLivraison } from '../services/contracts'

const EMPTY_LIVRAISON: LivraisonFormValues = {
  commandeId: 0,
  transporteur: '',
  dateExpedition: today(),
  dateLivraisonPrevue: '',
  adresseLivraison: '',
  statut: 'en attente',
  tracking: '',
}

const FIELD_LABELS = {
  commandeId: 'Commande',
  transporteur: 'Transporteur',
  dateExpedition: "Date d'expedition",
  dateLivraisonPrevue: 'Date de livraison prevue',
  adresseLivraison: 'Adresse de livraison',
  statut: 'Statut',
  tracking: 'Numero de suivi',
} satisfies Record<string, string>

const byDateDesc = (rows: ApiLivraison[]) =>
  [...rows].sort((a, b) => b.dateExpedition.localeCompare(a.dateExpedition))

export default function LivraisonsView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const commandes = useCommandeOptions()
  const { rows, loading, saving, error, offline, reload, create, update, remove } = useResource<ApiLivraison>({
    path: '/livraisons',
    sort: byDateDesc,
  })

  const form = useForm<LivraisonFormValues>({
    resolver: zodResolver(livraisonSchema),
    defaultValues: EMPTY_LIVRAISON,
    mode: 'onSubmit',
  })
  const register = form.register as unknown as FieldRegister

  const [patching, setPatching] = useState<number | null>(null)

  const canEdit = canWrite(user?.role, 'caisse')

  /** Libelle de commande : `Client — date`, lisible sans quitter la liste. */
  const commandeLabel = (commandeId: number) => {
    const commande = commandes.find((item) => item.id === commandeId)
    return commande ? `Commande du ${commande.dateCommande}` : `Commande #${commandeId}`
  }

  async function handleSubmit(values: LivraisonFormValues) {
    const created = await create(values)
    if (created === null) return
    form.reset({ ...EMPTY_LIVRAISON, dateExpedition: today() })
    toast.success(`Livraison enregistree pour la commande du ${values.dateExpedition}.`)
  }

  async function changeStatut(livraison: ApiLivraison, statut: ApiLivraison['statut']) {
    if (livraison.statut === statut) return
    setPatching(livraison.id)
    const updated = await update(livraison.id, { statut })
    setPatching(null)
    if (updated !== null) toast.success(`Livraison du ${livraison.dateExpedition} : ${statut}.`)
  }

  const handleDelete = (livraison: ApiLivraison) => {
    confirm(
      'Supprimer cette livraison ?',
      <>
        La livraison du <strong>{livraison.dateExpedition}</strong> chez{' '}
        <strong>{livraison.transporteur}</strong> sera retiree du suivi.
      </>,
      () => {
        void remove(livraison.id).then((deleted) => {
          if (deleted) toast.success('Livraison supprimee.')
        })
      },
    )
  }

  const columns: ColumnDef<ApiLivraison>[] = [
    {
      key: 'dateExpedition',
      header: 'EXPEDITION',
      sortable: true,
      sortValue: (row) => row.dateExpedition,
      render: (row) => <b>{row.dateExpedition}</b>,
    },
    {
      key: 'commandeId',
      header: 'COMMANDE',
      sortable: true,
      sortValue: (row) => row.commandeId,
      render: (row) => commandeLabel(row.commandeId),
    },
    { key: 'transporteur', header: 'TRANSPORTEUR', sortable: true, sortValue: (row) => row.transporteur, render: (row) => row.transporteur },
    {
      key: 'dateLivraisonPrevue',
      header: 'LIVRAISON',
      sortable: true,
      sortValue: (row) => row.dateLivraisonPrevue,
      render: (row) => row.dateLivraisonPrevue,
    },
    { key: 'adresseLivraison', header: 'ADRESSE', render: (row) => row.adresseLivraison },
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
            aria-label={`Statut de la livraison du ${row.dateExpedition}`}
            onChange={(event) => {
              void changeStatut(row, event.target.value as ApiLivraison['statut'])
            }}
          >
            {DELIVERY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <span className="type-badge">{row.statut}</span>
        ),
    },
    {
      key: 'tracking',
      header: 'SUIVI',
      render: (row) => (row.tracking ? <span className="reference">{row.tracking}</span> : '—'),
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
            aria-label={`Supprimer la livraison du ${row.dateExpedition}`}
          >
            <Icon name="trash" size="sm" />
          </button>
        ) : null,
    },
  ]

  return (
    <PageLayout
      eyebrow="LIVRAISONS"
      title="Suivi des livraisons"
      description="Suivez l'etat de vos expeditions en temps reel."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      <ResourceBanners
        error={error}
        offline={offline}
        readOnly={canEdit ? null : 'Le suivi des livraisons est reserve a la caisse. Consultez la liste ci-dessous.'}
        resource="livraisons"
      />

      {canEdit && (
        <section className="form-card">
          <h2>Nouvelle livraison</h2>
          <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            <ErrorSummary errors={form.formState.errors} labels={FIELD_LABELS} />

            {commandes.length === 0 && (
              <p className="info-banner" role="note">
                <Icon name="alert" size="sm" /> Aucune commande disponible : une livraison se
                rattache a une commande client existante.
              </p>
            )}

            <div className="form-grid-2">
              <FormSelect
                label="Commande"
                name="commandeId"
                options={commandes.map((commande) => ({
                  value: String(commande.id),
                  label: `${commandeLabel(commande.id)} (#${commande.id})`,
                }))}
                register={register}
                error={form.formState.errors.commandeId?.message}
                required
              />
              <FormSelect
                label="Transporteur"
                name="transporteur"
                options={CARRIER_OPTIONS}
                register={register}
                error={form.formState.errors.transporteur?.message}
                required
              />
              <FormInput
                label="Date d'expedition"
                name="dateExpedition"
                type="date"
                register={register}
                error={form.formState.errors.dateExpedition?.message}
                required
              />
              <FormInput
                label="Date de livraison prevue"
                name="dateLivraisonPrevue"
                type="date"
                register={register}
                error={form.formState.errors.dateLivraisonPrevue?.message}
                required
              />
              <FormInput
                label="Adresse de livraison"
                name="adresseLivraison"
                register={register}
                error={form.formState.errors.adresseLivraison?.message}
                required
              />
              <FormSelect
                label="Statut"
                name="statut"
                options={DELIVERY_STATUS_OPTIONS}
                register={register}
                error={form.formState.errors.statut?.message}
                placeholder={null}
                required
              />
              <FormInput
                label="Numero de suivi"
                name="tracking"
                register={register}
                error={form.formState.errors.tracking?.message}
                placeholder="Optionnel"
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving || form.formState.isSubmitting || commandes.length === 0}
                title={commandes.length === 0 ? 'Aucune commande a livrer' : undefined}
              >
                <Icon name="check" size="sm" /> Enregistrer
              </button>
              <button type="button" className="secondary-button" onClick={() => form.reset(EMPTY_LIVRAISON)}>
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
        emptyMessage="Aucune livraison enregistree."
        loading={loading}
        defaultSort={{ key: 'dateExpedition', direction: 'desc' }}
        caption="Historique des livraisons clients"
      />

      <ConfirmDialog {...dialogProps} confirmLabel="Supprimer" destructive />
    </PageLayout>
  )
}
