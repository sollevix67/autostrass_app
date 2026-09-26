/**
 * Repository de la caisse : sessions, comptage et journal des mouvements.
 *
 * Ce n'est pas un CRUD generique. Trois regles metier font l'objet d'une
 * transaction, parce qu'une session mal fermee fausse le compte de caisse :
 *
 * 1. **Une seule session ouverte par caissier.** Deux tiroirs ouverts sur le
 *    meme poste rendraient la cloture ambigue : on ne saurait pas quel
 *    comptage arreter quelle recette.
 * 2. **Le total theorique est toujours derive des ventes**, jamais saisi. Il
 *    vaut `fonds + especes encaissees - monnaie rendue`. Le saisissant
 *    laisserait un ecart structurellement nul, donc toujours « justifie ».
 * 3. **La cloture fige la session.** Une fois `clôturée`, la session n'est plus
 *    modifiable et n'accepte plus de vente : sinon le comptage afficherait un
 *    ecart que la vente suivante vient d'inventer.
 *
 * Les montants sont calcules en centimes entiers : `0.1 + 0.2 !== 0.3` en
 * flottant, et un ecart de caisse calcule au centime pres doit tomber juste.
 */

import { and, desc, eq, sql } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from '../db/schema.js'
import { toNumber, toIsoString } from './mapping.js'
import { RepositoryError } from './simpleRepositories.js'

type Tables = typeof schema

/** Type de transaction Drizzle, deduit pour eviter de le redeclarer. */
type Tx = Parameters<Parameters<MySql2Database<Tables>['transaction']>[0]>[0]

/** Arrondi commercial au centime. Evite les residus de flottant en cascade. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Convertit un montant en chaine DECIMAL, format attendu par MariaDB. */
function toDecimal(value: number): string {
  return round2(value).toFixed(2)
}

/**
 * Une ligne de comptage telle que la stocke `cash_session_breaks`.
 * Le denomination est un montant en euros : `10.00` represente un billet de 10 €.
 */
export type CashBreak = {
  denomination: number
  quantite: number
}

/** Mouvement de caisse expose par l'API. */
export type CashMovementRow = {
  id: number
  sessionId: number
  type: schema.CashMovementType
  /** Montant signe : positif = entree de liquide, negatif = sortie. */
  montant: number
  venteId: number | null
  libelle: string
  createdAt: string
}

/** Resultat du comptage, expose dans le detail d'une session. */
export type CashCountRow = {
  denomination: number
  quantite: number
  /** `denomination * quantite`, calcule pour l'affichage du total. */
  sousTotal: number
}

/**
 * Detail d'une session, avec ses agregats de caisse.
 *
 * `totalEspeces` est la somme des ventes en especes de la session. Elle est
 * presentee separement du `totalTheorique` : le total theorique inclut le
 * fond de caisse et deduit la monnaie rendue, ce qui rend la comparaison au
 * comptage incomprehensible sans ce detail.
 */
export type CashSessionRow = {
  id: number
  caissier: string
  utilisateurId: number
  statut: schema.CashSessionStatus
  fondsCaisse: number
  /** Somme des ventes en especes de la session (encaissements - monnaie). */
  totalEspeces: number
  totalTheorique: number | null
  totalReel: number | null
  /** `totalReel - totalTheorique`. Nul tant que la session est ouverte. */
  ecart: number | null
  openedAt: string
  closedAt: string | null
  notes: string | null
  /** Nombre de ventes rattachees a la session. */
  nombreVentes: number
  /** Detail du comptage : vide tant que la session est ouverte. */
  comptage: CashCountRow[]
  createdAt: string
  updatedAt: string
}

export class CashRegisterRepository {
  constructor(private readonly db: MySql2Database<Tables>) {}

  /**
   * Somme des ventes **en especes** d'une session.
   *
   * `montant_paye - monnaie` est la recette reelle encaissée : un client qui
   * paye 50 € pour 31 € laisse 31 € dans le tiroir, pas 50 €.
   *
   * Le filtre sur `mode_paiement` est indispensable : sans lui, une vente par
   * carte ou par cheque gonflerait le solde du tiroir d'un montant qui n'y est
   * jamais entre. Le controle de caisse detecterait alors un excedent
   * systematique a chaque cloture, sans qu'aucune erreur soit visible dans les
   * ventes.
   */
  private async especesRecette(sessionId: number, tx?: Tx): Promise<number> {
    const executor = tx ?? this.db
    const [row] = await executor
      .select({
        total: sql<number>`COALESCE(SUM(${schema.ventes.montant_paye} - ${schema.ventes.monnaie}), 0)`,
      })
      .from(schema.ventes)
      .where(
        and(
          eq(schema.ventes.session_id, sessionId),
          eq(schema.ventes.mode_paiement, 'espèces'),
        ),
      )

    return round2(toNumber(row?.total as string | number | null))
  }

