import { el } from './dom'
import { pixelIcon } from './icons'

export const MOODS = ['idle', 'feliz', 'susto', 'festa', 'dormindo'] as const
export type Mood = (typeof MOODS)[number]

/**
 * Cores do Mascote, iguais em todos os Temas (Revisão 2): o rosa da marca. K contorno, P corpo,
 * W brilho, G agulha, Y/B confete e gota, Z o "z" do sono (claro para aparecer no cabeçalho escuro).
 */
export const MASCOT_PALETTE: Record<string, string> = {
  K: '#1a1226', P: '#ff3e7f', W: '#ffffff', G: '#8c8ca0', Y: '#f2c94c', B: '#7fd0ff', Z: '#ffffff',
}

const NEEDLE = ['.......KG.......', '.......KG.......', '.......KG.......', '.......KG.......', '........K.......', '................']

/** Alfinete de cabeça estreita (10 px), sem boca nem bochecha: um quadro 16×16 por humor (MASC-06). */
export const MASCOT: Record<Mood, readonly string[]> = {
  idle: [
    '................',
    '................',
    '.....KKKKKK.....',
    '....KPPPPPPK....',
    '...KPWPPPPPPK...',
    '...KPPKPPKPPK...',
    '...KPPKPPKPPK...',
    '...KPPPPPPPPK...',
    '....KPPPPPPK....',
    '.....KKKKKK.....',
    ...NEEDLE,
  ],
  feliz: [
    '..........W.....',
    '................',
    '.....KKKKKK..W..',
    '....KPPPPPPK....',
    '...KPWPPPPPPK...',
    '...KPKKPPKKPK...',
    '...KPPPPPPPPK...',
    '...KPPPPPPPPK...',
    '....KPPPPPPK....',
    '.....KKKKKK.....',
    ...NEEDLE,
  ],
  susto: [
    '................',
    '.............B..',
    '.....KKKKKK.BB..',
    '....KPPPPPPK.B..',
    '...KPPKPPKPPK...',
    '...KPPKPPKPPK...',
    '...KPPKPPKPPK...',
    '...KPPPPPPPPK...',
    '....KPPPPPPK....',
    '.....KKKKKK.....',
    ...NEEDLE,
  ],
  festa: [
    '.Y..........B...',
    '...B.........Y..',
    '.....KKKKKK.....',
    '.Y..KPPPPPPK..B.',
    '...KPWPPPPPPK...',
    '...KPKKPPKKPK...',
    '...KPPPPPPPPK..Y',
    '...KPPPPPPPPK...',
    '....KPPPPPPK....',
    '.....KKKKKK.....',
    ...NEEDLE,
  ],
  dormindo: [
    '............ZZZZ',
    '..............Z.',
    '.....KKKKKK..Z..',
    '....KPPPPPPK.ZZZ',
    '...KPPPPPPPPK...',
    '...KPPPPPPPPK...',
    '...KPKKPPKKPK...',
    '...KPPPPPPPPK...',
    '....KPPPPPPK....',
    '.....KKKKKK.....',
    ...NEEDLE,
  ],
}

/**
 * Mascote do cabeçalho (MASC-01..06). `set(mood, ms)` com duração volta sozinho para `idle`.
 * A animação é só CSS (`[data-mood]`), desligada por `prefers-reduced-motion` (MASC-05).
 */
export function createMascot() {
  const node = el('span', { className: 'pxa-mascot', title: 'PxA' })
  node.setAttribute('role', 'img')
  const frames = Object.fromEntries(MOODS.map((m) => [m, pixelIcon(MASCOT[m], 2, MASCOT_PALETTE)])) as Record<Mood, SVGSVGElement>
  let current: Mood = 'idle'
  let timer: ReturnType<typeof setTimeout> | undefined

  function draw(mood: Mood) {
    current = mood
    node.dataset.mood = mood
    node.setAttribute('aria-label', `Mascote do PxA: ${mood}`)
    node.replaceChildren(frames[mood])
  }
  draw('idle')

  return {
    el: node,
    mood: () => current,
    set(mood: Mood, ms?: number) {
      clearTimeout(timer)
      timer = ms ? setTimeout(() => draw('idle'), ms) : undefined
      draw(mood)
    },
  }
}
