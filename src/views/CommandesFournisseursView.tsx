import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { PageLayout } from '../components/PageLayout'
import { canWrite, useAuth } from '../components/useAuth'
import { useToast } from '../components/useToast'
import { useRemoteValue } from '../hooks/useRemoteValue'
import { SUPPLIER_DELIVERY_OPTIONS } from '../options'
import { toErrorMessage } from '../services/api'
import { confirmationIncertaine, lireOperationsEnCours, memoriserOperation, transmettreOperation, type OperationFournisseur } from '../services/commandesFournisseurs'
import type { ApiArticleACommander, ApiCommandeFournisseur, ApiFournisseur, ApiHoraireFournisseur } from '../services/contracts'
import { AchatDialog, AffectationDialog, DetailsCommande, HoraireDialog, ReceptionCommandeDialog } from './commandes-fournisseurs/CommandeDialogs'
import '../commandesFournisseurs.css'

type Cible =
  | { type: 'affectation'; besoin: ApiArticleACommander }
  | { type: 'commande'; besoins: ApiArticleACommander[]; fournisseur: ApiFournisseur; initialId: number }
  | { type: 'reception' | 'detail'; commande: ApiCommandeFournisseur }
  | { type: 'horaire'; fournisseur: ApiFournisseur; horaire: ApiHoraireFournisseur }

const sections = [
  { key: 'besoins', label: 'Articles à commander' },
  { key: 'commandes', label: 'Commandes passées' },
  { key: 'horaires', label: 'Horaires de commande' },
] as const

const libelleMode = (mode: string) => SUPPLIER_DELIVERY_OPTIONS.find((option) => option.value === mode)?.label ?? mode

export default function CommandesFournisseursView() {
  const { user } = useAuth()
  if (!user || !canWrite(user.role, 'depot')) return <PageLayout eyebrow="DÉPÔT" title="Commandes fournisseurs">
    <p className="info-banner">Les commandes fournisseurs sont réservées aux administrateurs et aux magasiniers.</p>
  </PageLayout>
  return <CommandesFournisseurs key={user.id} utilisateurId={user.id} admin={canWrite(user.role, 'admin')} />
}

