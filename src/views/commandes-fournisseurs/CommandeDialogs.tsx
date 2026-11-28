import { useRef, useState, type ReactNode } from 'react'
import { FormDialog } from '../../components/FormDialog'
import { FormInput, FormSelect } from '../../components/forms/FormFields'
import { formatEuros, SUPPLIER_DELIVERY_OPTIONS } from '../../options'
import { api, ApiError, toErrorMessage } from '../../services/api'
import { cleOperation, confirmationIncertaine, type OperationFournisseur } from '../../services/commandesFournisseurs'
import type { ApiArticleACommander, ApiCommandeFournisseur, ApiFournisseur, ApiHoraireFournisseur } from '../../services/contracts'

type DialogActions = { onClose: () => void; onSuccess: (message: string) => void }
type Transmit = (operation: OperationFournisseur) => Promise<string>

function FormulaireAchat({ title, description, submitLabel, commit, onClose, onSuccess, children, idempotent = false }: DialogActions & {
  title: string
  description?: string
  submitLabel: string
  commit: () => Promise<string>
  children: ReactNode
  idempotent?: boolean
}) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const close = () => { if (!pending.current) onClose() }
  return <FormDialog open title={title} description={description} busy={busy} showCancel={false} onClose={close}>
    <form onSubmit={async (event) => {
      event.preventDefault()
      if (pending.current) return
      pending.current = true
      setBusy(true)
      setError('')
      try { onSuccess(await commit()) }
      catch (cause) {
        setError(toErrorMessage(cause))
        setUncertain(idempotent && confirmationIncertaine(cause))
      } finally {
        pending.current = false
        setBusy(false)
      }
    }}>
      <fieldset className="form-dialog-fields" disabled={uncertain}>{children}</fieldset>
      {error && <p className="error-banner" role="alert">{error}</p>}
      {uncertain && <p className="form-hint">La confirmation manque. Réessayez pour retrouver cette opération avec les quantités saisies.</p>}
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={close}>{uncertain ? 'Fermer' : 'Annuler'}</button>
        <button type="submit" className="primary-button">{busy ? 'Enregistrement…' : uncertain ? 'Réessayer' : submitLabel}</button>
      </div>
    </form>
  </FormDialog>
}

export function AffectationDialog({ besoin, fournisseurs, ...actions }: DialogActions & {
  besoin: ApiArticleACommander
  fournisseurs: ApiFournisseur[]
}) {
  const [supplierId, setSupplierId] = useState(fournisseurs.some((f) => f.id === besoin.fournisseurId) ? String(besoin.fournisseurId) : '')
  const [mode, setMode] = useState<string>(besoin.modeLivraison)
  return <FormulaireAchat {...actions} title="Affecter un article" submitLabel="Enregistrer l’affectation"
    description={`${besoin.reference} · ${besoin.designation} · Commande client ${besoin.commandeNumero ?? '#' + besoin.commandeId}`}
    commit={async () => {
      await api.put(`/articles-a-commander/${besoin.id}`, { fournisseurId: Number(supplierId), modeLivraison: mode })
      return `Affectation enregistrée pour ${besoin.reference}.`
    }}>
    <div className="form-grid-2">
      <FormSelect name="achat-fournisseur" label="Fournisseur actif" value={supplierId} required placeholder="Choisir un fournisseur"
        options={fournisseurs.map((f) => ({ value: String(f.id), label: f.nom }))}
        onChange={(_, value) => {
          setSupplierId(value)
          const fournisseur = fournisseurs.find((item) => String(item.id) === value)
          if (fournisseur) setMode(fournisseur.modeLivraison)
        }} />
      <FormSelect name="achat-mode" label="Mode de livraison" value={mode} required options={SUPPLIER_DELIVERY_OPTIONS}
        placeholder={null} onChange={(_, value) => setMode(value)} />
    </div>
  </FormulaireAchat>
}

