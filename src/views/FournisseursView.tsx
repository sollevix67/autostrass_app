/**
 * Vue fournisseurs : liste, creation, mise a jour et suppression.
 *
 * Branchee sur l'API (`/api/fournisseurs`). Le formulaire en dialogue suit le meme
 * patron que les clients : React Hook Form + Zod, resume d'erreurs
 * focusable, et suppression confirmee via `ConfirmDialog` plutot que
 * `window.confirm`.
 *
 * L'ecriture est reservee au depot : un caissier voit la liste mais pas le
 * formulaire de creation. Le bouton reste visible et desactive plutot que
 * masque, pour que la limite de droits soit lisible sans deviner.
 */

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
import { FormInput, FormSelect, FormCheckbox, type FieldRegister } from '../components/forms/FormFields'
import { useResource } from '../hooks/useResource'
import { useAuth, canWrite } from '../components/useAuth'
import { fournisseurSchema, type FournisseurFormValues, type FournisseurFormOutput } from '../schemas'
import type { ApiFournisseur } from '../services/contracts'

/** Valeurs initiales du formulaire : jamais de champ `undefined`. */
const EMPTY_FOURNISSEUR = {
  nom: '',
  code: '',
  siret: '',
  email: '',
  telephone: '',
  adresse: '',
  ville: '',
  codePostal: '',
  delaiLivraison: 0,
  modeLivraison: 'livraison',
  actif: true,
} as const

const LIVRAISON_MODES = [
  { value: 'retrait', label: 'Retrait sur place' },
  { value: 'livraison', label: 'Livraison' },
  { value: 'express', label: 'Express' },
  { value: 'franchise', label: 'Franchise' },
]

function fournisseurFormValues(row: ApiFournisseur): FournisseurFormValues {
  return {
    nom: row.nom,
    code: row.code ?? '',
    siret: row.siret ?? '',
    email: row.email ?? '',
    telephone: row.telephone ?? '',
    adresse: row.adresse ?? '',
    ville: row.ville ?? '',
    codePostal: row.codePostal ?? '',
    delaiLivraison: row.delaiLivraison,
    modeLivraison: row.modeLivraison,
    actif: row.actif,
  }
}

/** Tri alphabétique, l'ordre naturel de lecture d'un annuaire. */
const byNom = (rows: ApiFournisseur[]) => [...rows].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

