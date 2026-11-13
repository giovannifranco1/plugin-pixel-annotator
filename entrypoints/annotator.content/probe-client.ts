import type { ComponentInfo } from '@/lib/types'
import { PROBE_ATTR, PROBE_REQUEST, PROBE_RESPONSE } from '@/lib/messages'

const PROBE_TIMEOUT_MS = 300

/**
 * Pede ao probe (main world) o componente React/Vue do elemento (COMP-01..04).
 * O elemento é apontado por um atributo temporário; os eventos levam JSON em string
 * (DOM e objetos não atravessam mundos com segurança no Firefox).
 */
export function probeComponent(el: Element): Promise<ComponentInfo | null> {
  const reqId = Math.random().toString(36).slice(2)
  return new Promise((resolve) => {
    const done = (value: ComponentInfo | null) => {
      window.removeEventListener(PROBE_RESPONSE, onResponse)
      clearTimeout(timer)
      el.removeAttribute(PROBE_ATTR)
      resolve(value)
    }
    const onResponse = (ev: Event) => {
      try {
        const data = JSON.parse(String((ev as CustomEvent).detail))
        if (data.reqId === reqId) done(data.result ?? null)
      } catch {
        // resposta malformada: ignora e espera o timeout
      }
    }
    const timer = setTimeout(() => done(null), PROBE_TIMEOUT_MS)
    window.addEventListener(PROBE_RESPONSE, onResponse)
    el.setAttribute(PROBE_ATTR, reqId)
    window.dispatchEvent(new CustomEvent(PROBE_REQUEST, { detail: JSON.stringify({ reqId }) }))
  })
}
