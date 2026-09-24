import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect, FormTextarea } from '../components/forms/FormFields'
import type { Article, Vente } from '../types'

const caisses = ['Caisse 01', 'Caisse 02', 'Caisse 03']
const modesPaiement = [
  { value: 'espèces', label: 'Espèces' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'chèque', label: 'Chèque' },
]

export default function VentesComptoirView() {
  const [vente, setVente] = useState<Vente>({
    clientId: '',
    dateVente: new Date().toISOString().split('T')[0],
    caissier: 'Marie Laurent',
    articles: [],
    totalHT: 0,
    montantPaye: 0,
    monnaie: 0,
    modePaiement: 'espèces',
  })

  const addArticle = (article: { reference: string; designation: string; prixUnitaire: number }) => {
    setVente((prev) => {
      const newArticles = [...prev.articles, { ...article, quantite: 1, montant: article.prixUnitaire }]
      const total = newArticles.reduce((sum, a) => sum + a.montant, 0)
      return { ...prev, articles: newArticles, totalHT: total }
    })
  }

  const updateQuantity = (index: number, value: string) => {
    setVente((prev) => {
      const newArticles = prev.articles.map((a, i) =>
        i === index ? { ...a, quantite: parseInt(value) || 1, montant: (parseInt(value) || 1) * a.prixUnitaire } : a
      )
      const total = newArticles.reduce((sum, a) => sum + a.montant, 0)
      return { ...prev, articles: newArticles, totalHT: total }
    })
  }

  const removeArticle = (index: number) => {
    setVente((prev) => {
      const newArticles = prev.articles.filter((_, i) => i !== index)
      const total = newArticles.reduce((sum, a) => sum + a.montant, 0)
      return { ...prev, articles: newArticles, totalHT: total }
    })
  }

  const handlePaiementChange = (montantPaye: string) => {
    const val = parseFloat(montantPaye) || 0
    setVente((prev) => ({ ...prev, montantPaye: val, monnaie: val - prev.totalHT }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`Vente n°${Date.now()} enregistrée !\nTotal: ${vente.totalHT.toFixed(2)} €`)
    setVente({
      clientId: '',
      dateVente: new Date().toISOString().split('T')[0],
      caissier: 'Marie Laurent',
      articles: [],
      totalHT: 0,
      montantPaye: 0,
      monnaie: 0,
      modePaiement: 'espèces',
    })
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">VENTES COMPTOIR</p>
          <h1>Ouvrir une caisse</h1>
          <p className="heading-copy">Enregistrez les ventes au comptoir.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Vente en cours</h2>

        <div className="form-grid-3">
          <FormInput label="ID Client" name="clientId" value={vente.clientId} onChange={(name, value) => setVente((prev) => ({ ...prev, [name]: value }))} placeholder="Rechercher un client" />
          <FormInput label="Date" name="dateVente" type="date" value={vente.dateVente} onChange={(name, value) => setVente((prev) => ({ ...prev, [name]: value }))} required />
          <FormSelect label="Caisse" name="caissier" value={vente.caissier} options={caisses.map(c => ({ value: c, label: c }))} onChange={(name, value) => setVente((prev) => ({ ...prev, [name]: value }))} required />
          <FormSelect label="Mode de paiement" name="modePaiement" value={vente.modePaiement} options={modesPaiement} onChange={(name, value) => setVente((prev) => ({ ...prev, [name]: value }))} required />
        </div>

        <h3 className="sub-heading">Articles vendus</h3>
        {vente.articles.length === 0 && <p className="empty-state">Aucun article. Recherchez et ajoutez un article du catalogue.</p>}
        {vente.articles.map((article, index) => (
          <div key={index} className="reception-article">
            <div className="form-grid-3">
              <div className="form-group"><label>Référence</label><span className="static-value">{article.reference}</span></div>
              <div className="form-group"><label>Désignation</label><span className="static-value">{article.designation}</span></div>
              <div className="form-group"><label>Prix unitaire</label><span className="static-value">{article.prixUnitaire.toFixed(2)} €</span></div>
              <div className="form-group">
                <label>Quantité</label>
                <input type="number" min="1" value={article.quantite} onChange={(e) => updateQuantity(index, e.target.value)} />
              </div>
              <div className="form-group"><label>Montant</label><span className="static-value">{(article.quantite * article.prixUnitaire).toFixed(2)} €</span></div>
            </div>
            <button type="button" className="action-btn delete" onClick={() => removeArticle(index)}>✕</button>
          </div>
        ))}

        <div className="vente-total">
          <div><strong>Total HT : {vente.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) } €</strong></div>
          <div className="form-group" style={{ minWidth: '200px' }}>
            <label>Montant payé</label>
            <input type="number" step="0.01" value={vente.montantPaye || ''} onChange={(e) => handlePaiementChange(e.target.value)} placeholder={vente.totalHT.toString()} />
          </div>
          {vente.monnaie > 0 && <div><strong>Monnaie : {vente.monnaie.toFixed(2)} €</strong></div>}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">✓ Valider la vente</button>
        </div>
      </form>

      <Link className="back-link" to="/">← Retour au dashboard</Link>
    </div>
  )
}
