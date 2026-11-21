import { useId, useRef, type FormEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { FormDialog } from '../../components/FormDialog'
import { ErrorSummary } from '../../components/forms/ErrorSummary'
import { FormInput, FormSelect, FormTextarea, type FieldRegister } from '../../components/forms/FormFields'
import { Icon } from '../../components/Icon'
import { devisSchema, type DevisFormValues } from '../../schemas/devis'
import { formatEuros } from '../../options'
import type { ApiClient, ApiDevis } from '../../services/contracts'
import type { Article } from '../../types'
import { todayParis } from '../../utils/devis'
import { venteTotals } from '../../utils/venteTotals'

type Props = {
  devis: ApiDevis | null
  clients: ApiClient[]
  articles: Article[]
  taxes: Array<{ id: number; taux: number }>
  loadingReferences: boolean
  referenceError: string | null
  saving: boolean
  error: string | null
  onSave: (values: DevisFormValues) => Promise<boolean>
  onClose: () => void
}

const EMPTY_LINE = { reference: '', quantite: 1, prixUnitaire: 0 }

/** Les taux et les désignations existants viennent du devis ; les nouvelles références du catalogue. */
export function DevisForm({ devis, clients, articles, taxes, loadingReferences, referenceError,
  saving, error, onSave, onClose }: Props) {
  const datalistId = useId()
  const pending = useRef(false)
  const { register, control, watch, setValue, setError, handleSubmit, formState: { errors, isSubmitting } } = useForm<DevisFormValues>({
    resolver: zodResolver(devisSchema),
    defaultValues: {
      clientId: devis?.clientId ?? 0,
      dateDevis: devis?.dateDevis ?? todayParis(),
      dateValidite: devis?.dateValidite ?? '',
      notes: devis?.notes ?? '',
      statut: devis?.statut === 'envoyé' || devis?.statut === 'annulé' ? devis.statut : 'brouillon',
      articles: devis ? devis.articles.map(({ reference, quantite, prixUnitaire }) => ({ reference, quantite, prixUnitaire })) : [{ ...EMPTY_LINE }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'articles' })
  const reg = register as unknown as FieldRegister
  const busy = saving || isSubmitting
  const watchedLines = watch('articles')
  const dateDevis = watch('dateDevis')

  const metadata = (reference: string) => {
    const normalized = reference.trim().toUpperCase()
    const existing = devis?.articles.find((line) => line.reference.toUpperCase() === normalized)
    if (existing) return { designation: existing.designation, tauxTva: existing.tauxTva }
    const article = articles.find((item) => item.reference.toUpperCase() === normalized)
    const tauxTva = taxes.find((item) => item.id === article?.tvaId)?.taux
    return article && tauxTva !== undefined ? { designation: article.designation, tauxTva } : null
  }

  let totals: ReturnType<typeof venteTotals> | null = null
  try {
    if (watchedLines.every((line) => metadata(line.reference) !== null)) {
      totals = venteTotals(watchedLines.map((line) => ({ ...line, tauxTva: metadata(line.reference)!.tauxTva })))
    }
  } catch { /* Les erreurs de saisie sont affichées par Zod à la soumission. */ }

  const clientOptions = clients.map((client) => ({ value: String(client.id), label: `${client.numeroClient} — ${client.prenom} ${client.nom}` }))
  if (devis && !clients.some((client) => client.id === devis.clientId)) {
    clientOptions.unshift({ value: String(devis.clientId), label: `${devis.clientSnapshot.numeroClient} — ${devis.clientSnapshot.prenom} ${devis.clientSnapshot.nom}` })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (pending.current) { event.preventDefault(); return }
    pending.current = true
    try {
      await handleSubmit(async (values) => {
        const missingReference = values.articles.findIndex((line) => metadata(line.reference) === null)
        if (missingReference !== -1) {
          setError(`articles.${missingReference}.reference`, { type: 'validate', message: 'Sélectionnez une référence du catalogue dont la TVA est disponible.' }, { shouldFocus: true })
          return
        }
        await onSave(values)
      })(event)
    } finally { pending.current = false }
  }

  return <FormDialog open title={devis ? `Modifier le devis ${devis.numero}` : 'Nouveau devis'}
    description={devis ? 'Les désignations et les taux de TVA des références existantes sont conservés. Vous pouvez modifier les prix HT. Le numéro et la date du devis restent fixes.' : 'Sélectionnez un client et les articles du catalogue. Le numéro sera attribué à l’enregistrement.'}
    busy={busy} size="wide" onClose={() => { if (!pending.current) onClose() }} initialFocus='select[name="clientId"]'>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {referenceError && <p className="info-banner" role="status">{referenceError}</p>}
    <form onSubmit={submit} noValidate>
      <ErrorSummary errors={errors} labels={{ clientId: 'Client', dateDevis: 'Date du devis', dateValidite: 'Validité', notes: 'Notes', statut: 'Statut', articles: 'Articles' }} />
      <div className="form-grid-2">
        <FormSelect label="Client" name="clientId" valueAsNumber register={reg} options={clientOptions} error={errors.clientId?.message} required />
        <FormInput label="Date du devis" name="dateDevis" type="date" register={reg} error={errors.dateDevis?.message} readOnly={devis !== null} required />
        <FormInput label="Valable jusqu’au" name="dateValidite" type="date" min={dateDevis} register={reg} error={errors.dateValidite?.message} hint="Facultatif. La conversion sera refusée après cette date." />
        {devis && <FormSelect label="Statut" name="statut" register={reg} placeholder={null} options={[
          { value: 'brouillon', label: 'Brouillon' }, { value: 'envoyé', label: 'Envoyé' }, { value: 'annulé', label: 'Annulé' },
        ]} error={errors.statut?.message} hint="Choisissez Envoyé après avoir transmis le devis au client." />}
      </div>
      <div id="articles" tabIndex={-1} className="devis-lines">
        <h3 className="sub-heading">Articles du devis</h3>
        <p className="form-hint">Recherchez une référence, une désignation ou un EAN13 dans les suggestions du catalogue.</p>
        <datalist id={datalistId}>
          {articles.map((article) => <option key={article.reference} value={article.reference} label={`${article.designation}${article.ean13 ? ` — ${article.ean13}` : ''}`} />)}
        </datalist>
        {fields.map((field, index) => {
          const lineErrors = errors.articles?.[index]
          const info = metadata(watchedLines[index]?.reference ?? '')
          const referenceName = `articles.${index}.reference` as const
          const registeredReference = register(referenceName)
          const metaId = `${datalistId}-line-${index}`
          return <div className="reception-article devis-line" key={field.id}>
            <div className="devis-line-heading"><strong>Article {index + 1}</strong><button type="button" className="action-btn delete" onClick={() => remove(index)} disabled={fields.length === 1 || busy} aria-label={`Retirer l’article ${index + 1}`}><Icon name="close" size="sm" /></button></div>
            <div className="form-grid-3">
              <div className="form-group">
                <label htmlFor={referenceName}>Référence<span className="required">*</span></label>
                <input {...registeredReference} id={referenceName} list={datalistId} maxLength={64} required
                  placeholder="Référence, désignation ou EAN13" aria-invalid={lineErrors?.reference ? true : undefined}
                  aria-describedby={`${metaId}${lineErrors?.reference ? ` ${metaId}-error` : ''}`}
                  onChange={(event) => {
                    void registeredReference.onChange(event)
                    const reference = event.target.value.trim().toUpperCase()
                    const existing = devis?.articles.find((line) => line.reference.toUpperCase() === reference)
                    const article = articles.find((item) => item.reference.toUpperCase() === reference)
                    if (existing || article) setValue(`articles.${index}.prixUnitaire`, existing?.prixUnitaire ?? article!.prixUnitaireHT, { shouldDirty: true })
                  }} />
                {lineErrors?.reference?.message && <small id={`${metaId}-error`} className="form-error-text" role="alert">{lineErrors.reference.message}</small>}
              </div>
              <FormInput label="Quantité" name={`articles.${index}.quantite`} type="number" min={1} max={9999} step="1" register={reg} error={lineErrors?.quantite?.message} required />
              <FormInput label="Prix unitaire HT (€)" name={`articles.${index}.prixUnitaire`} type="number" min={0} max={1000000} step="0.01" register={reg} error={lineErrors?.prixUnitaire?.message} required />
            </div>
            <p id={metaId} className="form-hint devis-line-description">{info ? <><b>{info.designation}</b> · TVA {info.tauxTva} %</> : 'Sélectionnez une référence du catalogue.'}</p>
          </div>
        })}
      </div>
      <button type="button" className="secondary-button" onClick={() => append({ ...EMPTY_LINE })} disabled={fields.length >= 200 || busy || loadingReferences}>
        <Icon name="plus" size="sm" /> Ajouter un article
      </button>
      <div className="devis-totals" aria-live="polite">
        <span>HT <b>{totals ? formatEuros(totals.totalHT) : '—'}</b></span>
        <span>TVA <b>{totals ? formatEuros(totals.totalTVA) : '—'}</b></span>
        <strong>Total TTC <b>{totals ? formatEuros(totals.totalTTC) : '—'}</b></strong>
      </div>
      <FormTextarea label="Notes" name="notes" register={reg} error={errors.notes?.message} placeholder="Conditions, délai ou précisions pour le client" />
      <div className="form-actions"><button type="submit" className="primary-button" disabled={busy}>
        <Icon name="check" size="sm" /> {busy ? 'Enregistrement…' : devis ? 'Enregistrer les modifications' : 'Créer le devis'}
      </button></div>
    </form>
  </FormDialog>
}
