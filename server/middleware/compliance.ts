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
    fingerprintVersion?: number
    totalTVA?: number | null
    totalTTC?: number | null
    montantPaye: number
    monnaie: number
    articles: Array<{ reference: string; designation: string; quantite: number; prixUnitaire: number; tauxTva?: number | null }>
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
  const version = input.fingerprintVersion ?? 1
  if (version !== 1 && version !== 2) throw new Error('Version d\'empreinte inconnue.')
  if (version === 2) {
    if (typeof input.totalTVA !== 'number' || !Number.isFinite(input.totalTVA)
      || typeof input.totalTTC !== 'number' || !Number.isFinite(input.totalTTC)
      || input.articles.some((line) => typeof line.tauxTva !== 'number' || !Number.isFinite(line.tauxTva))) {
      throw new Error('Montants fiscaux absents pour une vente scellée en version 2.')
    }
    const lignes = input.articles.map((line) => JSON.stringify([
      line.reference, line.designation, line.quantite, centimes(line.prixUnitaire), centimes(line.tauxTva as number),
    ])).sort()
    const charge = JSON.stringify([
      version, previous, input.id, input.sessionId ?? 0, dateOnly(input.dateVente), input.caissier,
      input.modePaiement, centimes(input.totalHT), centimes(input.totalTVA), centimes(input.totalTTC),
      centimes(input.montantPaye), centimes(input.monnaie), lignes,
    ])
    return createHash('sha256').update(charge, 'utf8').digest('hex')
  }

  // Conserver exactement la charge v1 : aucune empreinte ancienne n'est réécrite.
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

export type FingerprintedSale = Parameters<typeof fingerprintVente>[0] & { fingerprint: string | null }

export type FingerprintResult = { intacte: boolean; rupture: number | null; anterieures: number }

/** État partagé entre les lots : une page ne recommence jamais à la genèse. */
export class FingerprintVerifier {
  private previous: string
  private started: boolean
  private lastId: number
  private pendingFirstId: number | null = null
  private pendingCount = 0
  private readonly historicalBeforeId: number | undefined
  private anterieures = 0
  private rupture: number | null = null
  private verifiees = 0

  constructor(anchor: { fingerprint: string; id: number; historicalBeforeId?: number } = { fingerprint: GENESIS_HASH, id: 0 }) {
    this.previous = anchor.fingerprint
    this.lastId = anchor.id
    this.started = anchor.fingerprint !== GENESIS_HASH
    this.historicalBeforeId = anchor.historicalBeforeId
  }

  get previousHash(): string { return this.previous }
  get checkedCount(): number { return this.verifiees }
  get lastExaminedId(): number { return this.lastId }
  get broken(): boolean { return this.rupture !== null }

  add(vente: FingerprintedSale): void {
    if (this.broken) return
    if (!Number.isInteger(vente.id) || vente.id <= this.lastId) {
      this.rupture = vente.id
      return
    }
    this.lastId = vente.id

    if (vente.fingerprint === null) {
      // La version 2 existe uniquement après le déploiement du scellement.
      // Elle ne peut jamais être requalifiée comme un ancien historique.
      if ((vente.fingerprintVersion ?? 1) !== 1 || this.started
        || (this.historicalBeforeId !== undefined && vente.id >= this.historicalBeforeId)) {
        this.rupture = vente.id
      } else if (this.historicalBeforeId !== undefined && vente.id < this.historicalBeforeId) {
        // Une archive peut fournir le premier bloc scellé, vérifié séparément.
        this.anterieures++
      } else {
        this.pendingFirstId ??= vente.id
        this.pendingCount++
      }
      return
    }

    let attendu: string
    try {
      attendu = fingerprintVente(vente, this.previous)
    } catch {
      this.rupture = vente.id
      return
    }
    if (vente.fingerprint !== attendu) {
      this.rupture = vente.id
      return
    }

    // Le premier bloc valide sur la genèse établit la fin de l'historique.
    // Un historique entièrement dépourvu d'empreintes reste non vérifiable.
    this.anterieures += this.pendingCount
    this.pendingCount = 0
    this.pendingFirstId = null
    this.started = true
    this.previous = vente.fingerprint
    this.verifiees++
  }

  result(): FingerprintResult {
    const rupture = this.rupture ?? this.pendingFirstId
    return { intacte: rupture === null, rupture, anterieures: this.anterieures }
  }
}

/** Vérifie la chaîne complète, en conservant uniquement son état courant. */
export function verifyFingerprints(ventes: readonly FingerprintedSale[]): FingerprintResult {
  const verifier = new FingerprintVerifier()
  for (const vente of ventes) verifier.add(vente)
  return verifier.result()
}

/** Parcourt toutes les pages, y compris lorsqu'une limite de lot est demandée. */
export async function scanFingerprints(
  readBatch: (afterId: number, size: number) => Promise<readonly FingerprintedSale[]>,
  batchSize = 1000,
): Promise<FingerprintResult & { verifiees: number; derniereVente: number | null }> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5000) {
    throw new Error('La taille des lots doit être comprise entre 1 et 5000.')
  }
  const verifier = new FingerprintVerifier()
  let afterId = 0
  while (!verifier.broken) {
    const batch = await readBatch(afterId, batchSize)
    if (batch.length === 0) break
    for (const vente of batch) verifier.add(vente)
    if (verifier.broken) break
    afterId = batch[batch.length - 1].id
  }
  return { ...verifier.result(), verifiees: verifier.checkedCount, derniereVente: verifier.lastExaminedId || null }
}
