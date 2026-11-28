import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '../components/PageLayout'
import { FormDialog } from '../components/FormDialog'
import { PdfPreviewDialog, type PdfPreviewRequest } from '../components/PdfPreviewDialog'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { useAuth, canWrite } from '../components/useAuth'
import { useToast } from '../components/useToast'
import { useDevis } from '../hooks/useDevis'
import { useRemoteValue } from '../hooks/useRemoteValue'
import { invalidateReferentials } from '../hooks/useReferentials'
import { formatEuros } from '../options'
import type { DevisFormValues } from '../schemas/devis'
import { toErrorMessage } from '../services/api'
import type { ApiArticleACommander, ApiClient, ApiDevis, ApiFournisseur, DevisInput } from '../services/contracts'
import { devisApi, devisPdfFilename, downloadDevisPdf } from '../services/devis'
import type { Article } from '../types'
import { devisExpired } from '../utils/devis'
import { DevisForm } from './devis/DevisForm'
import { DevisConversionDialog } from './devis/DevisConversionDialog'
import { DevisShareDialog } from './devis/DevisShareDialog'
import '../devis.css'

const STATUS_OPTIONS = [
  { value: 'brouillon', label: 'Brouillon' }, { value: 'envoyé', label: 'Envoyé' },
  { value: 'converti', label: 'Converti' }, { value: 'annulé', label: 'Annulé' },
] as const

/** La garde empêche aussi les lectures API lorsqu'un magasinier ouvre directement l'URL. */
export default function DevisView() {
  const { user } = useAuth()
  if (!canWrite(user?.role, 'caisse')) return <PageLayout eyebrow="DEVIS" title="Devis">
    <p className="info-banner" role="note">Les devis sont réservés aux administrateurs et aux caissiers.</p>
  </PageLayout>
  return <DevisWorkspace />
}

