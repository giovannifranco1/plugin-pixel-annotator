import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createGrid } from '@/entrypoints/annotator.content/ui/grid'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'

let ui: UiHost
beforeEach(() => { ui = createHost() })
afterEach(() => {
  window.scrollTo(0, 0)
  ui.host.remove()
})

const grid = () => ui.root.querySelector<HTMLElement>('.pxa-grid')!

describe('grid', () => {
  test('GRAD-01 ciclo desligada → 8px → 4px → desligada', () => {
    const g = createGrid(ui)
    expect(grid().style.display).toBe('none')
    expect(g.cycle()).toBe(8)
    expect(grid().style.display).toBe('block')
    expect(grid().style.backgroundImage).toContain('8px')
    expect(g.cycle()).toBe(4)
    expect(grid().style.backgroundImage).toContain('4px')
    expect(g.cycle()).toBe(0)
    expect(grid().style.display).toBe('none')
  })

  test('GRAD-01 alinhada ao topo do documento: acompanha a rolagem', () => {
    const g = createGrid(ui)
    g.cycle()
    window.scrollTo(3, 21)
    g.measure()()
    expect(grid().style.backgroundPosition).toContain('-3px -21px')
  })

  test('GRAD-02 no shadow root, translúcida, sem capturar eventos, com repeating-linear-gradient', () => {
    createGrid(ui).cycle()
    expect(grid().getRootNode()).toBe(ui.root)
    expect(grid().style.backgroundImage).toContain('repeating-linear-gradient')
    expect(grid().className).toBe('pxa-grid') // pointer-events: none vem do CSS de .pxa-grid
  })

  test('GRAD-03 esconder a UI para o print esconde a grade (visibility herdada do host)', () => {
    createGrid(ui).cycle()
    ui.setHidden(true)
    expect(getComputedStyle(grid()).visibility).toBe('hidden')
  })
})
