/**
 * Vue ventes au comptoir : panier, encaissement et journal des ventes.
 *
 * Branchee sur l'API (`/api/ventes`). Le panier est un état **local** tant que
 * la vente n'est pas validee : il n'a pas d'existence en base, et il ne doit
 * pas déclencher d'écriture à chaque ligne ajoutée. Seule la validation
 * finale envoie le document complet, entete et lignes, dans une transaction.
 *
 * Le total et la monnaie ne sont jamais saisis : ils sont recalcules par le
 * serveur a partir des lignes et du montant encaisse, ce qui empeche un total
 * incoherent avec le detail.
 *
 * Une vente ne peut etre enregistree que dans une **session de caisse
 * ouverte** : le serveur la refuse en 409 sinon. L'écran renvoie donc vers la
 * page Caisse plutot que de laisser l'utilisateur decouvrir le refus apres
 * avoir rempli un panier.
 */

import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageLayout } from '../components/PageLayout'
import { FormDialog } from '../components/FormDialog'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { useToast } from '../components/useToast'
import { ResourceBanners } from '../components/ResourceBanners'
import { ErrorSummary } from '../components/forms/ErrorSummary'
import { FormInput, FormSelect, type FieldRegister } from '../components/forms/FormFields'
import { useCatalogue } from '../hooks/useCatalogue'
import { useResource } from '../hooks/useResource'
import { useClientOptions } from '../hooks/useReferentials'
import { useCashSession } from '../hooks/useCashSession'
import { useRemoteValue } from '../hooks/useRemoteValue'
import { venteTotals, type TaxedLine } from '../utils/venteTotals'
import { useAuth, canWrite } from '../components/useAuth'
import { venteSchema, type DocumentLineFormValues } from '../schemas'
import { PAYMENT_MODE_OPTIONS, formatEuros } from '../options'
import type { ApiVente } from '../services/contracts'
import { buildUrl } from '../services/api'

/** Ligne du panier local. `lineId` est la cle React stable de la ligne. */
type CartLine = DocumentLineFormValues & TaxedLine & { lineId: string }

const todayIso = () => new Date().toISOString()

const byDateDesc = (rows: ApiVente[]) =>
  [...rows].sort((a, b) => b.dateVente.localeCompare(a.dateVente))

function formatLineTotal(line: CartLine): string {
  try { return formatEuros(venteTotals([line]).totalTTC) }
  catch { return 'Limite dépassée' }
}

