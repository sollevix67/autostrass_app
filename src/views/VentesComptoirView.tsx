/**
 * Vue ventes au comptoir : panier, encaissement et journal des ventes.
 *
 * Branchee sur l'API (`/api/ventes`). Le panier est un etat **local** tant que
 * la vente n'est pas validee : il n'a pas d'existence en base, et il ne doit
 * pas declencher d'ecriture a chaque ligne ajoutee. Seule la validation
 * finale envoie le document complet, entete et lignes, dans une transaction.
 *
 * Le total et la monnaie ne sont jamais saisis : ils sont recalcules par le
 * serveur a partir des lignes et du montant encaisse, ce qui empeche un total
 * incoherent avec le detail.
 *
 * Une vente ne peut etre enregistree que dans une **session de caisse
 * ouverte** : le serveur la refuse en 409 sinon. L'ecran renvoie donc vers la
 * page Caisse plutot que de laisser l'utilisateur decouvrir le refus apres
 * avoir rempli un panier.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageLayout } from '../components/PageLayout'
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
import { useAuth, canWrite } from '../components/useAuth'
import { venteSchema, type DocumentLineFormValues } from '../schemas'
import { PAYMENT_MODE_OPTIONS, formatEuros } from '../options'
import type { ApiVente } from '../services/contracts'

/** Ligne du panier local. `lineId` est la cle React stable de la ligne. */
type CartLine = DocumentLineFormValues & { lineId: string }

const todayIso = () => new Date().toISOString()

const byDateDesc = (rows: ApiVente[]) =>
  [...rows].sort((a, b) => b.dateVente.localeCompare(a.dateVente))

/** Somme des lignes du panier, arrondie au centime. */
function totalOf(lines: readonly CartLine[]): number {
  return Math.round(lines.reduce((sum, line) => sum + line.quantite * line.prixUnitaire, 0) * 100) / 100
}

export default function VentesComptoirView() {
  const { user } = useAuth()
  const toast = useToast()
  const { articles: catalogue } = useCatalogue()
  const clients = useClientOptions()
  const { session: cashSession } = useCashSession()
  const { rows, loading, saving, error, offline, reload, create } = useResource<ApiVente>({
    path: '/ventes',
    sort: byDateDesc,
  })

  const [cart, setCart] = useState<CartLine[]>([])
  const [selection, setSelection] = useState('')

  const totalHT = useMemo(() => totalOf(cart), [cart])

  const canEdit = canWrite(user?.role, 'caisse')

  /**
   * Le resolver depend du total calcule : la regle « montant encaisse >=
   * total » ne peut pas etre un schema statique. On garde un schema constant
   * pour les types et on appelle `venteSchema` a chaque rendu.
   */
  const form = useForm({
    resolver: zodResolver(venteSchema(totalHT)),
    mode: 'onSubmit',
    defaultValues: {
      clientId: null as number | null,
      dateVente: todayIso(),
      caissier: `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Caisse',
      modePaiement: 'espèces' as 'espèces' | 'carte' | 'chèque',
      montantPaye: 0,
    },
  })
  const register = form.register as unknown as FieldRegister

  const modePaiement = form.watch('modePaiement')
  const montantPaye = form.watch('montantPaye') || 0
  const monnaie = Math.round((montantPaye - totalHT) * 100) / 100

  const FIELD_LABELS = {
    clientId: 'Client',
    dateVente: 'Date de vente',
    caissier: 'Caisse',
    modePaiement: 'Mode de paiement',
    montantPaye: 'Montant paye',
  } satisfies Record<string, string>

  /** Ajoute une ligne au panier, ou incremente si la reference est presente. */
  function addToCart(reference: string) {
    const article = catalogue.find((item) => item.reference === reference)
    if (!article) return

    setCart((current) => {
      const existing = current.find((line) => line.reference === article.reference)
      if (existing) {
        return current.map((line) =>
          line.reference === article.reference ? { ...line, quantite: line.quantite + 1 } : line,
        )
      }
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
        },
      ]
    })

    setSelection('')
  }

  function updateQuantity(lineId: string, value: number) {
    setCart((current) =>
      current.map((line) => (line.lineId === lineId ? { ...line, quantite: value } : line)),
    )
  }

  function removeLine(lineId: string) {
    setCart((current) => current.filter((line) => line.lineId !== lineId))
  }

  const submit = form.handleSubmit(async (values) => {
    const created = await create({
      clientId: values.clientId,
      dateVente: values.dateVente,
      caissier: values.caissier,
      modePaiement: values.modePaiement,
      montantPaye: values.montantPaye,
      // La monnaie n'est pas un champ saisi : elle vaut l'encaissement moins
      // le total, et le serveur la recalcule de toute facon.
      monnaie: Math.max(0, Math.round((values.montantPaye - totalHT) * 100) / 100),
      articles: cart.map((line) => ({
        reference: line.reference,
        designation: line.designation,
        quantite: line.quantite,
        prixUnitaire: line.prixUnitaire,
      })),
    })
    if (created === null) return

    setCart([])
    form.reset({
      clientId: null,
      dateVente: todayIso(),
      caissier: `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Caisse',
      modePaiement: 'espèces',
      montantPaye: 0,
    })
    toast.success(`Vente enregistree : ${formatEuros(created.totalHT)} HT.`)
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
      key: 'totalHT',
      header: 'TOTAL HT',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.totalHT,
      render: (row) => <b>{formatEuros(row.totalHT)}</b>,
    },
  ]

  return (
    <PageLayout
      eyebrow="VENTES COMPTOIR"
      title="Ouvrir une caisse"
      description="Enregistrez les ventes au comptoir."
      actions={
        <button type="button" className="secondary-button" onClick={reload} disabled={loading}>
          <Icon name="rotate-ccw" size="sm" /> Actualiser
        </button>
      }
    >
      <ResourceBanners
        error={error}
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

      {canEdit && cashSession !== null && (
        <section className="form-card">
          <h2>Vente en cours</h2>
          <form onSubmit={submit} noValidate>
            <ErrorSummary errors={form.formState.errors} labels={FIELD_LABELS} />

            <div className="form-grid-2">
              <FormSelect
                label="Client"
                name="clientId"
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
              <FormInput
                label="Caissier"
                name="caissier"
                register={register}
                error={form.formState.errors.caissier?.message}
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
                    <label>Prix unitaire</label>
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
                    <label>Montant</label>
                    <span className="static-value">{formatEuros(line.quantite * line.prixUnitaire)}</span>
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
                  placeholder={totalHT.toFixed(2)}
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
                disabled={saving || cart.length === 0 || modePaiement === undefined}
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
        </section>
      )}

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
