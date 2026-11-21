import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormDialog } from '../../components/FormDialog'
import { FormInput, type FieldRegister } from '../../components/forms/FormFields'
import { Icon } from '../../components/Icon'
import { formatEuros } from '../../options'
import { devisConversionSchema, type DevisConversionValues } from '../../schemas/devis'
import type { ApiDevis, ApiDevisConversion } from '../../services/contracts'

export function DevisConversionDialog({ devis, saving, error, onConvert, onClose }: {
  devis: ApiDevis
  saving: boolean
  error: string | null
  onConvert: (dateLivraisonPrevue?: string) => Promise<ApiDevisConversion | null>
  onClose: () => void
}) {
  const [result, setResult] = useState<ApiDevisConversion | null>(null)
  const pending = useRef(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DevisConversionValues>({
    resolver: zodResolver(devisConversionSchema), defaultValues: { dateLivraisonPrevue: '' },
  })
  const reg = register as unknown as FieldRegister
  const busy = saving || isSubmitting
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (pending.current || result) { event.preventDefault(); return }
    pending.current = true
    try {
      await handleSubmit(async (values) => {
        const converted = await onConvert(values.dateLivraisonPrevue || undefined)
        if (converted) setResult(converted)
      })(event)
    } finally { pending.current = false }
  }

  return <FormDialog open title={result ? 'Commande client créée' : `Convertir le devis ${devis.numero}`}
    description={result ? `Le devis ${devis.numero} est désormais lié à sa commande.` : 'La conversion crée une commande client et ajoute les quantités manquantes à la liste des articles à commander aux fournisseurs. Le devis sera ensuite figé.'}
    size={result && result.articlesACommander.length ? 'normal' : 'small'} busy={busy} cancelLabel={result ? 'Fermer' : 'Annuler'}
    onClose={() => { if (!pending.current) onClose() }}>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {result ? <>
      <p className="info-banner" role="status">Commande <b>{result.commande.numero ?? `#${result.commande.id}`}</b> créée pour {formatEuros(result.devis.totalTTC)} TTC.</p>
      <h3 className="sub-heading">Articles à commander</h3>
      {result.articlesACommander.length ? <ul className="devis-shortage-list">{result.articlesACommander.map((line) => <li key={line.id}>
        <b>{line.reference}</b> — {line.designation} : <strong>{line.quantite}</strong>
      </li>)}</ul> : <p>Aucun article supplémentaire à commander.</p>}
      <Link className="primary-button" to="/commandes-clients"><Icon name="layers" size="sm" /> Voir les commandes clients</Link>
    </> : <form onSubmit={submit} noValidate>
      <p><b>{devis.clientSnapshot.prenom} {devis.clientSnapshot.nom}</b> · {formatEuros(devis.totalTTC)} TTC</p>
      <FormInput label="Date de livraison prévue" name="dateLivraisonPrevue" type="date" register={reg} error={errors.dateLivraisonPrevue?.message} hint="Facultatif." />
      <div className="form-actions"><button type="submit" className="primary-button" disabled={busy}>
        <Icon name="check" size="sm" /> {busy ? 'Conversion…' : 'Créer la commande client'}
      </button></div>
    </form>}
  </FormDialog>
}
