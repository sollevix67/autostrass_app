import { useId, useMemo, useState, type ReactNode } from 'react'

/** Cle de trie : chemin d'acces a la valeur dans la ligne. */
type SortAccessor<T> = (row: T) => string | number

export type ColumnDef<T> = {
  /** Cle de la colonne : sert de cle React et d'identifiant de tri. */
  key: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: SortAccessor<T>
  align?: 'left' | 'right' | 'center'
  /** Largeur CSS (ex: '120px'). */
  width?: string
  /** Rend la colonne triable (necessite `sortValue`). */
  sortable?: boolean
}

type DataTableProps<T> = {
  columns: ColumnDef<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Tri initial. */
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  emptyMessage?: string
  /** Etat de chargement : remplace le corps du tableau. */
  loading?: boolean
  loadingMessage?: string
  /** Ligne mise en avant (edition en cours). */
  isRowActive?: (row: T) => boolean
  caption?: string
}

const compare = (a: string | number, b: string | number): number => {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' })
}

/**
 * Tableau generique triable.
 *
 * - tri local (aucun rechargement reseau) avec `aria-sort` expose
 * - etat vide et etat de chargement distincts
 * - ligne active surlignee (edition en cours)
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  defaultSort,
  emptyMessage = 'Aucune donnee.',
  loading = false,
  loadingMessage = 'Chargement...',
  isRowActive,
  caption,
}: DataTableProps<T>) {
  const captionId = useId()
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(defaultSort ?? null)

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return rows

    const accessor = column.sortValue
    const factor = sort.direction === 'asc' ? 1 : -1
    // Copie defensive : ne pas muter le tableau fourni par le hook.
    return [...rows].sort((a, b) => compare(accessor(a), accessor(b)) * factor)
  }, [rows, sort, columns])

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null // troisieme clic : retour au tri naturel du hook
    })
  }

  const ariaSort = (key: string): 'ascending' | 'descending' | 'none' => {
    if (sort?.key !== key) return 'none'
    return sort.direction === 'asc' ? 'ascending' : 'descending'
  }

  return (
    <div className="table-wrap">
      <table aria-busy={loading} aria-labelledby={caption ? captionId : undefined}>
        {caption && <caption id={captionId} className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => {
              const sortable = Boolean(column.sortable && column.sortValue)
              const active = sort?.key === column.key
              return (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  aria-sort={sortable ? ariaSort(column.key) : undefined}
                  className={[
                    sortable ? 'sortable' : '',
                    active ? (sort?.direction === 'asc' ? 'sort-asc' : 'sort-desc') : '',
                    column.align ? `align-${column.align}` : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={sortable ? () => toggleSort(column.key) : undefined}
                  scope="col"
                >
                  {column.header}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length}>
                <p className="table-state">{loadingMessage}</p>
              </td>
            </tr>
          ) : sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <p className="table-state">{emptyMessage}</p>
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => (
              <tr key={rowKey(row)} className={isRowActive?.(row) ? 'row-editing' : undefined}>
                {columns.map((column) => (
                  <td key={column.key} className={column.align ? `align-${column.align}` : undefined}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
