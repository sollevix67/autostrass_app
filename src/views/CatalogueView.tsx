import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import { EMPTY_ARTICLE, useCatalogue } from '../hooks/useCatalogue'
import type { Article } from '../types'

const categories = [
  { value: 'freins', label: 'Freins' },
  { value: 'filtres', label: 'Filtres' },
  { value: 'batteries', label: 'Batteries' },
  { value: 'huiles', label: 'Huiles' },
  { value: 'pneus', label: 'Pneus' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'carrosserie', label: 'Carrosserie' },
]

const currency = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Feedback = { tone: 'success' | 'error'; message: string }

export default function CatalogueView() {
  const { articles, loading, saving, error, offline, create, update, remove } = useCatalogue()
  const [draft, setDraft] = useState<Article>(EMPTY_ARTICLE)
  /** Reference de l'article en cours d'edition, `null` pour une creation. */
  const [editingReference, setEditingReference] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const isEditing = editingReference !== null

  const resetForm = () => {
    setDraft(EMPTY_ARTICLE)
    setEditingReference(null)
    setFeedback(null)
  }

  const setField = (field: keyof Article, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
    setFeedback(null)
  }

  const setNumericField = (field: 'prixUnitaireHT' | 'quantite' | 'minimum', value: string) => {
    setDraft((prev) => ({ ...prev, [field]: Number.parseFloat(value) || 0 }))
    setFeedback(null)
  }

  /** Charge un article existant dans le formulaire pour edition. */
  const handleEdit = (article: Article) => {
    setDraft(article)
    setEditingReference(article.reference)
    setFeedback(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const cleaned: Article = {
      ...draft,
      reference: draft.reference.trim(),
      designation: draft.designation.trim(),
    }

    // En mode edition la reference est la cle : elle ne doit pas changer.
    const payload = isEditing ? { ...cleaned, reference: editingReference } : cleaned

    const saved = isEditing ? await update(payload) : await create(payload)
    if (!saved) {
      setFeedback({ tone: 'error', message: "L'enregistrement a echoue. Verifiez la connexion a l'API." })
      return
    }

    setFeedback({
      tone: 'success',
      message: isEditing
        ? `Article ${payload.reference} mis a jour.`
        : offline
          ? `Article ${payload.reference} ajoute en local (non persiste).`
          : `Article ${payload.reference} cree.`,
    })
    setDraft(EMPTY_ARTICLE)
    setEditingReference(null)
  }

  const handleDelete = async (article: Article) => {
    if (!window.confirm(`Supprimer definitivement ${article.reference} ?`)) return
    const ok = await remove(article.reference)
    setFeedback(
      ok
        ? { tone: 'success', message: `Article ${article.reference} supprime.` }
        : { tone: 'error', message: `La suppression de ${article.reference} a echoue.` },
    )
    if (ok && editingReference === article.reference) {
      setDraft(EMPTY_ARTICLE)
      setEditingReference(null)
    }
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

      {offline && (
        <p className="info-banner" role="status">
          API catalogue indisponible : les modifications restent en memoire et seront perdues au rechargement.
        </p>
      )}

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>{isEditing ? `Modifier ${editingReference}` : 'Nouvel article'}</h2>

        <div className="form-grid-2">
          <FormInput
            label="Référence"
            name="reference"
            value={draft.reference}
            onChange={(_name, value) => setField('reference', value)}
            required
            placeholder="ex: PLA-2841"
          />
          <FormInput
            label="Désignation"
            name="designation"
            value={draft.designation}
            onChange={(_name, value) => setField('designation', value)}
            required
            placeholder="Nom de l'article"
          />
          <FormSelect
            label="Catégorie"
            name="category"
            value={draft.category}
            options={categories}
            onChange={(_name, value) => setField('category', value)}
            required
          />
          <FormInput
            label="Emplacement"
            name="emplacement"
            value={draft.emplacement}
            onChange={(_name, value) => setField('emplacement', value)}
            required
            placeholder="ex: A-03 / E-02"
          />
          <FormInput
            label="Prix unitaire HT (€)"
            name="prixUnitaireHT"
            type="number"
            step="0.01"
            value={String(draft.prixUnitaireHT)}
            onChange={(_name, value) => setNumericField('prixUnitaireHT', value)}
            required
          />
          <FormInput
            label="Quantité en stock"
            name="quantite"
            type="number"
            value={String(draft.quantite)}
            onChange={(_name, value) => setNumericField('quantite', value)}
            required
          />
          <FormInput
            label="Seuil minimum"
            name="minimum"
            type="number"
            value={String(draft.minimum)}
            onChange={(_name, value) => setNumericField('minimum', value)}
            required
          />
          <FormInput
            label="Description"
            name="description"
            value={draft.description ?? ''}
            onChange={(_name, value) => setField('description', value)}
            placeholder="Optionnel"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            <span>＋</span> {saving ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer'} l'article
          </button>
          {feedback && (
            <span className={feedback.tone === 'success' ? 'form-success' : 'form-error'} role="status">
              {feedback.tone === 'success' ? '✓' : '⚠'} {feedback.message}
            </span>
          )}
          <button type="button" className="secondary-button" onClick={resetForm}>
            Effacer
          </button>
        </div>
        {error && <p className="error-banner" role="alert">{error}</p>}
      </form>

      <div className="form-card">
        <h2>Liste des articles {saving && <span className="saving-indicator">· synchronisation...</span>}</h2>
        {loading ? (
          <p className="table-state">Chargement du catalogue...</p>
        ) : articles.length === 0 ? (
          <p className="table-state">Aucun article. Utilisez le formulaire ci-dessus pour creer le premier.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>REFERENCE</th>
                  <th>DESIGNATION</th>
                  <th>CATEGORIE</th>
                  <th>PRIX HT</th>
                  <th>STOCK</th>
                  <th>SEUIL</th>
                  <th>EMPLACEMENT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.reference}
                    className={[
                      article.quantite <= article.minimum ? 'row-warning' : '',
                      editingReference === article.reference ? 'row-editing' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td><b className="reference">{article.reference}</b></td>
                    <td>{article.designation}</td>
                    <td>{article.category}</td>
                    <td>{currency.format(article.prixUnitaireHT)} €</td>
                    <td><b>{article.quantite}</b></td>
                    <td>{article.minimum}</td>
                    <td><span className="location-tag">{article.emplacement}</span></td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="action-btn edit"
                        onClick={() => handleEdit(article)}
                        title="Charger dans le formulaire"
                        aria-label={`Modifier ${article.reference}`}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="action-btn delete"
                        onClick={() => void handleDelete(article)}
                        title="Supprimer"
                        aria-label={`Supprimer ${article.reference}`}
                        disabled={saving}
                      >
                        🗑
                      </button>
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
