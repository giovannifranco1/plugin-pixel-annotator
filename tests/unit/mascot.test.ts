import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMascot, MASCOT, MASCOT_PALETTES, MOODS } from '@/entrypoints/annotator.content/ui/mascot'
import { THEME_IDS } from '@/lib/profile'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const fills = (el: Element) => new Set(Array.from(el.querySelectorAll('rect')).map((r) => r.getAttribute('fill')))

describe('mascote', () => {
  test('MASC-06 cada humor é uma grade 16×16 desenhada em SVG crispEdges 2×', () => {
    expect(MOODS).toEqual(['idle', 'feliz', 'susto', 'festa', 'dormindo'])
    for (const mood of MOODS) {
      expect(MASCOT[mood]).toHaveLength(16)
      expect(MASCOT[mood].every((r) => r.length === 16)).toBe(true)
    }
    const m = createMascot()
    const svg = m.el.querySelector('svg')!
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges')
    expect(svg.getAttribute('width')).toBe('32')
    expect(m.el.querySelector('img')).toBeNull()
  })

  test('MASC-06 humores têm quadros diferentes e todo pixel tem cor em toda paleta', () => {
    expect(new Set(MOODS.map((m) => MASCOT[m].join(''))).size).toBe(MOODS.length)
    const used = new Set(MOODS.flatMap((m) => MASCOT[m].join('').replaceAll('.', '').split('')))
    for (const id of THEME_IDS) for (const c of used) expect(MASCOT_PALETTES[id][c], `${id}: ${c}`).toBeTruthy()
  })

  test('MASC-07 cada tema tem sua paleta e setTheme troca as cores na hora', () => {
    const m = createMascot('padrao')
    expect(fills(m.el)).toContain(MASCOT_PALETTES.padrao.P)
    m.set('feliz')
    m.setTheme('noite')
    expect(m.mood()).toBe('feliz')
    expect(fills(m.el)).toContain(MASCOT_PALETTES.noite.P)
    const fresh = createMascot('noite')
    fresh.set('feliz')
    expect(fills(m.el)).toEqual(fills(fresh.el)) // igual a nascer no tema Noite
    expect(MASCOT_PALETTES.noite.P).not.toBe(MASCOT_PALETTES.padrao.P)
  })

  test('MASC-02 humor transitório volta para idle', () => {
    const m = createMascot()
    expect(m.mood()).toBe('idle')
    m.set('feliz', 1500)
    expect(m.el.dataset.mood).toBe('feliz')
    vi.advanceTimersByTime(1499)
    expect(m.mood()).toBe('feliz')
    vi.advanceTimersByTime(1)
    expect(m.mood()).toBe('idle')
    expect(m.el.dataset.mood).toBe('idle')
  })

  test('MASC-02 humor novo substitui o anterior e seu timer', () => {
    const m = createMascot()
    m.set('feliz', 1500)
    vi.advanceTimersByTime(1000)
    m.set('festa', 2000)
    vi.advanceTimersByTime(1000)
    expect(m.mood()).toBe('festa')
    vi.advanceTimersByTime(1000)
    expect(m.mood()).toBe('idle')
  })

  test('MASC-04 humor sem duração fica até o próximo', () => {
    const m = createMascot()
    m.set('dormindo')
    vi.advanceTimersByTime(600_000)
    expect(m.mood()).toBe('dormindo')
  })
})
