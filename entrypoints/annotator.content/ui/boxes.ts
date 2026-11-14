import type { UiHost } from './host'
import { el } from './dom'

export interface BoxSpec {
  left: number
  top: number
  width: number
  height: number
  color?: string
  label?: string
  /** Vermelho com rótulo (vazamento). */
  danger?: boolean
}

/**
 * Pool de caixas `position: fixed` para desenhar muitos contornos (X-ray, destaque do relatório).
 * Fica no começo da camada, abaixo do overlay de hover, do painel e do editor.
 * Escreve só as caixas cuja posição/cor/rótulo mudou.
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
      const key = `${s.left},${s.top},${s.width},${s.height},${s.color ?? ''},${s.label ?? ''},${s.danger ?? ''}`
      if (keys[i] === key) return
      keys[i] = key
      node.className = s.danger ? 'pxa-box pxa-danger' : 'pxa-box'
      Object.assign(node.style, {
        display: 'block', left: `${s.left}px`, top: `${s.top}px`, width: `${s.width}px`, height: `${s.height}px`, borderColor: s.color ?? '',
      })
      node.replaceChildren(...(s.label ? [el('span', { className: 'pxa-box-label', textContent: s.label })] : []))
    })
    for (let i = specs.length; i < nodes.length; i++) {
      if (keys[i] === 'hidden') continue
      keys[i] = 'hidden'
      nodes[i]!.style.display = 'none'
    }
  }

  return { draw, clear: () => draw([]) }
}
