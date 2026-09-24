import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import type { Utilisateur } from '../types'

const roles = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'magasinier', label: 'Magasinier' },
  { value: 'caissier', label: 'Caissier' },
]

export default function UtilisateursView() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([
    { id: 'U-001', nom: 'Laurent', prenom: 'Marie', email: 'marie.laurent@autostrass.fr', telephone: '0612345678', role: 'admin', actif: true },
  ])

  const [newUser, setNewUser] = useState<Partial<Utilisateur>>({ actif: true })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const u: Utilisateur = { ...newUser, id: `U-${String(utilisateurs.length + 1).padStart(3, '0')}` } as Utilisateur
    setUtilisateurs((prev) => [...prev, u])
    setNewUser({ actif: true })
    alert('Utilisateur enregistré !')
  }

  const toggleActive = (id: string) => {
    setUtilisateurs((prev) => prev.map((u) => u.id === id ? { ...u, actif: !u.actif } : u))
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">ADMINISTRATION</p><h1>Utilisateurs & droits</h1><p className="heading-copy">Gérez les accès et les droits de chaque utilisateur.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouvel utilisateur</h2>
        <div className="form-grid-2">
          <FormInput label="Nom" name="nom" value={newUser.nom || ''} onChange={(name, value) => setNewUser((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Prénom" name="prenom" value={newUser.prenom || ''} onChange={(name, value) => setNewUser((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Email" name="email" type="email" value={newUser.email || ''} onChange={(name, value) => setNewUser((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Téléphone" name="telephone" value={newUser.telephone || ''} onChange={(name, value) => setNewUser((prev) => ({ ...prev, [name]: value }))} />
          <FormSelect label="Rôle" name="role" value={newUser.role || ''} options={roles} onChange={(name, value) => setNewUser((prev) => ({ ...prev, [name]: value }))} required />
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
