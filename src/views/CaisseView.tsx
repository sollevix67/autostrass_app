/**
 * Vue caisse : ouverture, suivi et clôture.
 *
 * Une page, trois etats successifs — c'est le fil d'une journee de depot :
 * 1. **aucune session** : on compte le fond et on ouvre ;
 * 2. **session ouverte** : on encaisse, et on voit le solde du tiroir ;
 * 3. **session clôturée** : on compare le comptage au théorique et on clôt.
 *
 * Le caissier n'a donc jamais à choisir son état : la page montre ce qu'il lui
 * reste a faire. Le bouton de validation porte l'action attendue
 * (« Ouvrir la caisse », « Clôturer la caisse »), jamais un libellé générique.
 *
 * Le montant d'entree est **le comptage physique**. Il n'est jamais repris
 * d'un calcul : c'est tout le principe du controle de caisse, et un total
 * « calcule puis saisi » ne controlerait rien.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { useToast } from '../components/useToast'
import { Icon } from '../components/Icon'
import { ResourceBanners } from '../components/ResourceBanners'
import { ErrorSummary } from '../components/forms/ErrorSummary'
import { CashCountFields } from '../components/forms/CashCountFields'
import { FormTextarea, type FieldRegister } from '../components/forms/FormFields'
import { useCashSession, useCashMovements } from '../hooks/useCashSession'
import { useRemoteValue } from '../hooks/useRemoteValue'
import { FormDialog } from '../components/FormDialog'
import { useAuth, canWrite } from '../components/useAuth'
import {
  caisseClotureSchema,
  caisseOuvertureComptageSchema,
  type CaisseClotureFormOutput,
} from '../schemas'
import { CASH_DENOMINATIONS, CASH_MOVEMENT_LABELS, formatEuros } from '../options'
import { totalCashCount } from '../utils/cashCounting'
import type { ApiCashMovement } from '../services/contracts'
import type { CaisseSettings } from '../schemas/parametres'

const OPENING_LABELS = { comptage: 'Comptage du fond de caisse', notes: 'Notes' } satisfies Record<string, string>
const CLOSING_LABELS = { comptage: 'Comptage', notes: 'Notes' } satisfies Record<string, string>
const EMPTY_COUNT = {
  comptage: CASH_DENOMINATIONS.map((denomination) => ({ denomination, quantite: 0 })),
  notes: '',
}

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
  const { session, loading, saving, error, reload, open, close } = useCashSession()
  const { data: caisseConfiguration, loading: configurationLoading, error: configurationError, reload: reloadConfiguration } = useRemoteValue<CaisseSettings>('/caisse/configuration')

  const { movements } = useCashMovements(session?.id ?? null)

  const canEdit = canWrite(user?.role, 'caisse')
  const [openingDialogOpen, setOpeningDialogOpen] = useState(false)

  // --- Formulaire d'ouverture ----------------------------------------------
  // Aucune ouverture tant que le plafond serveur n'a pas été chargé.
  const openingSchema = caisseOuvertureComptageSchema(caisseConfiguration?.maxFondsCaisse ?? 0)
  const opening = useForm({
    resolver: zodResolver(openingSchema),
    defaultValues: EMPTY_COUNT,
    mode: 'onSubmit',
  })
  const openingRegister = opening.register as unknown as FieldRegister
  const { fields: openingFields } = useFieldArray({ control: opening.control, name: 'comptage' })
  const openingCount = useWatch({ control: opening.control, name: 'comptage' })
  const parsedOpeningCount = openingSchema.shape.comptage.safeParse(openingCount)
  const fondsCompte = parsedOpeningCount.success ? totalCashCount(parsedOpeningCount.data) : null

  // --- Formulaire de clôture ------------------------------------------------
  // Le comptage est pre-rempli avec les coupures courantes a quantite nulle :
  // le caissier remplit ce qu'il compte, il n'a pas a construire une liste.
  const closing = useForm({
    resolver: zodResolver(caisseClotureSchema),
    defaultValues: EMPTY_COUNT,
    mode: 'onSubmit',
  })
  const closingRegister = closing.register as unknown as FieldRegister
  const { fields: countFields } = useFieldArray({ control: closing.control, name: 'comptage' })
  const { reset: resetClosing, setFocus: setClosingFocus } = closing
  const [closingDialogOpen, setClosingDialogOpen] = useState(false)
  const [closingValues, setClosingValues] = useState<CaisseClotureFormOutput | null>(null)
  const [submitFailed, setSubmitFailed] = useState(false)
  const closingDialogRef = useRef<HTMLDialogElement>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const pending = useRef(false)
  const busy = saving || opening.formState.isSubmitting || closing.formState.isSubmitting

  const watchedCount = useWatch({ control: closing.control, name: 'comptage' })
  const parsedCount = caisseClotureSchema.shape.comptage.safeParse(watchedCount)
  const totalComptage = parsedCount.success ? totalCashCount(parsedCount.data) : null

  // Le solde theorique du tiroir, tant que la session est ouverte : fond
  // remis + especes encaissees. La monnaie rendue est deja deduite par le
  // serveur dans `totalEspeces`.
  const soldeTheorique = (Math.round((session?.fondsCaisse ?? 0) * 100) + Math.round((session?.totalEspeces ?? 0) * 100)) / 100
  const ecartComptage = totalComptage === null ? null : Math.round((totalComptage - soldeTheorique) * 100) / 100
  const confirmedTotal = closingValues ? totalCashCount(closingValues.comptage) : 0
  const confirmedVariance = Math.round((confirmedTotal - soldeTheorique) * 100) / 100

  useEffect(() => {
    const dialog = closingDialogRef.current
    if (!closingDialogOpen || !canEdit || !session || !dialog) return

    const trigger = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [closingDialogOpen, canEdit, session])

  useEffect(() => {
    if (closingDialogOpen && !closingValues) setClosingFocus('comptage.0.quantite')
  }, [closingValues, closingDialogOpen, setClosingFocus])

  useEffect(() => {
    if (closingValues && !busy) backButtonRef.current?.focus()
  }, [closingValues, busy])

  function openClosingDialog() {
    if (!canEdit || !session || busy || loading || pending.current) return
    resetClosing(EMPTY_COUNT)
    setClosingValues(null)
    setSubmitFailed(false)
    setClosingDialogOpen(true)
  }

  const closeClosingDialog = useCallback(() => {
    if (busy || pending.current) return
    setClosingDialogOpen(false)
    setClosingValues(null)
    setSubmitFailed(false)
    resetClosing(EMPTY_COUNT)
  }, [busy, resetClosing])

  const backToCounting = useCallback(() => {
    if (busy || pending.current) return
    setClosingValues(null)
  }, [busy])

  useEffect(() => {
    if (!closingDialogOpen) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      if (closingValues) backToCounting()
      else closeClosingDialog()
    }
    document.addEventListener('keydown', onEscape, true)
    return () => document.removeEventListener('keydown', onEscape, true)
  }, [closingDialogOpen, closingValues, backToCounting, closeClosingDialog])

  const submitOpening = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit || session !== null || !caisseConfiguration || configurationLoading || busy || loading || pending.current) return
    void opening.handleSubmit(async (values) => {
      if (pending.current) return
      pending.current = true
      try {
        const created = await open(totalCashCount(values.comptage), values.notes)
        if (created === null) return
        opening.reset(EMPTY_COUNT)
        setOpeningDialogOpen(false)
        toast.success(`Caisse ouverte avec ${formatEuros(created.fondsCaisse)} de fond.`)
      } finally {
        pending.current = false
      }
    })(event)
  }

  const submitClosing = async () => {
    if (!canEdit || !session || !closingValues || busy || loading || pending.current) return
    pending.current = true
    setSubmitFailed(false)
    // Le comptage ne garde que les coupures reellement comptees : envoyer les
    // lignes a zero gonflerait le journal pour rien.
    try {
      const comptage = closingValues.comptage.filter((line) => line.quantite > 0)
      const closed = await close(comptage, closingValues.notes)
      if (closed === null) {
        setSubmitFailed(true)
        setClosingValues(null)
        return
      }

      setClosingDialogOpen(false)
      setClosingValues(null)
      resetClosing(EMPTY_COUNT)
      const ecart = closed.ecart ?? 0
      const verdict = varianceLabel(ecart)
      if (ecart === 0) toast.success(`Caisse clôturée : ${verdict.text.toLowerCase()}.`)
      else toast.error(`Caisse clôturée avec un écart : ${verdict.text.toLowerCase()}.`)
    } finally {
      pending.current = false
    }
  }

  // Clic et touche Entrée valident le même comptage avant sa confirmation.
  const askClosing = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit || !session || busy || loading || pending.current) return
    void closing.handleSubmit((values) => {
      setSubmitFailed(false)
      setClosingValues(values)
    })(event)
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
      description="Ouverture, suivi et clôture de votre session de caisse."
      actions={
        <>
          <button type="button" className="secondary-button" onClick={() => { reload(); reloadConfiguration() }} disabled={loading || configurationLoading || busy}>
            <Icon name="rotate-ccw" size="sm" /> Actualiser
          </button>
          {canEdit && session !== null && (
            <button type="button" className="danger-button" onClick={openClosingDialog} disabled={loading || busy} aria-haspopup="dialog">
              <Icon name="check" size="sm" /> Clôturer la caisse
            </button>
          )}
          {canEdit && session === null && <button type="button" className="primary-button" disabled={loading || busy} aria-haspopup="dialog" onClick={() => { opening.reset(EMPTY_COUNT); setOpeningDialogOpen(true) }}>
            <Icon name="plus" size="sm" /> Ouvrir la caisse
          </button>}
        </>
      }
    >
      <ResourceBanners error={closingDialogOpen || openingDialogOpen ? null : error ?? configurationError} offline={false} readOnly={null} />

      {!canEdit && (
        <p className="info-banner" role="note">
          <Icon name="alert" size="sm" /> La gestion de caisse est reservee a la caisse.
          Consultez l'état de la session ci-dessous.
        </p>
      )}

      {/* --- Aucune session : ouverture ------------------------------------ */}
      {!canEdit && session === null && (
        <p className="empty-state">Aucune caisse ouverte.</p>
      )}

      {canEdit && session === null && <p className="empty-state">Aucune caisse ouverte. Ouvrez une session après avoir compté le fond de caisse.</p>}
      <FormDialog open={openingDialogOpen && canEdit && session === null} title="Ouvrir la caisse" className="caisse-opening-modal" busy={busy} onClose={() => setOpeningDialogOpen(false)}>
          <ResourceBanners error={error ?? configurationError} offline={false} readOnly={null} />
          <button type="button" className="secondary-button" disabled={loading || configurationLoading || busy} onClick={() => { reload(); reloadConfiguration() }}>Actualiser le plafond</button>
        <form className="caisse-opening-form" onSubmit={submitOpening} noValidate aria-busy={busy}>
          <ErrorSummary errors={opening.formState.errors} labels={OPENING_LABELS} />
          {opening.formState.errors.comptage?.root?.message && (
            <p className="error-banner" role="alert">{opening.formState.errors.comptage.root.message}</p>
          )}
          <fieldset className="caisse-form-fields" disabled={busy || loading || configurationLoading || !caisseConfiguration}>
            <legend className="sr-only">Comptage du fond de caisse</legend>
            <p className="form-hint">
              Comptez les billets et pièces remis dans le tiroir à l'ouverture.
              Saisissez les quantités et laissez zéro pour les coupures absentes.
            </p>
            <CashCountFields fields={openingFields} count={openingCount} register={openingRegister} errors={opening.formState.errors.comptage} />
            <div className="reception-total" role="status" aria-live="polite">
              <strong>{fondsCompte === null ? 'Comptage à compléter' : `Fond de caisse compté : ${formatEuros(fondsCompte)}`}</strong>
              <span className="muted">{caisseConfiguration ? `Plafond autorisé : ${formatEuros(caisseConfiguration.maxFondsCaisse)}.` : 'Chargement du plafond autorisé…'}</span>
            </div>
            <FormTextarea
              label="Notes"
              name="notes"
              rows={3}
              register={openingRegister}
              error={opening.formState.errors.notes?.message}
              placeholder="Optionnel : consigne de dépôt, particularité..."
            />
            <div className="form-actions">
              <button type="submit" className="primary-button">
                <Icon name="check" size="sm" /> {busy ? 'Ouverture en cours…' : 'Ouvrir la caisse'}
              </button>
            </div>
          </fieldset>
        </form>
      </FormDialog>

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
            <dialog
              ref={closingDialogRef}
              className="modal caisse-modal"
              aria-labelledby="caisse-dialog-title"
              aria-describedby="caisse-dialog-description"
              onKeyDown={(event) => {
                if (event.key !== 'Tab') return
                const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]',
                )).filter((control) => control.getClientRects().length > 0)
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
                if (closingValues) backToCounting()
                else closeClosingDialog()
              }}
              onMouseDown={(event) => {
                if (event.target !== event.currentTarget) return
                const bounds = event.currentTarget.getBoundingClientRect()
                if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
                  event.preventDefault()
                  closeClosingDialog()
                }
              }}
            >
              <div className="caisse-modal-header">
                <h2 id="caisse-dialog-title">{closingValues ? 'Confirmer la clôture' : 'Clôturer la caisse'}</h2>
                <button type="button" className="action-btn" aria-label="Fermer la fenêtre" onClick={closeClosingDialog} disabled={busy}>
                  <Icon name="close" size="lg" />
                </button>
              </div>
              <p id="caisse-dialog-description" className="modal-desc">
                Session #{session.id} — comptez le contenu réel du tiroir avant de clôturer.
              </p>
              <ResourceBanners error={submitFailed ? error : null} offline={false} readOnly={null} />
              <form onSubmit={askClosing} noValidate aria-busy={busy} hidden={closingValues !== null}>
                <ErrorSummary errors={closing.formState.errors} labels={CLOSING_LABELS} />
                <fieldset className="caisse-form-fields" disabled={busy || closingValues !== null}>
                  <legend className="sr-only">Comptage des billets et pièces</legend>
                  <p className="form-hint">
                    Saisissez la quantité de chaque coupure, fond de caisse compris.
                    Laissez zéro pour les coupures absentes.
                  </p>

                  <CashCountFields fields={countFields} count={watchedCount} register={closingRegister} errors={closing.formState.errors.comptage} />

                  <div className="reception-total" role="status" aria-live="polite">
                    <strong>{totalComptage === null ? 'Comptage à compléter' : `Total compté : ${formatEuros(totalComptage)}`}</strong>
                    <span className="muted">
                      {' '}
                      Théorique : {formatEuros(soldeTheorique)}
                      {ecartComptage !== null && ` — ${varianceLabel(ecartComptage).text}`}
                    </span>
                  </div>

                  <FormTextarea
                    label="Commentaire de clôture"
                    name="notes"
                    rows={3}
                    register={closingRegister}
                    error={closing.formState.errors.notes?.message}
                    placeholder="Optionnel : motif de l'écart, incident de comptage..."
                  />

                  <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={closeClosingDialog}>Annuler</button>
                    <button
                      type="submit"
                      className="danger-button"
                      disabled={loading}
                    >
                      <Icon name="check" size="sm" /> Vérifier la clôture
                    </button>
                  </div>
                </fieldset>
              </form>
              {closingValues && (
                <section aria-busy={busy}>
                  <p className="confirm-message">
                    Vous avez compté <strong>{formatEuros(confirmedTotal)}</strong> pour un
                    solde théorique de <strong>{formatEuros(soldeTheorique)}</strong>.
                    {' '}{varianceLabel(confirmedVariance).text}.
                    La session sera fermée et ne pourra plus recevoir de vente.
                  </p>
                  {closingValues.notes && <p className="confirm-message">Commentaire : {closingValues.notes}</p>}
                  <div className="form-actions">
                    <button ref={backButtonRef} type="button" className="secondary-button" onClick={backToCounting} disabled={busy}>
                      Revenir au comptage
                    </button>
                    <button type="button" className="danger-button" onClick={() => void submitClosing()} disabled={busy || loading}>
                      <Icon name="check" size="sm" /> {busy ? 'Clôture en cours…' : 'Confirmer la clôture'}
                    </button>
                  </div>
                </section>
              )}
            </dialog>
          )}

          <DataTable
            columns={movementColumns}
            rows={movements}
            rowKey={(row) => String(row.id)}
            caption="Journal des mouvements de la session"
            emptyMessage="Aucun mouvement enregistré."
            defaultSort={{ key: 'createdAt', direction: 'desc' }}
          />
        </>
      )}
    </PageLayout>
  )
}
