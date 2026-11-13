import { detectComponent } from '@/lib/component-detect'
import { PROBE_ATTR, PROBE_REQUEST, PROBE_RESPONSE } from '@/lib/messages'

// Main world: enxerga as propriedades expando de React/Vue que o isolated world não vê.
export default defineUnlistedScript(() => {
  const w = window as unknown as Record<string, unknown>
  if (w.__pxaProbe) return
  w.__pxaProbe = true

  window.addEventListener(PROBE_REQUEST, (ev) => {
    let reqId = ''
    let result = null
    try {
      reqId = String(JSON.parse(String((ev as CustomEvent).detail)).reqId)
      const el = document.querySelector(`[${PROBE_ATTR}="${CSS.escape(reqId)}"]`)
      result = el ? detectComponent(el) : null
    } catch {
      // COMP-04: responde null; o cliente nunca vê erro
    }
    if (reqId) window.dispatchEvent(new CustomEvent(PROBE_RESPONSE, { detail: JSON.stringify({ reqId, result }) }))
  })
})
