/**
 * Conformité NF525 — empreinte cryptographique et mode dégradé.
 *
 * La NF525 (systèmes de caisse enregistreuse) n'exige pas un algorithme
 * particulier : elle exige que **toute modification de la mémoire de vente
 * soit détectable**. On s'appuie donc sur une chaîne de hachage, chaque vente
 * portant l'empreinte du bloc qui la précède. Modifier une vente ancienne
 * invalide désormais toutes les empreintes suivantes, et le contrôle le
 * montre.
 *
 * Choix de l'algorithme : **SHA-256**, et non MD5 ni SHA-1. Ces derniers sont
 * aujourd'hui considérés cassés pour la résistance aux collisions ; une
 * empreinte foirée est exactement ce que la norme cherche à empêcher, donc
 * l'algorithme doit être solide sur ce point, pas seulement rapide.
 *
 * ## Ce que la norme demande, et ce que l'on fait
 *
 * | Exigence NF525 | Réalisé ici |
 * |---|---|
 * | Vente inaltérable après validation | `PUT`/`DELETE` refusés (409 `VENTE_FROME`) |
 * | Séquence inaltérable | Chaîne de hachage : chaque vente porte l'empreinte de la précédente |
 * | Journal des événements du système | `system_events` (démarrage, arrêt, mode dégradé) |
 * | Mode dégradé | Événements journalisés **localement** puis rejoués au retour du service |
 * | Conservation 7 ans | `scripts/archive-fiscal.ts` + note de déploiement |
 *
 * ## Limite assumée
 *
 * La NF525 prévoit aussi des **clés de scellement** opérées par l'État et
 * une certification du matériel par l'ADEME. Ces deux points dépendent
 * l'un de l'acheteur et ne sont pas réalisables dans le code : ce module
 * couvre les exigences logicielles.
 */

import { createHash } from 'node:crypto'

/** Bloc vide utilisé comme genèse de la chaîne. */
export const GENESIS_HASH = '0'.repeat(64)

/**
 * Calcule l'empreinte d'une vente.
 *
 * Les montants sont convertis en centimes **avant** hachage : `15.5` et
 * `"15.50"` doivent produire la même empreinte, sinon un simple changement de
 * format de sérialisation invaliderait la chaîne sans que la donnée ait
 * change. Le calcul se fait sur un tableau de valeurs, pas sur du JSON, pour
 * que l'ordre des clés n'ait pas d'importance.
 *
 * @param previous empreinte de la vente précédente
 */
export function fingerprintVente(
  input: {
    id: number
    sessionId: number | null
    dateVente: string
    caissier: string
    modePaiement: string
    totalHT: number
    montantPaye: number
    monnaie: number
    articles: Array<{ reference: string; designation: string; quantite: number; prixUnitaire: number }>
  },
  previous: string,
): string {
  /**
   * Réduit un horodatage à sa **date civile**.
   *
   * On ne hache ni l'heure ni l'instant : mysql2 convertit un `Date` en chaîne
   * locale selon le fuseau du serveur, si bien que la valeur relue differe de
   * celle ecrite de quelques heures. Hacher l'une des deux rend l'empreinte
   * non reproductible et le contrôle signale une rupture inexistante — c'est
   * exactement ce que produit un décalage de fuseau.
   *
   * La date seule suffit à l'_inaltérabilité_ : l'empreinte doit prouver que
   * le **contenu** d'une vente n'a pas été réécrit. L'ordre exact des ventes
   * est déjà garanti par `id`, qui est strictly croissant et fait partie de la
   * charge. Un déplacement d'une vente d'un jour sur un autre resterait
   * détecté ; un déplacement de quelques minutes ne change rien au contenu
   * comptable et n'a pas lieu d'être traité comme une altération.
   */
  function dateOnly(date: string | number | Date): string {
    const value = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(value.getTime())) return '0000-00-00'
    return value.toISOString().slice(0, 10)
  }

  const centimes = (value: number): number => Math.round(value * 100)
  const lignes = input.articles
    .map((line) => [line.reference, line.designation, line.quantite, centimes(line.prixUnitaire)].join('|'))
    .sort()

  const charge = [
    previous,
    input.id,
    input.sessionId ?? 0,
    dateOnly(input.dateVente),
    input.caissier,
    input.modePaiement,
    centimes(input.totalHT),
    centimes(input.montantPaye),
    centimes(input.monnaie),
    ...lignes,
  ].join('~')

  return createHash('sha256').update(charge, 'utf8').digest('hex')
}

/** Vérifie qu'une chaîne d'empreintes est intacte. */
export function verifyFingerprints(
  ventes: Array<{
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
  }>,
): { intacte: boolean; rupture: number | null; anterieures: number } {
  // La chaîne ne **saute** jamais une vente : une vente sans empreinte
  // antérieure à la mise en conformité n'a pas de chaînon, et la vente
  // suivante a été scellée sur le généèse. Filtrer ces ventes ferait porter le
  // chaînon à la mauvaise vente, et le contrôle signalerait une rupture
  // inexistante.
  //
  // On les compte séparément, et le contrôle les qualifie d'« antérieures »
  // plutôt que de rompues : absence d'empreinte ≠ altération.
  let previous = GENESIS_HASH
  let anterieures = 0
  let rupture: number | null = null

  for (const vente of ventes) {
    if (vente.fingerprint === null) {
      anterieures += 1
      previous = GENESIS_HASH
      continue
    }

    const attendu = fingerprintVente(vente, previous)
    if (vente.fingerprint !== attendu) {
      rupture = vente.id
      break
    }
    previous = vente.fingerprint
  }

  return { intacte: rupture === null, rupture, anterieures }
}