export function AchatDialog({ besoins, initialId, fournisseur, transmit, ...actions }: DialogActions & {
  besoins: ApiArticleACommander[]
  initialId: number
  fournisseur: ApiFournisseur
  transmit: Transmit
}) {
  const [cle] = useState(cleOperation)
  const [quantites, setQuantites] = useState<Record<number, string>>(() => Object.fromEntries(besoins.map((b) =>
    [b.id, b.id === initialId ? String(Math.min(9999, b.quantite)) : '0'])))
  const [prix, setPrix] = useState<Record<number, string>>({})
  const mode = besoins[0].modeLivraison
  const selected = besoins.filter((b) => Number(quantites[b.id]) > 0)
  const total = selected.reduce((cents, line) => cents + Number(quantites[line.id]) * Math.round(Number(prix[line.id]) * 100), 0)
  return <FormulaireAchat {...actions} title="Passer une commande fournisseur" submitLabel="Passer la commande" idempotent
    description={`${fournisseur.nom} · ${SUPPLIER_DELIVERY_OPTIONS.find((option) => option.value === mode)?.label ?? mode}. Transmettez la commande au fournisseur par votre canal habituel.`}
    commit={async () => {
      if (!selected.length || selected.length > 200) throw new ApiError(422, 'INVALID_LINES', 'Choisissez entre 1 et 200 lignes à commander.')
      return transmit({ type: 'commande', cle, fournisseurId: fournisseur.id, modeLivraison: mode,
        articles: selected.map((line) => ({ besoinId: line.id, quantite: Number(quantites[line.id]), prixUnitaire: Number(prix[line.id]) })),
      })
    }}>
    {besoins.length > 1 && <p className="form-hint">Vous pouvez regrouper ces besoins. Laissez la quantité à zéro pour exclure un article.</p>}
    {besoins.map((line) => <div key={line.id} className="achat-ligne">
      <p><strong>{line.reference}</strong> · {line.designation}<small>Commande client {line.commandeNumero ?? `#${line.commandeId}`} · {line.quantite} à commander</small></p>
      <div className="form-grid-2">
        <FormInput name={`quantite-${line.id}`} label="Quantité à commander" type="number" min={0} max={Math.min(9999, line.quantite)} step="1"
          value={quantites[line.id]} onChange={(_, value) => setQuantites((previous) => ({ ...previous, [line.id]: value }))} />
        {Number(quantites[line.id]) > 0 && <FormInput name={`prix-${line.id}`} label="Prix d’achat unitaire HT (€)" type="number" min={0} max={1000000}
          step="0.01" value={prix[line.id] ?? ''} required onChange={(_, value) => setPrix((previous) => ({ ...previous, [line.id]: value }))} />}
      </div>
    </div>)}
    {selected.length > 0 && Number.isFinite(total) && selected.every((line) => prix[line.id]?.trim()) &&
      <div className="reception-total"><strong>Total HT {formatEuros(total / 100)}</strong></div>}
  </FormulaireAchat>
}

