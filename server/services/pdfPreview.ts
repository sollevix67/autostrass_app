import type { DocumentsPdfSettings } from '../../src/schemas/parametres.js'
import { generateCommercialPdf, OPENSTRASS_PDF_COMPANY, type CommercialPdfDocument } from './pdfCommercial.js'
import { venteTotals } from '../../src/utils/venteTotals.js'

/** Exemple stable, sans compte client, vente, caisse ou document enregistré. */
export function createDocumentsPdfPreviewDocument(): CommercialPdfDocument {
  const inputs = [
    { quantite: 2, reference: 'EXEMPLE-001', designation: 'Article fictif à taux normal', prixUnitaire: 12.5, tauxTva: 20 },
    { quantite: 1, reference: 'EXEMPLE-002', designation: 'Article fictif à taux réduit', prixUnitaire: 10, tauxTva: 5.5 },
  ]
  return {
    title: 'DEVIS — APERÇU', numero: 'APERÇU', date: '2026-11-21',
    company: OPENSTRASS_PDF_COMPANY,
    client: { numero: 'EXEMPLE', lines: ['Client de démonstration', '10 rue de l’Exemple', '67000 Strasbourg', 'client@example.test'] },
    lines: inputs.map((line) => {
      const amounts = venteTotals([line])
      return {
        quantite: line.quantite, reference: line.reference, designation: line.designation,
        prixNetHT: line.prixUnitaire, tauxTva: line.tauxTva,
        montantHT: amounts.totalHT, montantTVA: amounts.totalTVA, montantTTC: amounts.totalTTC,
      }
    }),
    totals: venteTotals(inputs),
    notes: 'Document fictif de démonstration. Cet aperçu ne crée ni devis, ni vente, ni écriture métier.',
  }
}

export async function generateDocumentsPdfPreview(settings: DocumentsPdfSettings): Promise<Buffer> {
  return generateCommercialPdf(createDocumentsPdfPreviewDocument(), settings)
}
