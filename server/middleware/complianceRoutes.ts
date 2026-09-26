/**
 * Routes de conformite NF525 : controle d'inalterabilite et mode degrade.
 *
 * Ces routes ne sont pas un « module metier » : elles exposent la capacite a
 * **demontrer** que la memoire de vente n'a pas ete reecrite. C'est ce que
 * demande un controle fiscal, et cela suppose de pouvoir rejouer la
 * verification a tout moment — donc que l'etat de la chaine soit consultable.
 *
 * L'acces suit le RBAC : lecture pour tout utilisateur authentifie, ouverture
 * du mode degrade reservee a la caisse (c'est une decision operationnelle, pas
 * une preference).
 */

import { Router, type Request } from 'express'
import { desc, eq, isNull } from 'drizzle-orm'
import { handler, requireDb, requireId } from './crud.js'
import { requireAuth, requireRole } from './auth.js'
import { requireCsrf } from './csrf.js'
import { GENESIS_HASH, verifyFingerprints } from './compliance.js'
import * as schema from '../db/schema.js'
import { toIsoString, toNumber } from '../repositories/mapping.js'
import type { UserRole } from '../db/schema.js'

/** Roles autorises a actionner le mode degrade. */
const CAISSE_WRITE: readonly UserRole[] = ['caissier']

/** Ligne de vente ramenee par le controle, avec ses lignes pour le recalcul. */
type SaleForFingerprint = {
  id: number
  sessionId: number | null
  dateVente: string
  caissier: string
  modePaiement: string
  totalHT: number
  montantPaye: number
  monnaie: number
  fingerprint: string | null
  articles: Array<{ reference: string; designation: string; quantite: number; prixUnitaire: number }>
}

export function createComplianceRouter(): Router {
  const router = Router()

  // Meme exigence que les metiers : le controle d'inalterabilite revele
  // quelle vente a ete alteree, ce qui est une information sensible.
  router.use(requireAuth)
  router.use(requireCsrf)

  /**
   * Controle d'inalterabilite de la chaine d'empreintes.
   *
   * Rejoue le calcul depuis le genine et signale la premiere rupture. La reponse
   * distingue trois etats, parce qu'ils n'appellent pas la meme reaction :
   * - `intacte` : tout concorde ;
   * - `anterieures` : des ventes n'ont pas d'empreinte (avant la mise en
   *   conformite) — ce n'est pas une alteration ;
   * - `rompue` : une empreinte ne correspond plus, et **le controle doit
   *   s'arreter la** : il ne faut pas continuer a recalculer au-dela, la suite
   *   n'aurait plus de sens.
   */
  router.get(
    '/nf525/controle',
    handler(async (request: Request, response) => {
      const client = requireDb(response)
      if (!client) return

      const ventes = await client
        .select()
        .from(schema.ventes)
        .orderBy(schema.ventes.id)
        .limit(Number.parseInt(String(request.query.limite ?? '5000'), 10) || 5000)

      // Lignes de toutes les ventes examinees, groupees par vente.
      const lignes = await client
        .select()
        .from(schema.venteLines)
        .orderBy(schema.venteLines.vente_id, schema.venteLines.ligne)

      const parVente = new Map<number, SaleForFingerprint['articles']>()
      for (const ligne of lignes) {
        const venteId = Number(ligne.vente_id)
        const list = parVente.get(venteId) ?? []
        list.push({
          reference: String(ligne.reference ?? ''),
          designation: String(ligne.designation ?? ''),
          quantite: Number(ligne.quantite ?? 0),
          prixUnitaire: toNumber(ligne.prix_unitaire as string | number | null),
        })
        parVente.set(venteId, list)
      }

      const candidats: SaleForFingerprint[] = ventes.map((vente) => ({
        id: Number(vente.id),
        sessionId: vente.session_id === null ? null : Number(vente.session_id),
        dateVente: toIsoString(vente.date_vente as Date | null),
        caissier: String(vente.caissier ?? ''),
        modePaiement: String(vente.mode_paiement ?? ''),
        totalHT: toNumber(vente.total_ht as string | number | null),
        montantPaye: toNumber(vente.montant_paye as string | number | null),
        monnaie: toNumber(vente.monnaie as string | number | null),
        fingerprint: vente.fingerprint === null || vente.fingerprint === undefined ? null : String(vente.fingerprint),
        articles: parVente.get(Number(vente.id)) ?? [],
      }))

      // Le controle rejoue la chaine sur l'integralite des ventes, dans
      // l'ordre des identifiants : c'est cet ordre qui constitue la memoire
      // de vente. Les ventes anterieures a la mise en conformite n'ont pas
      // d'empreinte et sont comptees a part par `verifyFingerprints`.
      const resultat = verifyFingerprints(candidats)

      if (resultat.intacte) {
        response.json({
          etat: resultat.anterieures > 0 ? 'anterieures' : 'intacte',
          ventesVerifiees: candidats.length - resultat.anterieures,
          ventesAnterieures: resultat.anterieures,
          rupture: null,
          genine: GENESIS_HASH,
        })
        return
      }

      response.status(409).json({
        error: 'CHAIN_ROMPUE',
        message: `Alteration detectee sur la vente #${resultat.rupture}. La memoire de vente n'est plus conforme.`,
        details: {
          etat: 'rompue',
          rupture: resultat.rupture,
          ventesVerifiees: candidats.length - resultat.anterieures,
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
   * Expose l'etat de la file plutot que de la traiter : le rejeu passe par
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
   * file, ce qui evite deux chemins d'ecriture pour les ventes.
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
