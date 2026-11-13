import type { UiHost } from './host'
import { el } from './dom'

/**
 * Contorno + rótulo "tag L×A" do elemento sob o cursor (ANOT-03).
 * `highlight` só troca o alvo; o desenho acontece no tick, em duas fases (ler → escrever)
 * e só quando algo mudou.
 */
export function createOverlay(ui: UiHost) {
  const box = el('div', { className: 'pxa-outline' })
  const label = el('div', { className: 'pxa-label' })
  ui.layer.append(box, label)
  let target: Element | null = null
  let drawn = 'none'
  box.style.display = label.style.display = 'none'

  /** Lê o layout agora e devolve a escrita, para o tick juntar todas as leituras antes das escritas. */
  function measure(): () => void {
    const r = target?.isConnected ? target.getBoundingClientRect() : null
    const text = r && target ? `${target.localName} ${Math.round(r.width)}×${Math.round(r.height)}` : ''
    const key = r ? `${r.left},${r.top},${r.width},${r.height},${text}` : 'none'
    return () => {
      if (key === drawn) return
      drawn = key
      if (!r) {
        box.style.display = label.style.display = 'none'
        return
      }
      Object.assign(box.style, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
      label.textContent = text
      Object.assign(label.style, { display: 'block', left: `${r.left}px`, top: `${Math.max(0, r.top - 22)}px` })
    }
  }

  return {
    highlight(next: Element | null) {
      target = next
    },
    measure,
    update: () => measure()(),
    current: () => target,
    hide() {
      target = null
      measure()()
    },
  }
}