export default function VentesComptoirView() {
  const { user } = useAuth()
  const toast = useToast()
  const { articles: catalogue } = useCatalogue()
  const taxes = useRemoteValue<Array<{ id: number; taux: number }>>('/tva')
  const clients = useClientOptions()
  const { session: cashSession } = useCashSession()
  const { rows, loading, saving, error, offline, reload, create } = useResource<ApiVente>({
    allowOfflineWrites: false,
    path: '/ventes',
    sort: byDateDesc,
  })

  const [cart, setCart] = useState<CartLine[]>([])
  const [selection, setSelection] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const pending = useRef(false)

  const totals = useMemo(() => {
    try { return venteTotals(cart) } catch { return null }
  }, [cart])
  const { totalHT, totalTVA, totalTTC } = totals ?? { totalHT: 0, totalTVA: 0, totalTTC: 0 }

  const canEdit = canWrite(user?.role, 'caisse')

  /**
   * Le resolver depend du total calcule : la regle « montant encaisse >=
   * total » ne peut pas etre un schema statique. On garde un schema constant
   * pour les types et on appelle `venteSchema` à chaque rendu.
   */
  const form = useForm({
    resolver: zodResolver(venteSchema(totalTTC)),
    mode: 'onSubmit',
    defaultValues: {
      clientId: null as number | null,
      dateVente: todayIso(),
      modePaiement: 'espèces' as 'espèces' | 'carte' | 'chèque',
      montantPaye: 0,
    },
  })
  const register = form.register as unknown as FieldRegister
  const busy = saving || form.formState.isSubmitting

  const modePaiement = form.watch('modePaiement')
  const montantPaye = form.watch('montantPaye') || 0
  const monnaie = modePaiement === 'espèces' ? Math.round((montantPaye - totalTTC) * 100) / 100 : 0

  const FIELD_LABELS = {
    clientId: 'Client',
    dateVente: 'Date de vente',
    modePaiement: 'Mode de paiement',
    montantPaye: 'Montant paye',
  } satisfies Record<string, string>

  /** Ajoute une ligne au panier, ou incremente si la reference est presente. */
  function addToCart(reference: string) {
    const article = catalogue.find((item) => item.reference === reference)
    if (!article) return
    const rate = taxes.data?.find((tax) => tax.id === article.tvaId)?.taux
    if (rate === undefined) {
      toast.error('Le taux de TVA est indisponible. Actualisez les données avant de vendre cet article.')
      return
    }

    setCart((current) => {
      const existing = current.find((line) => line.reference === article.reference)
      if (existing) {
        return current.map((line) =>
          line.reference === article.reference ? { ...line, quantite: Math.min(9999, line.quantite + 1) } : line,
        )
      }
      if (current.length >= 200) return current
      return [
        ...current,
        {
          // La cle de ligne est generee localement : elle n'est jamais envoyee
          // a l'API, qui replace chaque ligne par son rang.
          lineId: `${article.reference}-${Date.now()}`,
          reference: article.reference,
          designation: article.designation,
          quantite: 1,
          prixUnitaire: article.prixUnitaireHT,
          tauxTva: rate,
        },
      ]
    })

    setSelection('')
  }

  function updateQuantity(lineId: string, value: number) {
    setCart((current) =>
      current.map((line) => (line.lineId === lineId ? { ...line, quantite: Math.max(1, Math.min(9999, value)) } : line)),
    )
  }

  function removeLine(lineId: string) {
    setCart((current) => current.filter((line) => line.lineId !== lineId))
  }

  const submit = form.handleSubmit(async (values) => {
    if (!user || !canEdit || !cashSession || !totals || pending.current) return
    pending.current = true
    try {
      const created = await create({
        clientId: values.clientId,
        dateVente: values.dateVente,
        caissier: `${user.prenom} ${user.nom}`.trim(),
        modePaiement: values.modePaiement,
        montantPaye: values.montantPaye,
        // La monnaie n'est pas un champ saisi : elle vaut l'encaissement moins
        // le total, et le serveur la recalcule de toute facon.
        monnaie: values.modePaiement === 'espèces' ? Math.max(0, Math.round((values.montantPaye - totalTTC) * 100) / 100) : 0,
        articles: cart.map((line) => ({
          reference: line.reference,
          designation: line.designation,
          quantite: line.quantite,
          prixUnitaire: line.prixUnitaire,
          tauxTva: line.tauxTva,
        })),
      })
      if (created === null) return
      setDialogOpen(false)
      setCart([])
      form.reset({
        clientId: null,
        dateVente: todayIso(),
        modePaiement: 'espèces',
        montantPaye: 0,
      })
      toast.success(`Vente enregistrée : ${formatEuros(created.totalTTC ?? created.totalHT)} TTC.`)
    } finally { pending.current = false }
  })

  const columns: ColumnDef<ApiVente>[] = [
    {
      key: 'dateVente',
      header: 'DATE',
      sortable: true,
      sortValue: (row) => row.dateVente,
      render: (row) => new Date(row.dateVente).toLocaleString('fr-FR'),
    },
    { key: 'caissier', header: 'CAISSIER', sortable: true, sortValue: (row) => row.caissier, render: (row) => row.caissier },
    {
      key: 'articles',
      header: 'ARTICLES',
      align: 'right',
      sortValue: (row) => row.articles.length,
      render: (row) => `${row.articles.length} ligne(s)`,
    },
    {
      key: 'modePaiement',
      header: 'PAIEMENT',
      sortable: true,
      sortValue: (row) => row.modePaiement,
      render: (row) => <span className="type-badge">{row.modePaiement}</span>,
    },
    {
      key: 'totalTTC',
      header: 'TOTAL TTC',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.totalTTC ?? row.totalHT,
      render: (row) => row.totalTTC == null ? <span>{formatEuros(row.totalHT)} HT (historique)</span> : <b>{formatEuros(row.totalTTC)}</b>,
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (row) => (
        <a
          href={buildUrl(`/ventes/${row.id}/facture`)}
          target="_blank"
          rel="noopener noreferrer"
          className="secondary-button small"
          title="Telecharger la facture"
        >
          <Icon name="download" size="sm" /> Facture
        </a>
      ),
    },
  ]

  return (
    <PageLayout
      eyebrow="VENTES COMPTOIR"
      title="Ventes au comptoir"
      description="Enregistrez les ventes au comptoir."
      actions={
        <>
        <button type="button" className="secondary-button" onClick={reload} disabled={loading || busy}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
        {canEdit && <button type="button" className="primary-button" disabled={!cashSession || busy} aria-haspopup="dialog" onClick={() => setDialogOpen(true)}><Icon name="plus" size="sm" /> {cart.length ? 'Reprendre la vente' : 'Nouvelle vente'}</button>}
        </>
      }
    >
      <ResourceBanners
        error={dialogOpen ? null : error}
        offline={offline}
        readOnly={canEdit ? null : 'La saisie des ventes est reservee a la caisse. Consultez le journal ci-dessous.'}
        resource="ventes"
      />

      {canEdit && cashSession === null && (
        <p className="info-banner" role="note">
          <Icon name="alert" size="sm" /> Aucune caisse ouverte : le serveur refusera
          d'enregistrer une vente. <Link to="/caisse">Ouvrir la caisse</Link> pour continuer.
        </p>
      )}

      {cart.length > 0 && <p className="info-banner">Vente en préparation : {cart.length} ligne(s), {formatEuros(totalTTC)} TTC.</p>}
      {!totals && <p className="error-banner" role="alert">Le montant du panier dépasse la limite autorisée.</p>}
      {taxes.error && <p className="error-banner" role="alert">TVA indisponible : {taxes.error} <button type="button" onClick={taxes.reload}>Actualiser la TVA</button></p>}
      <FormDialog open={dialogOpen && canEdit && cashSession !== null} title="Vente en cours" size="wide" busy={busy} onClose={() => setDialogOpen(false)} cancelLabel="Fermer et garder le panier">
          <ResourceBanners error={error} offline={offline} readOnly={null} resource="ventes" />
        <form onSubmit={submit} noValidate>
          <ErrorSummary errors={form.formState.errors} labels={FIELD_LABELS} />

          <div className="form-grid-2">
            <FormSelect
              label="Client"
              name="clientId"
              valueAsNumber
              options={clients.map((client) => ({
                value: String(client.id),
                label: `${client.numeroClient} - ${client.nom} ${client.prenom}`,
              }))}
              register={register}
              error={form.formState.errors.clientId?.message}
              placeholder="Client de passage (facultatif)"
            />
            <FormInput
              label="Date"
              name="dateVente"
              type="date"
              register={register}
              error={form.formState.errors.dateVente?.message}
              required
            />
            <FormSelect
              label="Mode de paiement"
              name="modePaiement"
              options={PAYMENT_MODE_OPTIONS}
              register={register}
              error={form.formState.errors.modePaiement?.message}
              placeholder={null}
              required
            />
          </div>

          <h3 className="sub-heading">Ajouter un article du catalogue</h3>
          <div className="filter-bar">
            <FormSelect
              label="Article"
              name="catalogueSelection"
              value={selection}
              options={catalogue.map((article) => ({
                value: article.reference,
                label: `${article.reference} - ${article.designation}`,
              }))}
              onChange={(_name, value) => {
                setSelection(value)
                addToCart(value)
              }}
              placeholder="Rechercher une reference..."
            />
          </div>

          <h3 className="sub-heading">Articles vendus</h3>
          {cart.length === 0 && (
            <p className="empty-state">Aucun article. Recherchez et ajoutez une reference du catalogue.</p>
          )}

          {cart.map((line) => (
            <div key={line.lineId} className="reception-article">
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Reference</label>
                  <span className="static-value">{line.reference}</span>
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <span className="static-value">{line.designation}</span>
                </div>
                <div className="form-group">
                  <label>Prix unitaire HT</label>
                  <span className="static-value">{formatEuros(line.prixUnitaire)}</span>
                </div>
                <div className="form-group">
                  <label htmlFor={`quantite-${line.lineId}`}>Quantite</label>
                  <input
                    id={`quantite-${line.lineId}`}
                    type="number"
                    min="1"
                    max="9999"
                    value={line.quantite}
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10)
                      updateQuantity(line.lineId, Number.isNaN(value) ? 1 : value)
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Montant TTC (TVA {line.tauxTva} %)</label>
                  <span className="static-value">{formatLineTotal(line)}</span>
                </div>
              </div>
              <button
                type="button"
                className="action-btn delete"
                onClick={() => removeLine(line.lineId)}
                aria-label={`Retirer ${line.reference} du panier`}
              >
                <Icon name="close" size="sm" />
              </button>
            </div>
          ))}

          <div className="vente-total">
            <div>
              <strong>Total HT : {formatEuros(totalHT)}</strong>
              <p>TVA : {formatEuros(totalTVA)}</p>
              <strong>Total TTC : {formatEuros(totalTTC)}</strong>
            </div>
            <div className="form-group">
              <label htmlFor="montantPaye">Montant encaisse</label>
              <input
                id="montantPaye"
                type="number"
                step="0.01"
                min="0"
                value={Number.isFinite(montantPaye) ? montantPaye : 0}
                onChange={(event) => {
                  const value = event.target.value
                  form.setValue('montantPaye', value === '' ? 0 : Number.parseFloat(value))
                }}
                placeholder={totalTTC.toFixed(2)}
                aria-invalid={form.formState.errors.montantPaye ? true : undefined}
                aria-describedby={form.formState.errors.montantPaye ? 'montantPaye-error' : undefined}
              />
              {form.formState.errors.montantPaye && (
                <small id="montantPaye-error" className="form-error-text" role="alert">
                  {form.formState.errors.montantPaye.message}
                </small>
              )}
            </div>
            {monnaie > 0 && <div><strong>Monnaie : {formatEuros(monnaie)}</strong></div>}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving || cart.length === 0 || !totals || modePaiement === undefined}
              title={cart.length === 0 ? 'Ajoutez au moins un article' : undefined}
            >
              <Icon name="check" size="sm" /> Valider la vente
            </button>
            {cart.length > 0 && (
              <button type="button" className="secondary-button" onClick={() => setCart([])}>
                Vider le panier
              </button>
            )}
          </div>
        </form>
      </FormDialog>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        caption="Journal des ventes au comptoir"
        loading={loading}
        emptyMessage="Aucune vente enregistree."
        defaultSort={{ key: 'dateVente', direction: 'desc' }}
      />
    </PageLayout>
  )
}
