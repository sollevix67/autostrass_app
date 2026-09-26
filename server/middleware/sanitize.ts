/**
 * Durcissement des entrees de l'API.
 *
 * ## Ce qui est deja protege, et ne doit pas l'etre deux fois
 *
 * - **Injection SQL** : aucune requete n'est concatenee. Tout passe par des
 *   requetes parametrées (`?`) ou par Drizzle, qui lie les valeurs. Verifie
 *   sur l'ensemble de `server/` : la seule interpolation dans une chaine SQL
 *   est la constante `LIMIT 1`.
 * - **XSS** : React echappe le texte par defaut et l'application n'emplace
 *   ni `innerHTML` ni `dangerouslySetInnerHTML`. Un `<script>` stocke en base
 *   s'affiche litteralement, il ne s'execute pas.
 * - **Mass-assignment** : les schemas Zod sont des `z.object` simples, qui
 *   suppriment les cles inconnues. Un corps `{"nom":"x","role":"admin"}`
 *   envoye a `PUT /api/clients/1` ne transmet que `nom`.
 *
 * Ce module traite ce qui reste et qui n'est pas couvert par ces garanties.
 *
 * ## Ce que ce module traite
 *
 * 1. **Biais Unicode (deguise)** : un nom peut contenir U+202E (RIGHT-TO-LEFT
 *    OVERRIDE), qui inverse l'affichage du texte qui le suit, ou des
 *    caracteres de largeur nulle qui collent deux valeurs. Un attaquant peut
 *    ainsi faire afficher "admin" a l'utilisateur pour "nimda" en base. Ces
 *    caracteres sont supprimes, pas rejetés : ils ne portent aucune
 *    information pour l'utilisateur.
 * 2. **Caracteres de controle** : `C0`, `DEL` et `C1` sont supprimes. Ils
 *    permettent d'injecter des sauts de ligne dans un export, un terminal, ou
 *    de falsifier un journal.
 * 3. **Tentatives de markup** : `<script>`, `onerror=`, `javascript:` sont
 *    *detectes* et rejetés avec un message explicite. React les neutraliserait
 *    deja, mais un rejet rend la tentative visible (compteur + journal) au
 *    lieu d'etre stockee silencieusement.
 * 4. **Longueur** : verifiee apres normalisation, sinon une suite de 10 000
 *    caracteres de largeur nulle passerait sous une limite de 255.
 *
 * ## Regle de conception
 *
 * La normalisation ne doit jamais *creer* dePermission geometrique
 * inattendue. C'est pourquoi la normalisation Unicode est appliquee AVANT les
 * controles de format, et non apres.
 */

/**
 * Caracteres de controle C0, DEL et C1.
 *
 * L'avertissement `no-control-regex` d'oxlint est desactive ici a dessein :
 * la regex DOIT contenir ces caracteres, puisque supprimer les caracteres de
 * controle est precisement l'objet de ce module. La contourner en filtrant
 * caractère par caractère serait plus lent et moins lisible.
 */
// oxlint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g

/**
 * Caracteres invisibles et de controle bidirectionnel.
 *
 * - U+00AD  SOFT HYPHEN : rendu conditionnel selon le contexte
 * - U+200B..U+200F, U+2060..U+2064 : largeur nulle / directionnels
 * - U+202A..U+202E, U+2066..U+2069 : isolants et basculements bidirectionnels
 * - U+FEFF : BOM, invisible en debut de chaine
 */
const INVISIBLE_CHARS = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g

