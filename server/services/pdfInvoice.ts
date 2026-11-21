import { venteTotals } from '../../src/utils/venteTotals.js'
import {
  AUTOSTRASS_PDF_COMPANY,
  formatCommercialMoney,
  formatCommercialTime,
  generateCommercialPdf,
  type CommercialPdfLine,
} from './pdfCommercial.js'

export type VenteForPdf = {
  id: number
  clientId: number | null
  dateVente: string
  caissier: string
  articles: Array<{
    reference: string
    designation: string
    quantite: number
    prixUnitaire: number
    tauxTva?: number | null
  }>
  totalHT: number
  totalTVA?: number | null
  totalTTC?: number | null
  montantPaye: number
  monnaie: number
  modePaiement: string
}

export type ClientForPdf = {
  numeroClient: string
  nom: string
  prenom: string
  adresse: string
  ville: string
  codePostal: string
  email?: string | null
  telephone?: string | null
  siret?: string | null
}

/** Conserve l'identité, les montants fiscaux et les encaissements de la vente. */
export async function generateVentePdf(vente: VenteForPdf, client: ClientForPdf | null): Promise<Buffer> {
  const taxesFigees = vente.totalTVA != null && vente.totalTTC != null
  const lines: CommercialPdfLine[] = vente.articles.map((line) => {
    const amounts = !taxesFigees || line.tauxTva == null ? null : venteTotals([{ ...line, tauxTva: line.tauxTva }])
    return {
      quantite: line.quantite,
      reference: line.reference,
      designation: line.designation,
      prixNetHT: line.prixUnitaire,
      montantHT: Math.round(line.prixUnitaire * 100) * line.quantite / 100,
      tauxTva: line.tauxTva ?? null,
      montantTVA: amounts?.totalTVA ?? null,
      montantTTC: amounts?.totalTTC ?? null,
    }
  })

  return generateCommercialPdf({
    title: 'FACTURE',
    numero: vente.id.toString().padStart(6, '0'),
    date: vente.dateVente,
    heure: formatCommercialTime(vente.dateVente),
    auteur: vente.caissier,
    company: AUTOSTRASS_PDF_COMPANY,
    client: {
      numero: client?.numeroClient ?? null,
      lines: client ? [
        [client.nom, client.prenom].filter(Boolean).join(' '),
        client.adresse,
        [client.codePostal, client.ville].filter(Boolean).join(' '),
        ...(client.email ? [client.email] : []),
        ...(client.telephone ? [client.telephone] : []),
        ...(client.siret ? [`SIRET : ${client.siret}`] : []),
      ] : ['Client de passage'],
    },
    lines,
    totals: { totalHT: vente.totalHT, totalTVA: vente.totalTVA ?? null, totalTTC: vente.totalTTC ?? null },
    paymentLines: [
      `Mode de paiement : ${vente.modePaiement}`,
      `Montant reçu : ${formatCommercialMoney(vente.montantPaye)}`,
      `Monnaie rendue : ${formatCommercialMoney(vente.monnaie)}`,
    ],
    footerLines: [`Vente n° ${vente.id} · ${vente.modePaiement}`],
  })
}
