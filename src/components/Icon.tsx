/**
 * Jeu d'icones en SVG inline.
 *
 * Remplace les emojis utilises comme icones : un emoji se rend differemment
 * selon la police du systeme, se declenche en couleur sur Windows et n'est
 * pas annonce correctement par les lecteurs d'ecran. Le SVG herite de
 * `currentColor`, suit la taille du texte et reste invisible au lecteur
 * d'ecran quand il est decoratif (`aria-hidden`).
 */

export type IconName =
  | 'menu'
  | 'close'
  | 'search'
  | 'bell'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'star'
  | 'alert'
  | 'grid'
  | 'box'
  | 'layers'
  | 'download'
  | 'cart'
  | 'clipboard'
  | 'truck'
  | 'rotate-ccw'
  | 'users'
  | 'car'
  | 'settings'
  | 'more'
  | 'arrow-down'

/**
 * Traces au format 24x24 (viewBox) : `d` est le chemin ou le groupe de
 * sous-traces, `filled` indique un remplissage plein plutot qu'un contour.
 * Les coordonnees sont en unites du viewBox, pas en pixels CSS.
 */
const PATHS = {
  menu: { d: 'M4 7h16M4 12h16M4 17h16' },
  close: { d: 'M6 6l12 12M18 6L6 18' },
  search: { d: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4' },
  bell: { d: 'M12 3a5 5 0 0 0-5 5v3.5L5.5 15h13L17 11.5V8a5 5 0 0 0-5-5zM10 18a2 2 0 0 0 4 0' },
  plus: { d: 'M12 5v14M5 12h14' },
  edit: { d: 'M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20zM14.5 6.5l3 3' },
  trash: { d: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6' },
  check: { d: 'M5 12.5l4.5 4.5L19 7' },
  'chevron-down': { d: 'M6 9.5l6 6 6-6' },
  'chevron-right': { d: 'M9.5 6l6 6-6 6' },
  star: { d: 'M12 4l2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8z' },
  alert: { d: 'M12 4l9 16H3zM12 10v4M12 17.2v.1' },
  grid: { d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  box: { d: 'M3 7.5L12 3l9 4.5v9L12 21l-9-4.5zM3 7.5L12 12l9-4.5M12 12v9' },
  layers: { d: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5' },
  download: { d: 'M12 4v11M7.5 11l4.5 4.5 4.5-4.5M4 20h16' },
  cart: { d: 'M3 5h2.5l2.5 11h10l2.5-8H6.5M9.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
  clipboard: { d: 'M8 4H6.5A1.5 1.5 0 0 0 5 5.5v14A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 17.5 4H16M9 2.5h6v3H9zM9 11h6M9 15h4' },
  truck: { d: 'M3 6h10v10H3zM13 10h4l4 3v3h-8M7 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
  'rotate-ccw': { d: 'M4 12a8 8 0 1 1 2.5 5.8M4 18v-5h5' },
  users: { d: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M17 11a3 3 0 1 0 0-6M18 14.5a5.5 5.5 0 0 1 3.5 5.5' },
  car: { d: 'M4 16v-4l2-5h12l2 5v4M4 16h16M4 16v2h3v-2M17 16v2h3v-2M7 12h10' },
  settings: { d: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2' },
  more: { d: 'M6 12h.01M12 12h.01M18 12h.01' },
  'arrow-down': { d: 'M12 5v14M6 13l6 6 6-6' },
} as const satisfies Record<IconName, { d: string }>

/** Tailles usuelles : le SVG reste dans la grille de flux du parent. */
const SIZES = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const

export type IconSize = keyof typeof SIZES

export function Icon({ name, size = 'md', title }: { name: IconName; size?: IconSize; title?: string }) {
  // Sans `title`, l'icone est decorative : elle n'est pas exposee a l'AT.
  // Avec `title`, elle devient une image accessible et nommee.
  const decorative = title === undefined

  return (
    <svg
      className="icon"
      width={SIZES[size]}
      height={SIZES[size]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      {title !== undefined && <title>{title}</title>}
      <path d={PATHS[name].d} />
    </svg>
  )
}
