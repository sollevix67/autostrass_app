/**
 * Vue caisse : ouverture, suivi et cloture.
 *
 * Une page, trois etats successifs — c'est le fil d'une journee de depot :
 * 1. **aucune session** : on compte le fond et on ouvre ;
 * 2. **session ouverte** : on encaisse, et on voit le solde du tiroir ;
 * 3. **session cloturee** : on compare le comptage au theorique et on clot.
 *
 * Le caissier n'a donc jamais a choisir son etat : la page montre ce qu'il lui
 * reste a faire. Le bouton de validation porte l'action attendue
 * (« Ouvrir la caisse », « Cloturer la caisse »), jamais un libelle generique.
 *
 * Le montant d'entree est **le comptage physique**. Il n'est jamais repris
 * d'un calcul : c'est tout le principe du controle de caisse, et un total
 * « calcule puis saisi » ne controlerait rien.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { Icon } from '../components/Icon'
import { ResourceBanners } from '../components/ResourceBanners'
import { ErrorSummary } from '../components/forms/ErrorSummary'
import { FormInput, FormTextarea, type FieldRegister } from '../components/forms/FormFields'
import { useCashSession, useCashMovements } from '../hooks/useCashSession'
import { useAuth, canWrite } from '../components/useAuth'
import {
  caisseClotureSchema,
  caisseOuvertureSchema,
  type CaisseClotureFormValues,
  type CaisseOuvertureFormValues,
} from '../schemas'
import { CASH_DENOMINATIONS, CASH_MOVEMENT_LABELS, formatDenomination, formatEuros } from '../options'
import type { ApiCashMovement } from '../services/contracts'

const OPENING_LABELS = { fondsCaisse: 'Fond de caisse', notes: 'Notes' } satisfies Record<string, string>
const CLOSING_LABELS = { comptage: 'Comptage', notes: 'Notes' } satisfies Record<string, string>

/** Signe d'un ecart, avec un libelle explicite. `0` n'est ni plus ni moins. */
function varianceLabel(ecart: number): { text: string; tone: 'ok' | 'warn' | 'bad' } {
  if (ecart === 0) return { text: 'Comptage conforme', tone: 'ok' }
  return ecart > 0
    ? { text: `Excédent de ${formatEuros(ecart)}`, tone: 'warn' }
    : { text: `Déficit de ${formatEuros(Math.abs(ecart))}`, tone: 'bad' }
}

