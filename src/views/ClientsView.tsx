import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import { pickEnum } from '../utils/coerce'
import type { Client } from '../types'

const CLIENT_TYPES = ['particulier', 'professionnel'] as const
type ClientType = (typeof CLIENT_TYPES)[number]

const types = [
  { value: 'particulier', label: 'Particulier' },
  { value: 'professionnel', label: 'Professionnel' },
]

const SEED_CLIENTS: Client[] = [
  {
    id: 'C-10482',
    numeroClient: 'C-10482',
    nom: 'Dupont',
    prenom: 'Jean',
    telephone: '0612345678',
    email: 'jean@exemple.fr',
    adresse: '12 Rue de Paris',
    ville: 'Paris',
    codePostal: '75001',
    type: 'particulier',
  },
  {
    id: 'C-10501',
    numeroClient: 'C-10501',
    nom: 'Martin',
    prenom: 'Marie',
    telephone: '0698765432',
    email: 'marie@exemple.fr',
    adresse: '5 Avenue de la Republique',
    ville: 'Lyon',
    codePostal: '69001',
    type: 'professionnel',
  },
]

/** Draft completement type : plus aucun `as` necessaire a la creation. */
const DEFAULT_CLIENT_TYPE: ClientType = 'particulier'

const EMPTY_CLIENT = {
  nom: '',
  prenom: '',
  telephone: '',
  email: '',
  adresse: '',
  ville: '',
  codePostal: '',
  type: DEFAULT_CLIENT_TYPE,
} satisfies Omit<Client, 'id' | 'numeroClient'>

type ClientDraft = typeof EMPTY_CLIENT

export default function ClientsView() {
  const [clients, setClients] = useState<Client[]>(SEED_CLIENTS)
  const [draft, setDraft] = useState<ClientDraft>(EMPTY_CLIENT)
  const [message, setMessage] = useState<string | null>(null)

  const setField = (field: keyof ClientDraft, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: field === 'type' ? pickEnum(value, CLIENT_TYPES, 'particulier') : value,
    }))
    setMessage(null)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const numero = `C-${10483 + clients.length}`
    const client: Client = { ...draft, id: numero, numeroClient: numero }
    setClients((prev) => [...prev, client])
    setDraft(EMPTY_CLIENT)
    setMessage(`Client ${numero} enregistre.`)
  }

  const handleDelete = (client: Client) => {
    if (!window.confirm(`Supprimer ${client.prenom} ${client.nom} ?`)) return
    setClients((prev) => prev.filter((item) => item.id !== client.id))
    setMessage(`Client ${client.numeroClient} supprime.`)
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CLIENTS</p>
          <h1>Gestion des clients</h1>
          <p className="heading-copy">Consultez et gérez votre base de clients.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouveau client</h2>
        <div className="form-grid-2">
          <FormInput label="Nom" name="nom" value={draft.nom} onChange={(_name, value) => setField('nom', value)} required />
          <FormInput label="Prénom" name="prenom" value={draft.prenom} onChange={(_name, value) => setField('prenom', value)} required />
          <FormInput label="Téléphone" name="telephone" type="tel" value={draft.telephone} onChange={(_name, value) => setField('telephone', value)} required />
          <FormInput label="Email" name="email" type="email" value={draft.email} onChange={(_name, value) => setField('email', value)} required />
          <FormInput label="Adresse" name="adresse" value={draft.adresse} onChange={(_name, value) => setField('adresse', value)} required />
          <FormInput label="Ville" name="ville" value={draft.ville} onChange={(_name, value) => setField('ville', value)} required />
          <FormInput label="Code postal" name="codePostal" value={draft.codePostal} onChange={(_name, value) => setField('codePostal', value)} required />
          <FormSelect label="Type" name="type" value={draft.type} options={types} onChange={(_name, value) => setField('type', value)} required />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Ajouter le client</button>
          {message && <span className="form-success" role="status">✓ {message}</span>}
          <button type="button" className="secondary-button" onClick={() => { setDraft(EMPTY_CLIENT); setMessage(null) }}>Effacer</button>
        </div>
      </form>

      <div className="form-card">
        <h2>Liste des clients</h2>
        {clients.length === 0 ? (
          <p className="empty-state">Aucun client enregistre.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>N°</th><th>NOM</th><th>TÉLÉPHONE</th><th>EMAIL</th><th>VILLE</th><th>TYPE</th><th>ACTIONS</th></tr></thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>{c.numeroClient}</td>
                    <td><strong>{c.nom} {c.prenom}</strong></td>
                    <td>{c.telephone}</td>
                    <td>{c.email}</td>
                    <td>{c.ville} ({c.codePostal})</td>
                    <td><span className={`type-badge ${c.type}`}>{c.type}</span></td>
                    <td className="actions-cell">
                      <button type="button" className="action-btn delete" onClick={() => handleDelete(c)} title="Supprimer">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link className="back-link" to="/">← Retour au dashboard</Link>
    </div>
  )
}
