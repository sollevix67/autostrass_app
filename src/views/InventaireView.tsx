import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageLayout } from '../components/PageLayout'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormDialog } from '../components/FormDialog'
import { useConfirm } from '../components/useConfirm'
import { FormInput } from '../components/forms/FormFields'
import { ErrorSummary } from '../components/forms/ErrorSummary'
import { canWrite, useAuth } from '../components/useAuth'
import { useToast } from '../components/useToast'
import { useRemoteValue } from '../hooks/useRemoteValue'
import { useEmplacements } from '../hooks/useEmplacements'
import { api, ApiError, toErrorMessage } from '../services/api'
import type { ApiArticle, ApiInventaire, ApiInventairePreparation } from '../services/contracts'
import { inventaireSchema, MAX_STOCK, type InventaireInput } from '../schemas/inventaire'
import '../inventaire.css'

const formatDelta = (value: number) => value > 0 ? `+${value}` : String(value)
const dateLabel = (date: string) => new Date(date).toLocaleString('fr-FR')

function Historique({ revision }: { revision: number }) {
  const [reference, setReference] = useState('')
  const [filter, setFilter] = useState('')
  const [before, setBefore] = useState<number | null>(null)
  const query = new URLSearchParams()
  if (filter) query.set('reference', filter)
  if (before !== null) query.set('before', String(before))
  return <section className="form-card inventaire-history">
    <h2>Historique des comptages</h2>
    <form className="form-actions" onSubmit={(event) => { event.preventDefault(); setFilter(reference.trim()); setBefore(null) }}>
      <FormInput label="Référence exacte" name="history-reference" value={reference} onChange={(_, value) => setReference(value)} />
      <button className="secondary-button" type="submit">Filtrer l’historique</button>
      {(filter || before !== null) && <button className="link-button" type="button" onClick={() => { setBefore(null); setFilter(''); setReference('') }}>Voir les derniers comptages</button>}
    </form>
    <HistoriquePage key={`${revision}-${query}`} path={`/inventaires?${query}`} onOlder={setBefore} />
  </section>
}

function HistoriquePage({ path, onOlder }: { path: string; onOlder: (id: number) => void }) {
  const history = useRemoteValue<ApiInventaire[]>(path)
  if (history.loading) return <p role="status">Chargement de l’historique…</p>
  if (history.error) return <p className="error-banner" role="alert">{history.error} <button className="link-button" onClick={history.reload}>Réessayer</button></p>
  if (!history.data?.length) return <p>Aucun comptage enregistré pour cette sélection.</p>
  return <>
    <button className="link-button" onClick={history.reload}>Actualiser l’historique</button>
    {history.data.map((item) => <details key={item.id} className="inventaire-record">
      <summary>#{item.id} · {item.reference} · {dateLabel(item.createdAt)} · {item.quantiteAvant} → {item.quantiteComptee} unités ({formatDelta(item.quantiteComptee - item.quantiteAvant)})</summary>
      <p>{item.designation} — {item.auteur}</p>
      <p>Motif : {item.motif}</p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label={`Détail du comptage ${item.id}`}>
        <table><thead><tr><th scope="col">Emplacement</th><th scope="col">Avant</th><th scope="col">Compté</th><th scope="col">Écart</th></tr></thead>
          <tbody>{item.lignes.map((line) => <tr key={line.emplacementId ?? 'none'}>
            <td>{line.chemin}</td><td>{line.quantiteAvant}</td><td>{line.quantiteComptee}</td><td>{formatDelta(line.quantiteComptee - line.quantiteAvant)}</td>
          </tr>)}</tbody></table>
      </div>
    </details>)}
    {history.data.length === 50 && <button className="secondary-button" onClick={() => onOlder(history.data!.at(-1)!.id)}>Comptages plus anciens</button>}
  </>
}

type ComptageProps = { reference: string; onClose: () => void; onSaved: (record: ApiInventaire) => void }

function Comptage({ reference, onClose, onSaved }: ComptageProps) {
  const stock = useRemoteValue<ApiInventairePreparation>(`/inventaires/${encodeURIComponent(reference)}`)
  if (stock.loading || stock.error || !stock.data) return <FormDialog open title={`Comptage — ${reference}`} onClose={onClose}>
    {stock.loading ? <p role="status">Chargement du stock à compter…</p> : <p className="error-banner" role="alert">{stock.error ?? 'Stock indisponible.'} <button className="link-button" onClick={stock.reload}>Réessayer</button></p>}
  </FormDialog>
  return <ComptageForm key={stock.data.version} stock={stock.data} onClose={onClose} onSaved={onSaved} onRestart={stock.reload} />
}