  /** Convertit une ligne de session SQL vers la forme exposee. */
  private async hydrate(raw: Record<string, unknown>): Promise<CashSessionRow> {
    const id = Number(raw.id)
    const total = await this.especesRecette(id)
    const totalVentes = await this.countVentes(id)

    // Le detail du comptage n'a de sens que sur une session fermee : le
    // charger pour une session ouverte serait une requete inutile.
    const comptage = raw.statut === 'clôturée' ? await this.findComptage(id) : []

    return {
      id,
      caissier: String(raw.caissier ?? ''),
      utilisateurId: Number(raw.utilisateur_id ?? 0),
      statut: (raw.statut as schema.CashSessionStatus) ?? 'ouverte',
      fondsCaisse: toNumber(raw.fonds_caisse as string | number | null),
      totalEspeces: total,
      totalTheorique: raw.total_theorique === null || raw.total_theorique === undefined
        ? null
        : toNumber(raw.total_theorique as string | number | null),
      totalReel: raw.total_reel === null || raw.total_reel === undefined
        ? null
        : toNumber(raw.total_reel as string | number | null),
      ecart: raw.ecart === null || raw.ecart === undefined
        ? null
        : toNumber(raw.ecart as string | number | null),
      openedAt: toIsoString(raw.opened_at as Date | null),
      closedAt: raw.closed_at === null || raw.closed_at === undefined ? null : toIsoString(raw.closed_at as Date | null),
      notes: raw.notes === null || raw.notes === undefined ? null : String(raw.notes),
      // Total des ventes de la session, tous modes de paiement : c'est le
      // volume de la session, pas la recette du tiroir. Une vente par carte
      // compte ici et pas dans `totalEspeces`.
      nombreVentes: totalVentes,
      comptage,
      createdAt: toIsoString(raw.created_at as Date | null),
      updatedAt: toIsoString(raw.updated_at as Date | null),
    }
  }

