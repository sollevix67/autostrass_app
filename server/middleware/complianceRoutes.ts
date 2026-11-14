/**
 * Routes de conformité NF525 : contrôle d'inaltérabilité et mode dégradé.
 *
 * Ces routes ne sont pas un « module metier » : elles exposent la capacite a
 * **demontrer** que la memoire de vente n'a pas ete reecrite. C'est ce que
 * demande un controle fiscal, et cela suppose de pouvoir rejouer la
 * vérification à tout moment — donc que l'état de la chaîne soit consultable.
 *
 * L'acces suit le RBAC : lecture pour tout utilisateur authentifie, ouverture
 * du mode degrade reservee a la caisse (c'est une decision operationnelle, pas
 * une preference).
 */

import { Router, type Request } from 'express'
import { desc, eq, gt, inArray, isNull } from 'drizzle-orm'
import { handler, requireDb, requireId } from './crud.js'
import { requireAuth, requireRole } from './auth.js'
import { requireCsrf } from './csrf.js'
import { GENESIS_HASH, scanFingerprints, type FingerprintedSale } from './compliance.js'
import * as schema from '../db/schema.js'
import { toIsoString, toNumber } from '../repositories/mapping.js'
import type { UserRole } from '../db/schema.js'

/** Roles autorises a actionner le mode degrade. */
const CAISSE_WRITE: readonly UserRole[] = ['caissier']

/** Ligne de vente ramenee par le controle, avec ses lignes pour le recalcul. */
type SaleForFingerprint = FingerprintedSale