/** Marqueurs d'injection de markup. Aucun n'est necessaire dans un depot. */
const INJECTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /<\s*\/?\s*[a-z][^>]*>/i, label: 'balise HTML' },
  { pattern: /<\s*script|<\s*\/\s*script/i, label: 'balise script' },
  { pattern: /\bon[a-z]+\s*=/i, label: 'gestionnaire d evenement' },
  { pattern: /javascript\s*:/i, label: 'pseudo-scheme javascript' },
  { pattern: /vbscript\s*:/i, label: 'pseudo-scheme vbscript' },
  { pattern: /data\s*:\s*text\/html/i, label: 'data URL HTML' },
  { pattern: /expression\s*\(/i, label: 'expression CSS' },
  { pattern: /&#x?[0-9a-f]{2,8};/i, label: 'entite HTML numerique' },
  { pattern: /\\x[0-9a-f]{2}/i, label: 'echappement hexadecimal' },
]

/** Tentatives d'injection SQL, detectees pour observation (non destructif). */
const SQL_INJECTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /(--|#)\s*$/m, label: 'commentaire SQL en fin de chaine' },
  { pattern: /;\s*(drop|delete|update|insert|alter|truncate|create|grant)\b/i, label: 'instruction SQL enchanee' },
  { pattern: /\b(union\s+select|information_schema|load_file|outfile|into\s+dumpfile)\b/i, label: 'extraction de donnees' },
  { pattern: /\b(sleep|benchmark|if)\s*\(/i, label: 'fonction conditionnelle ou temporelle' },
]

/** Reference de piece : jeu de caracteres strict, deja impose par les schemas. */
const SAFE_CODE = /^[A-Za-z0-9._/-]+$/

/**
 * Enumeration : lettres (accentuees incluses), chiffres, espace, apostrophe
 * et tiret. Couvre « validée », « expédiée », « ministère ».
 */
const SAFE_ENUM = /^[\p{L}\p{N}\s'’-]+$/u

export type InjectionKind = 'markup' | 'sql'

export type SanitizeReport = {
  /** Le champ a-t-il ete rejete ? */
  rejected: boolean
  kind?: InjectionKind
  /** Libelle du motif detecte, pour le journal. */
  label?: string
}

/**
 * Normalise une chaine : espaces de bord retires, forme canonique Unicode,
 * caracteres invisibles et de controle supprimes.
 *
 * La normalisation NFKC precede le nettoyage des caracteres de controle, pas
 * l'inverse : certains caracteres Unicode se replient en controlables (par
 * exemple U+2028 LINE SEPARATOR, qui se replie sur LF). Nettoyer d'abord
 * laisserait passer un caractere qui redevient invisible apres coup.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(INVISIBLE_CHARS, '')
    .replace(CONTROL_CHARS, '')
    .trim()
}

/** Cherche un marqueur d'injection de markup dans une chaine normalisee. */
function findMarkupInjection(value: string): string | null {
  for (const { pattern, label } of INJECTION_PATTERNS) {
    if (pattern.test(value)) return label
  }
  return null
}

/** Cherche un marqueur d'injection SQL dans une chaine normalisee. */
export function findSqlInjection(value: string): string | null {
  for (const { pattern, label } of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) return label
  }
  return null
}

/**
 * Normalise et rejette les chaines contenant du markup.
 *
 * L'erreur est lancee avec le second argument de Zod (`ctx`) : en Zod 4, une
 * exception levee dans un `transform` se propage telle quelle et court-circuite
 * le schema, ce qui produisait un 500 « erreur interne » au lieu d'un 422.
 * Avec `ctx`, Zod convertit l'exception en `issue` et poursuit la validation
 * des autres champs — un formulaire signale alors toutes ses erreurs d'un
 * coup, au lieu d'en afficher une a la fois.
 *
 * @param value   chaine brute
 * @param max     longueur maximale APRES normalisation
 * @param field   nom du champ, pour le message
 */
export function sanitizeText(value: string, max: number, field: string): string {
  const normalized = normalizeText(value)
  const found = findMarkupInjection(normalized)
  if (found !== null) {
    reportInjection(field, 'markup', found)
    throw new Error(`${field} contient une sequence interdite (${found}).`)
  }
  if (normalized.length > max) {
    throw new Error(`${field} ne doit pas depasser ${max} caracteres.`)
  }
  return normalized
}

/**
 * Variante stricte pour les identifiants techniques (reference de piece,
 * immatriculation) : le jeu de caracteres est restreint, ce qui ecarte toute
 * notion de markup.
 */
export function sanitizeCode(value: string, max: number, field: string): string {
  const normalized = normalizeText(value)
  if (!SAFE_CODE.test(normalized)) {
    throw new Error(`${field} contient des caracteres interdits.`)
  }
  if (normalized.length > max) {
    throw new Error(`${field} ne doit pas depasser ${max} caracteres.`)
  }
  return normalized
}

/** Variante stricte pour les valeurs d'enumeration. */
export function sanitizeEnum(value: string, max: number, field: string): string {
  const normalized = normalizeText(value)
  if (!SAFE_ENUM.test(normalized)) {
    throw new Error(`${field} contient des caracteres interdits.`)
  }
  if (normalized.length > max) {
    throw new Error(`${field} ne doit pas depasser ${max} caracteres.`)
  }
  return normalized
}

// ---------------------------------------------------------------------------
// Observation des tentatives
//
// Compteur en memoire, uniquement pour le journal : il ne doit jamais
// bloquer une requete valide, sinon il deviendrait lui-meme un vecteur de
// deni de service (un attaquant sature le compteur pour verrouiller le depot).
// Pour une protection reelle, il faut un stockage partage et une Fenetre
// glissante — voir la semaine 4.
// ---------------------------------------------------------------------------

const INJECTION_COUNTS = new Map<string, number>()

/** Enregistre une tentative et journalise les premieres occurrences. */
export function reportInjection(field: string, kind: InjectionKind, label: string): void {
  const key = `${kind}:${field}:${label}`
  const count = (INJECTION_COUNTS.get(key) ?? 0) + 1
  INJECTION_COUNTS.set(key, count)
  if (count <= 5) {
    console.warn(`[securite] tentative ${kind} sur « ${field} » : ${label} (${count}e occurrence)`)
  }
}

/** Total des tentatives observees depuis le demarrage du processus. */
export function injectionAttemptCount(): number {
  let total = 0
  for (const value of INJECTION_COUNTS.values()) total += value
  return total
}

/** Remet les compteurs a zero. Reserve aux tests. */
export function resetInjectionAttempts(): void {
  INJECTION_COUNTS.clear()
}
