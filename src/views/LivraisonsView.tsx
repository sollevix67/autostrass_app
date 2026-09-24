import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import type { Livraison } from '../types'

const transporteurs = [
  { value: 'chronopost', label: 'Chronopost' },
  { value: 'colissimo', label: 'Colissimo' },
  { value: 'gls', label: 'GLS' },
  { value: 'dhl', label: 'DHL' },
]

const statuts = [
  { value: 'en transit', label: 'En transit' },
  { value: 'livrée', label: 'Livrée' },
  { value: 'en attente', label: 'En attente' },
]

export default function LivraisonsView() {
  const [livraisons, setLivraisons] = useState<Livraison[]>([
    { id: 'L-001', commandeId: 'CC-001', transporteur: 'Chronopost', dateExpedition: '2026-09-20', dateLivraisonPrevue: '2026-09-25', adresseLivraison: '12 Rue de Paris, 75001 Paris', statut: 'en transit', tracking: 'CC123456789FR' },
  ])

  const [newLivraison, setNewLivraison] = useState<Partial<Livraison>>({
    commandeId: '',
    transporteur: '',
    dateExpedition: new Date().toISOString().split('T')[0],
    dateLivraisonPrevue: '',
    adresseLivraison: '',
    statut: 'en attente',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const l: Livraison = { ...newLivraison, id: `L-${String(livraisons.length + 1).padStart(3, '0')}` } as Livraison
    setLivraisons((prev) => [...prev, l])
    setNewLivraison({ commandeId: '', transporteur: '', dateExpedition: new Date().toISOString().split('T')[0], dateLivraisonPrevue: '', adresseLivraison: '', statut: 'en attente' })
    alert('Livraison enregistrée !')
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">LIVRAISONS</p><h1>Suivi des livraisons</h1><p className="heading-copy">Suivez l'état de vos expéditions en temps réel.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouvelle livraison</h2>
        <div className="form-grid-2">
          <FormInput label="N° Commande" name="commandeId" value={newLivraison.commandeId || ''} onChange={(name, value) => setNewLivraison((prev) => ({ ...prev, [name]: value }))} required placeholder="ex: CC-001" />
          <FormSelect label="Transporteur" name="transporteur" value={newLivraison.transporteur || ''} options={transporteurs} onChange={(name, value) => setNewLivraison((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Date d'expédition" name="dateExpedition" type="date" value={newLivraison.dateExpedition || ''} onChange={(name, value) => setNewLivraison((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Date livraison prévue" name="dateLivraisonPrevue" type="date" value={newLivraison.dateLivraisonPrevue || ''} onChange={(name, value) => setNewLivraison((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Adresse de livraison" name="adresseLivraison" value={newLivraison.adresseLivraison || ''} onChange={(name, value) => setNewLivraison((prev) => ({ ...prev, [name]: value }))} required />
          <FormSelect label="Statut" name="statut" value={newLivraison.statut || ''} options={statuts} onChange={(name, value) => setNewLivraison((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="N° de suivi" name="tracking" value={newLivraison.tracking || ''} onChange={(name, value) => setNewLivraison((prev) => ({ ...prev, [name]: value }))} placeholder="Optionnel" />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Enregistrer</button>
        </div>
      </form>

      <div className="form-card">
        <h2>Historique des livraisons</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>COMMANDE</th><th>TRANSPORTEUR</th><th>EXPÉDITION</th><th>LIVRAISON</th><th>ADRESSE</th><th>STATUT</th><th>TRACKING</th></tr></thead>
            <tbody>
              {livraisons.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{l.commandeId}</td>
                  <td>{l.transporteur}</td>
                  <td>{l.dateExpedition}</td>
                  <td>{l.dateLivraisonPrevue}</td>
                  <td>{l.adresseLivraison}</td>
                  <td><span className={`status-badge status-${l.statut.replace(/\s/g, '')}`}>{l.statut}</span></td>
                  <td>{l.tracking || '-'}</td>
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
