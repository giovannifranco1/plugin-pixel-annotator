import type { UiHost } from './ui/host'

// Gestos bloqueados na fase de captura em window: a página não reage ao clique de anotação (ANOT-04).
const BLOCKED = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'touchstart', 'submit'] as const

export interface InterceptorHandlers {
  onHover(el: Element | null): void
  onPick(el: Element): void
}

export function installInterceptor(ui: UiHost, h: InterceptorHandlers, win: Window = window): () => void {
  const fromPxa = (ev: Event) => ui.isPxa(ev.target, ev.composedPath())
  const pick = (ev: Event): Element | null => {
    const t = ev.target
    return t instanceof Element && !t.closest('[data-pxa-ignore]') ? t : null
  }
  const block = (ev: Event) => {
    if (fromPxa(ev)) return
    ev.preventDefault()
    ev.stopImmediatePropagation()
    if (ev.type === 'click') {
      const el = pick(ev)
      if (el) h.onPick(el)
    }
  }
  const hover = (ev: Event) => h.onHover(fromPxa(ev) ? null : pick(ev))
  for (const type of BLOCKED) win.addEventListener(type, block, { capture: true })
  win.addEventListener('pointermove', hover, { capture: true, passive: true })
  return () => {
    for (const type of BLOCKED) win.removeEventListener(type, block, { capture: true })
    win.removeEventListener('pointermove', hover, { capture: true })
  }
}
