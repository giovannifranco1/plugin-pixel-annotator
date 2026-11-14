import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createBoxes } from '@/entrypoints/annotator.content/ui/boxes'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'

let ui: UiHost
beforeEach(() => { ui = createHost() })
afterEach(() => ui.host.remove())

const shown = () => Array.from(ui.root.querySelectorAll<HTMLElement>('.pxa-box')).filter((b) => b.style.display !== 'none')

describe('boxes', () => {
  test('desenha caixas com posição, cor e rótulo, abaixo do resto da UI', () => {
    ui.layer.append(document.createElement('aside'))
    const boxes = createBoxes(ui, 'pxa-test')
    boxes.draw([{ left: 10, top: 20, width: 30, height: 40, color: 'rgb(1, 2, 3)' }, { left: 0, top: 0, width: 5, height: 5, label: 'vaza 12px', danger: true }])
    const [a, b] = shown()
    expect(ui.layer.firstElementChild!.classList.contains('pxa-test')).toBe(true)
    expect(a!.style.cssText).toContain('left: 10px')
    expect(a!.style.height).toBe('40px')
    expect(a!.style.borderColor).toBe('rgb(1, 2, 3)')
    expect(b!.classList.contains('pxa-danger')).toBe(true)
    expect(b!.textContent).toBe('vaza 12px')
  })

  test('reaproveita nós, esconde os que sobram e não reescreve o que não mudou', () => {
    const boxes = createBoxes(ui, 'pxa-test')
    const spec = { left: 1, top: 1, width: 1, height: 1 }
    boxes.draw([spec, spec, spec])
    const first = shown()[0]!
    boxes.draw([spec])
    expect(shown()).toHaveLength(1)
    expect(shown()[0]).toBe(first)
    first.style.left = '999px'
    boxes.draw([spec])
    expect(first.style.left).toBe('999px') // mesma chave: nada escrito
    boxes.clear()
    expect(shown()).toHaveLength(0)
  })
})
