import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput } from '../components/forms/FormFields'
import type { Article } from '../types'

export default function StockView() {
  const [articles, setArticles] = useState<Article[]>([
    { reference: 'PLA-2841', designation: 'Plaquettes de frein avant', category: 'freins', prixUnitaireHT: 15.50, quantite: 2, minimum: 6, emplacement: 'A-03 / E-02 / P-14' },
    { reference: 'FIL-0920', designation: 'Filtre a huile - Renault', category: 'filtres', prixUnitaireHT: 8.20, quantite: 3, minimum: 8, emplacement: 'B-01 / E-04 / P-02' },
    { reference: 'BAT-7710', designation: 'Batterie 12V 70Ah', category: 'batteries', prixUnitaireHT: 45.00, quantite: 1, minimum: 4, emplacement: 'C-02 / E-01 / P-08' },
    { reference: 'HUI-5400', designation: 'Huile moteur 5W30 - 5L', category: 'huiles', prixUnitaireHT: 22.00, quantite: 4, minimum: 10, emplacement: 'D-05 / E-03 / P-21' },
  ])
  const [editing, setEditing] = useState<Article | null>(null)

  const handleQuantityChange = (reference: string, delta: number) => {
    setArticles((prev) =>
      prev.map((a) =>
        a.reference === reference ? { ...a, quantite: Math.max(0, a.quantite + delta) } : a
      )
    )
  }

  const handleDelete = (reference: string) => {
    if (confirm('Supprimer cet article ?')) {
      setArticles((prev) => prev.filter((a) => a.reference !== reference))
    }
  }

  const lowStockItems = articles.filter((a) => a.quantite <= a.minimum)

  return (
    <div className="page-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">STOCK</p>
          <h1>Gestion du stock</h1>
          <p className="heading-copy">Suivez vos niveaux de stock et réapprovisionnez en un clin d'œil.</p>
        </div>
      </div>

      <section className="metric-grid">
        <article className="metric-card accent-yellow"><div className="metric-icon">!</div><p>Articles en rupture</p><strong>{lowStockItems.length}</strong><span className="metric-trend warning">Action requise</span></article>
        <article className="metric-card accent-green"><div className="metric-icon">✓</div><p>Articles OK</p><strong>{articles.filter(a => a.quantite > a.minimum).length}</strong><span className="metric-trend positive">Tout est OK</span></article>
        <article className="metric-card accent-blue"><div className="metric-icon">#</div><p>Total références</p><strong>{articles.length}</strong><span className="metric-trend neutral">au catalogue</span></article>
        <article className="metric-card accent-coral"><div className="metric-icon">€</div><p>Valeur estimée</p><strong>{articles.reduce((sum, a) => sum + a.prixUnitaireHT * a.quantite, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong><span className="metric-trend neutral">total HT</span></article>
      </section>

      <div className="form-card">
        <h2>Ajuster les quantités</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>RÉFÉRENCE</th><th>DÉSIGNATION</th><th>EMPLACEMENT</th><th>DISPONIBLE</th><th>SEUIL MIN.</th><th>ACTIONS</th></tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.reference} className={article.quantite <= article.minimum ? 'row-warning' : ''}>
                  <td><b className="reference">{article.reference}</b></td>
                  <td>{article.designation}</td>
                  <td><span className="location-tag">{article.emplacement}</span></td>
                  <td><b>{article.quantite}</b></td>
                  <td>{article.minimum}</td>
                  <td className="actions-cell">
                    <button className="action-btn" onClick={() => handleQuantityChange(article.reference, 1)} title="Ajouter 1">+1</button>
                    <button className="action-btn" onClick={() => handleQuantityChange(article.reference, -1)} title="Retirer 1">-1</button>
                    <button className="action-btn edit" onClick={() => setEditing(article)} title="Modifier">✎</button>
                    <button className="action-btn delete" onClick={() => handleDelete(article.reference)} title="Supprimer">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Modifier {editing.reference}</h2>
            <FormInput label="Quantité" name="quantite" type="number" value={editing.quantite.toString()} onChange={(name, value) => setEditing((prev) => prev ? { ...prev, [name]: parseInt(value) || 0 } : prev)} />
            <FormInput label="Seuil minimum" name="minimum" type="number" value={editing.minimum.toString()} onChange={(name, value) => setEditing((prev) => prev ? { ...prev, [name]: parseInt(value) || 0 } : prev)} />
            <div className="form-actions">
              <button className="primary-button" onClick={() => { setArticles((prev) => prev.map((a) => a.reference === editing.reference ? editing : a)); setEditing(null) }}>Enregistrer</button>
              <button className="secondary-button" onClick={() => setEditing(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <Link className="back-link" to="/">← Retour au dashboard</Link>
    </div>
  )
}