export default function CaisseView() {
  const { user } = useAuth()
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const { session, loading, saving, error, reload, open, close } = useCashSession()

  const { movements } = useCashMovements(session?.id ?? null)

  const canEdit = canWrite(user?.role, 'caisse')

  // --- Formulaire d'ouverture ----------------------------------------------
  const opening = useForm<CaisseOuvertureFormValues>({
    resolver: zodResolver(caisseOuvertureSchema),
    defaultValues: { fondsCaisse: 150, notes: '' },
    mode: 'onSubmit',
  })
  const openingRegister = opening.register as unknown as FieldRegister

  // --- Formulaire de cloture ------------------------------------------------
  // Le comptage est pre-rempli avec les coupures courantes a quantite nulle :
  // le caissier remplit ce qu'il compte, il n'a pas a construire une liste.
  const closing = useForm<CaisseClotureFormValues>({
    resolver: zodResolver(caisseClotureSchema),
    defaultValues: {
      comptage: CASH_DENOMINATIONS.map((denomination) => ({ denomination, quantite: 0 })),
      notes: '',
    },
    mode: 'onSubmit',
  })
  const closingRegister = closing.register as unknown as FieldRegister
  const { fields: countFields } = useFieldArray({ control: closing.control, name: 'comptage' })

  const watchedCount = closing.watch('comptage')
  const totalComptage = useMemo(
    () => (watchedCount ?? []).reduce((sum, line) => sum + (line.denomination || 0) * (line.quantite || 0), 0),
    [watchedCount],
  )

  // Le solde theorique du tiroir, tant que la session est ouverte : fond
  // remis + especes encaissees. La monnaie rendue est deja deduite par le
  // serveur dans `totalEspeces`.
  const soldeTheorique = (session?.fondsCaisse ?? 0) + (session?.totalEspeces ?? 0)

  const submitOpening = opening.handleSubmit(async (values) => {
    const created = await open(values.fondsCaisse, values.notes)
    if (created === null) return
    opening.reset({ fondsCaisse: 150, notes: '' })
    toast.success(`Caisse ouverte avec ${formatEuros(created.fondsCaisse)} de fond.`)
  })

  const submitClosing = closing.handleSubmit(async (values) => {
    // Le comptage ne garde que les coupures reellement comptees : envoyer les
    // lignes a zero gonflerait le journal pour rien.
    const comptage = values.comptage.filter((line) => line.quantite > 0)
    const closed = await close(comptage, values.notes)
    if (closed === null) return

    const ecart = closed.ecart ?? 0
    const verdict = varianceLabel(ecart)
    closing.reset({
      comptage: CASH_DENOMINATIONS.map((denomination) => ({ denomination, quantite: 0 })),
      notes: '',
    })
    if (ecart === 0) toast.success(`Caisse cloturee : ${verdict.text.toLowerCase()}.`)
    else toast.error(`Caisse cloturee avec un ecart : ${verdict.text.toLowerCase()}.`)
  })

  const askClosing = () => {
    const ecart = totalComptage - soldeTheorique
    confirm(
      'Cloturer la caisse ?',
      <>
        Vous comptez <strong>{formatEuros(totalComptage)}</strong> pour un theorique de{' '}
        <strong>{formatEuros(soldeTheorique)}</strong>
        {ecart !== 0 && (
          <>
            {' '}— soit un {varianceLabel(ecart).text.toLowerCase().replace('€', 'EUR')}. La session
            sera fermee et ne pourra plus recevoir de vente.
          </>
        )}
        . Vous pourrez saisir un commentaire pour expliquer l'ecart.
      </>,
      () => {
        // La validation reelle est faite par le formulaire : le dialogue
        // confirme l'intention, les valeurs viennent des champs.
        void submitClosing()
      },
    )
  }

  const movementColumns: ColumnDef<ApiCashMovement>[] = [
    {
      key: 'createdAt',
      header: 'HEURE',
      sortable: true,
      sortValue: (row) => row.createdAt,
      render: (row) => new Date(row.createdAt).toLocaleTimeString('fr-FR'),
    },
    {
      key: 'type',
      header: 'TYPE',
      sortable: true,
      sortValue: (row) => row.type,
      render: (row) => <span className="type-badge">{CASH_MOVEMENT_LABELS[row.type] ?? row.type}</span>,
    },
    { key: 'libelle', header: 'LIBELLE', render: (row) => row.libelle },
    {
      key: 'montant',
      header: 'MONTANT',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.montant,
      render: (row) => (
        <b className={row.montant < 0 ? 'amount-out' : 'amount-in'}>{formatEuros(row.montant)}</b>
      ),
    },
  ]

  return (
    <PageLayout
      eyebrow="CAISSE"
      title="Gestion de caisse"
      description="Ouverture, suivi et cloture de votre session de caisse."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      <ResourceBanners error={error} offline={false} readOnly={null} />

      {!canEdit && (
        <p className="info-banner" role="note">
          <Icon name="alert" size="sm" /> La gestion de caisse est reservee a la caisse.
          Consultez l'etat de la session ci-dessous.
        </p>
      )}

      {/* --- Aucune session : ouverture ------------------------------------ */}
      {!canEdit && session === null && (
        <p className="empty-state">Aucune caisse ouverte.</p>
      )}

      {canEdit && session === null && (
        <section className="form-card">
          <h2>Ouvrir la caisse</h2>
          <form onSubmit={submitOpening} noValidate>
            <ErrorSummary errors={opening.formState.errors} labels={OPENING_LABELS} />

            <div className="form-grid-2">
              <FormInput
                label="Fond de caisse"
                name="fondsCaisse"
                type="number"
                step="0.01"
                min="0"
                register={openingRegister}
                error={opening.formState.errors.fondsCaisse?.message}
                hint="Montant remis dans le tiroir a l'ouverture."
                required
              />
              <FormTextarea
                label="Notes"
                name="notes"
                rows={3}
                register={openingRegister}
                error={opening.formState.errors.notes?.message}
                placeholder="Optionnel : consigne de depot, particularite..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={saving || loading}>
                <Icon name="check" size="sm" /> Ouvrir la caisse
              </button>
            </div>
          </form>
        </section>
      )}

      {/* --- Session ouverte : suivi et comptage --------------------------- */}
      {session !== null && (
        <>
          <section className="caisse-summary" aria-label="Etat de la session">
            <div className="caisse-card">
              <span className="caisse-card-label">Session</span>
              <strong className="caisse-card-value">#{session.id}</strong>
              <span className="caisse-card-note">
                Ouverte le {new Date(session.openedAt).toLocaleString('fr-FR')}
              </span>
            </div>
            <div className="caisse-card">
              <span className="caisse-card-label">Fond de caisse</span>
              <strong className="caisse-card-value">{formatEuros(session.fondsCaisse)}</strong>
              <span className="caisse-card-note">Remis a l'ouverture</span>
            </div>
            <div className="caisse-card">
              <span className="caisse-card-label">Encaissements especes</span>
              <strong className="caisse-card-value">{formatEuros(session.totalEspeces)}</strong>
              <span className="caisse-card-note">{session.nombreVentes} vente(s) — carte et cheque exclus</span>
            </div>
            <div className="caisse-card accent">
              <span className="caisse-card-label">Solde theorique du tiroir</span>
              <strong className="caisse-card-value">{formatEuros(soldeTheorique)}</strong>
              <span className="caisse-card-note">A comparer au comptage</span>
            </div>
          </section>

          {canEdit && (
            <section className="form-card">
              <h2>Cloturer la caisse</h2>
              <form onSubmit={submitClosing} noValidate>
                <ErrorSummary errors={closing.formState.errors} labels={CLOSING_LABELS} />

                <h3 className="sub-heading">Comptage des billets et pieces</h3>
                <p className="form-hint">
                  Comptez le contenu reel du tiroir et saisissez les quantites. Le total calcule
                  ci-dessous n'est qu'une aide : c'est votre saisie qui fait foi.
                </p>

                <div className="comptage-grid">
                  {countFields.map((field, index) => (
                    <div key={field.id} className="comptage-row">
                      <label htmlFor={`comptage-${index}-denomination`} className="sr-only">
                        Denomination
                      </label>
                      <span className="comptage-coupure">{formatDenomination(field.denomination)}</span>
                      <FormInput
                        label="Quantite"
                        name={`comptage.${index}.quantite`}
                        type="number"
                        min="0"
                        register={closingRegister}
                        error={closing.formState.errors.comptage?.[index]?.quantite?.message}
                      />
                    </div>
                  ))}
                </div>

                <div className="reception-total">
                  <strong>Total compte : {formatEuros(totalComptage)}</strong>
                  <span className="muted">
                    {' '}
                    — theorique {formatEuros(soldeTheorique)}
                    {totalComptage !== soldeTheorique && ` (ecart ${varianceLabel(totalComptage - soldeTheorique).text})`}
                  </span>
                </div>

                <FormTextarea
                  label="Commentaire de cloture"
                  name="notes"
                  rows={3}
                  register={closingRegister}
                  error={closing.formState.errors.notes?.message}
                  placeholder="Optionnel : motif de l'ecart, incident de comptage..."
                />

                <div className="form-actions">
                  <button
                    type="button"
                    className="danger-button"
                    onClick={askClosing}
                    disabled={saving}
                  >
                    <Icon name="check" size="sm" /> Cloturer la caisse
                  </button>
                </div>
              </form>
            </section>
          )}

          <DataTable
            columns={movementColumns}
            rows={movements}
            rowKey={(row) => String(row.id)}
            caption="Journal des mouvements de la session"
            emptyMessage="Aucun mouvement enregistre."
            defaultSort={{ key: 'createdAt', direction: 'desc' }}
          />
        </>
      )}

      <ConfirmDialog {...dialogProps} confirmLabel="Cloturer" destructive />
    </PageLayout>
  )
}
