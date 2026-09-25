import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import type { CommandeClient } from '../types'

const statuts = [
  { value: 'en attente', label: 'En attente' },
  { value: 'validée', label: 'Validée' },
  { value: 'expédiée', label: 'Expédiée' },
  { value: 'livrée', label: 'Livrée' },
  { value: 'annulée', label: 'Annulée' },
]

export default function CommandesClientsView() {
  const [commandes, setCommandes] = useState<CommandeClient[]>([
    { id: 'CC-001', clientId: 'C-10482', dateCommande: '2026-09-18', articles: [{ reference: 'PLA-2841', designation: 'Plaquettes frein', quantite: 20, prixUnitaire: 15.50 }], statut: 'validée', dateLivraisonPrevue: '2026-09-25' },
    { id: 'CC-002', clientId: 'C-10501', dateCommande: '2026-09-19', articles: [{ reference: 'BAT-7710', designation: 'Batterie 12V', quantite: 5, prixUnitaire: 45.00 }], statut: 'en attente' },
  ])

  const [newCommande, setNewCommande] = useState<Partial<CommandeClient>>({
    clientId: '',
    dateCommande: new Date().toISOString().split('T')[0],
    articles: [],
    statut: 'en attente',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cmd: CommandeClient = { ...newCommande, id: `CC-${String(commandes.length + 1).padStart(3, '0')}` } as CommandeClient
    setCommandes((prev) => [cmd, ...prev])
    setNewCommande({ clientId: '', dateCommande: new Date().toISOString().split('T')[0], articles: [], statut: 'en attente' })
    alert('Commande enregistrée !')
  }

  const updateStatus = (id: string, statut: string) => {
    setCommandes((prev) => prev.map((c) => c.id === id ? { ...c, statut: statut as CommandeClient['statut'] } : c))
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">COMMANDES CLIENTS</p><h1>Commandes clients</h1><p className="heading-copy">Suivez et gérez les commandes de vos clients.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouvelle commande</h2>
        <div className="form-grid-2">
          <FormInput label="ID Client" name="clientId" value={newCommande.clientId || ''} onChange={(name, value) => setNewCommande((prev) => ({ ...prev, [name]: value }))} required placeholder="ex: C-10482" />
          <FormInput label="Date commande" name="dateCommande" type="date" value={newCommande.dateCommande || ''} onChange={(name, value) => setNewCommande((prev) => ({ ...prev, [name]: value }))} required />
          <FormSelect label="Statut" name="statut" value={newCommande.statut || ''} options={statuts} onChange={(name, value) => setNewCommande((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Date livraison prévue" name="dateLivraisonPrevue" type="date" value={newCommande.dateLivraisonPrevue || ''} onChange={(name, value) => setNewCommande((prev) => ({ ...prev, [name]: value }))} />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Créer la commande</button>
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
                    <select value={cmd.statut} onChange={(e) => updateStatus(cmd.id!, e.target.value)} className="status-select">
                      {statuts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td>{cmd.dateLivraisonPrevue || '-'}</td>
                  <td><button className="action-btn">✎</button></td>
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
