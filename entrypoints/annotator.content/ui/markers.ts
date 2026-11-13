import type { UiHost } from './host'
import { el } from './dom'
import type { AnnotationStore } from '@/lib/store'
import { resolveAnnotation } from '@/lib/resolve'
import { CATEGORY_COLOR, categoryOf } from '@/lib/viewport'

/** Intervalo para tentar de novo achar pelo seletor um elemento que sumiu (evita varrer o DOM a cada frame). */
const MISS_RETRY_MS = 500

interface MarkerNode {
  node: HTMLElement
  drawn: string
}

/** Marcadores numerados sobre os elementos anotados da rota atual (ANOT-05/08, PAIN-06, MARC-01/02). */
export function createMarkers(ui: UiHost, store: AnnotationStore) {
  const markers = new Map<string, MarkerNode>()
  let lastPathname = ''
  let lastRetry = -Infinity

  /** Lê posições agora e devolve as escritas, para o tick juntar todas as leituras antes das escritas. */
  function measure(): () => void {
    const pathname = location.pathname
    const now = performance.now()
    const retry = pathname !== lastPathname || now - lastRetry >= MISS_RETRY_MS
    lastPathname = pathname
    if (retry) lastRetry = now
    const current = categoryOf(innerWidth)
    const plan: Array<[MarkerNode, string]> = []
    const seen = new Set<string>()

    for (const a of store.list()) {
      seen.add(a.id)
      let m = markers.get(a.id)
      if (!m) {
        m = { node: el('div', { className: 'pxa-marker', textContent: String(a.number) }), drawn: '' }
        m.node.style.background = CATEGORY_COLOR[a.viewport.category] // MARC-01
        ui.layer.append(m.node)
        markers.set(a.id, m)
      }
      let target: Element | null = null
      if (a.pathname === pathname) {
        const ref = store.refOf(a.id)?.deref()
        target = ref?.isConnected ? ref : retry ? resolveAnnotation(store, a.id, pathname) : null
      }
      if (!target) {
        plan.push([m, 'hidden'])
        continue
      }
      const r = target.getBoundingClientRect()
      const opacity = a.viewport.category === current ? '1' : '0.35' // MARC-02
      plan.push([m, `${r.left},${r.top},${opacity}`])
    }
    for (const [id, m] of markers) {
      if (!seen.has(id)) {
        m.node.remove()
        markers.delete(id)
      }
    }

    return () => {
      for (const [m, key] of plan) {
        if (key === m.drawn) continue
        m.drawn = key
        if (key === 'hidden') {
          m.node.style.display = 'none'
          continue
        }
        const [left, top, opacity] = key.split(',')
        Object.assign(m.node.style, { display: 'block', left: `${left}px`, top: `${top}px`, opacity })
      }
    }
  }

  return {
    measure,
    update: () => measure()(),
    hideAll() {
      for (const m of markers.values()) {
        m.node.style.display = 'none'
        m.drawn = 'hidden'
      }
    },
  }
}