export default function FournisseursView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const { rows, loading, saving, error, offline, reload, create, update, remove } = useResource<ApiFournisseur>({
    path: '/fournisseurs',
    sort: byNom,
    allowOfflineWrites: false,
  })

  // `register` de RHF est contravariant sur le nom de champ : on elargit
  // l'instance pour que `FormInput` reste reutilisable.
  const form = useForm<FournisseurFormValues, unknown, FournisseurFormOutput>({
    resolver: zodResolver(fournisseurSchema),
    defaultValues: EMPTY_FOURNISSEUR,
    mode: 'onSubmit',
  })
  const register = form.register as unknown as FieldRegister
  const { reset, setFocus, formState: { errors, isSubmitting } } = form
  const [editingRow, setEditingRow] = useState<ApiFournisseur | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitFailed, setSubmitFailed] = useState(false)
  const supplierDialogRef = useRef<HTMLDialogElement>(null)
  const pending = useRef(false)

  const canEdit = canWrite(user?.role, 'depot')
  const busy = saving || isSubmitting

  useEffect(() => {
    const dialog = supplierDialogRef.current
    if (!dialogOpen || !canEdit || !dialog) return

    const trigger = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    setFocus('nom')
    document.body.style.overflow = 'hidden'

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [dialogOpen, canEdit, setFocus])

  function openSupplierDialog(row: ApiFournisseur | null = null) {
    if (!canEdit || busy || pending.current) return
    setEditingRow(row)
    reset(row ? fournisseurFormValues(row) : EMPTY_FOURNISSEUR)
    setSubmitFailed(false)
    setDialogOpen(true)
  }

  const closeSupplierDialog = useCallback(() => {
    if (busy || pending.current) return
    setDialogOpen(false)
    setEditingRow(null)
    reset(EMPTY_FOURNISSEUR)
    setSubmitFailed(false)
  }, [busy, reset])

  useEffect(() => {
    if (!dialogOpen) return
    // Compatibilité avec les aperçus relayant keydown sans cancel natif.
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      closeSupplierDialog()
    }
    document.addEventListener('keydown', onEscape, true)
    return () => document.removeEventListener('keydown', onEscape, true)
  }, [dialogOpen, closeSupplierDialog])

  async function handleSubmit(values: FournisseurFormOutput) {
    if (!canEdit || saving || pending.current) return
    pending.current = true
    setSubmitFailed(false)
    try {
      const saved = editingRow ? await update(editingRow.id, values) : await create(values)
      if (saved === null) {
        setSubmitFailed(true)
        return
      }
      setDialogOpen(false)
      setEditingRow(null)
      reset(EMPTY_FOURNISSEUR)
      toast.success(`Fournisseur ${saved.nom} ${editingRow ? 'modifié' : 'enregistré'}.`)
    } finally {
      pending.current = false
    }
  }

  async function handleDelete(fournisseur: ApiFournisseur) {
    if (!canEdit || busy || pending.current) return
    confirm(
      'Supprimer ce fournisseur ?',
      <>Le fournisseur <strong>{fournisseur.nom}</strong> ({fournisseur.code ?? 'sans code'}) sera supprime definitivement.</>,
      () => {
        void remove(fournisseur.id).then((deleted) => {
          if (deleted) toast.success(`Fournisseur ${fournisseur.nom} supprime.`)
        })
      },
    )
  }

  const columns: ColumnDef<ApiFournisseur>[] = [
    {
      key: 'nom',
      header: 'NOM',
      sortable: true,
      sortValue: (row) => row.nom,
      render: (row) => <b>{row.nom}</b>,
    },
    {
      key: 'code',
      header: 'CODE',
      sortable: true,
      sortValue: (row) => row.code ?? '',
      render: (row) => <span className={row.code ? 'stock-reference' : 'text-muted'}>{row.code ?? '-'}</span>,
    },
    {
      key: 'siret',
      header: 'SIRET',
      sortable: true,
      sortValue: (row) => row.siret ?? '',
      render: (row) => row.siret ?? '-',
    },
    {
      key: 'telephone',
      header: 'TELEPHONE',
      sortable: true,
      sortValue: (row) => row.telephone ?? '',
      render: (row) => row.telephone ?? '-',
    },
    {
      key: 'email',
      header: 'EMAIL',
      sortable: true,
      sortValue: (row) => row.email ?? '',
      render: (row) => row.email ?? '-',
    },
    {
      key: 'ville',
      header: 'VILLE',
      sortable: true,
      sortValue: (row) => row.ville ?? '',
      render: (row) => <span>{row.ville ?? '-'} ({row.codePostal ?? '-'})</span>,
    },
    {
      key: 'delai',
      header: 'DELAI (J)',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.delaiLivraison,
      render: (row) => <span className="align-right">{row.delaiLivraison}</span>,
    },
    {
      key: 'actif',
      header: 'ACTIF',
      sortable: true,
      sortValue: (row) => row.actif ? 1 : 0,
      render: (row) => <span className={`status-badge ${row.actif ? 'status-disponible' : 'status-rupture'}`}>{row.actif ? 'Oui' : 'Non'}</span>,
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '150px',
      render: (row) => (
        <div className="actions-cell">
          <button type="button" className="action-btn edit" onClick={() => openSupplierDialog(row)} disabled={!canEdit || busy} title="Modifier" aria-label={`Modifier ${row.nom}`} aria-haspopup="dialog">
            <Icon name="edit" size="sm" />
          </button>
          <button type="button" className="action-btn delete" onClick={() => handleDelete(row)} disabled={!canEdit || busy} title="Supprimer" aria-label={`Supprimer ${row.nom}`}>
            <Icon name="trash" size="sm" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageLayout
      eyebrow="FOURNISSEURS"
      title="Gestion des fournisseurs"
      description="Consultez et gérez votre base de fournisseurs."
      actions={
        <>
          <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
            <Icon name="rotate-ccw" size="sm" /> Actualiser
          </button>
          <button type="button" className="primary-button" onClick={() => openSupplierDialog()} disabled={!canEdit || busy} aria-haspopup="dialog" title={!canEdit ? 'La création de fournisseurs est réservée au dépôt.' : undefined}>
            <Icon name="plus" size="sm" /> Nouveau fournisseur
          </button>
        </>
      }
    >
      {offline && (
        <p className="info-banner" role="status">
          API fournisseurs indisponible : l'enregistrement nécessite une connexion au serveur.
        </p>
      )}
      {error !== null && !dialogOpen && <p className="error-banner" role="alert">{error}</p>}

      {canEdit && (
        <dialog
          ref={supplierDialogRef}
          className="modal supplier-modal"
          aria-labelledby="supplier-dialog-title"
          aria-describedby="supplier-dialog-description"
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
            closeSupplierDialog()
          }}
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) return
            const bounds = event.currentTarget.getBoundingClientRect()
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
              event.preventDefault()
              closeSupplierDialog()
            }
          }}
        >
          <div className="supplier-modal-header">
            <h2 id="supplier-dialog-title">{editingRow ? `Modifier ${editingRow.nom}` : 'Nouveau fournisseur'}</h2>
            <button type="button" className="action-btn" aria-label="Fermer la fenêtre" onClick={closeSupplierDialog} disabled={busy}>
              <Icon name="close" size="lg" />
            </button>
          </div>
          <p id="supplier-dialog-description" className="modal-desc">
            Seul le nom est obligatoire. Les coordonnées peuvent être complétées plus tard.
          </p>
          {offline && <p className="info-banner" role="status">L'enregistrement nécessite une connexion au serveur.</p>}
          {submitFailed && error && <p className="error-banner" role="alert">{error}</p>}
          <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)} noValidate aria-busy={busy}>
            <ErrorSummary
              errors={errors}
              labels={{
                nom: 'Nom',
                code: 'Code',
                siret: 'SIRET',
                email: 'Email',
                telephone: 'Téléphone',
                adresse: 'Adresse',
                ville: 'Ville',
                codePostal: 'Code postal',
                delaiLivraison: 'Délai',
                modeLivraison: 'Mode de livraison',
                actif: 'Actif',
              }}
            />
            <fieldset className="supplier-form-fields" disabled={busy}>
              <legend className="sr-only">Coordonnées du fournisseur</legend>
              <div className="form-grid-2">
                <FormInput label="Nom" name="nom" error={errors.nom?.message} register={register} required />
                <FormInput label="Code" name="code" error={errors.code?.message} register={register} />
                <FormInput label="SIRET" name="siret" error={errors.siret?.message} register={register} inputMode="numeric" maxLength={14} pattern="[0-9]{14}" hint="Facultatif, 14 chiffres sans espaces." />
                <FormInput label="Email" name="email" error={errors.email?.message} type="email" register={register} />
                <FormInput label="Téléphone" name="telephone" error={errors.telephone?.message} type="tel" register={register} />
                <FormInput label="Adresse" name="adresse" error={errors.adresse?.message} register={register} />
                <FormInput label="Ville" name="ville" error={errors.ville?.message} register={register} />
                <FormInput label="Code postal" name="codePostal" error={errors.codePostal?.message} register={register} />
                <FormInput label="Délai (jours)" name="delaiLivraison" error={errors.delaiLivraison?.message} type="number" min={0} step="1" register={register} />
                <FormSelect label="Mode de livraison" name="modeLivraison" error={errors.modeLivraison?.message} register={register} options={LIVRAISON_MODES} />
              </div>
              <div className="form-actions">
                <FormCheckbox label="Actif" name="actif" register={register} />
                <button type="button" className="secondary-button supplier-form-reset" onClick={() => reset(editingRow ? fournisseurFormValues(editingRow) : EMPTY_FOURNISSEUR)}>
                  {editingRow ? 'Rétablir' : 'Effacer'}
                </button>
                <button type="button" className="secondary-button" onClick={closeSupplierDialog}>Annuler</button>
                <button type="submit" className="primary-button">
                  <Icon name={editingRow ? 'check' : 'plus'} size="sm" /> {busy ? 'Enregistrement…' : editingRow ? 'Enregistrer' : 'Ajouter le fournisseur'}
                </button>
              </div>
            </fieldset>
          </form>
        </dialog>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id.toString()}
        emptyMessage="Aucun fournisseur."
        loading={loading}
        caption="Fournisseurs"
      />

      <ConfirmDialog {...dialogProps} />
    </PageLayout>
  )
}
