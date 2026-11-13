import type { UiHost } from './host'

/** Contorno + rótulo "tag L×A" do elemento sob o cursor (ANOT-03). */
export function createOverlay(ui: UiHost) {
  const box = document.createElement('div')
  box.className = 'pxa-outline'
  const label = document.createElement('div')
  label.className = 'pxa-label'
  ui.layer.append(box, label)
  let target: Element | null = null

  const hide = () => {
    box.style.display = 'none'
    label.style.display = 'none'
  }
  const update = () => {
    if (!target || !target.isConnected) return hide()
    const r = target.getBoundingClientRect()
    Object.assign(box.style, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
    label.textContent = `${target.localName} ${Math.round(r.width)}×${Math.round(r.height)}`
    Object.assign(label.style, { display: 'block', left: `${r.left}px`, top: `${Math.max(0, r.top - 22)}px` })
  }
  hide()
  return {
    highlight(el: Element | null) {
      target = el
      update()
    },
    update,
    current: () => target,
    hide() {
      target = null
      hide()
    },
  }
}

export type Overlay = ReturnType<typeof createOverlay>
