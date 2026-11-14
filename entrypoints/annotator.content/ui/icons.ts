import type { ScreenCategory } from '@/lib/types'

// Ícones pixel art desenhados como grade: cada caractere é um pixel ('.' = transparente).
const PALETTE: Record<string, string> = {
  K: 'currentColor', // contorno: cor do texto do botão, acompanha o tema (TEMA-05)
  P: '#ff3e7f', // rosa da marca
  L: '#d8d2e3', // cinza claro
  G: '#8c8ca0', // cinza escuro
  M: '#3fbf5f', // tela mobile (mesma cor do marcador)
  B: '#f2c94c', // tela tablet
  D: '#4a8cff', // tela desktop
}

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

// Botão de som (SOM-01): alto-falante claro e ondas cinza aparecem nos temas claro e escuro.
export const SPEAKER_ON = [
  '............',
  '.....K......',
  '....KK...G..',
  '.KKKLK.G..G.',
  '.KLLLK..G.G.',
  '.KLLLK..G..G',
  '.KLLLK..G..G',
  '.KLLLK..G.G.',
  '.KKKLK.G..G.',
  '....KK...G..',
  '.....K......',
  '............',
]

export const SPEAKER_OFF = [
  '............',
  '.....K......',
  '....KK......',
  '.KKKLK......',
  '.KLLLK.P...P',
  '.KLLLK..P.P.',
  '.KLLLK...P..',
  '.KLLLK..P.P.',
  '.KKKLK.P...P',
  '....KK......',
  '.....K......',
  '............',
]

// Recolher/expandir o painel (seta grossa, mesmo tamanho do ícone de exportar).
export const CHEVRON_DOWN = [
  '............',
  '............',
  '............',
  '.KK......KK.',
  '.KKK....KKK.',
  '..KKK..KKK..',
  '...KKKKKK...',
  '....KKKK....',
  '.....KK.....',
  '............',
  '............',
  '............',
]

export const CHEVRON_UP = [...CHEVRON_DOWN].reverse()

// Menu de ações do painel (três pontos na vertical).
export const MENU = [
  '............',
  '.....KK.....',
  '.....KK.....',
  '............',
  '............',
  '.....KK.....',
  '.....KK.....',
  '............',
  '............',
  '.....KK.....',
  '.....KK.....',
  '............',
]

export const CATEGORY_PIXEL_ICON: Record<ScreenCategory, readonly string[]> = { mobile: PHONE, tablet: TABLET, desktop: MONITOR }

const SVG_NS = 'http://www.w3.org/2000/svg'

/** SVG nítido (crispEdges) da grade em 1× (1 pixel da arte = 1px), juntando pixels vizinhos da mesma cor. */
export function pixelIcon(rows: readonly string[], scale = 1, palette: Record<string, string> = PALETTE): SVGSVGElement {
  const width = rows[0]?.length ?? 0
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${rows.length}`)
  svg.setAttribute('width', String(width * scale))
  svg.setAttribute('height', String(rows.length * scale))
  svg.setAttribute('shape-rendering', 'crispEdges')
  svg.setAttribute('aria-hidden', 'true')
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const color = palette[row[x] ?? '.']
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

/** Elemento SVG com atributos (o `el()` é só para HTML). */
function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>, ...children: SVGElement[]): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  node.append(...children)
  return node
}

/**
 * Check em círculo, o mesmo do phren (`CheckCircle2Icon`/`circle-check` do lucide, licença ISC,
 * https://lucide.dev). Inline para não trazer a dependência para a extensão.
 */
export const circleCheck = () =>
  svgEl(
    'svg',
    { viewBox: '0 0 24 24', width: '14', height: '14', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    svgEl('circle', { cx: '12', cy: '12', r: '10' }),
    svgEl('path', { d: 'm9 12 2 2 4-4' }),
  )
