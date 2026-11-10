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
import { FormInput, FormTextarea, type FieldRegister } from '../components/forms/FormFields'
import { useCashSession, useCashMovements } from '../hooks/useCashSession'
import { useAuth, canWrite } from '../components/useAuth'
import {
  caisseClotureSchema,
  caisseOuvertureSchema,
  type CaisseClotureFormOutput,
} from '../schemas'
import { CASH_DENOMINATIONS, CASH_MOVEMENT_LABELS, formatDenomination, formatEuros } from '../options'
import type { ApiCashMovement } from '../services/contracts'

const OPENING_LABELS = { fondsCaisse: 'Fond de caisse', notes: 'Notes' } satisfies Record<string, string>
const CLOSING_LABELS = { comptage: 'Comptage', notes: 'Notes' } satisfies Record<string, string>
const EMPTY_CLOSING = {
  comptage: CASH_DENOMINATIONS.map((denomination) => ({ denomination, quantite: 0 })),
  notes: '',
}

/** Additionner des centimes entiers évite les faux écarts sur les pièces. */
function countTotal(lines: CaisseClotureFormOutput['comptage']): number {
  return lines.reduce((sum, line) => sum + Math.round(line.denomination * 100) * line.quantite, 0) / 100
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

  const { movements } = useCashMovements(session?.id ?? null)

  const canEdit = canWrite(user?.role, 'caisse')

  // --- Formulaire d'ouverture ----------------------------------------------
  const opening = useForm({
    resolver: zodResolver(caisseOuvertureSchema),
    defaultValues: { fondsCaisse: 150, notes: '' },
    mode: 'onSubmit',
  })
  const openingRegister = opening.register

  // --- Formulaire de clôture ------------------------------------------------
  // Le comptage est pre-rempli avec les coupures courantes a quantite nulle :
  // le caissier remplit ce qu'il compte, il n'a pas a construire une liste.
  const closing = useForm({
    resolver: zodResolver(caisseClotureSchema),
    defaultValues: EMPTY_CLOSING,
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
  const busy = saving || closing.formState.isSubmitting

  const watchedCount = useWatch({ control: closing.control, name: 'comptage' })
  const parsedCount = caisseClotureSchema.shape.comptage.safeParse(watchedCount)
  const totalComptage = parsedCount.success ? countTotal(parsedCount.data) : null

  // Le solde theorique du tiroir, tant que la session est ouverte : fond
  // remis + especes encaissees. La monnaie rendue est deja deduite par le
  // serveur dans `totalEspeces`.
  const soldeTheorique = (Math.round((session?.fondsCaisse ?? 0) * 100) + Math.round((session?.totalEspeces ?? 0) * 100)) / 100
  const ecartComptage = totalComptage === null ? null : Math.round((totalComptage - soldeTheorique) * 100) / 100
  const confirmedTotal = closingValues ? countTotal(closingValues.comptage) : 0
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
    resetClosing(EMPTY_CLOSING)
    setClosingValues(null)
    setSubmitFailed(false)
    setClosingDialogOpen(true)
  }

  const closeClosingDialog = useCallback(() => {
    if (busy || pending.current) return
    setClosingDialogOpen(false)
    setClosingValues(null)
    setSubmitFailed(false)
    resetClosing(EMPTY_CLOSING)
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

  const submitOpening = opening.handleSubmit(async (values) => {
    const created = await open(values.fondsCaisse, values.notes)
    if (created === null) return
    opening.reset({ fondsCaisse: 150, notes: '' })
    toast.success(`Caisse ouverte avec ${formatEuros(created.fondsCaisse)} de fond.`)
  })

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
      resetClosing(EMPTY_CLOSING)
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
          <button type="button" className="secondary-button" onClick={reload} disabled={loading || busy}>
            <Icon name="rotate-ccw" size="sm" /> Actualiser
          </button>
          {canEdit && session !== null && (
            <button type="button" className="danger-button" onClick={openClosingDialog} disabled={loading || busy} aria-haspopup="dialog">
              <Icon name="check" size="sm" /> Clôturer la caisse
            </button>
          )}
        </>
      }
    >
      <ResourceBanners error={closingDialogOpen ? null : error} offline={false} readOnly={null} />

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
                register={openingRegister as FieldRegister}
                error={opening.formState.errors.fondsCaisse?.message}
                hint="Montant remis dans le tiroir a l'ouverture."
                required
              />
              <FormTextarea
                label="Notes"
                name="notes"
                rows={3}
                register={openingRegister as FieldRegister}
                error={opening.formState.errors.notes?.message}
                placeholder="Optionnel : consigne de dépôt, particularité..."
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

                  <div className="comptage-grid">
                    {countFields.map((field, index) => (
                      <div key={field.id} className="comptage-row">
                        <FormInput
                          label={`${formatDenomination(field.denomination)} — quantité`}
                          name={`comptage.${index}.quantite`}
                          type="number"
                          min="0"
                          max="10000"
                          step="1"
                          inputMode="numeric"
                          register={closingRegister}
                          error={closing.formState.errors.comptage?.[index]?.quantite?.message}
                          required
                        />
                        <output className="comptage-line-total" aria-label={`Montant en ${formatDenomination(field.denomination)}`}>
                          {caisseClotureSchema.shape.comptage.element.safeParse(watchedCount?.[index]).success
                            ? formatEuros(Math.round(field.denomination * 100) * watchedCount[index].quantite / 100)
                            : '—'}
                        </output>
                      </div>
                    ))}
                  </div>

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
