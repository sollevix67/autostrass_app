/**
 * Vue vehicules : parc automobile du depot.
 *
 * Branchee sur l'API (`/api/vehicules`). Meme patron que `ClientsView` :
 * React Hook Form + Zod, resume d'erreurs focusable, tableau triable et
 * suppression confirmee par `ConfirmDialog`.
 *
 * L'ecriture est reservee au depot : un caissier consulte le parc mais ne le
 * modifie pas.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
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
import { useAuth, canWrite } from '../components/useAuth'
import { vehiculeSchema, type VehiculeFormValues } from '../schemas'
import { VEHICLE_TYPE_OPTIONS, VEHICLE_STATUS_OPTIONS, formatInteger } from '../options'
import type { ApiVehicule } from '../services/contracts'

/** Valeurs initiales du formulaire : jamais de champ `undefined`. */
const EMPTY_VEHICULE: VehiculeFormValues = {
  immatriculation: '',
  marque: '',
  modele: '',
  annee: new Date().getFullYear(),
  type: 'voiture',
  kilometrage: 0,
  proprietaire: '',
  statut: 'disponible',
}

const FIELD_LABELS = {
  immatriculation: 'Immatriculation',
  marque: 'Marque',
  modele: 'Modele',
  annee: 'Annee',
  type: 'Type',
  kilometrage: 'Kilometrage',
  proprietaire: 'Proprietaire',
  statut: 'Statut',
} satisfies Record<string, string>

/** Tri par immatriculation : ordre de lecture d'un registre de parc. */
const byImmatriculation = (rows: ApiVehicule[]) =>
  [...rows].sort((a, b) => a.immatriculation.localeCompare(b.immatriculation, 'fr'))

/** Retire les separateurs d'une immatriculation pour les comparaisons. */
const compact = (value: string) => value.replace(/[\s-]/g, '')

/** Champs modifiables depuis le tableau, via une edition ciblee. */
type VehiclePatch = Partial<
  Pick<ApiVehicule, 'marque' | 'modele' | 'annee' | 'type' | 'kilometrage' | 'proprietaire' | 'statut'>
>

