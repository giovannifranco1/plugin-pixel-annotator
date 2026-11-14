import type { ThemeId } from '@/lib/profile'
import { el } from './dom'
import { pixelIcon } from './icons'

export const MOODS = ['idle', 'feliz', 'susto', 'festa', 'dormindo'] as const
export type Mood = (typeof MOODS)[number]

/**
 * Cores do Mascote por Tema (MASC-07). K contorno, P corpo, W brilho do olho, R bochecha,
 * G agulha, Y/B confete e gota, Z o "z" do sono (claro para aparecer no cabeçalho escuro).
 */
export const MASCOT_PALETTES: Record<ThemeId, Record<string, string>> = {
  padrao: { K: '#1a1226', P: '#ff7aa8', W: '#ffffff', R: '#ff3e7f', G: '#8c8ca0', Y: '#f2c94c', B: '#7fd0ff', Z: '#ffffff' },
  noite: { K: '#0e0b16', P: '#b9a3ff', W: '#ffffff', R: '#ff7aa8', G: '#e6e1f0', Y: '#f2c94c', B: '#7fd0ff', Z: '#e6e1f0' },
}

const NEEDLE = ['......KKKK......', '.......KG.......', '.......KG.......', '........K.......', '................', '................']

/** Alfinete fofo, sem boca: um quadro 16×16 por humor (MASC-06). */
export const MASCOT: Record<Mood, readonly string[]> = {
  idle: [
    '................',
    '.....KKKKKK.....',
    '...KKPPPPPPKK...',
    '..KPWWPPPPPPPK..',
    '..KPWPPPPPPPPK..',
    '..KPKKPPPPKKPK..',
    '..KPKWPPPPKWPK..',
    '..KRRPPPPPPRRK..',
    '...KPPPPPPPPK...',
    '....KKPPPPKK....',
    ...NEEDLE,
  ],
  feliz: [
    '................',
    '.....KKKKKK.....',
    '...KKPPPPPPKK...',
    '..KPWWPPPPPPPK..',
    '..KPWPPPPPPPPK..',
    '..KPPKKPPKKPPK..',
    '..KPKPPKKPPKPK..',
    '..KRRPPPPPPRRK..',
    '...KPPPPPPPPK...',
    '....KKPPPPKK....',
    ...NEEDLE,
  ],
  susto: [
    '.............B..',
    '.....KKKKKK.BB..',
    '...KKPPPPPPKKB..',
    '..KPPPPPPPPPPK..',
    '..KPKKPPPPKKPK..',
    '..KPKKPPPPKKPK..',
    '..KPPPPPPPPPPK..',
    '..KRRPPPPPPRRK..',
    '...KPPPPPPPPK...',
    '....KKPPPPKK....',
    ...NEEDLE,
  ],
  festa: [
    '.Y..........B...',
    '.....KKKKKK....Y',
    'B..KKPPPPPPKK...',
    '..KPWWPPPPPPPK..',
    '..KPWPPPPPPPPK..',
    '..KPPKKPPKKPPK..',
    '..KPKPPKKPPKPK..',
    '..KRRPPPPPPRRK..',
    '...KPPPPPPPPK..B',
    'Y...KKPPPPKK....',
    ...NEEDLE,
  ],
  dormindo: [
    '.............ZZZ',
    '.....KKKKKK...Z.',
    '...KKPPPPPPKKZZZ',
    '..KPPPPPPPPPPK..',
    '..KPPPPPPPPPPK..',
    '..KPPPPPPPPPPK..',
    '..KPKKPPPPKKPK..',
    '..KRRPPPPPPRRK..',
    '...KPPPPPPPPK...',
    '....KKPPPPKK....',
    ...NEEDLE,
  ],
}

/**
 * Mascote do cabeçalho (MASC-01..07). `set(mood, ms)` com duração volta sozinho para `idle`;
 * `setTheme` troca a paleta na hora. A animação é só CSS (`[data-mood]`), desligada por
 * `prefers-reduced-motion` (MASC-05).
 */
export function createMascot(theme: ThemeId = 'padrao') {
  const node = el('span', { className: 'pxa-mascot', title: 'PxA' })
  node.setAttribute('role', 'img')
  // Quadros montados uma vez por tema, na primeira vez que o tema aparece.
  const cache = new Map<ThemeId, Record<Mood, SVGSVGElement>>()
  const framesOf = (id: ThemeId) => cache.get(id) ?? cache.set(id, buildFrames(id)).get(id)!
  let frames = framesOf(theme)
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
    setTheme(id: ThemeId) {
      if (frames === framesOf(id)) return
      frames = framesOf(id)
      draw(current)
    },
  }
}

function buildFrames(theme: ThemeId): Record<Mood, SVGSVGElement> {
  return Object.fromEntries(MOODS.map((m) => [m, pixelIcon(MASCOT[m], 2, MASCOT_PALETTES[theme])])) as Record<Mood, SVGSVGElement>
}
