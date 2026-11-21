import { z } from 'zod'
import { documentLineSchema } from './index'

export const devisSchema = z.object({
  clientId: z.number({ message: 'Sélectionnez un client.' }).int().positive('Sélectionnez un client.'),
  dateDevis: z.iso.date({ message: 'La date du devis est invalide.' }),
  dateValidite: z.iso.date({ message: 'La date de validité est invalide.' }).or(z.literal('')),
  notes: z.string().trim().max(2000, 'Les notes ne doivent pas dépasser 2 000 caractères.'),
  statut: z.enum(['brouillon', 'envoyé', 'annulé']),
  articles: z.array(documentLineSchema.pick({ reference: true, quantite: true, prixUnitaire: true }))
    .min(1, 'Ajoutez au moins un article au devis.')
    .max(200, 'Maximum 200 lignes par devis.'),
}).superRefine((values, context) => {
  const references = new Set<string>()
  values.articles.forEach((line, index) => {
    if (references.has(line.reference)) {
      context.addIssue({ code: 'custom', path: ['articles', index, 'reference'], message: 'Une référence ne peut apparaître qu’une fois dans un devis.' })
    }
    references.add(line.reference)
  })
  if (values.dateValidite && values.dateValidite < values.dateDevis) {
    context.addIssue({ code: 'custom', path: ['dateValidite'], message: 'La validité doit être postérieure ou égale à la date du devis.' })
  }
})

export const devisConversionSchema = z.object({
  dateLivraisonPrevue: z.iso.date({ message: 'La date de livraison prévue est invalide.' }).or(z.literal('')),
})

export type DevisFormValues = z.input<typeof devisSchema>
export type DevisConversionValues = z.input<typeof devisConversionSchema>
