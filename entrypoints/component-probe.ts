import { detectComponent } from '@/lib/component-detect'

// Main world: enxerga as propriedades expando de React/Vue que o isolated world não vê.
export default defineUnlistedScript(() => {
  const w = window as unknown as Record<string, unknown>
  if (w.__pxaProbe) return
  w.__pxaProbe = true

  window.addEventListener('pxa:probe-request', (ev) => {
    let reqId = ''
    try {
      reqId = String(JSON.parse(String((ev as CustomEvent).detail)).reqId)
      const el = document.querySelector(`[data-pxa-probe="${CSS.escape(reqId)}"]`)
      const result = el ? detectComponent(el) : null
      window.dispatchEvent(new CustomEvent('pxa:probe-response', { detail: JSON.stringify({ reqId, result }) }))
    } catch {
      if (reqId) window.dispatchEvent(new CustomEvent('pxa:probe-response', { detail: JSON.stringify({ reqId, result: null }) }))
    }
  })
})
