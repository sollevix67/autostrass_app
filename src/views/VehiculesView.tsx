import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import { pickEnum, toNumber } from '../utils/coerce'
import { nextId } from '../utils/ids'
import type { Vehicule } from '../types'

const VEHICLE_TYPES = ['voiture', 'camionnette', 'camion', 'autre'] as const
const VEHICLE_STATUSES = ['disponible', 'en service', 'en maintenance'] as const

type VehicleDraft = {
  immatriculation: string
  marque: string
  modele: string
  annee: number
  type: (typeof VEHICLE_TYPES)[number]
  kilometrage: number
  proprietaire: string
  statut: (typeof VEHICLE_STATUSES)[number]
}

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

const EMPTY_VEHICLE = (): VehicleDraft => ({
  immatriculation: '',
  marque: '',
  modele: '',
  annee: new Date().getFullYear(),
  type: 'voiture',
  kilometrage: 0,
  proprietaire: '',
  statut: 'disponible',
})

export default function VehiculesView() {
  const [vehicules, setVehicules] = useState<Vehicule[]>([
    { id: 'V-001', immatriculation: 'AB-123-CD', marque: 'Renault', modele: 'Kangoo', annee: 2020, type: 'camionnette', kilometrage: 85000, proprietaire: 'Auto Strass', statut: 'disponible' },
    { id: 'V-002', immatriculation: 'EF-456-GH', marque: 'Peugeot', modele: '308', annee: 2022, type: 'voiture', kilometrage: 32000, proprietaire: 'Marie Laurent', statut: 'en service' },
  ])

  const [draft, setDraft] = useState<VehicleDraft>(EMPTY_VEHICLE)

  const setField = (field: keyof VehicleDraft, value: string) => {
    setDraft((prev) => {
      if (field === 'type') return { ...prev, type: pickEnum(value, VEHICLE_TYPES, 'voiture') }
      if (field === 'statut') return { ...prev, statut: pickEnum(value, VEHICLE_STATUSES, 'disponible') }
      if (field === 'annee') return { ...prev, annee: toNumber(value, new Date().getFullYear()) }
      if (field === 'kilometrage') return { ...prev, kilometrage: Math.max(0, toNumber(value)) }
      return { ...prev, [field]: value }
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const vehicule: Vehicule = { ...draft, id: nextId('V', vehicules.length) }
    setVehicules((prev) => [...prev, vehicule])
    setDraft(EMPTY_VEHICLE())
  }

  const handleDelete = (id: string | undefined) => {
    if (!id) return
    setVehicules((prev) => prev.filter((v) => v.id !== id))
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">VEHICULES</p><h1>Gestion des véhicules</h1><p className="heading-copy">Suivez le parc automobile du dépôt.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouveau véhicule</h2>
        <div className="form-grid-2">
          <FormInput label="Immatriculation" name="immatriculation" value={draft.immatriculation} onChange={(_name, value) => setField('immatriculation', value)} required />
          <FormInput label="Marque" name="marque" value={draft.marque} onChange={(_name, value) => setField('marque', value)} required />
          <FormInput label="Modèle" name="modele" value={draft.modele} onChange={(_name, value) => setField('modele', value)} required />
          <FormInput label="Année" name="annee" type="number" value={String(draft.annee)} onChange={(_name, value) => setField('annee', value)} required />
          <FormSelect label="Type" name="type" value={draft.type} options={typesVehicule} onChange={(_name, value) => setField('type', value)} required />
          <FormInput label="Kilométrage" name="kilometrage" type="number" value={String(draft.kilometrage)} onChange={(_name, value) => setField('kilometrage', value)} required />
          <FormInput label="Propriétaire" name="proprietaire" value={draft.proprietaire} onChange={(_name, value) => setField('proprietaire', value)} required />
          <FormSelect label="Statut" name="statut" value={draft.statut} options={statuts} onChange={(_name, value) => setField('statut', value)} required />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Ajouter le véhicule</button>
          <button type="button" className="secondary-button" onClick={() => setDraft(EMPTY_VEHICLE())}>Effacer</button>
        </div>
      </form>

      <div className="form-card">
        <h2>Parc automobile</h2>
        {vehicules.length === 0 ? (
          <p className="empty-state">Aucun vehicule enregistre.</p>
        ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>IMMATRICULATION</th><th>MARQUE</th><th>MODÈLE</th><th>ANNÉE</th><th>TYPE</th><th>KILOMÉTRAGE</th><th>STATUT</th><th>ACTIONS</th></tr></thead>
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
                  <td className="actions-cell">
                    <button type="button" className="action-btn delete" onClick={() => handleDelete(v.id)} title="Supprimer">🗑</button>
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
