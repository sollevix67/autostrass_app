/**
 * Vue fournisseurs : liste, creation, mise a jour et suppression.
 *
 * Branchee sur l'API (`/api/fournisseurs`). Le formulaire suit le meme
 * patron que le catalogue : React Hook Form + Zod, resume d'erreurs
 * focusable, et suppression confirmee via `ConfirmDialog` plutot que
 * `window.confirm`.
 *
 * L'ecriture est reservee au depot : un caissier voit la liste mais pas le
 * formulaire de creation. Le bouton reste visible et desactive plutot que
 * masque, pour que la limite de droits soit lisible sans deviner.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
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
import { fournisseurSchema, type FournisseurFormOutput } from '../schemas'
import type { ApiFournisseur } from '../services/contracts'

/** Valeurs initiales du formulaire : jamais de champ `undefined`. */
const EMPTY_FOURNISSEUR = {
  nom: '',
  code: '',
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

/** Tri alphabétique, l'ordre naturel de lecture d'un annuaire. */
const byNom = (rows: ApiFournisseur[]) => [...rows].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

export default function FournisseursView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const { rows, loading, saving, error, offline, reload, create, update, remove } = useResource<ApiFournisseur>({
    path: '/fournisseurs',
    sort: byNom,
  })

  // `register` de RHF est contravariant sur le nom de champ : on elargit
  // l'instance pour que `FormInput` reste reutilisable.
  const form = useForm<FournisseurFormOutput>({
      resolver: zodResolver(fournisseurSchema) as any,
      defaultValues: EMPTY_FOURNISSEUR,
    mode: 'onSubmit',
  })
  const register = form.register as unknown as FieldRegister

  const canEdit = canWrite(user?.role, 'depot')

  async function handleSubmit(values: FournisseurFormOutput) {
      const created = await create(values)
      if (created === null) return
      form.reset(EMPTY_FOURNISSEUR)
      toast.success(`Fournisseur ${created.nom} enregistre.`)
    }

    async function handleDelete(fournisseur: ApiFournisseur) {
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
          <button type="button" className="action-btn edit" onClick={() => startEditing(row)} title="Modifier" aria-label={`Modifier ${row.nom}`}>
            <Icon name="edit" size="sm" />
          </button>
          <button type="button" className="action-btn delete" onClick={() => handleDelete(row)} disabled={saving} title="Supprimer" aria-label={`Supprimer ${row.nom}`}>
            <Icon name="trash" size="sm" />
          </button>
        </div>
      ),
    },
  ]

  const [editingRow, setEditingRow] = useState<ApiFournisseur | null>(null)

  function startEditing(row: ApiFournisseur) {
    setEditingRow(row)
    form.reset({
      nom: row.nom,
      code: row.code ?? '',
      email: row.email ?? '',
      telephone: row.telephone ?? '',
      adresse: row.adresse ?? '',
      ville: row.ville ?? '',
      codePostal: row.codePostal ?? '',
      delaiLivraison: row.delaiLivraison,
      modeLivraison: row.modeLivraison,
      actif: row.actif,
    })
  }

  function cancelEditing() {
    setEditingRow(null)
    form.reset(EMPTY_FOURNISSEUR)
  }

  const [savingEdit, setSavingEdit] = useState(false)

  async function handleSaveEdit() {
    if (!editingRow) return
    setSavingEdit(true)
    const ok = await update(editingRow.id, {
          nom: form.getValues().nom,
          code: form.getValues().code,
          email: form.getValues().email,
          telephone: form.getValues().telephone,
          adresse: form.getValues().adresse,
          ville: form.getValues().ville,
          codePostal: form.getValues().codePostal,
          delaiLivraison: form.getValues().delaiLivraison,
          modeLivraison: form.getValues().modeLivraison,
          actif: form.getValues().actif,
    })
    setSavingEdit(false)
    if (ok) {
      toast.success(`Fournisseur ${editingRow.nom} mis a jour.`)
      setEditingRow(null)
    } else {
      toast.error(`Echec de la mise a jour de ${editingRow.nom}.`)
    }
  }

  return (
    <PageLayout
      eyebrow="FOURNISSEURS"
      title="Gestion des fournisseurs"
      description="Consultez et gérez votre base de fournisseurs."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      {offline && (
        <p className="info-banner" role="status">
          API fournisseurs indisponible : affichage local uniquement, les modifications ne sont pas
          enregistrees.
        </p>
      )}
      {error !== null && <p className="error-banner" role="alert">{error}</p>}

      {editingRow ? (
        <form className="form-card" onSubmit={form.handleSubmit(handleSaveEdit)} noValidate>
          <h2>Modifier {editingRow.nom}</h2>

          <ErrorSummary
            errors={form.formState.errors}
            labels={{
              nom: 'Nom',
              code: 'Code',
              email: 'Email',
              telephone: 'Telephone',
              adresse: 'Adresse',
              ville: 'Ville',
              codePostal: 'Code postal',
              delaiLivraison: 'Delai',
              modeLivraison: 'Mode de livraison',
              actif: 'Actif',
            }}
          />

          <div className="form-grid-2">
            <FormInput label="Nom" name="nom" register={register} required />
            <FormInput label="Code" name="code" register={register} />
            <FormInput label="Email" name="email" type="email" register={register} />
            <FormInput label="Telephone" name="telephone" type="tel" register={register} />
            <FormInput label="Adresse" name="adresse" register={register} />
            <FormInput label="Ville" name="ville" register={register} />
            <FormInput label="Code postal" name="codePostal" register={register} />
            <FormInput label="Delai (jours)" name="delaiLivraison" type="number" register={register} />
            <FormSelect label="Mode de livraison" name="modeLivraison" register={register} options={LIVRAISON_MODES} />
          </div>

          <div className="form-actions">
            <FormCheckbox label="Actif" name="actif" register={register} defaultChecked={editingRow.actif} />
            <button type="submit" className="primary-button" disabled={savingEdit || form.formState.isSubmitting}>
              <Icon name="check" size="sm" /> Enregistrer
            </button>
            <button type="button" className="secondary-button" onClick={cancelEditing}>
              Annuler
            </button>
          </div>
        </form>
      ) : canEdit ? (
        <form className="form-card" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <h2>Nouveau fournisseur</h2>

          <ErrorSummary
            errors={form.formState.errors}
            labels={{
              nom: 'Nom',
              code: 'Code',
              email: 'Email',
              telephone: 'Telephone',
              adresse: 'Adresse',
              ville: 'Ville',
              codePostal: 'Code postal',
              delaiLivraison: 'Delai',
              modeLivraison: 'Mode de livraison',
              actif: 'Actif',
            }}
          />

          <div className="form-grid-2">
            <FormInput label="Nom" name="nom" register={register} required />
            <FormInput label="Code" name="code" register={register} />
            <FormInput label="Email" name="email" type="email" register={register} />
            <FormInput label="Telephone" name="telephone" type="tel" register={register} />
            <FormInput label="Adresse" name="adresse" register={register} />
            <FormInput label="Ville" name="ville" register={register} />
            <FormInput label="Code postal" name="codePostal" register={register} />
            <FormInput label="Delai (jours)" name="delaiLivraison" type="number" register={register} />
            <FormSelect label="Mode de livraison" name="modeLivraison" register={register} options={LIVRAISON_MODES} />
          </div>

          <div className="form-actions">
            <FormCheckbox label="Actif" name="actif" register={register} defaultChecked />
            <button type="submit" className="primary-button" disabled={saving || form.formState.isSubmitting}>
              <Icon name="plus" size="sm" /> Ajouter le fournisseur
            </button>
            <button type="button" className="secondary-button" onClick={() => form.reset(EMPTY_FOURNISSEUR)}>
              Effacer
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="secondary-button" disabled>
          Creation reservee au depot
        </button>
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
