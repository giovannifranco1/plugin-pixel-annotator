import { el } from './dom'
import { pixelIcon } from './icons'

export const MOODS = ['idle', 'feliz', 'susto', 'festa', 'dormindo'] as const
export type Mood = (typeof MOODS)[number]

/** Cores do Mascote: o alfinete rosa do ícone do PxA. Fixas, não mudam com o Tema. */
const MASCOT_PALETTE: Record<string, string> = {
  K: '#1a1226', P: '#ff3e7f', W: '#ffffff', G: '#8c8ca0', R: '#8a1538', Y: '#f2c94c', B: '#4a8cff',
}

const NEEDLE = ['.......KK.......', '.......KG.......', '.......KG.......', '.......KG.......', '........K.......', '................']

/** Um quadro 16×16 por humor (MASC-06). Cabeça nas linhas 0–9, agulha nas 10–15. */
export const MASCOT: Record<Mood, readonly string[]> = {
  idle: [
    '................',
    '.....KKKKKK.....',
    '....KPPPPPPK....',
    '...KPPPPPPPPK...',
    '...KPWKPPWKPK...',
    '...KPWKPPWKPK...',
    '...KPPPPPPPPK...',
    '...KPPPKKPPPK...',
    '....KPPPPPPK....',
    '.....KKKKKK.....',
    ...NEEDLE,
  ],
  feliz: [
    '................',
    '.....KKKKKK.....',
    '....KPPPPPPK....',
    '...KPPPPPPPPK...',
    '...KPKKPPKKPK...',
    '...KPPPPPPPPK...',
    '...KPPPPPPPPK...',
    '...KPKRRRRKPK...',
    '....KPKKKKPK....',
    '.....KKKKKK.....',
    ...NEEDLE,
  ],
  susto: [
    '................',
    '.....KKKKKK.....',
    '....KPPPPPPK....',
    '...KPWWPPWWPK...',
    '...KPWKPPWKPK...',
    '...KPWWPPWWPK...',
    '...KPPPPPPPPK...',
    '...KPPKRRKPPK...',
    '....KPPKKPPK....',
    '.....KKKKKK.....',
    ...NEEDLE,
  ],
  festa: [
    '.Y............B.',
    '.....KKKKKK.....',
    '.K..KPPPPPPK..K.',
    '.K.KPPPPPPPPK.K.',
    '..KKPKKPPKKPKK..',
    '...KPPPPPPPPK...',
    '...KPPPPPPPPK...',
    '...KPKRRRRKPK...',
    '....KPKKKKPK....',
    '.....KKKKKK.....',
    '.......KK.......',
    'B......KG.......',
    '.......KG......Y',
    '.......KG.......',
    '........K.......',
    '................',
  ],
  dormindo: [
    '.............KKK',
    '.....KKKKKK...K.',
    '....KPPPPPPK.KKK',
    '...KPPPPPPPPK...',
    '...KPPPPPPPPK...',
    '...KPKKPPKKPK...',
    '...KPPPPPPPPK...',
    '...KPPPKKPPPK...',
    '....KPPPPPPK....',
    '.....KKKKKK.....',
    ...NEEDLE,
  ],
}

/**
 * Mascote do cabeçalho (MASC-01..06). `set(mood, ms)` com duração volta sozinho para `idle`.
 * A animação é só CSS (`pxa-mood-<humor>`), desligada por `prefers-reduced-motion` (MASC-05).
 */
export function createMascot() {
  const node = el('span', { className: 'pxa-mascot', title: 'PxA' })
  node.setAttribute('role', 'img')
  let current: Mood = 'idle'
  let timer: ReturnType<typeof setTimeout> | undefined

  function draw(mood: Mood) {
    node.classList.remove(`pxa-mood-${current}`)
    current = mood
    node.dataset.mood = mood
    node.classList.add(`pxa-mood-${mood}`)
    node.setAttribute('aria-label', `Mascote do PxA: ${mood}`)
    node.replaceChildren(pixelIcon(MASCOT[mood], 2, MASCOT_PALETTE))
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
