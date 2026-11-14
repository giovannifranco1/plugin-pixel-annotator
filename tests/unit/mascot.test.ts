import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMascot, MASCOT, MASCOT_PALETTE, MOODS } from '@/entrypoints/annotator.content/ui/mascot'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())


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

  test('MASC-06 humores têm quadros diferentes, sem bochecha, e todo pixel tem cor', () => {
    expect(new Set(MOODS.map((m) => MASCOT[m].join(''))).size).toBe(MOODS.length)
    const used = new Set(MOODS.flatMap((m) => MASCOT[m].join('').replaceAll('.', '').split('')))
    expect(used.has('R')).toBe(false)
    for (const c of used) expect(MASCOT_PALETTE[c], c).toBeTruthy()
    expect(MASCOT_PALETTE.P).toBe('#ff3e7f') // rosa da marca
  })

  test('MASC-06 cabeça estreita: no máximo 10 px de largura', () => {
    for (const mood of MOODS) {
      const head = MASCOT[mood].slice(0, 10).map((r) => r.replace(/[^KPW]/g, '.'))
      const widths = head.map((r) => (r.includes('K') ? r.lastIndexOf('K') - r.indexOf('K') + 1 : 0))
      expect(Math.max(...widths), mood).toBeLessThanOrEqual(10)
    }
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
