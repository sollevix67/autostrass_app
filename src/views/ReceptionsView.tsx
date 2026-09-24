import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect, FormTextarea } from '../components/forms/FormFields'
import type { Article, Reception } from '../types'

const fournisseurs = [
  { value: 'auto-pieces-nord', label: 'Auto Pieces Nord' },
  { value: 'frein-plus', label: 'Frein Plus' },
  { value: 'filtre-pro', label: 'Filtre Pro' },
  { value: 'batterie-express', label: 'Batterie Express' },
  { value: 'huile-max', label: 'Huile Max' },
]

export default function ReceptionsView() {
  const [reception, setReception] = useState<Reception>({
    fournisseur: '',
    dateReception: new Date().toISOString().split('T')[0],
    articles: [],
    totalHT: 0,
  })
  const [history, setHistory] = useState<Reception[]>([
    { id: 'R-001', fournisseur: 'Auto Pieces Nord', dateReception: '2026-09-19', articles: [{ reference: 'PLA-2841', designation: 'Plaquettes frein', quantiteRecue: 50, prixUnitaire: 15.50 }], totalHT: 775 },
  ])

  const addArticle = () => {
    setReception((prev) => ({
      ...prev,
      articles: [...prev.articles, { reference: '', designation: '', quantiteRecue: 0, prixUnitaire: 0 }],
    }))
  }

  const updateArticle = (index: number, field: string, value: string) => {
    setReception((prev) => ({
      ...prev,
      articles: prev.articles.map((article, i) =>
        i === index ? { ...article, [field]: field === 'quantiteRecue' || field === 'prixUnitaire' ? parseFloat(value) || 0 : value } : article
      ),
    }))
  }

  const removeArticle = (index: number) => {
    setReception((prev) => ({
      ...prev,
      articles: prev.articles.filter((_, i) => i !== index),
    }))
  }

  const totalHT = reception.articles.reduce((sum, a) => sum + a.quantiteRecue * a.prixUnitaire, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newReception = { ...reception, id: `R-${String(history.length + 1).padStart(3, '0')}`, totalHT }
    setHistory((prev) => [newReception, ...prev])
    setReception({ fournisseur: '', dateReception: new Date().toISOString().split('T')[0], articles: [], totalHT: 0 })
    alert('Réception enregistrée avec succès !')
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">RECEPTIONS</p>
          <h1>Enregistrer une réception</h1>
          <p className="heading-copy">Ajoutez les articles reçus de vos fournisseurs.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Nouvelle réception</h2>
        
        <div className="form-grid-2">
          <FormSelect label="Fournisseur" name="fournisseur" value={reception.fournisseur} options={fournisseurs} onChange={(name, value) => setReception((prev) => ({ ...prev, [name]: value }))} required />
          <FormInput label="Date de réception" name="dateReception" type="date" value={reception.dateReception} onChange={(name, value) => setReception((prev) => ({ ...prev, [name]: value }))} required />
        </div>

        <h3 className="sub-heading">Articles reçus</h3>
        {reception.articles.length === 0 && <p className="empty-state">Aucun article ajouté. Cliquez sur « Ajouter un article ».</p>}
        {reception.articles.map((article, index) => (
          <div key={index} className="reception-article">
            <div className="form-grid-2">
              <FormInput label="Référence" name={`ref-${index}`} value={article.reference} onChange={(name, value) => updateArticle(index, 'reference', value)} required />
              <FormInput label="Désignation" name={`desig-${index}`} value={article.designation} onChange={(name, value) => updateArticle(index, 'designation', value)} required />
              <FormInput label="Quantité reçue" name={`qt-${index}`} type="number" value={article.quantiteRecue.toString()} onChange={(name, value) => updateArticle(index, 'quantiteRecue', value)} required />
              <FormInput label="Prix unitaire (€)" name={`price-${index}`} type="number" step="0.01" value={article.prixUnitaire.toString()} onChange={(name, value) => updateArticle(index, 'prixUnitaire', value)} required />
            </div>
            <button type="button" className="action-btn delete" onClick={() => removeArticle(index)}>✕</button>
          </div>
        ))}
        <button type="button" className="secondary-button" onClick={addArticle}>＋ Ajouter un article</button>

        <div className="reception-total">
          <strong>Total HT : {totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Enregistrer la réception</button>
        </div>
      </form>

      {history.length > 0 && (
        <div className="form-card">
          <h2>Historique des réceptions</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>N°</th><th>FOURNISSEUR</th><th>DATE</th><th>ARTICLES</th><th>TOTAL HT</th></tr></thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.fournisseur}</td>
                    <td>{r.dateReception}</td>
                    <td>{r.articles.length} article(s)</td>
                    <td><strong>{r.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) } €</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Link className="back-link" to="/">← Retour au dashboard</Link>
    </div>
  )
}