function DevisWorkspace() {
  const { user } = useAuth()
  const toast = useToast()
  const devis = useDevis()
  const clients = useRemoteValue<ApiClient[]>('/clients')
  const catalogue = useRemoteValue<Article[]>('/articles')
  const taxes = useRemoteValue<Array<{ id: number; taux: number }>>('/tva')
  const besoins = useRemoteValue<ApiArticleACommander[]>('/articles-a-commander')
  const fournisseurs = useRemoteValue<ApiFournisseur[]>('/fournisseurs')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showBesoins, setShowBesoins] = useState(false)
  const [fournisseurFilter, setFournisseurFilter] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [formTarget, setFormTarget] = useState<{ devis: ApiDevis | null } | null>(null)
  const [detailTarget, setDetailTarget] = useState<ApiDevis | null>(null)
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewRequest | null>(null)
  const [shareTarget, setShareTarget] = useState<ApiDevis | null>(null)
  const [conversionTarget, setConversionTarget] = useState<ApiDevis | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const downloadPending = useRef(false)
  const busy = devis.saving || downloading !== null

  function reload() {
    devis.reload()
    clients.reload()
    catalogue.reload()
    taxes.reload()
    besoins.reload()
    fournisseurs.reload()
    setDocumentError(null)
  }

  async function save(values: DevisFormValues): Promise<boolean> {
    const input: DevisInput = {
      clientId: values.clientId, dateDevis: values.dateDevis,
      dateValidite: values.dateValidite || null, notes: values.notes || null,
      articles: values.articles,
    }
    const existing = formTarget?.devis
    const result = existing
      ? await devis.update(existing.id, { ...input, version: existing.version, statut: values.statut })
      : await devis.create(input)
    if (!result) return false
    setFormTarget(null)
    toast.success(`Devis ${result.numero} enregistré.`)
    return true
  }

  async function download(row: ApiDevis) {
    if (downloadPending.current || devis.saving) return
    downloadPending.current = true
    setDownloading(row.id)
    setDocumentError(null)
    try { downloadDevisPdf(await devisApi.pdf(row.id, undefined, row.version), devisPdfFilename(row)) }
    catch (cause) { setDocumentError(toErrorMessage(cause)) }
    finally { downloadPending.current = false; setDownloading(null) }
  }

  function viewPdf({ id, numero, version }: ApiDevis) {
    setDocumentError(null)
    setPdfPreview({
      title: `Devis ${numero}`,
      filename: devisPdfFilename({ numero }),
      loadFile: (signal) => devisApi.pdf(id, signal, version),
    })
  }

  const query = search.trim().toLocaleLowerCase('fr')
  const visibleRows = devis.rows.filter((row) => (!status || row.statut === status) && (!query ||
    `${row.numero} ${row.clientSnapshot.numeroClient} ${row.clientSnapshot.prenom} ${row.clientSnapshot.nom} ${row.articles.map((line) => `${line.reference} ${line.designation}`).join(' ')}`.toLocaleLowerCase('fr').includes(query)))
  const columns: ColumnDef<ApiDevis>[] = [
    { key: 'numero', header: 'DEVIS', render: (row) => <button type="button" className="link-button devis-number" onClick={() => setDetailTarget(row)}><b>{row.numero}</b></button> },
    { key: 'dateDevis', header: 'DATE', render: (row) => row.dateDevis },
    { key: 'client', header: 'CLIENT', render: (row) => <span>{row.clientSnapshot.prenom} {row.clientSnapshot.nom}<small className="devis-secondary">Client {row.clientSnapshot.numeroClient}</small></span> },
    { key: 'statut', header: 'STATUT', render: (row) => <span className={`devis-status devis-status-${row.statut === 'envoyé' ? 'envoye' : row.statut === 'annulé' ? 'annule' : row.statut}`}>
      {STATUS_OPTIONS.find((option) => option.value === row.statut)?.label}{devisExpired(row.dateValidite) && row.statut !== 'converti' && <small> · expiré</small>}
    </span> },
    { key: 'dateValidite', header: 'VALIDITÉ', render: (row) => row.dateValidite ?? '—' },
    { key: 'totalTTC', header: 'TOTAL TTC', align: 'right', render: (row) => <b className="devis-amount">{formatEuros(row.totalTTC)}</b> },
    { key: 'actions', header: 'ACTIONS', render: (row) => <div className="devis-row-actions">
      <button type="button" className="secondary-button" disabled={busy} aria-haspopup="dialog" aria-label={`Voir le PDF du devis ${row.numero}`} onClick={() => viewPdf(row)}>Voir le PDF</button>
      <button type="button" className="action-btn" disabled={busy} onClick={() => { devis.clearError(); setShareTarget(row) }} aria-label={`Partager le devis ${row.numero}`} title="Partager"><Icon name="share" size="sm" /></button>
      <button type="button" className="action-btn" disabled={busy} onClick={() => void download(row)} aria-label={`Télécharger le PDF du devis ${row.numero}`} title="Télécharger le PDF"><Icon name="download" size="sm" /></button>
      {row.statut !== 'converti' && <button type="button" className="action-btn" disabled={busy} onClick={() => { devis.clearError(); setFormTarget({ devis: row }) }} aria-label={`Modifier le devis ${row.numero}`} title="Modifier"><Icon name="edit" size="sm" /></button>}
      {row.statut !== 'converti' && row.statut !== 'annulé' && !devisExpired(row.dateValidite) && <button type="button" className="secondary-button" disabled={busy} onClick={() => { devis.clearError(); setConversionTarget(row) }} aria-label={`Convertir le devis ${row.numero} en commande client`}>Convertir</button>}
      {row.commandeId !== null && <Link className="link-button" to="/commandes-clients">Commande #{row.commandeId}</Link>}
    </div> },
  ]

  const filteredBesoins = (besoins.data ?? []).filter((line) =>
    (!fournisseurFilter || (fournisseurFilter === 'sans' ? line.fournisseurId === null : line.fournisseurId === Number(fournisseurFilter)))
    && (!modeFilter || line.modeLivraison === modeFilter))
  const besoinColumns: ColumnDef<ApiArticleACommander>[] = [
    { key: 'commande', header: 'COMMANDE CLIENT', render: (row) => <Link className="link-button" to="/commandes-clients">{row.commandeNumero ?? `#${row.commandeId}`}</Link> },
    { key: 'reference', header: 'RÉFÉRENCE', render: (row) => <b>{row.reference}</b> },
    { key: 'designation', header: 'DÉSIGNATION', render: (row) => row.designation },
    { key: 'quantite', header: 'À COMMANDER', align: 'right', render: (row) => <b>{row.quantite}</b> },
    { key: 'fournisseur', header: 'FOURNISSEUR', render: (row) => row.fournisseurId === null ? 'À choisir' : fournisseurs.data?.find((item) => item.id === row.fournisseurId)?.nom ?? `Fournisseur #${row.fournisseurId}` },
    { key: 'mode', header: 'MODE DE LIVRAISON', render: (row) => row.modeLivraison || 'À choisir' },
  ]
  const anyDialog = formTarget !== null || shareTarget !== null || conversionTarget !== null

  return <PageLayout eyebrow="DEVIS" title="Devis" description="Préparez vos propositions commerciales et transformez-les en commandes clients."
    actions={<>
      <button type="button" className="secondary-button" onClick={reload} disabled={devis.loading || busy}><Icon name="rotate-ccw" size="sm" /> Actualiser</button>
      <button type="button" className="primary-button" disabled={busy} aria-haspopup="dialog" onClick={() => { devis.clearError(); setFormTarget({ devis: null }) }}><Icon name="plus" size="sm" /> Nouveau devis</button>
    </>}>
    {!anyDialog && devis.error && <p className="error-banner" role="alert">{devis.error}</p>}
    {documentError && <p className="error-banner" role="alert">{documentError}</p>}
    {downloading !== null && <p className="form-hint" role="status">Préparation du PDF…</p>}
    <div className="devis-toolbar">
      <div className="filter-bar">
        <label className="sr-only" htmlFor="devis-search">Rechercher un devis</label>
        <input id="devis-search" type="search" placeholder="Numéro, client ou article" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="sr-only" htmlFor="devis-status-filter">Filtrer les devis par statut</label>
        <select id="devis-status-filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tous les statuts</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      </div>
      <button type="button" className="secondary-button" aria-expanded={showBesoins} aria-controls="devis-besoins" onClick={() => setShowBesoins((value) => !value)}>
        <Icon name="box" size="sm" /> Articles à commander{besoins.data ? ` (${besoins.data.length})` : ''}
      </button>
    </div>
    <DataTable columns={columns} rows={visibleRows} rowKey={(row) => String(row.id)} loading={devis.loading}
      emptyMessage={query || status ? 'Aucun devis ne correspond aux filtres.' : 'Aucun devis enregistré.'} caption="Liste des devis" />

    {showBesoins && <section id="devis-besoins" className="devis-besoins" aria-labelledby="devis-besoins-title">
      <div className="devis-section-heading"><h2 id="devis-besoins-title">Articles à commander</h2><button type="button" className="link-button" onClick={besoins.reload} disabled={besoins.loading || busy}>Actualiser la liste</button></div>
      <p className="form-hint">Quantités restant à commander pour les devis convertis en commandes clients en cours.</p>
      {canWrite(user?.role, 'depot') && <Link className="secondary-button" to="/commandes-fournisseurs">Gérer les commandes fournisseurs</Link>}
      {besoins.error && <p className="error-banner" role="alert">{besoins.error}</p>}
      <div className="filter-bar">
        <label className="sr-only" htmlFor="besoins-fournisseur">Filtrer par fournisseur</label>
        <select id="besoins-fournisseur" value={fournisseurFilter} onChange={(event) => setFournisseurFilter(event.target.value)}><option value="">Tous les fournisseurs</option><option value="sans">Fournisseur à choisir</option>{(fournisseurs.data ?? []).map((item) => <option key={item.id} value={String(item.id)}>{item.nom}</option>)}</select>
        <label className="sr-only" htmlFor="besoins-mode">Filtrer par mode de livraison</label>
        <select id="besoins-mode" value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}><option value="">Tous les modes de livraison</option>{[...new Set((besoins.data ?? []).map((line) => line.modeLivraison).filter(Boolean))].map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select>
      </div>
      <DataTable columns={besoinColumns} rows={filteredBesoins} rowKey={(row) => String(row.id)} loading={besoins.loading} emptyMessage="Aucun article à commander pour ces filtres." caption="Articles manquants liés aux commandes clients" />
    </section>}

    {formTarget && <DevisForm devis={formTarget.devis} clients={clients.data ?? []} articles={catalogue.data ?? []} taxes={taxes.data ?? []}
      loadingReferences={clients.loading || catalogue.loading || taxes.loading} referenceError={clients.error || catalogue.error || taxes.error}
      saving={devis.saving} error={devis.error} onSave={save} onClose={() => { if (!devis.saving) setFormTarget(null) }} />}
    {shareTarget && <DevisShareDialog key={`${shareTarget.id}-${shareTarget.version}`} devis={shareTarget} onClose={() => setShareTarget(null)} />}
    {conversionTarget && <DevisConversionDialog devis={conversionTarget} saving={devis.saving} error={devis.error}
      onClose={() => { if (!devis.saving) setConversionTarget(null) }} onConvert={async (date) => {
        const result = await devis.convert(conversionTarget.id, conversionTarget.version, date)
        if (result) { besoins.reload(); invalidateReferentials(['/commandes']) }
        return result
      }} />}
    {detailTarget && <DevisDetails devis={detailTarget} onViewPdf={() => viewPdf(detailTarget)} onClose={() => setDetailTarget(null)} />}
    {pdfPreview && <PdfPreviewDialog {...pdfPreview} onClose={() => setPdfPreview(null)} />}
  </PageLayout>
}

