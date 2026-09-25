import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import { toNumber } from '../utils/coerce'
import { nextId } from '../utils/ids'
import type { Retour } from '../types'

const motifs = ['Article défectueux', 'Erreur de commande', 'Article non conforme', 'Changement d\'avis', 'Autre']

const EMPTY_RETOUR = (): Omit<Retour, 'id'> => ({
  venteId: '',
  clientId: '',
  dateRetour: new Date().toISOString().split('T')[0],
  motif: '',
  articles: [],
  montantRembourse: 0,
})

type RetourDraft = Omit<Retour, 'id'>

export default function RetoursView() {
  const [retours, setRetours] = useState<Retour[]>([
    { id: 'R-001', venteId: 'V-010482', clientId: 'C-10482', dateRetour: '2026-09-18', motif: 'Article défectueux', articles: [{ reference: 'BAT-7710', designation: 'Batterie 12V 70Ah', quantite: 1, prixUnitaire: 45.00 }], montantRembourse: 45.00 },
  ])

  const [draft, setDraft] = useState<RetourDraft>(EMPTY_RETOUR())

  const setField = (field: keyof RetourDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: field === 'montantRembourse' ? toNumber(value) : value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const retour: Retour = { ...draft, id: nextId('R', retours.length) }
    setRetours((prev) => [retour, ...prev])
    setDraft(EMPTY_RETOUR())
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div><p className="eyebrow">RETOURS</p><h1>Gestion des retours</h1><p className="heading-copy">Enregistrez et suivez les retours clients.</p></div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouveau retour</h2>
        <div className="form-grid-2">
          <FormInput label="ID Vente" name="venteId" value={draft.venteId} onChange={(_name, value) => setField('venteId', value)} required placeholder="ex: V-010482" />
          <FormInput label="ID Client" name="clientId" value={draft.clientId} onChange={(_name, value) => setField('clientId', value)} required />
          <FormInput label="Date du retour" name="dateRetour" type="date" value={draft.dateRetour} onChange={(_name, value) => setField('dateRetour', value)} required />
          <FormSelect label="Motif" name="motif" value={draft.motif} options={motifs.map((m) => ({ value: m, label: m }))} onChange={(_name, value) => setField('motif', value)} required />
          <FormInput label="Montant rembourse (€)" name="montantRembourse" type="number" step="0.01" value={String(draft.montantRembourse)} onChange={(_name, value) => setField('montantRembourse', value)} required />
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Enregistrer le retour</button>
          <button type="button" className="secondary-button" onClick={() => setDraft(EMPTY_RETOUR())}>Effacer</button>
        </div>
      </form>

      <div className="form-card">
        <h2>Historique des retours</h2>
        {retours.length === 0 ? (
          <p className="empty-state">Aucun retour enregistre.</p>
        ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>VENTE</th><th>CLIENT</th><th>DATE</th><th>MOTIF</th><th>MONTANT</th></tr></thead>
            <tbody>
              {retours.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.venteId}</td>
                  <td>{r.clientId}</td>
                  <td>{r.dateRetour}</td>
                  <td>{r.motif}</td>
                  <td><strong>{r.montantRembourse.toFixed(2)} €</strong></td>
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
