import { z } from 'zod'

export const MAX_STOCK = 2_147_483_647
const quantite = z.number({ message: 'Saisissez une quantité.' })
  .int('La quantité doit être entière.').min(0, 'La quantité ne peut pas être négative.')
  .max(MAX_STOCK, 'La quantité dépasse la limite autorisée.')

/** Contrat commun ; le serveur normalise également le motif avec sanitizeText. */
export const inventaireSchema = z.object({
  version: z.string().regex(/^[a-f0-9]{64}$/, 'Rechargez le stock avant de compter.'),
  motif: z.string().trim().min(1, 'Le motif du comptage est obligatoire.').max(255, 'Le motif est limité à 255 caractères.'),
  lignes: z.array(z.object({
    emplacementId: z.number().int().positive().max(4_294_967_295).nullable(),
    quantiteComptee: quantite,
  })).min(1, 'Comptez aussi le stock non affecté.').max(500, 'Un comptage est limité à 500 emplacements.'),
}).superRefine(({ lignes }, ctx) => {
  if (!lignes.some((ligne) => ligne.emplacementId === null)) {
    ctx.addIssue({ code: 'custom', path: ['lignes'], message: 'Comptez aussi le stock non affecté.' })
  }
  if (new Set(lignes.map((ligne) => ligne.emplacementId)).size !== lignes.length) {
    ctx.addIssue({ code: 'custom', path: ['lignes'], message: 'Chaque emplacement doit être compté une seule fois.' })
  }
  if (lignes.reduce((total, ligne) => total + ligne.quantiteComptee, 0) > MAX_STOCK) {
    ctx.addIssue({ code: 'custom', path: ['lignes'], message: 'Le total compté dépasse la limite autorisée.' })
  }
})

export type InventaireInput = z.infer<typeof inventaireSchema>