export function createComplianceRouter(): Router {
  const router = Router()

  // Même exigence que les métiers : le contrôle d'inaltérabilité révèle
  // quelle vente a ete alteree, ce qui est une information sensible.
  router.use(requireAuth)
  router.use(requireCsrf)

  /**
   * Contrôle d'inaltérabilité de la chaîne d'empreintes.
   *
   * Rejoue le calcul depuis le généèse et signale la première rupture. La réponse
   * distingue trois etats, parce qu'ils n'appellent pas la meme reaction :
   * - `intacte` : tout concorde ;
   * - `anterieures` : des ventes n'ont pas d'empreinte (avant la mise en
   *   conformité) — ce n'est pas une altération ;
   * - `rompue` : une empreinte ne correspond plus, et **le controle doit
   *   s'arreter la** : il ne faut pas continuer a recalculer au-dela, la suite
   *   n'aurait plus de sens.
   */
  router.get(
    '/nf525/controle',
    handler(async (request: Request, response) => {
      const client = requireDb(response)
      if (!client) return

      // `limite` règle la taille des lots, jamais la longueur de la chaîne.
      const requestedSize = Number(request.query.limite ?? 1000)
      if (!Number.isInteger(requestedSize) || requestedSize < 1 || requestedSize > 5000) {
        response.status(400).json({ error: 'INVALID_LIMIT', message: 'La taille des lots doit être comprise entre 1 et 5000.' })
        return
      }
      // En REPEATABLE READ, le premier SELECT établit le snapshot conservé
      // jusqu'au commit. Drizzle 0.45 concatène ses options START TRANSACTION
      // sans virgule ; combiner READ ONLY et WITH CONSISTENT SNAPSHOT serait invalide.
      const resultat = await client.transaction(async (tx) => scanFingerprints(async (afterId, size) => {
        const ventes = await tx.select().from(schema.ventes)
          .where(gt(schema.ventes.id, afterId)).orderBy(schema.ventes.id).limit(size)
        if (ventes.length === 0) return []

        const lignes = await tx.select().from(schema.venteLines)
          .where(inArray(schema.venteLines.vente_id, ventes.map((vente) => vente.id)))
          .orderBy(schema.venteLines.vente_id, schema.venteLines.ligne)
        const parVente = new Map<number, SaleForFingerprint['articles']>()
        for (const ligne of lignes) {
          const venteId = Number(ligne.vente_id)
          const list = parVente.get(venteId) ?? []
          list.push({
            reference: String(ligne.reference ?? ''), designation: String(ligne.designation ?? ''),
            quantite: Number(ligne.quantite ?? 0), prixUnitaire: toNumber(ligne.prix_unitaire),
            tauxTva: ligne.taux_tva === null ? null : toNumber(ligne.taux_tva),
          })
          parVente.set(venteId, list)
        }
        return ventes.map((vente): SaleForFingerprint => ({
          id: Number(vente.id), sessionId: vente.session_id === null ? null : Number(vente.session_id),
          dateVente: toIsoString(vente.date_vente), caissier: String(vente.caissier ?? ''),
          modePaiement: String(vente.mode_paiement ?? ''), totalHT: toNumber(vente.total_ht),
          fingerprintVersion: Number(vente.fingerprint_version),
          totalTVA: vente.total_tva === null ? null : toNumber(vente.total_tva),
          totalTTC: vente.total_ttc === null ? null : toNumber(vente.total_ttc),
          montantPaye: toNumber(vente.montant_paye), monnaie: toNumber(vente.monnaie),
          fingerprint: vente.fingerprint === null ? null : String(vente.fingerprint),
          articles: parVente.get(Number(vente.id)) ?? [],
        }))
      }, requestedSize), { isolationLevel: 'repeatable read', accessMode: 'read only' })

      if (resultat.intacte) {
        response.json({
          etat: resultat.anterieures > 0 ? 'anterieures' : 'intacte',
          ventesVerifiees: resultat.verifiees,
          ventesAnterieures: resultat.anterieures,
          rupture: null,
          genine: GENESIS_HASH,
          derniereVente: resultat.derniereVente,
          controleComplet: true,
        })
        return
      }

      response.status(409).json({
        error: 'CHAIN_ROMPUE',
        message: `Alteration detectee sur la vente #${resultat.rupture}. La memoire de vente n'est plus conforme.`,
        details: {
          etat: 'rompue',
          rupture: resultat.rupture,
          ventesVerifiees: resultat.verifiees,
          ventesAnterieures: resultat.anterieures,
        },
      })
    }),
  )

  /** Journal des evenements systeme. */
  router.get(
    '/nf525/evenements',
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const limit = Number.parseInt(String(request.query.limite ?? '200'), 10)
      const rows = await client
        .select()
        .from(schema.systemEvents)
        .orderBy(desc(schema.systemEvents.id))
        .limit(Number.isInteger(limit) ? Math.min(limit, 1000) : 200)

      response.json(
        rows.map((row) => ({
          id: Number(row.id),
          type: row.type,
          detail: row.detail,
          degrade: row.degrade,
          createdAt: toIsoString(row.createdAt as Date | null),
        })),
      )
    }),
  )

  /**
   * Ventes accumulees hors ligne, en attente de rejeu.
   *
   * Expose l'état de la file plutôt que de la traiter : le rejeu passe par
   * `POST /nf525/mode-degrade/rejouer`, qui doit pouvoir etre appele quand le
   * service revient, pas au moment ou l'evenement est constate.
   */
  router.get(
    '/nf525/mode-degrade/file',
    handler(async (_request, response) => {
      const client = requireDb(response)
      if (!client) return
      const rows = await client
        .select()
        .from(schema.offlineVenteQueue)
        .where(isNull(schema.offlineVenteQueue.integree))
        .orderBy(schema.offlineVenteQueue.id)
      response.json(
        rows.map((row) => ({
          id: Number(row.id),
          reference: String(row.reference ?? ''),
          fingerprint: String(row.fingerprint ?? ''),
          createdAt: toIsoString(row.createdAt as Date | null),
        })),
      )
    }),
  )

  /**
   * Signale une coupure : le poste passe en mode degrade.
   *
   * L'evenement est ecrit immediatement, avant que l'on sache si la coupure
   * dure. Un evenement « coupure » suivi d'un « retour nominal » dans la
   * minute est un faux contact et se lit comme tel ; l'inverse, un arret
   * simultane de la base et du poste, laisserait un silence inexpliqué.
   */
  router.post(
    '/nf525/mode-degrade/ouvrir',
    requireRole(...CAISSE_WRITE),
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      await client.insert(schema.systemEvents).values({
        type: 'mode dégradé',
        detail: String((request.body as { motif?: string } | undefined)?.motif ?? 'Coupure de liaison'),
        degrade: true,
      })
      response.status(201).json({ etat: 'degrade' })
    }),
  )

  /** Cloture du mode degrade : la liaison est retablie. */
  router.post(
    '/nf525/mode-degrade/fermer',
    requireRole(...CAISSE_WRITE),
    handler(async (_request, response) => {
      const client = requireDb(response)
      if (!client) return

      const enAttente = await client
        .select()
        .from(schema.offlineVenteQueue)
        .where(isNull(schema.offlineVenteQueue.integree))

      await client.insert(schema.systemEvents).values({
        type: 'retour nominal',
        detail: `${enAttente.length} vente(s) hors ligne a rejouer`,
        degrade: false,
      })
      response.status(201).json({ etat: 'nominal', ventesARrejouer: enAttente.length })
    }),
  )

  /**
   * Marque une vente hors ligne comme integree.
   *
   * Le rejeu lui-meme passe par `POST /api/ventes` : la vente reprend son
   * chemin normal, empreinte comprise. Cette route ne fait que pointer la
   * file, ce qui évite deux chemins d'écriture pour les ventes.
   */
  router.post(
    '/nf525/mode-degrade/integrer/:id',
    requireRole(...CAISSE_WRITE),
    handler(async (request, response) => {
      const client = requireDb(response)
      if (!client) return
      const id = requireId(request, response)
      if (id === null) return
      await client.update(schema.offlineVenteQueue).set({ integree: true }).where(eq(schema.offlineVenteQueue.id, id))
      response.json({ integree: true })
    }),
  )

  return router
}
