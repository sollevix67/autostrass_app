import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormDialog } from '../../components/FormDialog'
import { PdfPreviewDialog } from '../../components/PdfPreviewDialog'
import { Icon } from '../../components/Icon'
import { ErrorSummary } from '../../components/forms/ErrorSummary'
import { FormInput, FormTextarea, type FieldRegister } from '../../components/forms/FormFields'
import { useToast } from '../../components/useToast'
import { ApiError, isAbortError, toErrorMessage } from '../../services/api'
import { documentsPdfApi } from '../../services/parametres'
import type { ApiParametres } from '../../services/contracts'
import { DEFAULT_DOCUMENTS_PDF_SETTINGS, DOCUMENTS_PDF_LIMITS, documentsPdfSettingsSchema, type DocumentsPdfSettings } from '../../schemas/parametres'
import { pdfLogoSource, readPdfLogo } from '../../utils/pdfLogo'

const labels = { nomEmetteur: 'Nom de l’émetteur', activite: 'Activité', coordonnees: 'Coordonnées et mentions de l’émetteur', piedCommun: 'Pied de page commun', logo: 'Logo' }

export default function DocumentsPdfForm({ values, onSaved, onClose }: {
  values: DocumentsPdfSettings
  onSaved: (data: ApiParametres) => void
  onClose: () => void
}) {
  const toast = useToast()
  const { register, watch, setValue, setError, clearErrors, handleSubmit, reset, formState: { errors } } = useForm<DocumentsPdfSettings>({
    resolver: zodResolver(documentsPdfSettingsSchema), defaultValues: values,
  })
  const reg = register as unknown as FieldRegister
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [readingLogo, setReadingLogo] = useState(false)
  const [invalidLogo, setInvalidLogo] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)
  const [error, setRequestError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Blob | null>(null)
  const active = useRef(true)
  const action = useRef<'save' | 'preview' | null>(null)
  const invalidLogoRef = useRef(false)
  const logoRequest = useRef<AbortController | null>(null)
  const previewRequest = useRef<AbortController | null>(null)
  const previewButton = useRef<HTMLButtonElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const logo = watch('logo')
  const actionDisabled = saving || previewing || readingLogo || invalidLogo

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      logoRequest.current?.abort()
      previewRequest.current?.abort()
    }
  }, [])

  function closePreview() {
    setPreview(null)
    globalThis.requestAnimationFrame(() => { if (active.current) previewButton.current?.focus() })
  }

  function showApiError(cause: unknown) {
    setRequestError(toErrorMessage(cause))
    if (cause instanceof ApiError && cause.details && typeof cause.details === 'object' && !Array.isArray(cause.details)) {
      for (const [field, message] of Object.entries(cause.details)) {
        if (field in labels && typeof message === 'string') setError(field as keyof DocumentsPdfSettings, { type: 'server', message })
      }
    }
  }

  function closeEditor() {
    if (action.current === 'save') return
    previewRequest.current?.abort()
    logoRequest.current?.abort()
    onClose()
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (action.current || logoRequest.current || invalidLogoRef.current) return
    action.current = 'save'
    setSaving(true)
    setRequestError(null)
    try {
      await handleSubmit(async (draft) => {
        const saved = await documentsPdfApi.save(draft)
        if (!active.current) return
        onSaved(saved)
        onClose()
        toast.success('Paramètres PDF enregistrés. Ils s’appliquent aux prochains PDF générés.')
      })(event)
    } catch (cause) { if (active.current) showApiError(cause) }
    finally { action.current = null; if (active.current) setSaving(false) }
  }

  async function previewDraft() {
    if (action.current || logoRequest.current || invalidLogoRef.current) return
    action.current = 'preview'
    const controller = new AbortController()
    previewRequest.current = controller
    setPreviewing(true)
    setRequestError(null)
    try {
      await handleSubmit(async (draft) => {
        if (!active.current || controller.signal.aborted) return
        const file = await documentsPdfApi.preview(draft, controller.signal)
        if (!active.current || controller.signal.aborted) return
        setPreview(file)
      })()
    } catch (cause) { if (active.current && !isAbortError(cause)) showApiError(cause) }
    finally { previewRequest.current = null; action.current = null; if (active.current) setPreviewing(false) }
  }

  async function selectLogo(file: File | undefined) {
    if (!file || action.current === 'save') return
    previewRequest.current?.abort()
    logoRequest.current?.abort()
    const controller = new AbortController()
    logoRequest.current = controller
    invalidLogoRef.current = false
    setInvalidLogo(false)
    setReadingLogo(true)
    clearErrors('logo')
    try {
      const loaded = await readPdfLogo(file, controller.signal)
      if (!active.current || controller.signal.aborted) return
      setValue('logo', loaded, { shouldDirty: true, shouldValidate: true })
      setFilename(file.name)
      setRequestError(null)
    } catch (cause) {
      if (!active.current || isAbortError(cause)) return
      invalidLogoRef.current = true
      setInvalidLogo(true)
      setError('logo', { type: 'validate', message: toErrorMessage(cause) })
    } finally {
      if (logoRequest.current === controller) { logoRequest.current = null; if (active.current) setReadingLogo(false) }
    }
  }

  function removeLogo() {
    if (action.current === 'save') return
    previewRequest.current?.abort()
    logoRequest.current?.abort()
    logoRequest.current = null
    invalidLogoRef.current = false
    setInvalidLogo(false)
    setReadingLogo(false)
    setFilename(null)
    setValue('logo', null, { shouldDirty: true, shouldValidate: true })
    clearErrors('logo')
    if (fileInput.current) fileInput.current.value = ''
  }

  function defaults() {
    if (action.current || logoRequest.current) return
    invalidLogoRef.current = false
    setInvalidLogo(false)
    setFilename(null)
    setRequestError(null)
    reset(structuredClone(DEFAULT_DOCUMENTS_PDF_SETTINGS))
    if (fileInput.current) fileInput.current.value = ''
  }

  return <>
    <FormDialog open title="Personnaliser les documents PDF" size="wide" busy={saving} onClose={closeEditor}
      description="Modifiez l’identité, le logo et les mentions communes, puis consultez un aperçu avant d’enregistrer."
      initialFocus='input[name="nomEmetteur"]'>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <form onSubmit={save} noValidate onChange={() => previewRequest.current?.abort()}>
        <ErrorSummary errors={errors} labels={labels} />
        <div className="form-grid-2">
          <FormInput name="nomEmetteur" label={labels.nomEmetteur} register={reg} required maxLength={DOCUMENTS_PDF_LIMITS.nomEmetteur} error={errors.nomEmetteur?.message} />
          <FormInput name="activite" label={labels.activite} register={reg} maxLength={DOCUMENTS_PDF_LIMITS.activite} error={errors.activite?.message} hint="Facultatif." />
          <FormTextarea name="coordonnees" label={labels.coordonnees} register={reg} rows={6} error={errors.coordonnees?.message}
            hint="8 lignes maximum, 120 caractères par ligne." placeholder="Adresse, téléphone, email, site ou mentions légales" />
          <FormTextarea name="piedCommun" label={labels.piedCommun} register={reg} rows={6} error={errors.piedCommun?.message}
            hint="6 lignes maximum, 100 caractères par ligne." placeholder="Texte commun imprimé en pied de page" />
        </div>
        <section className="documents-pdf-logo" aria-labelledby="documents-logo-title">
          <h3 id="documents-logo-title">Logo</h3>
          <div className="form-group">
            <label htmlFor="logo">Choisir un logo PNG ou JPEG</label>
            <input ref={fileInput} id="logo" name="logo-file" type="file" accept="image/png,image/jpeg"
              aria-invalid={errors.logo ? true : undefined} aria-describedby={`documents-logo-hint${errors.logo ? ' documents-logo-error' : ''}`}
              onChange={(event) => void selectLogo(event.target.files?.[0])} />
            <small id="documents-logo-hint" className="form-hint">256 Ko maximum, 1 024 × 1 024 pixels maximum. Le logo conserve ses proportions.</small>
            {errors.logo?.message && <small id="documents-logo-error" className="form-error-text" role="alert">{errors.logo.message}</small>}
          </div>
          {readingLogo && <p className="form-hint" role="status">Lecture du logo…</p>}
          {logo && <div className="documents-pdf-logo-sample"><img src={pdfLogoSource(logo)} alt="Logo du brouillon" /><span>{filename ?? 'Logo enregistré'}</span></div>}
          <button type="button" className="secondary-button" onClick={removeLogo} disabled={saving || !logo && !invalidLogo && !readingLogo}>Retirer le logo</button>
        </section>
        <p className="form-hint">Les prochains PDF générés utiliseront les valeurs enregistrées. L’aperçu et les valeurs par défaut restent un brouillon jusqu’à l’enregistrement.</p>
        <div className="form-actions documents-pdf-actions">
          <button ref={previewButton} type="button" className="secondary-button" onClick={() => void previewDraft()} disabled={actionDisabled}><Icon name="clipboard" size="sm" /> {previewing ? 'Préparation de l’aperçu…' : 'Aperçu fictif'}</button>
          <button type="button" className="secondary-button" onClick={defaults} disabled={saving || previewing || readingLogo}>Valeurs par défaut</button>
          <button type="submit" className="primary-button" disabled={actionDisabled}><Icon name="check" size="sm" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </FormDialog>
    {preview && <PdfPreviewDialog file={preview} title="Aperçu fictif des documents PDF"
      description="Document d’exemple créé avec votre saisie, avant son enregistrement."
      filename="apercu-documents.pdf" downloadLabel="Télécharger l’aperçu" showOpenInTab onClose={closePreview} />}
  </>
}
