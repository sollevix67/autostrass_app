/**
 * Vue utilisateurs : comptes, roles et activation.
 *
 * Branchee sur l'API (`/api/utilisateurs`), qui est reservee a l'administrateur
 * — le backend repond 403 a toute autre tentative, le cache-fou est donc
 * purement cosmetique.
 *
 * Particularite : la creation exige un mot de passe cote serveur. Il n'est
 * demande qu'a la creation, jamais renvoye par l'API, et n'est pas pre-rempli a
 * la modification : on ne modifie un compte que pour ce qu'on veut changer.
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
import { utilisateurSchema, type UtilisateurFormValues } from '../schemas'
import { ROLE_OPTIONS } from '../options'
import type { ApiUtilisateur } from '../services/contracts'

const EMPTY_USER: UtilisateurFormValues = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  role: 'magasinier',
  motDePasse: '',
}

const FIELD_LABELS = {
  nom: 'Nom',
  prenom: 'Prenom',
  email: 'Email',
  telephone: 'Telephone',
  role: 'Role',
  motDePasse: 'Mot de passe',
} satisfies Record<string, string>

const byName = (rows: ApiUtilisateur[]) =>
  [...rows].sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'))

export default function UtilisateursView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const { rows, loading, saving, error, offline, reload, create, update, remove } = useResource<ApiUtilisateur>({
    path: '/utilisateurs',
    sort: byName,
  })

  const form = useForm<UtilisateurFormValues>({
    resolver: zodResolver(utilisateurSchema),
    defaultValues: EMPTY_USER,
    mode: 'onSubmit',
  })
  const register = form.register as unknown as FieldRegister

  const [patching, setPatching] = useState<number | null>(null)

  const isAdmin = canWrite(user?.role, 'admin')

  async function handleSubmit(values: UtilisateurFormValues) {
    const created = await create({
      nom: values.nom,
      prenom: values.prenom,
      email: values.email,
      telephone: values.telephone,
      role: values.role,
      motDePasse: values.motDePasse,
    })
    if (created === null) return
    // Le mot de passe n'est jamais renvoye par l'API : le vider evite qu'il
    // reste dans le DOM et soit renvoye tel quel lors d'une modification.
    form.reset(EMPTY_USER)
    toast.success(`Compte cree pour ${created.email}.`)
  }

  /**
   * Bascule l'activation d'un compte.
   *
   * Le serveur refuse (409 `SELF_LOCKOUT`) qu'un administrateur se desactive
   * lui-meme : le depot resterait sans personne pour le gerer. L'etat du
   * bouton reflecting desactive des le depart, et le refus remonte en toast.
   */
  async function toggleActive(utilisateur: ApiUtilisateur) {
    if (utilisateur.id === user?.id) {
      toast.error('Vous ne pouvez pas desactiver votre propre compte.')
      return
    }
    setPatching(utilisateur.id)
    const updated = await update(utilisateur.id, { actif: !utilisateur.actif })
    setPatching(null)
    if (updated === null) return
    toast.success(
      updated.actif
        ? `Compte de ${updated.email} active.`
        : `Compte de ${updated.email} desactive.`,
    )
  }

  const handleDelete = (utilisateur: ApiUtilisateur) => {
    if (utilisateur.id === user?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte.')
      return
    }
    confirm(
      'Supprimer ce compte ?',
      <>
        Le compte de <strong>{utilisateur.prenom} {utilisateur.nom}</strong> ({utilisateur.email})
        sera supprime. Ses jetons de session deviennent invalides immediatement.
      </>,
      () => {
        void remove(utilisateur.id).then((deleted) => {
          if (deleted) toast.success(`Compte ${utilisateur.email} supprime.`)
        })
      },
    )
  }

  const columns: ColumnDef<ApiUtilisateur>[] = [
    {
      key: 'nom',
      header: 'NOM',
      sortable: true,
      sortValue: (row) => `${row.nom} ${row.prenom}`,
      render: (row) => <b>{row.prenom} {row.nom}</b>,
    },
    { key: 'email', header: 'EMAIL', sortable: true, sortValue: (row) => row.email, render: (row) => row.email },
    {
      key: 'telephone',
      header: 'TELEPHONE',
      sortable: true,
      sortValue: (row) => row.telephone ?? '',
      render: (row) => row.telephone || '—',
    },
    { key: 'role', header: 'ROLE', sortable: true, sortValue: (row) => row.role, render: (row) => <span className="role-badge">{row.role}</span> },
    {
      key: 'actif',
      header: 'ACTIF',
      sortable: true,
      sortValue: (row) => (row.actif ? 1 : 0),
      render: (row) => {
        // Pas de controle sur son propre compte : le serveur l'interdit, mieux
        // vaut ne pas proposer un bouton qui echouerait.
        const isSelf = row.id === user?.id
        return (
          <button
            type="button"
            className={`toggle-btn ${row.actif ? 'active' : ''}`}
            aria-pressed={row.actif}
            disabled={!isAdmin || isSelf || saving || patching === row.id}
            title={isSelf ? 'Vous ne pouvez pas desactiver votre propre compte' : undefined}
            onClick={() => void toggleActive(row)}
          >
            {row.actif ? 'Oui' : 'Non'}
          </button>
        )
      },
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '60px',
      render: (row) =>
        isAdmin && row.id !== user?.id ? (
          <button
            type="button"
            className="action-btn delete"
            onClick={() => handleDelete(row)}
            disabled={saving}
            title="Supprimer"
            aria-label={`Supprimer le compte ${row.email}`}
          >
            <Icon name="trash" size="sm" />
          </button>
        ) : null,
    },
  ]

  return (
    <PageLayout
      eyebrow="ADMINISTRATION"
      title="Utilisateurs et droits"
      description="Gerez les acces et les droits de chaque utilisateur."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      <ResourceBanners
        error={error}
        offline={offline}
        readOnly={
          isAdmin
            ? null
            : "La gestion des comptes est reservee a l'administrateur. Consultez la liste ci-dessous."
        }
        resource="utilisateurs"
      />

      {isAdmin && (
        <section className="form-card">
          <h2>Nouvel utilisateur</h2>
          <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            <ErrorSummary errors={form.formState.errors} labels={FIELD_LABELS} />

            <div className="form-grid-2">
              <FormInput label="Nom" name="nom" register={register} error={form.formState.errors.nom?.message} required />
              <FormInput label="Prenom" name="prenom" register={register} error={form.formState.errors.prenom?.message} required />
              <FormInput
                label="Email"
                name="email"
                type="email"
                register={register}
                error={form.formState.errors.email?.message}
                required
              />
              <FormInput
                label="Telephone"
                name="telephone"
                type="tel"
                register={register}
                error={form.formState.errors.telephone?.message}
              />
              <FormSelect
                label="Role"
                name="role"
                register={register}
                options={ROLE_OPTIONS}
                error={form.formState.errors.role?.message}
                required
              />
              <FormInput
                label="Mot de passe"
                name="motDePasse"
                type="password"
                register={register}
                error={form.formState.errors.motDePasse?.message}
                hint="8 caracteres minimum. Communiquez-le a l'utilisateur par un canal sur."
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving || form.formState.isSubmitting}
              >
                <Icon name="plus" size="sm" /> Creer le compte
              </button>
              <button type="button" className="secondary-button" onClick={() => form.reset(EMPTY_USER)}>
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
        caption="Comptes utilisateurs et roles"
        loading={loading}
        emptyMessage="Aucun utilisateur enregistre."
        defaultSort={{ key: 'nom', direction: 'asc' }}
      />

      <ConfirmDialog {...dialogProps} confirmLabel="Supprimer" destructive />
    </PageLayout>
  )
}
