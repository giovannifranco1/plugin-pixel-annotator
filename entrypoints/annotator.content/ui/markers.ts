import type { UiHost } from './host'
import type { AnnotationStore } from '@/lib/store'
import { resolveElement } from '@/lib/resolve'
import { CATEGORY_COLOR, categoryOf } from '@/lib/viewport'

/** Marcadores numerados sobre os elementos anotados da rota atual (ANOT-05/08, PAIN-06, MARC-01/02). */
export function createMarkers(ui: UiHost, store: AnnotationStore, win: Window = window) {
  const nodes = new Map<string, HTMLElement>()
  return {
    update() {
      const current = categoryOf(win.innerWidth)
      const pathname = win.location.pathname
      const seen = new Set<string>()
      for (const a of store.list()) {
        seen.add(a.id)
        let m = nodes.get(a.id)
        if (!m) {
          m = document.createElement('div')
          m.className = 'pxa-marker'
          m.textContent = String(a.number)
          ui.layer.append(m)
          nodes.set(a.id, m)
        }
        const el = a.pathname === pathname ? resolveElement(a, store.refOf(a.id), pathname, win.document) : null
        if (!el) {
          m.style.display = 'none'
          continue
        }
        const r = el.getBoundingClientRect()
        m.style.display = 'block'
        m.style.left = `${r.left}px`
        m.style.top = `${r.top}px`
        m.style.background = CATEGORY_COLOR[a.viewport.category]
        m.style.opacity = a.viewport.category === current ? '1' : '0.35'
      }
      for (const [id, m] of nodes) {
        if (!seen.has(id)) {
          m.remove()
          nodes.delete(id)
        }
      }
    },
    hideAll() {
      for (const m of nodes.values()) m.style.display = 'none'
    },
  }
}

export type Markers = ReturnType<typeof createMarkers>
