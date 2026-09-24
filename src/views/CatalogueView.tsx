import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect, FormTextarea } from '../components/forms/FormFields'

const categories = [
  { value: 'freins', label: 'Freins' },
  { value: 'filtres', label: 'Filtres' },
  { value: 'batteries', label: 'Batteries' },
  { value: 'huiles', label: 'Huiles' },
  { value: 'pneus', label: 'Pneus' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'carrosserie', label: 'Carrosserie' },
]

const defaultArticle = {
  reference: '',
  designation: '',
  category: '',
  prixUnitaireHT: 0,
  quantite: 0,
  minimum: 0,
  emplacement: '',
  description: '',
}

export default function CatalogueView() {
  const [article, setArticle] = useState(defaultArticle)
  const [saved, setSaved] = useState(false)

  const handleChange = (name: string, value: string) => {
    setArticle((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
  }

  const handleNumericChange = (name: string, value: string) => {
    setArticle((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }))
    setSaved(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Article à enregistrer:', article)
    setSaved(true)
  }

  return (
    <div className="page-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CATALOGUE</p>
          <h1>Gestion du catalogue</h1>
          <p className="heading-copy">Ajouter, modifier ou supprimer des articles du catalogue.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>{article.reference ? 'Modifier l\'article' : 'Nouvel article'}</h2>
        
        <div className="form-grid-2">
          <FormInput label="Référence" name="reference" value={article.reference} onChange={handleChange} required placeholder="ex: PLA-2841" />
          <FormInput label="Désignation" name="designation" value={article.designation} onChange={handleChange} required placeholder="Nom de l'article" />
          <FormSelect label="Catégorie" name="category" value={article.category} options={categories} onChange={handleChange} required />
          <FormInput label="Emplacement" name="emplacement" value={article.emplacement} onChange={handleChange} required placeholder="ex: A-03 / E-02" />
          <FormInput label="Prix unitaire HT (€)" name="prixUnitaireHT" type="number" step="0.01" value={article.prixUnitaireHT.toString()} onChange={handleNumericChange} required />
          <FormInput label="Quantité en stock" name="quantite" type="number" value={article.quantite.toString()} onChange={handleNumericChange} required />
          <FormInput label="Seuil minimum" name="minimum" type="number" value={article.minimum.toString()} onChange={handleNumericChange} required />
          <FormInput label="Description" name="description" value={article.description} onChange={handleChange} placeholder="Optionnel" />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">
            <span>＋</span> {article.reference ? 'Enregistrer' : 'Créer'} l\'article
          </button>
          {saved && <span className="form-success">✓ Enregistré avec succès</span>}
          <button type="button" className="secondary-button" onClick={() => { setArticle(defaultArticle); setSaved(false) }}>
            Effacer
          </button>
        </div>
      </form>

      <div className="form-card">
        <h2>Liste des articles</h2>
        <p className="empty-state">Aucun article n'est encore affiché ici. Les articles créés apparaîtront dans cette liste.</p>
      </div>

      <Link className="back-link" to="/">← Retour au dashboard</Link>
    </div>
  )
}
