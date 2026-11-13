import type { ScreenCategory } from '@/lib/types'

// Ícones pixel art desenhados como grade: cada caractere é um pixel ('.' = transparente).
const PALETTE: Record<string, string> = {
  K: '#1a1226', // contorno
  P: '#ff3e7f', // borracha
  Y: '#f2c94c', // corpo do lápis
  W: '#f5d7a1', // madeira apontada
  L: '#d8d2e3', // metal claro
  G: '#8c8ca0', // metal escuro
  M: '#3fbf5f', // tela mobile (mesma cor do marcador)
  B: '#f2c94c', // tela tablet
  D: '#4a8cff', // tela desktop
}

export const PENCIL = [
  '............',
  '..........KK',
  '........KPPK',
  '.......KGGK.',
  '......KYYK..',
  '.....KYYK...',
  '....KYYK....',
  '...KYYK.....',
  '..KWYK......',
  '.KWWK.......',
  'KKK.........',
  '............',
]

export const TRASH = [
  '....KKKK....',
  '.KKKKKKKKKK.',
  'KLLLLLLLLLLK',
  'KKKKKKKKKKKK',
  '.KLLGLLGLLK.',
  '.KLLGLLGLLK.',
  '.KLLGLLGLLK.',
  '.KLLGLLGLLK.',
  '.KLLGLLGLLK.',
  '.KLLLLLLLLK.',
  '..KKKKKKKK..',
  '............',
]

const PHONE = [
  '...KKKKKK...',
  '...KMMMMK...',
  '...KMMMMK...',
  '...KMMMMK...',
  '...KMMMMK...',
  '...KMMMMK...',
  '...KMMMMK...',
  '...KMMMMK...',
  '...KKKKKK...',
  '...KKLLKK...',
  '...KKKKKK...',
  '............',
]

const TABLET = [
  '............',
  '.KKKKKKKKKK.',
  '.KBBBBBBBBK.',
  '.KBBBBBBBBK.',
  '.KBBBBBBBBK.',
  '.KBBBBBBBBK.',
  '.KBBBBBBBBK.',
  '.KBBBBBBBBK.',
  '.KKKKLLKKKK.',
  '.KKKKKKKKKK.',
  '............',
  '............',
]

const MONITOR = [
  'KKKKKKKKKKKK',
  'KDDDDDDDDDDK',
  'KDDDDDDDDDDK',
  'KDDDDDDDDDDK',
  'KDDDDDDDDDDK',
  'KDDDDDDDDDDK',
  'KKKKKKKKKKKK',
  '.....KK.....',
  '.....KK.....',
  '...KKKKKK...',
  '............',
  '............',
]

export const DOWNLOAD = [
  '.....KK.....',
  '.....PP.....',
  '.....PP.....',
  '.....PP.....',
  '..KK.PP.KK..',
  '...KPPPPK...',
  '....KPPK....',
  '.....KK.....',
  '............',
  '.K........K.',
  '.KKKKKKKKKK.',
  '............',
]

export const CATEGORY_PIXEL_ICON: Record<ScreenCategory, readonly string[]> = { mobile: PHONE, tablet: TABLET, desktop: MONITOR }

const SVG_NS = 'http://www.w3.org/2000/svg'

/** SVG nítido (crispEdges) da grade em 1× (1 pixel da arte = 1px), juntando pixels vizinhos da mesma cor. */
export function pixelIcon(rows: readonly string[], scale = 1): SVGSVGElement {
  const width = rows[0]?.length ?? 0
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${rows.length}`)
  svg.setAttribute('width', String(width * scale))
  svg.setAttribute('height', String(rows.length * scale))
  svg.setAttribute('shape-rendering', 'crispEdges')
  svg.setAttribute('aria-hidden', 'true')
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const color = PALETTE[row[x] ?? '.']
      let end = x + 1
      while (end < row.length && row[end] === row[x]) end++
      if (color) {
        const rect = document.createElementNS(SVG_NS, 'rect')
        for (const [k, v] of Object.entries({ x, y, width: end - x, height: 1, fill: color })) rect.setAttribute(k, String(v))
        svg.append(rect)
      }
      x = end
    }
  })
  return svg
}
