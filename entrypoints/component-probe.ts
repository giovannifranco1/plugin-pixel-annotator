import { detectComponent } from '@/lib/component-detect'
import { installErrorHooks } from '@/lib/error-hooks'
import { createErrorLog } from '@/lib/error-log'
import { ERROR_WINDOW_MS, ERRORS_REQUEST, ERRORS_RESPONSE, PROBE_ATTR, PROBE_REQUEST, PROBE_RESPONSE } from '@/lib/messages'

// Main world: enxerga as propriedades expando de React/Vue que o isolated world não vê,
// e os console.error/fetch/XHR da página (Registro de erros, ERRO-01).
export default defineUnlistedScript(() => {
  const w = window as unknown as Record<string, unknown>
  if (w.__pxaProbe) return
  w.__pxaProbe = true

  const errorLog = createErrorLog()
  installErrorHooks(window, errorLog)

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

  window.addEventListener(ERRORS_REQUEST, (ev) => {
    try {
      const { reqId, windowMs } = JSON.parse(String((ev as CustomEvent).detail))
      const result = errorLog.since(Number(windowMs) || ERROR_WINDOW_MS)
      window.dispatchEvent(new CustomEvent(ERRORS_RESPONSE, { detail: JSON.stringify({ reqId: String(reqId), result }) }))
    } catch {
      // ERRO-06: sem resposta o cliente cai no timeout e segue com lista vazia
    }
  })
})