export default function VehiculesView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const { rows, loading, saving, error, offline, reload, create, update, remove } = useResource<ApiVehicule>({
    path: '/vehicules',
    sort: byImmatriculation,
  })

  const form = useForm<VehiculeFormValues>({
    resolver: zodResolver(vehiculeSchema),
    defaultValues: EMPTY_VEHICULE,
    mode: 'onSubmit',
  })
  const register = form.register as unknown as FieldRegister

  // L'identifiant de la ligne en cours de patch : sans lui, le `select` de
  // statut ne sait pas quelle ligne est en attente de reponse.
  const [patching, setPatching] = useState<number | null>(null)

  const canEdit = canWrite(user?.role, 'depot')

  async function handleSubmit(values: VehiculeFormValues) {
    if (duplicateImmatriculation(values.immatriculation)) {
      toast.error('Cette immatriculation est deja presente dans le parc.')
      return
    }
    const created = await create(values)
    if (created === null) return
    form.reset(EMPTY_VEHICULE)
    toast.success(`Vehicule ${created.immatriculation} enregistre.`)
  }

  /**
   * Applique une modification d'un seul champ.
   *
   * L'API expose un `PUT` ou toutes les clefs sont optionnelles. On repart
   * donc de la ligne courante et on ne change que le champ vise : la
   * validation serveur reste satisfaite sans retransmettre le formulaire, et
   * la ligne conserve les champs que l'API a renvoyes.
   */
  async function patchVehicle(vehicule: ApiVehicule, patch: VehiclePatch, message: string) {
    setPatching(vehicule.id)
    const updated = await update(vehicule.id, { ...vehicule, ...patch })
    setPatching(null)
    if (updated !== null) toast.success(message)
  }

  /**
   * Signale une immatriculation deja prise.
   *
   * La base ne porte pas de contrainte d'unicite sur cette colonne : deux
   * lignes identiques y seraient acceptees et le parc deviendrait ambigu.
   * La verification est donc faite ici, ou l'utilisateur peut la voir, et
   * l'ecriture est refusee avant l'appel reseau.
   */
  function duplicateImmatriculation(value: string): boolean {
    if (value.trim() === '') return false
    const target = compact(value)
    return rows.some((row) => compact(row.immatriculation) === target)
  }

  const handleDelete = (vehicule: ApiVehicule) => {
    confirm(
      'Supprimer ce vehicule ?',
      <>
        Le vehicule <strong>{vehicule.immatriculation}</strong> ({vehicule.marque} {vehicule.modele})
        sera retire du parc.
      </>,
      () => {
        void remove(vehicule.id).then((deleted) => {
          if (deleted) toast.success(`Vehicule ${vehicule.immatriculation} supprime.`)
        })
      },
    )
  }

  const columns: ColumnDef<ApiVehicule>[] = [
    {
      key: 'immatriculation',
      header: 'IMMATRICULATION',
      sortable: true,
      sortValue: (row) => row.immatriculation,
      render: (row) => <b>{row.immatriculation}</b>,
    },
    {
      key: 'vehicule',
      header: 'VEHICULE',
      sortable: true,
      sortValue: (row) => `${row.marque} ${row.modele}`,
      render: (row) => (
        <span>
          {row.marque} {row.modele}
        </span>
      ),
    },
    { key: 'annee', header: 'ANNEE', align: 'right', sortable: true, sortValue: (row) => row.annee, render: (row) => row.annee },
    { key: 'type', header: 'TYPE', sortable: true, sortValue: (row) => row.type, render: (row) => row.type },
    {
      key: 'kilometrage',
      header: 'KILOMETRAGE',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.kilometrage,
      render: (row) => <span>{formatInteger(row.kilometrage)} km</span>,
    },
    {
      key: 'proprietaire',
      header: 'PROPRIETAIRE',
      sortable: true,
      sortValue: (row) => row.proprietaire,
      render: (row) => row.proprietaire,
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
            aria-label={`Statut du vehicule ${row.immatriculation}`}
            onChange={(event) => {
              const value = event.target.value as ApiVehicule['statut']
              void patchVehicle(row, { statut: value }, `${row.immatriculation} : statut mis a jour.`)
            }}
          >
            {VEHICLE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <span className={`status-badge status-${row.statut.replace(/\s/g, '')}`}>{row.statut}</span>
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
            aria-label={`Supprimer le vehicule ${row.immatriculation}`}
          >
            <Icon name="trash" size="sm" />
          </button>
        ) : null,
    },
  ]

  return (
    <PageLayout
      eyebrow="VEHICULES"
      title="Gestion des vehicules"
      description="Suivez le parc automobile du depot."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      <ResourceBanners
        error={error}
        offline={offline}
        readOnly={canEdit ? null : 'La saisie de vehicules est reservee au depot. Consultez le parc ci-dessous.'}
        resource="vehicules"
      />

      {canEdit && (
        <section className="form-card">
          <h2>Nouveau vehicule</h2>
          <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            <ErrorSummary errors={form.formState.errors} labels={FIELD_LABELS} />

            <div className="form-grid-2">
              <FormInput
                label="Immatriculation"
                name="immatriculation"
                register={register}
                error={form.formState.errors.immatriculation?.message}
                required
                placeholder="AB-123-CD"
              />
              <FormInput
                label="Marque"
                name="marque"
                register={register}
                error={form.formState.errors.marque?.message}
                required
              />
              <FormInput
                label="Modele"
                name="modele"
                register={register}
                error={form.formState.errors.modele?.message}
                required
              />
              <FormInput
                label="Annee"
                name="annee"
                type="number"
                register={register}
                error={form.formState.errors.annee?.message}
                required
              />
              <FormSelect
                label="Type"
                name="type"
                register={register}
                options={VEHICLE_TYPE_OPTIONS}
                error={form.formState.errors.type?.message}
                required
              />
              <FormInput
                label="Kilometrage"
                name="kilometrage"
                type="number"
                register={register}
                error={form.formState.errors.kilometrage?.message}
                required
              />
              <FormInput
                label="Proprietaire"
                name="proprietaire"
                register={register}
                error={form.formState.errors.proprietaire?.message}
                required
              />
              <FormSelect
                label="Statut"
                name="statut"
                register={register}
                options={VEHICLE_STATUS_OPTIONS}
                error={form.formState.errors.statut?.message}
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving || form.formState.isSubmitting}
              >
                <Icon name="plus" size="sm" /> Ajouter le vehicule
              </button>
              <button type="button" className="secondary-button" onClick={() => form.reset(EMPTY_VEHICULE)}>
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
        caption="Parc automobile du depot"
        loading={loading}
        emptyMessage="Aucun vehicule enregistre."
        defaultSort={{ key: 'immatriculation', direction: 'asc' }}
      />

      <ConfirmDialog {...dialogProps} confirmLabel="Supprimer" destructive />
    </PageLayout>
  )
}