function ComptageForm({ stock, onClose, onSaved, onRestart }: {
  stock: ApiInventairePreparation; onClose: () => void; onSaved: (record: ApiInventaire) => void; onRestart: () => void
}) {
  const [lines, setLines] = useState(() => stock.lignes.map((line) => ({ ...line, count: '' })))
  const [motif, setMotif] = useState('')
  const [location, setLocation] = useState('')
  const [errors, setErrors] = useState<Record<string, { message: string }>>({})
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const { dialogProps, confirm } = useConfirm()
  const navigate = useNavigate()
  const locations = useEmplacements()
  const dirty = !!motif || lines.some((line) => line.count !== '') || lines.length !== stock.lignes.length
  const available = locations.emplacements.filter((item) => item.actif && !lines.some((line) => line.emplacementId === item.id))
  const complete = lines.every((line) => line.count.trim() !== '' && Number.isInteger(Number(line.count)) && Number(line.count) >= 0)
  const total = complete ? lines.reduce((sum, line) => sum + Number(line.count), 0) : null

  useEffect(() => {
    if (!dirty && !saving) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving])

  useEffect(() => {
    if (!dirty && !saving) return
    const guardNavigation = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank'
        || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const url = new URL(anchor.href)
      if (url.origin !== window.location.origin
        || (url.pathname === window.location.pathname && url.search === window.location.search)) return
      event.preventDefault()
      event.stopPropagation()
      if (busy.current) return
      confirm('Quitter le comptage', 'Les quantités saisies ne sont pas enregistrées. Voulez-vous quitter cette page ?', () => navigate(url.pathname + url.search + url.hash))
    }
    document.addEventListener('click', guardNavigation, true)
    return () => document.removeEventListener('click', guardNavigation, true)
  }, [dirty, saving, confirm, navigate])

  async function save(input: InventaireInput) {
    if (busy.current || conflict) return
    busy.current = true
    setSaving(true)
    setError(null)
    try {
      const record = await api.post<ApiInventaire>(`/inventaires/${encodeURIComponent(stock.reference)}`, input)
      onSaved(record)
    } catch (cause) {
      setError(toErrorMessage(cause))
      if (cause instanceof ApiError && cause.code === 'STOCK_CHANGED') setConflict(true)
    } finally { busy.current = false; setSaving(false) }
  }

  function review() {
    const result = inventaireSchema.safeParse({ version: stock.version, motif, lignes: lines.map((line) => ({
      emplacementId: line.emplacementId, quantiteComptee: line.count.trim() === '' ? undefined : Number(line.count),
    })) })
    if (!result.success) {
      const issues: Record<string, { message: string }> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] === 'lignes' && typeof issue.path[1] === 'number' ? `count-${issue.path[1]}` : String(issue.path[0])
        issues[field] ??= { message: issue.message }
      }
      setErrors(issues)
      return
    }
    setErrors({})
    const countedTotal = result.data.lignes.reduce((sum, line) => sum + line.quantiteComptee, 0)
    confirm('Valider le comptage physique', <>
      <p><strong>{stock.reference}</strong> : {stock.quantiteTotale} → <strong>{countedTotal} unités</strong>, écart {formatDelta(countedTotal - stock.quantiteTotale)}.</p>
      <p>Les quantités comptées remplaceront le stock et sa répartition. Le résultat sera conservé dans l’historique.</p>
      <p>Motif : {result.data.motif}</p>
    </>, () => { void save(result.data) })
  }

  const cancel = () => {
    if (busy.current) return
    if (dirty) confirm('Abandonner le comptage', 'Les quantités saisies ne seront pas enregistrées.', onClose)
    else onClose()
  }

  return <FormDialog open title={`${stock.reference} — ${stock.designation}`} className="inventaire-count" size="wide" busy={saving} onClose={cancel} showCancel={false}>
    <p>Comptez tous les emplacements et les unités non affectées. Saisissez explicitement 0 si aucun article n’est présent.</p>
    {stock.incoherent && <p className="info-banner" role="status">La répartition actuelle est incohérente. Ce comptage complet la remplacera par les quantités réellement constatées.</p>}
    {error && <p className="error-banner" role="alert">{error} {!conflict && 'En cas de réponse perdue, vérifiez l’historique avant de réessayer.'}</p>}
    <form noValidate onSubmit={(event) => { event.preventDefault(); if (!saving && !conflict) review() }}>
      <ErrorSummary errors={errors} labels={{ motif: 'Motif', lignes: 'Comptage', ...Object.fromEntries(lines.map((line, index) => [`count-${index}`, line.chemin])) }} />
      <fieldset disabled={saving || conflict}>
        <legend className="visually-hidden">Quantités physiques</legend>
        <div className="inventaire-lines">
          {lines.map((line, index) => <div key={line.emplacementId ?? 'none'} className="inventaire-line">
            <div><strong>{line.chemin}</strong><p>Stock théorique : {line.quantiteAvant}</p></div>
            <FormInput name={`count-${index}`} label={`Quantité comptée — ${line.chemin}`} type="number" min={0} max={MAX_STOCK} step="1" required
              value={line.count} error={errors[`count-${index}`]?.message}
              onChange={(_, value) => setLines((current) => current.map((item, position) => position === index ? { ...item, count: value } : item))} />
            <span className="inventaire-delta">Écart : {line.count !== '' && Number.isInteger(Number(line.count)) ? formatDelta(Number(line.count) - line.quantiteAvant) : '—'}</span>
          </div>)}
        </div>
        <div className="form-actions">
          <div className="form-group"><label htmlFor="count-location">Article trouvé à un autre emplacement</label>
            <select id="count-location" value={location} onChange={(event) => setLocation(event.target.value)} disabled={locations.loading || !!locations.error}>
              <option value="">Choisir un emplacement</option>{available.map((item) => <option key={item.id} value={item.id}>{item.chemin}</option>)}
            </select>
          </div>
          <button className="secondary-button" type="button" disabled={!location || lines.length >= 500} onClick={() => {
            const selected = available.find((item) => item.id === Number(location))
            if (selected) { setLines((current) => [...current, { emplacementId: selected.id, chemin: selected.chemin, quantiteAvant: 0, count: '' }]); setLocation('') }
          }}>Ajouter au comptage</button>
        </div>
        {locations.error && <p className="error-banner" role="alert">Emplacements : {locations.error} <button className="link-button" type="button" onClick={locations.reload}>Recharger les emplacements</button></p>}
        <FormInput label="Motif du comptage" name="motif" value={motif} onChange={(_, value) => setMotif(value)} required error={errors.motif?.message} placeholder="Ex. Contrôle physique du rayon freinage" />
        <p className="inventaire-total" aria-live="polite">Total théorique : {stock.quantiteTotale} · Total compté : <strong>{total ?? 'À compléter'}</strong>{total !== null && ` · Écart : ${formatDelta(total - stock.quantiteTotale)}`}</p>
        <button type="submit" className="primary-button">Vérifier et valider le comptage</button>
      </fieldset>
      {saving && <p role="status">Enregistrement du comptage…</p>}
      <div className="form-actions">
        {conflict && <button type="button" className="primary-button" onClick={() => confirm('Recommencer le comptage', 'Le stock actualisé sera chargé. Les quantités saisies seront effacées pour effectuer un nouveau comptage.', onRestart)}>Recommencer avec le stock actualisé</button>}
        <button type="button" className="secondary-button" disabled={saving} onClick={cancel}>Annuler le comptage</button>
      </div>
    </form>
    <ConfirmDialog {...dialogProps} />
  </FormDialog>
}

