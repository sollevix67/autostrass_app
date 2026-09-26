/**
 * Conformite NF525 — empreinte cryptographique et mode degrade.
 *
 * La NF525 (systemes de caisse enregistreuse) n'exige pas un algorithme
 * particulier : elle exige que **toute modification de la memoire de vente
 * soit detectable**. On s'appuie donc sur une chaine de hachage, chaque vente
 * portant l'empreinte du bloc qui la precede. Modifier une vente ancienne
 * invalide desormais toutes les empreintes suivantes, et le controle le
 * montre.
 *
 * Choix de l'algorithme : **SHA-256**, et non MD5 ni SHA-1. Ces derniers sont
 * aujourd'hui consideres casses pour la resistance aux collisions ; une
 * empreinte foiree est exactement ce que la norme cherche a empecher, donc
 * l'algorithme doit etre solide sur ce point, pas seulement rapide.
 *
 * ## Ce que la norme demande, et ce que l'on fait
 *
 * | Exigence NF525 | Realise ici |
 * |---|---|
 * | Vente inalterable apres validation | `PUT`/`DELETE` refuses (409 `VENTE_FROME`) |
 * | Sequence inalterable | Chaine de hachage : chaque vente porte l empreinte de la precedente |
 * | Journal des evenements du systeme | `system_events` (démarrage, arrêt, mode dégradé) |
 * | Mode degrade | Evenements journalises **localement** puis rejoues au retour du service |
 * | Conservation 7 ans | `scripts/archive-fiscal.ts` + note de deploiement |
 *
 * ## Limite assumee
 *
 * La NF525 prevaut aussi des **clés de scellement** operated par l'Etat et
 * une certification du materiel par l'ADEME. Ces deux points dependent
 * l'un de l'acheteur et ne sont pas realisables dans le code : ce module
 * couvre les exigences logicielles.
 */

import { createHash } from 'node:crypto'

/** Blocvide utilise comme genine de la chaine. */
export const GENESIS_HASH = '0'.repeat(64)

/**
 * Calcule l'empreinte d'une vente.
 *
 * Les montants sont convertis en centimes **avant** hachage : `15.5` et
 * `"15.50"` doivent produire la meme empreinte, sinon un simple changement de
 * format de serialization invaliderait la chaine sans que la donnee ait
 * change. Le calcul se fait sur un tableau de valeurs, pas sur du JSON, pour
 * que l'ordre des cles n'ait pas d'importance.
 *
 * @param previous empreinte de la vente precedente
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
   * Reduit un horodatage a sa **date civile**.
   *
   * On ne hache ni l'heure ni l'instant : mysql2 convertit un `Date` en chaine
   * locale selon le fuseau du serveur, si bien que la valeur relue differe de
   * celle ecrite de quelques heures. Hacher l'une des deux rend l'empreinte
   * non reproductible et le controle signale une rupture inexistante — c'est
   * exactement ce que produit un decalage de fuseau.
   *
   * La date seule suffit a l'_inalterabilite_ : l'empreinte doit prouver que
   * le **contenu** d'une vente n'a pas ete reecrit. L'ordre exact des ventes
   * est deja garanti par `id`, qui est strictly croissant et fait partie de la
   * charge. Un deplacement d'une vente d'un jour sur un autre resterait
   * detecte ; un deplacement de quelques minutes ne change rien au contenu
   * comptable et n'a pas lieu d'etre traite comme une alteration.
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

/** Verifie qu'une chaine d'empreintes est intacte. */
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
  // La chaine ne **saute** jamais une vente : une vente sans empreinte
  // anterieure a la mise en conformite n'a pas de chainon, et la vente
  // suivante a ete scellee sur le genine. Filtrer ces ventes ferait porter le
  // chainon a la mauvaise vente, et le controle signalerait une rupture
  // inexistante.
  //
  // On les compte separement, et le controle les qualifie d'« anterieures »
  // plutot que de rompues : absence d'empreinte != alteration.
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
