import type { ComponentInfo } from '@/lib/types'

export const PROBE_TIMEOUT_MS = 300

/**
 * Pede ao probe (main world) o componente React/Vue do elemento (COMP-01..04).
 * O elemento é apontado por um atributo temporário; os eventos levam JSON em string
 * (DOM e objetos não atravessam mundos com segurança no Firefox).
 */
export function probeComponent(el: Element, win: Window = window, timeoutMs = PROBE_TIMEOUT_MS): Promise<ComponentInfo | null> {
  const reqId = Math.random().toString(36).slice(2)
  return new Promise((resolve) => {
    const done = (value: ComponentInfo | null) => {
      win.removeEventListener('pxa:probe-response', onResponse)
      clearTimeout(timer)
      el.removeAttribute('data-pxa-probe')
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
    const timer = setTimeout(() => done(null), timeoutMs)
    win.addEventListener('pxa:probe-response', onResponse)
    el.setAttribute('data-pxa-probe', reqId)
    win.dispatchEvent(new CustomEvent('pxa:probe-request', { detail: JSON.stringify({ reqId }) }))
  })
}
