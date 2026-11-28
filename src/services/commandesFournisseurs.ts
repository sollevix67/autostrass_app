import { z } from 'zod'
import { api, ApiError } from './api'
import type { ApiCommandeFournisseur } from './contracts'

const id = z.number().int().positive()
const operationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('commande'), cle: z.uuid(), fournisseurId: id,
    modeLivraison: z.enum(['retrait', 'livraison', 'express', 'franchise']),
    articles: z.array(z.object({ besoinId: id, quantite: id, prixUnitaire: z.number().nonnegative() })).min(1),
  }),
  z.object({
    type: z.literal('reception'), cle: z.uuid(), commandeId: id,
    articles: z.array(z.object({ ligne: id, quantite: id })).min(1),
  }),
])

export type OperationFournisseur = z.infer<typeof operationSchema>

export function cleOperation(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // getRandomValues est aussi disponible sur le réseau local en HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

export async function transmettreOperation(operation: OperationFournisseur): Promise<string> {
  if (operation.type === 'commande') {
    const { id: commandeId } = await api.post<ApiCommandeFournisseur>('/commandes-fournisseurs', {
      cleCommande: operation.cle, fournisseurId: operation.fournisseurId,
      modeLivraison: operation.modeLivraison, articles: operation.articles,
    })
    return `Commande fournisseur n° ${commandeId} enregistrée.`
  }
  const { receptionId } = await api.post<{ receptionId: number }>(`/commandes-fournisseurs/${operation.commandeId}/receptions`, {
    cleOperation: operation.cle, articles: operation.articles,
  })
  return `Réception n° ${receptionId} enregistrée pour la commande n° ${operation.commandeId}.`
}

export function confirmationIncertaine(cause: unknown) {
  return !(cause instanceof ApiError) || cause.status === 0 || cause.status === 408 || cause.status >= 500
}

/** Seules les opérations envoyées en attente de confirmation survivent au rechargement de l’onglet. */
export function lireOperationsEnCours(utilisateurId: number): OperationFournisseur[] {
  const operations: OperationFournisseur[] = []
  try {
    const prefix = `openstrass-achats-en-cours-${utilisateurId}-`
    for (const key of Object.keys(sessionStorage).filter((name) => name.startsWith(prefix))) {
      const stored = sessionStorage.getItem(key)
      if (stored) {
        const result = operationSchema.safeParse(JSON.parse(stored))
        if (result.success && key === prefix + result.data.cle) operations.push(result.data)
      }
    }
  } catch {
    // Le stockage de l’onglet peut être désactivé.
  }
  return operations
}

export function memoriserOperation(utilisateurId: number, operation: OperationFournisseur, garder: boolean) {
  try {
    const key = `openstrass-achats-en-cours-${utilisateurId}-${operation.cle}`
    if (garder) sessionStorage.setItem(key, JSON.stringify(operation))
    else sessionStorage.removeItem(key)
  } catch {
    // Si le stockage est désactivé, le dialogue conserve la clé en mémoire.
  }
}
