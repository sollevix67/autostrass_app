import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import type { Vehicule } from '../types'

const typesVehicule = [
  { value: 'voiture', label: 'Voiture' },
  { value: 'camionnette', label: 'Camionnette' },
  { value: 'camion', label: 'Camion' },
  { value: 'autre', label: 'Autre' },
]

const statuts = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en service', label: 'En service' },
  { value: 'en maintenance', label: 'En maintenance' },
]

export default function VehiculesView() {
  const [vehicules, setVehicules] = useState<Vehicule[]>([
    { id: 'V-001', immatriculation: 'AB-123-CD', marque: 'Renault', modele: 'Kangoo', annee: 2020, type: 'camionnette', kilometrage: 85000, proprietaire: 'Auto Strass', statut: 'disponible' },
    { id: 'V-002', immatriculation: 'EF-456-GH', marque: 'Peugeot', modele: '308', annee: 2022, type: 'voiture', kilometrage: 32000, proprietaire: 'Marie Laurent', statut: 'en service' },
  ])

  const [newVehicule, setNewVehicule] = useState<Partial<Vehicule>>({ annee: new Date().getFullYear(), kilometrage: 0, statut: 'disponible' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v: Vehicule = { ...newVehicule, id: `V-${String(vehicules.length + 1).padStart(3, '0')}` } as Vehicule
    setVehicules((prev) => [...prev, v])
    setNewVehicule({ annee: new Date().getFullYear(), kilometrage: 0, statut: 'disponible' })
    alert('Véhicule enregistré !')
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">VEHICULES</p><h1>Gestion des véhicules</h1><p className="heading-copy">Suivez le parc automobile du dépôt.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouveau véhicule</h2>
        <div className="form-grid-2">
          <FormInput label="Immatriculation" name="immatriculation" value={newVehicule.immatriculation || ''} onChange={(name, value) => setNewVehicule((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Marque" name="marque" value={newVehicule.marque || ''} onChange={(name, value) => setNewVehicule((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Modèle" name="modele" value={newVehicule.modele || ''} onChange={(name, value) => setNewVehicule((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Année" name="annee" type="number" value={newVehicule.annee?.toString() || ''} onChange={(name, value) => setNewVehicule((prev) => ({ ...prev, [name]: parseInt(value) || 0 }))} required />
          <FormSelect label="Type" name="type" value={newVehicule.type || ''} options={typesVehicule} onChange={(name, value) => setNewVehicule((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Kilométrage" name="kilometrage" type="number" value={newVehicule.kilometrage?.toString() || ''} onChange={(name, value) => setNewVehicule((prev) => ({ ...prev, [name]: parseInt(value) || 0 }))} required />
          <FormInput label="Propriétaire" name="proprietaire" value={newVehicule.proprietaire || ''} onChange={(name, value) => setNewVehicule((prev) => ({ ...prev, [name]: value }))} required />
          <FormSelect label="Statut" name="statut" value={newVehicule.statut || ''} options={statuts} onChange={(name, value) => setNewVehicule((prev) => ({ ...prev, [name]: value }))} required />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Ajouter le véhicule</button>
        </div>
      </form>

      <div className="form-card">
        <h2>Parc automobile</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>IMMATRICULATION</th><th>MARQUE</th><th>MODÈLE</th><th>ANNÉE</th><th>TYPE</th><th>KILOMÉTRAGE</th><th>STATUT</th></tr></thead>
            <tbody>
              {vehicules.map((v) => (
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td><b>{v.immatriculation}</b></td>
                  <td>{v.marque}</td>
                  <td>{v.modele}</td>
                  <td>{v.annee}</td>
                  <td>{v.type}</td>
                  <td>{v.kilometrage.toLocaleString('fr-FR')} km</td>
                  <td><span className={`status-badge status-${v.statut.replace(/\s/g, '')}`}>{v.statut}</span></td>
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