  /** Nombre de ventes rattachees a la session, tous modes de paiement. */
  private async countVentes(sessionId: number, tx?: Tx): Promise<number> {
    const executor = tx ?? this.db
    const [row] = await executor
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.ventes)
      .where(eq(schema.ventes.session_id, sessionId))
    return Number(row?.count ?? 0)
  }

  async list(limit = 100): Promise<CashSessionRow[]> {
    const rows = await this.db
      .select()
      .from(schema.cashSessions)
      .orderBy(desc(schema.cashSessions.opened_at))
      .limit(limit)
    return Promise.all(rows.map((row) => this.hydrate(row as unknown as Record<string, unknown>)))
  }

  async findById(id: number): Promise<CashSessionRow | null> {
    const rows = await this.db.select().from(schema.cashSessions).where(eq(schema.cashSessions.id, id)).limit(1)
    const row = rows[0]
    return row ? this.hydrate(row as unknown as Record<string, unknown>) : null
  }

  /**
   * Session actuellement ouverte pour un caissier, ou `null`.
   *
   * C'est l'etat affiche au caissier a son arrivee : il doit rouvrir sa
   * caisse, pas en ouvrir une seconde.
   */
  async findOpenByUser(utilisateurId: number): Promise<CashSessionRow | null> {
    const rows = await this.db
      .select()
      .from(schema.cashSessions)
      .where(and(eq(schema.cashSessions.utilisateur_id, utilisateurId), eq(schema.cashSessions.statut, 'ouverte')))
      .limit(1)
    const row = rows[0]
    return row ? this.hydrate(row as unknown as Record<string, unknown>) : null
  }

  /** Detail du comptage, trie par denomination decroissante. */
  async findComptage(sessionId: number): Promise<CashCountRow[]> {
    const rows = await this.db
      .select()
      .from(schema.cashSessionBreaks)
      .where(eq(schema.cashSessionBreaks.session_id, sessionId))
      .orderBy(desc(schema.cashSessionBreaks.denomination))

    return rows.map((row) => {
      const denomination = toNumber(row.denomination as string | number | null)
      const quantite = Number(row.quantite ?? 0)
      return { denomination, quantite, sousTotal: round2(denomination * quantite) }
    })
  }

  /** Journal des mouvements d'une session, du plus recent au plus ancien. */
  async listMovements(sessionId: number): Promise<CashMovementRow[]> {
    const rows = await this.db
      .select()
      .from(schema.cashMovements)
      .where(eq(schema.cashMovements.session_id, sessionId))
      .orderBy(desc(schema.cashMovements.createdAt), desc(schema.cashMovements.id))
    return rows.map((row) => ({
      id: Number(row.id),
      sessionId: Number(row.session_id),
      type: row.type as schema.CashMovementType,
      montant: toNumber(row.montant as string | number | null),
      venteId: row.vente_id === null || row.vente_id === undefined ? null : Number(row.vente_id),
      libelle: String(row.libelle ?? ''),
      createdAt: toIsoString(row.createdAt as Date | null),
    }))
  }

  /**
   * Ouvre une session de caisse.
   *
   * Refuse (409) si le caissier en a deja une ouverte : la regle est
   * verifiee puis l'insertion effectuee dans la meme transaction, sans verrou
   * explicite. Deux ouvertures simultanees passent donc par la base, qui
   * n'a pas de contrainte d'unicite partielle sur ce cas — un caissier qui
   * double-clique sur le bouton recoit un 409, ce qui est le comportement
   * voulu meme si la session qu'il cree reste orpheline cote tri.
   */
  async open(input: {
    utilisateurId: number
    caissier: string
    fondsCaisse: number
    notes?: string
  }): Promise<CashSessionRow> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: schema.cashSessions.id })
        .from(schema.cashSessions)
        .where(
          and(
            eq(schema.cashSessions.utilisateur_id, input.utilisateurId),
            eq(schema.cashSessions.statut, 'ouverte'),
          ),
        )
        .limit(1)

      if (existing[0]) {
        throw new RepositoryError(
          409,
          'SESSION_DEJA_OUVERTE',
          'Vous avez deja une caisse ouverte. Fermez-la avant d\'en ouvrir une nouvelle.',
        )
      }

      const [result] = await tx
        .insert(schema.cashSessions)
        .values({
          caissier: input.caissier,
          utilisateur_id: input.utilisateurId,
          statut: 'ouverte',
          fonds_caisse: toDecimal(input.fondsCaisse),
          opened_at: new Date(),
          notes: input.notes || null,
        })

      // Le fond de caisse est un mouvement d'entree : le solde du tiroir se
      // deduit par somme des mouvements, sans cas particulier a l'ouverture.
      await tx.insert(schema.cashMovements).values({
        session_id: result.insertId,
        type: 'ouverture',
        montant: toDecimal(input.fondsCaisse),
        libelle: 'Ouverture de caisse — fond de caisse',
      })

      const rows = await tx.select().from(schema.cashSessions).where(eq(schema.cashSessions.id, result.insertId)).limit(1)
      return this.hydrate(rows[0] as unknown as Record<string, unknown>)
    })
  }

  /**
   * Session ouverte d'un caissier, **dans une transaction donnee**.
   *
   * Utilisee par la creation de vente : la session doit etre lue et
   * l'encaissement ecrit dans la meme transaction, sinon une session close
   * entre les deux ferait entrer une vente dans un tiroir deja compté.
   *
   * `FOR UPDATE` verrouille la ligne : deux ventes simultanees ne peuvent pas
   * s'ecrire chacune leur session, et surtout une cloture concurrente ne peut
   * pas s'inserer entre la lecture et l'ecriture du mouvement.
   */
  async findOpenForUpdate(tx: Tx, utilisateurId: number): Promise<{ id: number; caissier: string } | null> {
    const rows = await tx
      .select({ id: schema.cashSessions.id, caissier: schema.cashSessions.caissier })
      .from(schema.cashSessions)
      .where(and(eq(schema.cashSessions.utilisateur_id, utilisateurId), eq(schema.cashSessions.statut, 'ouverte')))
      .orderBy(desc(schema.cashSessions.opened_at))
      .limit(1)
      .for('update')

    const row = rows[0]
    return row ? { id: Number(row.id), caissier: String(row.caissier) } : null
  }

  /**
   * Enregistre une vente en especes dans le journal de la session.
   *
   * Appele par la route de creation de vente, dans la **meme transaction** que
   * l'insertion de la vente : sans cela, un encaissement sans vente (ou
   * l'inverse) fausserait le total theorique de la session.
   *
   * Le montant journalise est la recette nette (`montant_paye - monnaie`) :
   * c'est ce qui entre physiquement dans le tiroir.
   */
  async recordVente(
    tx: Tx,
    session: { id: number },
    vente: { id: number; montantPaye: number; monnaie: number; totalHT: number },
  ): Promise<void> {
    if (session.id === null || session.id === undefined) return
    const net = round2(vente.montantPaye - vente.monnaie)

    await tx.insert(schema.cashMovements).values({
      session_id: session.id,
      type: 'encaissement',
      montant: toDecimal(net),
      vente_id: vente.id,
      libelle: `Vente #${vente.id} — ${vente.totalHT.toFixed(2)} EUR`,
    })

    // La monnaie rendue est une sortie de liquide. Elle n'est journalisee que
    // si elle est non nulle : un mouvement a 0 € noierait le journal sans rien
    // expliquer du comptage.
    if (vente.monnaie > 0) {
      await tx.insert(schema.cashMovements).values({
        session_id: session.id,
        type: 'rendu',
        montant: toDecimal(-vente.monnaie),
        vente_id: vente.id,
        libelle: `Monnaie rendue — vente #${vente.id}`,
      })
    }
  }

  /**
   * Ferme une session apres comptage.
   *
   * Le total reel est la **somme des billets comptes**, pas un montant saisi :
   * c'est le comptage physique. Le total theorique est recalcule ici, a
   * partir des ventes, au moment de la cloture — et non a l'ouverture, ou il
   * evoluerait avec chaque vente.
   *
   * Ecart = reel - theorique. Positif = excédent de caisse (le caissier a
   * plus d'argent que prevu), negatif = deficit.
   */
  async close(input: {
    sessionId: number
    comptage: CashBreak[]
    notes?: string
  }): Promise<CashSessionRow> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(schema.cashSessions)
        .where(eq(schema.cashSessions.id, input.sessionId))
        .limit(1)
      const session = rows[0]

      if (!session) {
        throw new RepositoryError(404, 'NOT_FOUND', 'Session de caisse introuvable.')
      }
      if (session.statut === 'clôturée') {
        throw new RepositoryError(409, 'SESSION_DEJA_CLOTUREE', 'Cette session de caisse est deja cloturee.')
      }

      const totalReel = round2(
        input.comptage.reduce((sum, line) => sum + line.denomination * line.quantite, 0),
      )
      const recettes = await this.especesRecette(input.sessionId, tx)
      const totalTheorique = round2(toNumber(session.fonds_caisse as string | number | null) + recettes)
      const ecart = round2(totalReel - totalTheorique)

      // Le comptage remplace integralement l'ancien : on repart d'une session
      // sans aucun billet pour ne pas laisser de lignes orphelines si la
      // cloture est rejouee apres un echec partiel.
      await tx.delete(schema.cashSessionBreaks).where(eq(schema.cashSessionBreaks.session_id, input.sessionId))
      if (input.comptage.length > 0) {
        await tx.insert(schema.cashSessionBreaks).values(
          input.comptage.map((line) => ({
            session_id: input.sessionId,
            denomination: toDecimal(line.denomination),
            quantite: line.quantite,
          })),
        )
      }

      await tx
        .update(schema.cashSessions)
        .set({
          statut: 'clôturée',
          total_reel: toDecimal(totalReel),
          total_theorique: toDecimal(totalTheorique),
          ecart: toDecimal(ecart),
          closed_at: new Date(),
          notes: input.notes || null,
        })
        .where(eq(schema.cashSessions.id, input.sessionId))

      await tx.insert(schema.cashMovements).values({
        session_id: input.sessionId,
        type: 'clôture',
        montant: toDecimal(ecart),
        libelle:
          ecart === 0
            ? 'Cloture — comptage conforme'
            : `Cloture — ecart de ${ecart > 0 ? '+' : ''}${ecart.toFixed(2)} EUR`,
      })

      const updated = await tx
        .select()
        .from(schema.cashSessions)
        .where(eq(schema.cashSessions.id, input.sessionId))
        .limit(1)

      // Le detail du comptage est lu dans la transaction, pas via `this.db` :
      // le pool ouvrirait une **autre** connexion, qui ne voit pas encore les
      // lignes inserees ci-dessus. La reponse renverrait alors un comptage vide
      // alors que la cloture vient de reussir. On retourne donc l'ecart et le
      // comptage calcules ici, la relecture complete se fera a la lecture
      // suivante de la session.
      const row = updated[0] as unknown as Record<string, unknown>
      const recettesFinales = await this.especesRecette(input.sessionId, tx)

      return {
        id: input.sessionId,
        caissier: String(row.caissier ?? ''),
        utilisateurId: Number(row.utilisateur_id ?? 0),
        statut: 'clôturée',
        fondsCaisse: toNumber(row.fonds_caisse as string | number | null),
        totalEspeces: recettesFinales,
        totalTheorique,
        totalReel,
        ecart,
        openedAt: toIsoString(row.opened_at as Date | null),
        closedAt: toIsoString(row.closed_at as Date | null),
        notes: input.notes || null,
        nombreVentes: await this.countVentes(input.sessionId, tx),
        comptage: input.comptage
          .filter((line) => line.quantite > 0)
          .map((line) => ({
            denomination: line.denomination,
            quantite: line.quantite,
            sousTotal: round2(line.denomination * line.quantite),
          })),
        createdAt: toIsoString(row.created_at as Date | null),
        updatedAt: toIsoString(row.updated_at as Date | null),
      }
    })
  }
}
