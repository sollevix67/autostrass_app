/**
 * Vue clients : liste, création, modification et suppression.
 *
 * Branchee sur l'API (`/api/clients`). Le formulaire en fenêtre modale suit le meme patron que
 * le catalogue : React Hook Form + Zod, resume d'erreurs focusable, et
 * suppression confirmee via `ConfirmDialog` plutot que `window.confirm`.
 *
 * L'écriture est réservée au dépôt : un caissier voit la liste mais pas le
 * formulaire d'édition. Les boutons restent visibles et désactivés plutôt que
 * masqués, pour que la limite de droits soit lisible sans deviner.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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

/** N'envoyer que les coordonnées éditables, sans identifiant ni secteur. */
function clientFormValues(client: ApiClient): ClientFormValues {
  return {
    nom: client.nom,
    prenom: client.prenom,
    telephone: client.telephone,
    email: client.email,
    adresse: client.adresse,
    ville: client.ville,
    codePostal: client.codePostal,
    type: client.type,
  }
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
  const { rows, loading, saving, error, offline, reload, create, update, remove } = useResource<ApiClient>({
    path: '/clients',
    sort: byNom,
    allowOfflineWrites: false,
  })

  // `register` de RHF est contravariant sur le nom de champ : on elargit
  // l'instance pour que `FormInput` reste reutilisable.
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: EMPTY_CLIENT,
    mode: 'onSubmit',
  })
  const register = form.register as unknown as FieldRegister
  const { setFocus, reset, formState: { errors, isSubmitting } } = form
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ApiClient | null>(null)
  const [submitFailed, setSubmitFailed] = useState(false)
  const clientDialogRef = useRef<HTMLDialogElement>(null)
  const pending = useRef(false)

  const canEdit = canWrite(user?.role, 'depot')
  const busy = saving || isSubmitting

  useEffect(() => {
    const dialog = clientDialogRef.current
    if (!dialogOpen || !canEdit || !dialog) return

    const trigger = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    // Le dialogue natif rend l'arrière-plan inerte et contient le focus clavier.
    dialog.showModal()
    setFocus('nom')
    document.body.style.overflow = 'hidden'

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [dialogOpen, canEdit, setFocus])

  function openClientDialog(client: ApiClient | null = null) {
    if (!canEdit || busy || pending.current) return
    setEditingClient(client)
    reset(client ? clientFormValues(client) : EMPTY_CLIENT)
    setSubmitFailed(false)
    setDialogOpen(true)
  }

  const closeClientDialog = useCallback(() => {
    if (busy || pending.current) return
    setDialogOpen(false)
    setEditingClient(null)
    reset(EMPTY_CLIENT)
    setSubmitFailed(false)
  }, [busy, reset])

  useEffect(() => {
    if (!dialogOpen) return
    // Certains aperçus relaient keydown sans déclencher le cancel natif du dialogue.
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      closeClientDialog()
    }
    document.addEventListener('keydown', onEscape, true)
    return () => document.removeEventListener('keydown', onEscape, true)
  }, [dialogOpen, closeClientDialog])

  async function handleSubmit(values: ClientFormValues) {
    if (!canEdit || saving || pending.current) return
    pending.current = true
    setSubmitFailed(false)
    try {
      const saved = editingClient ? await update(editingClient.id, values) : await create(values)
      if (saved === null) {
        setSubmitFailed(true)
        return
      }
      setDialogOpen(false)
      setEditingClient(null)
      reset(EMPTY_CLIENT)
      toast.success(`Client ${saved.numeroClient} ${editingClient ? 'modifié' : 'enregistré'}.`)
    } finally {
      pending.current = false
    }
  }

  async function handleDelete(client: ApiClient) {
    if (!canEdit || busy || pending.current) return
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
        <div className="actions-cell">
          <button
            type="button"
            className="link-button"
            onClick={() => openClientDialog(row)}
            disabled={!canEdit || busy}
            title={!canEdit ? 'La modification des clients est réservée au dépôt.' : 'Modifier'}
            aria-label={`Modifier ${row.prenom} ${row.nom} (${row.numeroClient})`}
            aria-haspopup="dialog"
          >
            <Icon name="edit" size="sm" /> Modifier
          </button>
          <button
            type="button"
            className="action-btn delete"
            onClick={() => handleDelete(row)}
            disabled={!canEdit || busy}
            title="Supprimer"
            aria-label={`Supprimer ${row.prenom} ${row.nom}`}
          >
            <Icon name="trash" size="sm" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageLayout
      eyebrow="CLIENTS"
      title="Gestion des clients"
      description="Consultez et gérez votre base de clients."
      actions={
        <>
          <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
            <Icon name="rotate-ccw" size="sm" /> Actualiser
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => openClientDialog()}
            disabled={!canEdit || busy}
            aria-haspopup="dialog"
            title={!canEdit ? 'La création de clients est réservée au dépôt.' : undefined}
          >
            <Icon name="plus" size="sm" /> Nouveau client
          </button>
        </>
      }
    >
      {offline && (
        <p className="info-banner" role="status">
          API clients indisponible : les changements ne sont pas enregistrés. Réessayez lorsque la connexion est rétablie.
        </p>
      )}
      {error !== null && !dialogOpen && <p className="error-banner" role="alert">{error}</p>}

      {canEdit && (
        <dialog
          ref={clientDialogRef}
          className="modal client-modal"
          aria-labelledby="client-dialog-title"
          aria-describedby="client-dialog-description"
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return
            const controls = event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
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
            closeClientDialog()
          }}
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) return
            const bounds = event.currentTarget.getBoundingClientRect()
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
              event.preventDefault()
              closeClientDialog()
            }
          }}
        >
          <div className="client-modal-header">
            <h2 id="client-dialog-title">{editingClient ? `Modifier le client ${editingClient.numeroClient}` : 'Nouveau client'}</h2>
            <button type="button" className="action-btn" aria-label="Fermer la fenêtre" onClick={closeClientDialog} disabled={busy}>
              <Icon name="close" size="lg" />
            </button>
          </div>
          <p id="client-dialog-description" className="modal-desc">
            {editingClient ? 'Modifiez les coordonnées du client. Son numéro de dossier reste inchangé.' : 'Renseignez les coordonnées du client à ajouter.'}
          </p>
          {offline && <p className="info-banner" role="status">API clients indisponible : les changements ne sont pas enregistrés.</p>}
          {submitFailed && error && <p className="error-banner" role="alert">{error}</p>}
          <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)} noValidate aria-busy={busy}>

            <ErrorSummary
              errors={errors}
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

            <fieldset className="client-form-fields" disabled={busy}>
              <legend className="sr-only">Coordonnées du client</legend>
              <div className="form-grid-2">
                <FormInput label="Nom" name="nom" register={register} error={errors.nom?.message} required />
                <FormInput label="Prénom" name="prenom" register={register} error={errors.prenom?.message} required />
                <FormInput label="Téléphone" name="telephone" type="tel" register={register} error={errors.telephone?.message} required />
                <FormInput label="Email" name="email" type="email" register={register} error={errors.email?.message} required />
                <FormInput label="Adresse" name="adresse" register={register} error={errors.adresse?.message} required />
                <FormInput label="Ville" name="ville" register={register} error={errors.ville?.message} required />
                <FormInput label="Code postal" name="codePostal" register={register} error={errors.codePostal?.message} required />
                <FormSelect label="Type" name="type" register={register} options={TYPES} error={errors.type?.message} required />
              </div>

              <div className="form-actions">
                <button type="button" className="secondary-button client-form-reset" onClick={() => reset(editingClient ? clientFormValues(editingClient) : EMPTY_CLIENT)}>
                  {editingClient ? 'Rétablir' : 'Effacer'}
                </button>
                <button type="button" className="secondary-button" onClick={closeClientDialog}>
                  Annuler
                </button>
                <button type="submit" className="primary-button">
                  <Icon name={editingClient ? 'check' : 'plus'} size="sm" /> {busy ? 'Enregistrement…' : editingClient ? 'Enregistrer les modifications' : 'Ajouter le client'}
                </button>
              </div>
            </fieldset>
          </form>
        </dialog>
      )}
      {!canEdit && (
        <p className="info-banner" role="note">
          <Icon name="alert" size="sm" /> La gestion des clients est réservée au dépôt.
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
