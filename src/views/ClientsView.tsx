import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import type { Client } from '../types'

const types = [
  { value: 'particulier', label: 'Particulier' },
  { value: 'professionnel', label: 'Professionnel' },
]

export default function ClientsView() {
  const [clients, setClients] = useState<Client[]>([
    { id: 'C-10482', nom: 'Dupont', prenom: 'Jean', telephone: '0612345678', email: 'jean@exemple.fr', adresse: '12 Rue de Paris', ville: 'Paris', codePostal: '75001', type: 'particulier', numeroClient: 'C-10482' },
    { id: 'C-10501', nom: 'Martin', prenom: 'Marie', telephone: '0698765432', email: 'marie@exemple.fr', adresse: '5 Avenue de la République', ville: 'Lyon', codePostal: '69001', type: 'professionnel', numeroClient: 'C-10501' },
  ])

  const [newClient, setNewClient] = useState<Partial<Client>>({ type: 'particulier' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const c: Client = { ...newClient, numeroClient: `C-${10482 + clients.length + 1}`, id: `C-${10482 + clients.length + 1}` } as Client
    setClients((prev) => [...prev, c])
    setNewClient({ type: 'particulier' })
    alert('Client enregistré !')
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">CLIENTS</p><h1>Gestion des clients</h1><p className="heading-copy">Consultez et gérez votre base de clients.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouveau client</h2>
        <div className="form-grid-2">
          <FormInput label="Nom" name="nom" value={newClient.nom || ''} onChange={(name, value) => setNewClient((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Prénom" name="prenom" value={newClient.prenom || ''} onChange={(name, value) => setNewClient((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Téléphone" name="telephone" value={newClient.telephone || ''} onChange={(name, value) => setNewClient((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Email" name="email" type="email" value={newClient.email || ''} onChange={(name, value) => setNewClient((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Adresse" name="adresse" value={newClient.adresse || ''} onChange={(name, value) => setNewClient((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Ville" name="ville" value={newClient.ville || ''} onChange={(name, value) => setNewClient((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Code postal" name="codePostal" value={newClient.codePostal || ''} onChange={(name, value) => setNewClient((prev) => ({ ...prev, [name]: value }))} required />
          <FormSelect label="Type" name="type" value={newClient.type || ''} options={types} onChange={(name, value) => setNewClient((prev) => ({ ...prev, [name]: value }))} required />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Ajouter le client</button>
        </div>
      </form>

      <div className="form-card">
        <h2>Liste des clients</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>NOM</th><th>TÉLÉPHONE</th><th>EMAIL</th><th>VILLE</th><th>TYPE</th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>{c.numeroClient}</td>
                  <td><strong>{c.nom} {c.prenom}</strong></td>
                  <td>{c.telephone}</td>
                  <td>{c.email}</td>
                  <td>{c.ville} ({c.codePostal})</td>
                  <td><span className={`type-badge ${c.type}`}>{c.type}</span></td>
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