function DevisDetails({ devis, onViewPdf, onClose }: { devis: ApiDevis; onViewPdf: () => void; onClose: () => void }) {
  const snapshot = devis.clientSnapshot
  return <FormDialog open title={`Devis ${devis.numero}`} size="wide" cancelLabel="Fermer" onClose={onClose}>
    <div className="devis-detail-header">
      <div><h3>Client {snapshot.numeroClient}</h3><p><b>{snapshot.prenom} {snapshot.nom}</b><br />{snapshot.adresse}<br />{snapshot.codePostal} {snapshot.ville}<br />{snapshot.email} · {snapshot.telephone}{snapshot.siret && <><br />SIRET {snapshot.siret}</>}</p></div>
      <dl><dt>Date du devis</dt><dd>{devis.dateDevis}</dd><dt>Valable jusqu’au</dt><dd>{devis.dateValidite ?? 'Non précisé'}</dd><dt>Statut</dt><dd>{STATUS_OPTIONS.find((option) => option.value === devis.statut)?.label}</dd></dl>
    </div>
    <div className="table-wrap"><table><caption className="sr-only">Articles du devis {devis.numero}</caption>
      <thead><tr><th scope="col">Référence</th><th scope="col">Désignation</th><th scope="col">Quantité</th><th scope="col">PU HT</th><th scope="col">TVA</th><th scope="col">TTC</th></tr></thead>
      <tbody>{devis.articles.map((line) => <tr key={line.ligne}><td>{line.reference}</td><td>{line.designation}</td><td>{line.quantite}</td><td>{formatEuros(line.prixUnitaire)}</td><td>{line.tauxTva} %</td><td>{formatEuros(line.montantTTC)}</td></tr>)}</tbody>
    </table></div>
    <div className="devis-totals"><span>HT <b>{formatEuros(devis.totalHT)}</b></span><span>TVA <b>{formatEuros(devis.totalTVA)}</b></span><strong>Total TTC <b>{formatEuros(devis.totalTTC)}</b></strong></div>
    {devis.notes && <div className="devis-notes"><h3>Notes</h3><p>{devis.notes}</p></div>}
    <div className="form-actions">
      <button type="button" className="secondary-button" aria-haspopup="dialog" onClick={onViewPdf}>Voir le PDF</button>
      {devis.commandeId !== null && <Link className="primary-button" to="/commandes-clients">Voir la commande client #{devis.commandeId}</Link>}
    </div>
  </FormDialog>
}