function InventaireContent() {
  const [params] = useSearchParams()
  const [reference, setReference] = useState(params.get('reference') ?? '')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [saved, setSaved] = useState<ApiInventaire | null>(null)
  const catalogue = useRemoteValue<ApiArticle[]>('/articles')
  const toast = useToast()
  const filtered = catalogue.data?.filter((article) => [article.reference, article.designation, article.ean13].some((value) => value?.toLocaleLowerCase().includes(query.toLocaleLowerCase()))) ?? []
  return <>
    {saved && <p className="info-banner" role="status">Comptage #{saved.id} enregistré pour {saved.reference} : {saved.quantiteComptee} unités, écart {formatDelta(saved.quantiteComptee - saved.quantiteAvant)}.</p>}
    {active ? <Comptage key={active} reference={active} onClose={() => setActive(null)} onSaved={(record) => {
      setSaved(record); setActive(null); setRevision((value) => value + 1); toast.success('Comptage enregistré et stock actualisé')
    }} /> : null}
    <section className="form-card">
      <h2>Commencer un comptage</h2>
      <p>Choisissez une référence, puis comptez toutes ses unités dans la fenêtre de comptage avant de valider.</p>
      {catalogue.loading && <p role="status">Chargement des articles…</p>}
      {catalogue.error && <p className="error-banner" role="alert">{catalogue.error} <button className="link-button" onClick={catalogue.reload}>Réessayer</button></p>}
      <form onSubmit={(event) => { event.preventDefault(); if (catalogue.data?.some((article) => article.reference === reference)) { setSaved(null); setActive(reference) } }}>
        <FormInput label="Rechercher par référence, désignation ou EAN13" name="count-search" value={query} onChange={(_, value) => setQuery(value)} />
        <div className="form-group"><label htmlFor="count-reference">Article à compter</label>
          <select id="count-reference" value={reference} onChange={(event) => setReference(event.target.value)} disabled={catalogue.loading || !!catalogue.error}>
            <option value="">Choisir une référence</option>
            {catalogue.data?.filter((article) => article.reference === reference || filtered.includes(article)).map((article) => <option key={article.reference} value={article.reference}>{article.reference} — {article.designation}</option>)}
          </select>
        </div>
        {!catalogue.loading && !catalogue.error && !filtered.length && <p>Aucun article ne correspond à cette recherche.</p>}
        <div className="form-actions"><button className="primary-button" aria-haspopup="dialog" disabled={catalogue.loading || !!catalogue.error || !catalogue.data?.some((article) => article.reference === reference)}>Commencer le comptage</button></div>
      </form>
    </section>
    <Historique revision={revision} />
  </>
}

export default function InventaireView() {
  const { user } = useAuth()
  return <PageLayout eyebrow="STOCK" title="Inventaire physique" description="Comptage par référence et ajustements traçables du stock." actions={<Link className="secondary-button" to="/stock">Retour au stock</Link>}>
    {canWrite(user?.role, 'depot') ? <InventaireContent /> : <p className="info-banner">L’inventaire est réservé aux magasiniers et aux administrateurs.</p>}
  </PageLayout>
}
