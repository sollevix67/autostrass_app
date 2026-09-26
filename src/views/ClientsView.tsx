/**
 * Vue clients : liste, creation et suppression.
 *
 * Branchee sur l'API (`/api/clients`). Le formulaire suit le meme patron que
 * le catalogue : React Hook Form + Zod, resume d'erreurs focusable, et
 * suppression confirmee via `ConfirmDialog` plutot que `window.confirm`.
 *
 * L'ecriture est reservee au depot : un caissier voit la liste mais pas le
 * formulaire de creation. Le bouton reste visible et desactive plutot que
 * masque, pour que la limite de droits soit lisible sans deviner.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { Icon } from '../components/Icon'
import { ErrorSummary } from '../components/forms/ErrorSummary'
import { FormInput, FormSelect, type FieldRegister } from '../components/forms/FormFields'
import { useResource } from '../hooks/useResource'
import { useAuth, canWrite } from '../components/useAuth'
import { clientSchema, type ClientFormValues } from '../schemas'
import type { ApiClient } from '../services/contracts'

/** Valeurs initiales du formulaire : jamais de champ `undefined`. */
const EMPTY_CLIENT: ClientFormValues = {
  nom: '',
  prenom: '',
  telephone: '',
  email: '',
  adresse: '',
  ville: '',
  codePostal: '',
  type: 'particulier',
}

const TYPES = [
  { value: 'particulier', label: 'Particulier' },
  { value: 'professionnel', label: 'Professionnel' },
]

/** Tri alphabétique, l'ordre naturel de lecture d'un annuaire. */
const byNom = (rows: ApiClient[]) => [...rows].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

export default function ClientsView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const { rows, loading, saving, error, offline, reload, create, remove } = useResource<ApiClient>({
    path: '/clients',
    sort: byNom,
  })

  // `register` de RHF est contravariant sur le nom de champ : on elargit
  // l'instance pour que `FormInput` reste reutilisable.
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: EMPTY_CLIENT,
    mode: 'onSubmit',
  })
  const register = form.register as unknown as FieldRegister

  const canEdit = canWrite(user?.role, 'depot')

  async function handleSubmit(values: ClientFormValues) {
    const created = await create(values)
    if (created === null) return
    form.reset(EMPTY_CLIENT)
    toast.success(`Client ${created.numeroClient} enregistre.`)
  }

  async function handleDelete(client: ApiClient) {
    confirm(
      'Supprimer ce client ?',
      <>
        Le client <strong>{client.prenom} {client.nom}</strong> ({client.numeroClient}) sera
        supprime definitivement. Les commandes qui le referencent doivent d'abord etre closes.
      </>,
      () => {
        // La suppression est asynchrone : on la declenche dans le callback du
        // dialogue, qui se ferme aussitot.
        void remove(client.id).then((deleted) => {
          if (deleted) toast.success(`Client ${client.numeroClient} supprime.`)
        })
      },
    )
  }

  const columns: ColumnDef<ApiClient>[] = [
    {
      key: 'numero',
      header: 'N°',
      sortable: true,
      sortValue: (row) => row.numeroClient,
      render: (row) => <span className="reference">{row.numeroClient}</span>,
    },
    {
      key: 'nom',
      header: 'NOM',
      sortable: true,
      sortValue: (row) => `${row.nom} ${row.prenom}`,
      render: (row) => <b>{row.nom} {row.prenom}</b>,
    },
    { key: 'telephone', header: 'TELEPHONE', sortable: true, sortValue: (row) => row.telephone, render: (row) => row.telephone },
    { key: 'email', header: 'EMAIL', sortable: true, sortValue: (row) => row.email, render: (row) => row.email },
    {
      key: 'ville',
      header: 'VILLE',
      sortable: true,
      sortValue: (row) => row.ville,
      render: (row) => (
        <span>
          {row.ville} ({row.codePostal})
        </span>
      ),
    },
    {
      key: 'type',
      header: 'TYPE',
      sortable: true,
      sortValue: (row) => row.type,
      render: (row) => <span className={`type-badge ${row.type}`}>{row.type}</span>,
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      render: (row) => (
        <button
          type="button"
          className="action-btn delete"
          onClick={() => handleDelete(row)}
          disabled={saving}
          title="Supprimer"
          aria-label={`Supprimer ${row.prenom} ${row.nom}`}
        >
          <Icon name="trash" size="sm" />
        </button>
      ),
    },
  ]

  return (
    <PageLayout
      eyebrow="CLIENTS"
      title="Gestion des clients"
      description="Consultez et gérez votre base de clients."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      {offline && (
        <p className="info-banner" role="status">
          API clients indisponible : affichage local uniquement, les modifications ne sont pas
          enregistrees.
        </p>
      )}
      {error !== null && <p className="error-banner" role="alert">{error}</p>}

      {canEdit ? (
        <form className="form-card" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <h2>Nouveau client</h2>

          <ErrorSummary
            errors={form.formState.errors}
            labels={{
              nom: 'Nom',
              prenom: 'Prenom',
              telephone: 'Telephone',
              email: 'Email',
              adresse: 'Adresse',
              ville: 'Ville',
              codePostal: 'Code postal',
              type: 'Type',
            }}
          />

          <div className="form-grid-2">
            <FormInput label="Nom" name="nom" register={register} required />
            <FormInput label="Prenom" name="prenom" register={register} required />
            <FormInput label="Telephone" name="telephone" type="tel" register={register} required />
            <FormInput label="Email" name="email" type="email" register={register} required />
            <FormInput label="Adresse" name="adresse" register={register} required />
            <FormInput label="Ville" name="ville" register={register} required />
            <FormInput label="Code postal" name="codePostal" register={register} required />
            <FormSelect label="Type" name="type" register={register} options={TYPES} required />
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={saving || form.formState.isSubmitting}>
              <Icon name="plus" size="sm" /> Ajouter le client
            </button>
            <button type="button" className="secondary-button" onClick={() => form.reset(EMPTY_CLIENT)}>
              Effacer
            </button>
          </div>
        </form>
      ) : (
        <p className="info-banner" role="note">
          <Icon name="alert" size="sm" /> La saisie de nouveaux clients est reservee au depot.
          Consultez la liste ci-dessous.
        </p>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        caption="Liste des clients"
        loading={loading}
        emptyMessage="Aucun client enregistre."
        defaultSort={{ key: 'nom', direction: 'asc' }}
      />

      <ConfirmDialog {...dialogProps} confirmLabel="Supprimer" destructive />
    </PageLayout>
  )
}
