import type { DevisRow } from '../repositories/devisRepository.js'
import { AUTOSTRASS_PDF_COMPANY, formatCommercialDate, generateCommercialPdf } from './pdfCommercial.js'

const statusLabels = {
  brouillon: 'Brouillon',
  envoyé: 'Envoyé',
  converti: 'Converti en commande',
  annulé: 'Annulé',
}

/** Rend exclusivement les coordonnées, prix et montants figés dans le devis. */
export async function generateDevisPdf(devis: DevisRow): Promise<Buffer> {
  const client = devis.clientSnapshot
  return generateCommercialPdf({
    title: 'DEVIS',
    numero: devis.numero,
    date: devis.dateDevis,
    validite: devis.dateValidite ? `Valable jusqu'au ${formatCommercialDate(devis.dateValidite)}` : 'Non précisée',
    statut: statusLabels[devis.statut],
    company: AUTOSTRASS_PDF_COMPANY,
    client: {
      numero: client.numeroClient,
      lines: [
        [client.prenom, client.nom].filter(Boolean).join(' '),
        client.adresse,
        [client.codePostal, client.ville].filter(Boolean).join(' '),
        client.email,
        client.telephone,
        ...(client.siret ? [`SIRET : ${client.siret}`] : []),
      ],
    },
    lines: devis.articles.map((line) => ({
      quantite: line.quantite,
      reference: line.reference,
      designation: line.designation,
      prixNetHT: line.prixUnitaire,
      tauxTva: line.tauxTva,
      montantHT: line.montant,
      montantTVA: line.montantTVA,
      montantTTC: line.montantTTC,
    })),
    totals: { totalHT: devis.totalHT, totalTVA: devis.totalTVA, totalTTC: devis.totalTTC },
    notes: devis.notes,
  })
}