export function ReceptionCommandeDialog({ commande, transmit, ...actions }: DialogActions & { commande: ApiCommandeFournisseur; transmit: Transmit }) {
  const [cle] = useState(cleOperation)
  const restantes = commande.articles.filter((line) => line.quantiteRecue < line.quantite)
  const [quantites, setQuantites] = useState<Record<number, string>>({})
  return <FormulaireAchat {...actions} title={`Réceptionner la commande n° ${commande.id}`} submitLabel="Enregistrer la réception" idempotent
    description={`${commande.fournisseur} · Saisissez uniquement les pièces reçues lors de cette livraison.`}
    commit={async () => {
      const articles = restantes.map((line) => ({ ligne: line.ligne, quantite: Number(quantites[line.ligne] || 0) })).filter((line) => line.quantite > 0)
      if (!articles.length) throw new ApiError(422, 'EMPTY_RECEIPT', 'Saisissez au moins une quantité reçue.')
      return transmit({ type: 'reception', cle, commandeId: commande.id, articles })
    }}>
    <button type="button" className="secondary-button" onClick={() => setQuantites(Object.fromEntries(restantes.map((line) =>
      [line.ligne, String(line.quantite - line.quantiteRecue)])))}>Tout réceptionner</button>
    {restantes.map((line) => <div className="achat-ligne" key={line.ligne}>
      <p><strong>{line.reference}</strong> · {line.designation}<small>{line.quantite - line.quantiteRecue} à recevoir
        {line.commandeClientId !== null && <> · Commande client {line.commandeClientNumero ?? `#${line.commandeClientId}`}</>}</small></p>
      <FormInput name={`recu-${line.ligne}`} label="Quantité reçue" type="number" min={0} max={line.quantite - line.quantiteRecue}
        step="1" value={quantites[line.ligne] ?? ''} placeholder="0" onChange={(_, value) => setQuantites((previous) => ({ ...previous, [line.ligne]: value }))} />
    </div>)}
  </FormulaireAchat>
}

export function HoraireDialog({ fournisseur, horaire, ...actions }: DialogActions & { fournisseur: ApiFournisseur; horaire: ApiHoraireFournisseur }) {
  const [active, setActive] = useState(horaire.heureBlocage !== null)
  const [heure, setHeure] = useState(horaire.heureBlocage ?? '')
  const [duree, setDuree] = useState(horaire.dureeBlocageMinutes?.toString() ?? '')
  return <FormulaireAchat {...actions} title={`Horaires de ${fournisseur.nom}`} submitLabel="Enregistrer les horaires"
    commit={async () => {
      await api.put(`/commandes-fournisseurs/horaires/${fournisseur.id}`, { heureBlocage: active ? heure : null, dureeBlocageMinutes: active ? Number(duree) : null })
      return `Horaires de commande enregistrés pour ${fournisseur.nom}.`
    }}>
    <div className="form-group"><label><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Bloquer les commandes chaque jour</label></div>
    {active && <div className="form-grid-2">
      <FormInput name="horaire-debut" label="Début du blocage (heure de Paris)" type="time" required value={heure} onChange={(_, value) => setHeure(value)} />
      <FormInput name="horaire-duree" label="Durée du blocage (minutes)" type="number" min={1} max={1439} step="1" required value={duree} onChange={(_, value) => setDuree(value)} />
    </div>}
  </FormulaireAchat>
}

export function DetailsCommande({ commande, onClose }: { commande: ApiCommandeFournisseur; onClose: () => void }) {
  return <FormDialog open title={`Commande fournisseur n° ${commande.id}`} size="wide" cancelLabel="Fermer" onClose={onClose}
    description={`${commande.fournisseur} · ${commande.dateCommande} · ${commande.modeLivraison} · ${commande.statut}`}>
    {commande.reliquatInconnu && <p className="info-banner">Reliquat à rapprocher. Les quantités déjà reçues par ligne sont inconnues pour cette commande historique.</p>}
    <div className="table-wrap"><table><caption className="sr-only">Détail des lignes et attributions</caption>
      <thead><tr>{['Article', 'Commande client', 'PU achat HT', 'Commandé', 'Reçu', 'Attribué au client'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{commande.articles.map((line) => <tr key={line.ligne}>
        <td><strong>{line.reference}</strong><small className="achat-secondaire">{line.designation}</small></td>
        <td>{line.commandeClientNumero ?? (line.commandeClientId === null ? '—' : `#${line.commandeClientId}`)}</td>
        <td>{formatEuros(line.prixUnitaire)}</td><td>{line.quantite}</td><td>{commande.reliquatInconnu ? '—' : line.quantiteRecue}</td><td>{commande.reliquatInconnu ? '—' : line.quantiteAttribuee}</td>
      </tr>)}</tbody>
    </table></div>
  </FormDialog>
}
