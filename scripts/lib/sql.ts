/**
 * Decoupage d'un script SQL en instructions.
 *
 * Extraction de `seed.ts` et `apply-migration.ts` : les deux rejouent un
 * fichier SQL instruction par instruction, et ils avaient chacun leur propre
 * version — avec un bug dans l'une des deux.
 *
 * L'ordre des deux operations est le point delicat. Retirer les commentaires
 * **puis** decouper sur `;` est obligatoire, et l'inverse casse des que la
 * prose contient un point-virgule : c'est ce que fait la ligne
 * « (`parent_id` NULL) ; chaque etagere se » de `seed_v3.sql`. Le `split(';')`
 * intervenait alors au milieu de la phrase, et l'instruction suivante
 * commençait par un bout de commentaire. Symptome : un echec « a la ligne 14 »
 * dont l'etiquette etait un fragment de phrase.
 *
 * Le second defaut de ces copies etait un marqueur de coupure propre a
 * drizzle-kit : les deux versions n'acceptaient pas le meme separateur, et il
 * fallait donc deux variantes du meme appel. `separator` rend l'intention
 * explicite.
 */

/**
 * @param source    contenu du fichier SQL
 * @param separator coupure d'instruction : `;` pour un script, le marqueur de
 *                  drizzle-kit pour un fichier de migration
 */
export function splitStatements(source: string, separator = ';'): string[] {
  return source
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(separator)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

/**
 * Variante pour les fichiers drizzle-kit : les instructions sont deja
 * separées par le marqueur `--> statement-breakpoint`.
 */
export function splitDrizzleKitStatements(source: string): string[] {
  return splitStatements(source, '--> statement-breakpoint')
}
