import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import { pickEnum } from '../utils/coerce'
import { nextId } from '../utils/ids'
import type { Livraison } from '../types'

const LIVRAISON_STATUSES = ['en transit', 'livrée', 'en attente'] as const

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

type LivraisonDraft = Required<Omit<Livraison, 'id'>>

const EMPTY_LIVRAISON = (): LivraisonDraft => ({
  commandeId: '',
  transporteur: '',
  dateExpedition: new Date().toISOString().split('T')[0],
  dateLivraisonPrevue: '',
  adresseLivraison: '',
  statut: 'en attente',
  tracking: '',
})

export default function LivraisonsView() {
  const [livraisons, setLivraisons] = useState<Livraison[]>([
    { id: 'L-001', commandeId: 'CC-001', transporteur: 'Chronopost', dateExpedition: '2026-09-20', dateLivraisonPrevue: '2026-09-25', adresseLivraison: '12 Rue de Paris, 75001 Paris', statut: 'en transit', tracking: 'CC123456789FR' },
  ])

  const [draft, setDraft] = useState<LivraisonDraft>(EMPTY_LIVRAISON())

  const setField = (field: keyof LivraisonDraft, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [field]: field === 'statut' ? pickEnum(value, LIVRAISON_STATUSES, 'en attente') : value,
    }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const livraison: Livraison = { ...draft, id: nextId('L', livraisons.length) }
    setLivraisons((prev) => [...prev, livraison])
    setDraft(EMPTY_LIVRAISON())
  }

  const updateStatus = (id: string | undefined, value: string) => {
    if (!id) return
    const statut = pickEnum(value, LIVRAISON_STATUSES, 'en attente')
    setLivraisons((prev) => prev.map((l) => (l.id === id ? { ...l, statut } : l)))
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">LIVRAISONS</p><h1>Suivi des livraisons</h1><p className="heading-copy">Suivez l'état de vos expéditions en temps réel.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouvelle livraison</h2>
        <div className="form-grid-2">
          <FormInput label="N° Commande" name="commandeId" value={draft.commandeId} onChange={(_name, value) => setField('commandeId', value)} required placeholder="ex: CC-001" />
          <FormSelect label="Transporteur" name="transporteur" value={draft.transporteur} options={transporteurs} onChange={(_name, value) => setField('transporteur', value)} required />
          <FormInput label="Date d'expédition" name="dateExpedition" type="date" value={draft.dateExpedition} onChange={(_name, value) => setField('dateExpedition', value)} required />
          <FormInput label="Date livraison prévue" name="dateLivraisonPrevue" type="date" value={draft.dateLivraisonPrevue} onChange={(_name, value) => setField('dateLivraisonPrevue', value)} required />
          <FormInput label="Adresse de livraison" name="adresseLivraison" value={draft.adresseLivraison} onChange={(_name, value) => setField('adresseLivraison', value)} required />
          <FormSelect label="Statut" name="statut" value={draft.statut} options={statuts} onChange={(_name, value) => setField('statut', value)} required />
          <FormInput label="N° de suivi" name="tracking" value={draft.tracking} onChange={(_name, value) => setField('tracking', value)} placeholder="Optionnel" />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Enregistrer</button>
          <button type="button" className="secondary-button" onClick={() => setDraft(EMPTY_LIVRAISON())}>Effacer</button>
        </div>
      </form>

      <div className="form-card">
        <h2>Historique des livraisons</h2>
        {livraisons.length === 0 ? (
          <p className="empty-state">Aucune livraison enregistree.</p>
        ) : (
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
                  <td>
                    <FormSelect
                      label=""
                      name={`statut-${l.id}`}
                      value={l.statut}
                      options={statuts}
                      onChange={(_name, value) => updateStatus(l.id, value)}
                    />
                  </td>
                  <td>{l.tracking || '-'}</td>
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
