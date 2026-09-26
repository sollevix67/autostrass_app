import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormInput, FormSelect } from '../components/forms/FormFields'
import { Icon } from '../components/Icon'
import { useCatalogue } from '../hooks/useCatalogue'
import { pickEnum } from '../utils/coerce'
import { createLineId } from '../utils/ids'
import type { Vente } from '../types'

const caisses = ['Caisse 01', 'Caisse 02', 'Caisse 03']

const currency = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatEuros = (value: number) => `${currency.format(value)} €`

const PAYMENT_MODES = ['espèces', 'carte', 'chèque'] as const
type PaymentMode = (typeof PAYMENT_MODES)[number]

const modesPaiement = [
  { value: 'espèces', label: 'Espèces' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'chèque', label: 'Chèque' },
]

const DEFAULT_PAYMENT_MODE: PaymentMode = 'espèces'

const EMPTY_VENTE: Omit<Vente, 'id'> = {
  clientId: '',
  dateVente: new Date().toISOString().split('T')[0],
  caissier: 'Marie Laurent',
  articles: [],
  totalHT: 0,
  montantPaye: 0,
  monnaie: 0,
  modePaiement: DEFAULT_PAYMENT_MODE,
}

export default function VentesComptoirView() {
  const { articles: catalogue } = useCatalogue()
  const [vente, setVente] = useState<Vente>(EMPTY_VENTE)
  const [selection, setSelection] = useState('')

  /** Recalcule total et monnaie a partir des lignes et du montant encaisse. */
  const recompute = (lines: Vente['articles'], montantPaye: number) => {
    const totalHT = lines.reduce((sum, line) => sum + line.montant, 0)
    return { totalHT, monnaie: Number((montantPaye - totalHT).toFixed(2)) }
  }

  /** Ajoute une ligne au panier, ou incremente si la reference est deja presente. */
  const addToCart = (reference: string) => {
    const article = catalogue.find((item) => item.reference === reference)
    if (!article) return

    setVente((prev) => {
      const existing = prev.articles.find((line) => line.reference === article.reference)
      const lines = existing
        ? prev.articles.map((line) =>
            line.reference === article.reference
              ? {
                  ...line,
                  quantite: line.quantite + 1,
                  montant: (line.quantite + 1) * line.prixUnitaire,
                }
              : line,
          )
        : [
            ...prev.articles,
            {
              lineId: createLineId('cart'),
              reference: article.reference,
              designation: article.designation,
              quantite: 1,
              prixUnitaire: article.prixUnitaireHT,
              montant: article.prixUnitaireHT,
            },
          ]
      return { ...prev, articles: lines, ...recompute(lines, prev.montantPaye) }
    })

    setSelection('')
  }

  const updateQuantity = (lineId: string, value: string) => {
    setVente((prev) => {
      const newArticles = prev.articles.map((a) => {
        if (a.lineId !== lineId) return a
        const quantite = Number.parseInt(value, 10) || 1
        return { ...a, quantite, montant: quantite * a.prixUnitaire }
      })
      return { ...prev, articles: newArticles, ...recompute(newArticles, prev.montantPaye) }
    })
  }

  const removeArticle = (lineId: string) => {
    setVente((prev) => {
      const newArticles = prev.articles.filter((a) => a.lineId !== lineId)
      return { ...prev, articles: newArticles, ...recompute(newArticles, prev.montantPaye) }
    })
  }

  const handlePaiementChange = (montantPaye: string) => {
    const val = Number.parseFloat(montantPaye) || 0
    setVente((prev) => ({ ...prev, montantPaye: val, ...recompute(prev.articles, val) }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (vente.articles.length === 0) {
      window.alert('Ajoutez au moins un article avant de valider la vente.')
      return
    }
    if (vente.montantPaye < vente.totalHT) {
      window.alert('Le montant encaisse est inferieur au total de la vente.')
      return
    }
    window.alert(`Vente enregistree !\nTotal: ${formatEuros(vente.totalHT)}\nMonnaie: ${formatEuros(vente.monnaie)}`)
    setVente({ ...EMPTY_VENTE, dateVente: new Date().toISOString().split('T')[0] })
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
          <FormInput label="ID Client" name="clientId" value={vente.clientId} onChange={(_name, value) => setVente((prev) => ({ ...prev, clientId: value }))} placeholder="Rechercher un client" />
          <FormInput label="Date" name="dateVente" type="date" value={vente.dateVente} onChange={(_name, value) => setVente((prev) => ({ ...prev, dateVente: value }))} required />
          <FormSelect label="Caisse" name="caissier" value={vente.caissier} options={caisses.map((c) => ({ value: c, label: c }))} onChange={(_name, value) => setVente((prev) => ({ ...prev, caissier: value }))} required />
          <FormSelect label="Mode de paiement" name="modePaiement" value={vente.modePaiement} options={modesPaiement} onChange={(_name, value) => setVente((prev) => ({ ...prev, modePaiement: pickEnum(value, PAYMENT_MODES, 'espèces') }))} required />
        </div>

        <h3 className="sub-heading">Ajouter un article du catalogue</h3>
        <div className="filter-bar">
          <FormSelect
            label="Article"
            name="catalogueSelection"
            value={selection}
            options={catalogue.map((article) => ({ value: article.reference, label: `${article.reference} - ${article.designation}` }))}
            onChange={(_name, value) => { setSelection(value); addToCart(value) }}
          />
        </div>

        <h3 className="sub-heading">Articles vendus</h3>
        {vente.articles.length === 0 && <p className="empty-state">Aucun article. Recherchez et ajoutez un article du catalogue.</p>}
        {vente.articles.map((article) => (
          <div key={article.lineId} className="reception-article">
            <div className="form-grid-3">
              <div className="form-group"><label>Référence</label><span className="static-value">{article.reference}</span></div>
              <div className="form-group"><label>Désignation</label><span className="static-value">{article.designation}</span></div>
              <div className="form-group"><label>Prix unitaire</label><span className="static-value">{formatEuros(article.prixUnitaire)}</span></div>
              <div className="form-group">
                <label>Quantité</label>
                <input type="number" min="1" value={article.quantite} onChange={(e) => updateQuantity(article.lineId, e.target.value)} />
              </div>
              <div className="form-group"><label>Montant</label><span className="static-value">{formatEuros(article.quantite * article.prixUnitaire)}</span></div>
            </div>
            <button type="button" className="action-btn delete" onClick={() => removeArticle(article.lineId)} aria-label={`Retirer ${article.reference} du panier`}><Icon name="close" size="sm" /></button>
          </div>
        ))}

        <div className="vente-total">
          <div><strong>Total HT : {formatEuros(vente.totalHT)}</strong></div>
          <div className="form-group" style={{ minWidth: '200px' }}>
            <label>Montant payé</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={vente.montantPaye}
              onChange={(e) => handlePaiementChange(e.target.value)}
              placeholder={vente.totalHT.toString()}
            />
          </div>
          {vente.monnaie > 0 && <div><strong>Monnaie : {formatEuros(vente.monnaie)}</strong></div>}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button"><Icon name="check" size="sm" /> Valider la vente</button>
        </div>
      </form>

      <Link className="back-link" to="/">← Retour au dashboard</Link>
    </div>
  )
}
