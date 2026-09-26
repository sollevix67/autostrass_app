import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import { Icon } from '../components/Icon'
import { pickEnum } from '../utils/coerce'
import { nextId } from '../utils/ids'
import type { CommandeClient } from '../types'

const COMMAND_STATUSES = ['en attente', 'validée', 'expédiée', 'livrée', 'annulée'] as const

const statuts = [
  { value: 'en attente', label: 'En attente' },
  { value: 'validée', label: 'Validée' },
  { value: 'expédiée', label: 'Expédiée' },
  { value: 'livrée', label: 'Livrée' },
  { value: 'annulée', label: 'Annulée' },
]

type CommandeDraft = Required<Omit<CommandeClient, 'id'>>

const EMPTY_COMMANDE = (): CommandeDraft => ({
  clientId: '',
  dateCommande: new Date().toISOString().split('T')[0],
  articles: [],
  statut: 'en attente',
  dateLivraisonPrevue: '',
})

export default function CommandesClientsView() {
  const [commandes, setCommandes] = useState<CommandeClient[]>([
    { id: 'CC-001', clientId: 'C-10482', dateCommande: '2026-09-18', articles: [{ reference: 'PLA-2841', designation: 'Plaquettes frein', quantite: 20, prixUnitaire: 15.50 }], statut: 'validée', dateLivraisonPrevue: '2026-09-25' },
    { id: 'CC-002', clientId: 'C-10501', dateCommande: '2026-09-19', articles: [{ reference: 'BAT-7710', designation: 'Batterie 12V', quantite: 5, prixUnitaire: 45.00 }], statut: 'en attente' },
  ])

  const [draft, setDraft] = useState<CommandeDraft>(EMPTY_COMMANDE())

  const setField = (field: keyof CommandeDraft, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: field === 'statut' ? pickEnum(value, COMMAND_STATUSES, 'en attente') : value,
    }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const commande: CommandeClient = { ...draft, id: nextId('CC', commandes.length) }
    setCommandes((prev) => [commande, ...prev])
    setDraft(EMPTY_COMMANDE())
  }

  const updateStatus = (id: string | undefined, value: string) => {
    if (!id) return
    const statut = pickEnum(value, COMMAND_STATUSES, 'en attente')
    setCommandes((prev) => prev.map((c) => (c.id === id ? { ...c, statut } : c)))
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">COMMANDES CLIENTS</p><h1>Commandes clients</h1><p className="heading-copy">Suivez et gérez les commandes de vos clients.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouvelle commande</h2>
        <div className="form-grid-2">
          <FormInput label="ID Client" name="clientId" value={draft.clientId} onChange={(_name, value) => setField('clientId', value)} required placeholder="ex: C-10482" />
          <FormInput label="Date commande" name="dateCommande" type="date" value={draft.dateCommande} onChange={(_name, value) => setField('dateCommande', value)} required />
          <FormSelect label="Statut" name="statut" value={draft.statut} options={statuts} onChange={(_name, value) => setField('statut', value)} required />
          <FormInput label="Date livraison prévue" name="dateLivraisonPrevue" type="date" value={draft.dateLivraisonPrevue} onChange={(_name, value) => setField('dateLivraisonPrevue', value)} />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button"><Icon name="check" size="sm" /> Créer la commande</button>
          <button type="button" className="secondary-button" onClick={() => setDraft(EMPTY_COMMANDE())}>Effacer</button>
        </div>
      </form>

      <div className="form-card">
        <h2>Liste des commandes</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>CLIENT</th><th>DATE</th><th>ARTICLES</th><th>STATUT</th><th>LIVRAISON</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {commandes.map((cmd) => (
                <tr key={cmd.id}>
                  <td>{cmd.id}</td>
                  <td>{cmd.clientId}</td>
                  <td>{cmd.dateCommande}</td>
                  <td>{cmd.articles.length} article(s)</td>
                  <td>
                    <select value={cmd.statut} onChange={(e) => updateStatus(cmd.id, e.target.value)} className="status-select" aria-label={`Statut de la commande ${cmd.id}`}>
                      {statuts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td>{cmd.dateLivraisonPrevue || '-'}</td>
                  <td><button className="action-btn"><Icon name="edit" size="sm" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Link className="back-link" to="/">← Retour au dashboard</Link>
    </div>
  )
}
