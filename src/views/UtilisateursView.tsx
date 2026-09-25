import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import { pickEnum } from '../utils/coerce'
import { nextId } from '../utils/ids'
import type { Utilisateur } from '../types'

const ROLES = ['admin', 'magasinier', 'caissier'] as const
type Role = (typeof ROLES)[number]

const roles = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'magasinier', label: 'Magasinier' },
  { value: 'caissier', label: 'Caissier' },
]

const DEFAULT_ROLE: Role = 'magasinier'

const EMPTY_USER = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  role: DEFAULT_ROLE,
  actif: true,
} satisfies Omit<Utilisateur, 'id'>

type UserDraft = typeof EMPTY_USER

export default function UtilisateursView() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([
    { id: 'U-001', nom: 'Laurent', prenom: 'Marie', email: 'marie.laurent@autostrass.fr', telephone: '0612345678', role: 'admin', actif: true },
  ])

  const [draft, setDraft] = useState<UserDraft>(EMPTY_USER)

  const setField = (field: keyof UserDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: field === 'role' ? pickEnum(value, ROLES, 'magasinier') : value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const user: Utilisateur = { ...draft, id: nextId('U', utilisateurs.length) }
    setUtilisateurs((prev) => [...prev, user])
    setDraft(EMPTY_USER)
  }

  const toggleActive = (id: string | undefined) => {
    if (!id) return
    setUtilisateurs((prev) => prev.map((u) => (u.id === id ? { ...u, actif: !u.actif } : u)))
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">ADMINISTRATION</p><h1>Utilisateurs & droits</h1><p className="heading-copy">Gérez les accès et les droits de chaque utilisateur.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouvel utilisateur</h2>
        <div className="form-grid-2">
          <FormInput label="Nom" name="nom" value={draft.nom} onChange={(_name, value) => setField('nom', value)} required />
          <FormInput label="Prénom" name="prenom" value={draft.prenom} onChange={(_name, value) => setField('prenom', value)} required />
          <FormInput label="Email" name="email" type="email" value={draft.email} onChange={(_name, value) => setField('email', value)} required />
          <FormInput label="Téléphone" name="telephone" value={draft.telephone} onChange={(_name, value) => setField('telephone', value)} />
          <FormSelect label="Rôle" name="role" value={draft.role} options={roles} onChange={(_name, value) => setField('role', value)} required />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Ajouter l'utilisateur</button>
        </div>
      </form>

      <div className="form-card">
        <h2>Liste des utilisateurs</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>NOM</th><th>EMAIL</th><th>TÉLÉPHONE</th><th>RÔLE</th><th>ACTIF</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {utilisateurs.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td><strong>{u.prenom} {u.nom}</strong></td>
                  <td>{u.email}</td>
                  <td>{u.telephone || '-'}</td>
                  <td><span className="role-badge">{u.role}</span></td>
                  <td><button className={`toggle-btn ${u.actif ? 'active' : ''}`} onClick={() => toggleActive(u.id!)}>{u.actif ? '✓ Oui' : '✕ Non'}</button></td>
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