function CommandesFournisseurs({ utilisateurId, admin }: { utilisateurId: number; admin: boolean }) {
  const besoins = useRemoteValue<ApiArticleACommander[]>('/articles-a-commander')
  const commandes = useRemoteValue<ApiCommandeFournisseur[]>('/commandes-fournisseurs')
  const annuaire = useRemoteValue<ApiFournisseur[]>('/fournisseurs')
  const horaires = useRemoteValue<ApiHoraireFournisseur[]>('/commandes-fournisseurs/horaires')
  const [params, setParams] = useSearchParams()
  const section = sections.find((item) => item.key === params.get('vue'))?.key ?? 'besoins'
  const fournisseurFilter = params.get('fournisseur') ?? ''
  const modeFilter = params.get('mode') ?? ''
  const commandeFilter = params.get('commande') ?? ''
  const [cible, setCible] = useState<Cible | null>(null)
  const [enCours, setEnCours] = useState(() => lireOperationsEnCours(utilisateurId))
  const operations = useRef(enCours)
  const rejeuEnCours = useRef(false)
  const [rejeu, setRejeu] = useState('')
  const [rejeuErreur, setRejeuErreur] = useState('')
  const toast = useToast()
  const fournisseurs = annuaire.data ?? []
  const actifs = fournisseurs.filter((f) => f.actif)
  const regles = new Map((horaires.data ?? []).map((row) => [row.fournisseurId, row]))
  const horairesConfigures = horaires.data?.some((row) => row.heureBlocage !== null)
  const rafraichirHoraires = horaires.reload
  useEffect(() => {
    if (!horairesConfigures) return
    const timer = window.setInterval(rafraichirHoraires, 60000)
    window.addEventListener('focus', rafraichirHoraires)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', rafraichirHoraires) }
  }, [horairesConfigures, rafraichirHoraires])

  function filtrer(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'vue' && value !== 'besoins' && next.get('fournisseur') === 'sans') next.delete('fournisseur')
    if (key === 'vue' && value !== 'commandes') next.delete('commande')
    setParams(next, { replace: true })
  }

  function reload() {
    besoins.reload()
    commandes.reload()
    annuaire.reload()
    horaires.reload()
  }

  function succes(message: string) {
    setCible(null)
    setRejeuErreur('')
    toast.success(message)
    reload()
  }

  function memoriser(op: OperationFournisseur, garder: boolean) {
    const next = operations.current.filter((item) => item.cle !== op.cle)
    if (garder) next.push(op)
    operations.current = next
    setEnCours(next)
    memoriserOperation(utilisateurId, op, garder)
  }

  async function transmettre(op: OperationFournisseur) {
    memoriser(op, true)
    try {
      const message = await transmettreOperation(op)
      memoriser(op, false)
      return message
    } catch (cause) {
      if (!confirmationIncertaine(cause)) memoriser(op, false)
      throw cause
    }
  }

  async function reessayer(op: OperationFournisseur) {
    if (rejeuEnCours.current) return
    rejeuEnCours.current = true
    setRejeu(op.cle)
    setRejeuErreur('')
    try { succes(await transmettre(op)) }
    catch (cause) { setRejeuErreur(toErrorMessage(cause)); reload() }
    finally { rejeuEnCours.current = false; setRejeu('') }
  }

  const besoinsEnCours = new Set(enCours.flatMap((op) => op.type === 'commande' ? op.articles.map((line) => line.besoinId) : []))
  const receptionsEnCours = new Set(enCours.flatMap((op) => op.type === 'reception' ? [op.commandeId] : []))
  const articles = besoins.data ?? []
  const nomFournisseur = (id: number) => fournisseurs.find((f) => f.id === id)?.nom ?? `Fournisseur n° ${id}`
  const filtreFournisseur = (id: number | null) => !fournisseurFilter || (fournisseurFilter === 'sans' ? id === null : Number(fournisseurFilter) === id)
  const matches = (row: { fournisseurId: number | null; modeLivraison: string }) => filtreFournisseur(row.fournisseurId) && (!modeFilter || row.modeLivraison === modeFilter)

  const besoinColonnes: ColumnDef<ApiArticleACommander>[] = [
    { key: 'article', header: 'ARTICLE', render: (b) => <><strong>{b.reference}</strong><small className="achat-secondaire">{b.designation}</small></> },
    { key: 'client', header: 'COMMANDE CLIENT', render: (b) => b.commandeNumero ?? `#${b.commandeId}` },
    { key: 'quantite', header: 'À COMMANDER', align: 'right', render: (b) => <strong>{b.quantite}</strong> },
    { key: 'fournisseur', header: 'FOURNISSEUR / MODE', render: (b) => b.fournisseurId === null ? 'À choisir' : <>
      {nomFournisseur(b.fournisseurId)}<small className="achat-secondaire">{libelleMode(b.modeLivraison)}{regles.get(b.fournisseurId)?.bloque && ' · Commandes suspendues'}</small>
    </> },
    { key: 'actions', header: 'ACTIONS', render: (b) => {
      const fournisseur = actifs.find((f) => f.id === b.fournisseurId)
      return <div className="actions-cell">
        <button type="button" className="secondary-button small" aria-haspopup="dialog" aria-label={`Affecter ${b.reference} à un fournisseur`}
          disabled={!actifs.length || besoinsEnCours.has(b.id)} onClick={() => setCible({ type: 'affectation', besoin: b })}>Affecter</button>
        {fournisseur && <button type="button" className="primary-button" aria-haspopup="dialog" aria-label={`Commander ${b.reference}`}
          disabled={regles.get(fournisseur.id)?.bloque || besoinsEnCours.has(b.id)}
          onClick={() => setCible({ type: 'commande', initialId: b.id, fournisseur,
            besoins: [b, ...articles.filter((line) => line.id !== b.id && line.fournisseurId === fournisseur.id && line.modeLivraison === b.modeLivraison && !besoinsEnCours.has(line.id))],
          })}>Commander</button>}
      </div>
    } },
  ]

  const commandeColonnes: ColumnDef<ApiCommandeFournisseur>[] = [
    { key: 'id', header: 'COMMANDE', render: (c) => <button type="button" className="link-button" aria-haspopup="dialog"
      aria-label={`Consulter la commande n° ${c.id}`} onClick={() => setCible({ type: 'detail', commande: c })}>N° {c.id}</button> },
    { key: 'fournisseur', header: 'FOURNISSEUR', render: (c) => <><strong>{c.fournisseur}</strong><small className="achat-secondaire">{libelleMode(c.modeLivraison)}</small></> },
    { key: 'date', header: 'DATE', render: (c) => c.dateCommande },
    { key: 'statut', header: 'STATUT', render: (c) => c.statut },
    { key: 'quantite', header: 'REÇU / COMMANDÉ', align: 'right', render: (c) => c.reliquatInconnu ? 'Reliquat à rapprocher'
      : `${c.articles.reduce((s, l) => s + l.quantiteRecue, 0)} / ${c.articles.reduce((s, l) => s + l.quantite, 0)}` },
    { key: 'actions', header: 'ACTIONS', render: (c) => !c.reliquatInconnu && (c.statut === 'envoyée' || c.statut === 'partielle') && c.articles.some((l) => l.quantiteRecue < l.quantite) &&
      <button type="button" className="secondary-button" aria-haspopup="dialog" disabled={receptionsEnCours.has(c.id)}
        aria-label={`Réceptionner la commande n° ${c.id}`} onClick={() => setCible({ type: 'reception', commande: c })}>Réceptionner</button> },
  ]

  const horaireColonnes: ColumnDef<ApiHoraireFournisseur>[] = [
    { key: 'fournisseur', header: 'FOURNISSEUR', render: (h) => <strong>{nomFournisseur(h.fournisseurId)}</strong> },
    { key: 'heure', header: 'DÉBUT (PARIS)', render: (h) => h.heureBlocage ?? 'Aucun blocage' },
    { key: 'duree', header: 'DURÉE', render: (h) => h.dureeBlocageMinutes === null ? '—' : `${h.dureeBlocageMinutes} min` },
    { key: 'bloque', header: 'ÉTAT', render: (h) => h.bloque ? 'Commandes suspendues' : 'Hors blocage' },
  ]
  if (admin) horaireColonnes.push({ key: 'actions', header: 'ACTIONS', render: (h) => {
    const fournisseur = fournisseurs.find((f) => f.id === h.fournisseurId)
    return fournisseur && <button type="button" className="secondary-button" aria-haspopup="dialog" aria-label={`Modifier les horaires de ${fournisseur.nom}`}
      onClick={() => setCible({ type: 'horaire', fournisseur, horaire: h })}>Modifier</button>
  } })
  const actions = { onSuccess: succes, onClose: () => setCible(null) }
  const lecture = section === 'commandes' ? commandes : section === 'horaires' ? horaires : besoins

  return <PageLayout eyebrow="DÉPÔT" title="Commandes fournisseurs" actions={
    <button type="button" className="secondary-button" onClick={reload} disabled={lecture.loading}><Icon name="rotate-ccw" size="sm" /> Actualiser</button>
  }>
    {!cible && enCours.map((op) => <div className="info-banner" key={op.cle}>
      <span>{op.type === 'commande' ? `Commande auprès de ${nomFournisseur(op.fournisseurId)}` : `Réception de la commande n° ${op.commandeId}`} en attente de confirmation.</span>
      <button type="button" className="secondary-button small" disabled={Boolean(rejeu)} onClick={() => void reessayer(op)}>
        {rejeu === op.cle ? 'Vérification…' : 'Réessayer'}</button>
    </div>)}
    {rejeuErreur && <p className="error-banner" role="alert">{rejeuErreur}</p>}
    <div className="filter-bar" role="group" aria-label="Suivi des achats">
      {sections.map(({ key, label }) => <button key={key} type="button" className={`filter-tab ${section === key ? 'active' : ''}`}
        aria-pressed={section === key} onClick={() => filtrer('vue', key)}>{label}</button>)}
    </div>
    <div className="filter-bar">
      {section === 'commandes' && commandeFilter && <button type="button" className="secondary-button" onClick={() => filtrer('commande', '')}
        aria-label={`Retirer le filtre de la commande n° ${commandeFilter}`}>Commande n° {commandeFilter}<Icon name="close" size="sm" /></button>}
      <label className="sr-only" htmlFor="achats-filtre-fournisseur">Filtrer par fournisseur</label>
      <select id="achats-filtre-fournisseur" value={fournisseurFilter} onChange={(event) => filtrer('fournisseur', event.target.value)}>
        <option value="">Tous les fournisseurs</option>{section === 'besoins' && <option value="sans">Fournisseur à choisir</option>}
        {fournisseurs.map((f) => <option value={f.id} key={f.id}>{f.nom}{f.actif ? '' : ' (inactif)'}</option>)}
      </select>
      {section !== 'horaires' && <><label className="sr-only" htmlFor="achats-filtre-mode">Filtrer par mode de livraison</label>
        <select id="achats-filtre-mode" value={modeFilter} onChange={(event) => filtrer('mode', event.target.value)}>
          <option value="">Tous les modes de livraison</option>{SUPPLIER_DELIVERY_OPTIONS.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
        </select></>}
    </div>
    {annuaire.error && <p className="error-banner" role="alert">Annuaire fournisseurs indisponible. {annuaire.error}</p>}
    {lecture.error && <p className="error-banner" role="alert">{lecture.error}</p>}
    {section === 'besoins' && <>
      {!annuaire.loading && !annuaire.error && !actifs.length && <p className="info-banner">Ajoutez ou réactivez un fournisseur dans l’annuaire pour affecter les articles.</p>}
      <DataTable caption="Articles à commander" columns={besoinColonnes} rows={articles.filter(matches)} rowKey={(b) => String(b.id)}
        loading={besoins.loading} emptyMessage="Aucun article à commander pour ces filtres." />
    </>}
    {section === 'commandes' && <DataTable caption="Commandes fournisseurs passées" columns={commandeColonnes}
      rows={(commandes.data ?? []).filter((c) => matches(c) && (!commandeFilter || String(c.id) === commandeFilter))}
      rowKey={(c) => String(c.id)} loading={commandes.loading} emptyMessage="Aucune commande fournisseur pour ces filtres." />}
    {section === 'horaires' && <DataTable caption="Horaires de commande par fournisseur" columns={horaireColonnes} rows={(horaires.data ?? []).filter((h) => filtreFournisseur(h.fournisseurId))}
      rowKey={(h) => String(h.fournisseurId)} loading={horaires.loading} emptyMessage="Aucun fournisseur pour ce filtre." />}
    {cible?.type === 'affectation' && <AffectationDialog {...actions} besoin={cible.besoin} fournisseurs={actifs} />}
    {cible?.type === 'commande' && <AchatDialog {...actions} {...cible} transmit={transmettre} />}
    {cible?.type === 'reception' && <ReceptionCommandeDialog {...actions} commande={cible.commande} transmit={transmettre} />}
    {cible?.type === 'detail' && <DetailsCommande commande={cible.commande} onClose={actions.onClose} />}
    {cible?.type === 'horaire' && <HoraireDialog {...actions} fournisseur={cible.fournisseur} horaire={cible.horaire} />}
  </PageLayout>
}
