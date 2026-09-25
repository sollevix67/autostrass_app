import { useEffect, useRef, useState } from 'react'

type ErrorItem = { field: string; label: string; message: string }

/**
 * Formulaire accepte par le resume d'erreurs.
 *
 * On elargit volontairement le type a `Record<string, unknown>` : le `FieldErrors`
 * reel de React Hook Form contient une cle `root` et des `types` aux signatures
 * tres specifiques qu'un `Partial<Record<string, FieldError>>` refuserait.
 * `readMessage` fait le tri et ne lit que ce qui l'interesse.
 */
export type ErrorRecord = Record<string, unknown>

type ErrorSummaryProps = {
  errors: ErrorRecord
  labels: Partial<Record<string, string>>
  /** Ordre d'affichage : les champs listes ici remontent en tete de resume. */
  order?: string[]
}

/**
 * Extrait un message lisible d'une erreur RHF, y compris pour les erreurs
 * imbriquees (sous-objets, tableaux, `types`).
 */
function readMessage(error: unknown, depth = 0): string | null {
  if (depth > 3 || !error || typeof error !== 'object') return null

  const record = error as Record<string, unknown>
  if (typeof record.message === 'string') return record.message

  // Erreur imbriquee : on prend le premier message trouve, en ignorant
  // `types` et `root` qui sont des metadonnees, pas des messages.
  for (const key of Object.keys(record)) {
    if (key === 'types' || key === 'root') continue
    const nested = readMessage(record[key], depth + 1)
    if (nested) return nested
  }
  return null
}

function buildItems(
  errors: ErrorRecord,
  labels: Partial<Record<string, string>>,
  order: string[] | undefined,
): ErrorItem[] {
  const entries = Object.entries(errors)
    .filter(([key]) => key !== 'root')
    .map(([key, error]) => ({ field: key, message: readMessage(error) }))
    .filter((entry): entry is { field: string; message: string } => entry.message !== null)
    .map((entry) => ({ ...entry, label: labels[entry.field] ?? entry.field }))

  if (!order) return entries

  return [...entries].sort((a, b) => {
    const ia = order.indexOf(a.field)
    const ib = order.indexOf(b.field)
    return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib)
  })
}

/**
 * Resume d'erreurs de validation, focusable et lie aux champs.
 *
 * Pattern applique (guideline "Focusable Error Summary", severite High) :
 * - `role="alert"` + `tabIndex={-1}` + `aria-labelledby`
 * - chaque message est un lien ancre vers le champ fautif (`#nomDuChamp`)
 * - le focus est deplace sur le resume a la premiere apparition d'erreurs,
 *   jamais a chaque frappe ni a chaque blur
 * - les erreurs inline restent affichees : le resume les complete, il ne les
 *   remplace pas
 */
export function ErrorSummary({ errors, labels, order }: ErrorSummaryProps) {
  const items = buildItems(errors, labels, order)
  const hasErrors = items.length > 0

  // Signature des erreurs courantes : detecte une NOUVELLE soumission invalide
  // sans stocker d'etat. On ne refocus que si la liste change.
  const signature = items.map((item) => item.field).join('|')
  const lastSignature = useRef<string | null>(null)

  // Cle de rendu : incrementee uniquement quand le resume doit reprendre la main.
  // `autoFocus` est plus fiable qu'un effet `focus()` ici, car React applique
  // le focus apres coup sur les elements cliquables du formulaire.
  const [focusCycle, setFocusCycle] = useState(0)

  useEffect(() => {
    if (!hasErrors) {
      lastSignature.current = null
      return
    }
    if (lastSignature.current !== signature) {
      lastSignature.current = signature
      setFocusCycle((cycle) => cycle + 1)
    }
  }, [hasErrors, signature])

  if (!hasErrors) return null

  return (
    <div
      // eslint-disable-next-line jsx-a11y/no-autofocus -- focus programme requis par la guideline
      key={focusCycle}
      className="error-summary"
      role="alert"
      tabIndex={-1}
      aria-labelledby="error-summary-title"
      ref={(node) => {
        // `ref` callback : appele apres insertion, focus pose dans le meme cycle.
        if (node && focusCycle > 0) node.focus()
      }}
    >
      <h2 id="error-summary-title" className="error-summary-title">
        {items.length === 1
          ? 'Le formulaire contient 1 erreur a corriger'
          : `Le formulaire contient ${items.length} erreurs a corriger`}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.field}>
            <a
              href={`#${item.field}`}
              onClick={(event) => {
                event.preventDefault()
                const target = document.getElementById(item.field)
                target?.focus()
                target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }}
            >
              <strong>{item.label}</strong> : {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
