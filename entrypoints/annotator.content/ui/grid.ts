import type { UiHost } from './host'
import { el } from './dom'

type GridStep = 0 | 4 | 8

/** Linha de base fixa em 4px (GRAD-01). */
const BASELINE = 4
const NEXT: Record<GridStep, GridStep> = { 0: 8, 8: 4, 4: 0 }

const pattern = (step: number) =>
  [
    `repeating-linear-gradient(to right, rgba(255, 62, 127, .3) 0 1px, transparent 1px ${step}px)`,
    `repeating-linear-gradient(to bottom, rgba(62, 198, 255, .22) 0 1px, transparent 1px ${BASELINE}px)`,
  ].join(', ')

/**
 * Grade de colunas (8 ou 4px) e linha de base (4px) sobre a página, desenhada no Shadow DOM
 * (GRAD-01/02). Acompanha a rolagem pelo `background-position` no tick. Some no print junto com o
 * resto da UI, porque `ui.setHidden` esconde o host (GRAD-03).
 */
export function createGrid(ui: UiHost) {
  const layer = el('div', { className: 'pxa-grid' })
  layer.style.display = 'none'
  ui.layer.prepend(layer)
  let step: GridStep = 0
  let drawn = ''

  function set(next: GridStep) {
    step = next
    drawn = ''
    layer.style.display = step ? 'block' : 'none'
    if (step) layer.style.backgroundImage = pattern(step)
    return step
  }

  return {
    /** desligada → 8px → 4px → desligada */
    cycle: () => set(NEXT[step]),
    off: () => set(0),
    step: () => step,
    measure(): () => void {
      if (!step) return () => {}
      const pos = `${-scrollX}px ${-scrollY}px`
      return () => {
        if (pos === drawn) return
        drawn = pos
        layer.style.backgroundPosition = `${pos}, ${pos}`
      }
    },
  }
}
