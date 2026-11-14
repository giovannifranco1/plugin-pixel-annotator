import type { UiHost } from './host'
import { el } from './dom'

export interface BoxSpec {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Pool de caixas `position: fixed` para destacar muitos elementos (hover do relatório do Detector).
 * Fica no começo da camada, abaixo do overlay de hover, do painel e do editor.
 * Escreve só as caixas cuja posição mudou.
 */
export function createBoxes(ui: UiHost, className: string) {
  const container = el('div', { className })
  ui.layer.prepend(container)
  const nodes: HTMLElement[] = []
  const keys: string[] = []

  function draw(specs: readonly BoxSpec[]) {
    specs.forEach((s, i) => {
      let node = nodes[i]
      if (!node) {
        node = el('div', { className: 'pxa-box' })
        nodes.push(node)
        container.append(node)
      }
      const key = `${s.left},${s.top},${s.width},${s.height}`
      if (keys[i] === key) return
      keys[i] = key
      Object.assign(node.style, { display: 'block', left: `${s.left}px`, top: `${s.top}px`, width: `${s.width}px`, height: `${s.height}px` })
    })
    for (let i = specs.length; i < nodes.length; i++) {
      if (keys[i] === 'hidden') continue
      keys[i] = 'hidden'
      nodes[i]!.style.display = 'none'
    }
  }

  return { draw, clear: () => draw([]) }
}
