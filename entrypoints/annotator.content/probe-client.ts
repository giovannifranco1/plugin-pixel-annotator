import type { ComponentInfo, PageError } from '@/lib/types'
import { ERRORS_REQUEST, ERRORS_RESPONSE, PROBE_ATTR, PROBE_REQUEST, PROBE_RESPONSE } from '@/lib/messages'

const PROBE_TIMEOUT_MS = 300

/**
 * Pedido ao probe (main world) por CustomEvent. Os eventos levam JSON em string (DOM e objetos não
 * atravessam mundos com segurança no Firefox). Sem resposta em 300ms, resposta malformada ou probe
 * ausente → `fallback`: o cliente nunca vê erro.
 */
function request<T>(
  names: { request: string; response: string },
  payload: Record<string, unknown>,
  fallback: T,
  setup?: (reqId: string) => () => void,
): Promise<T> {
  const reqId = Math.random().toString(36).slice(2)
  const cleanup = setup?.(reqId)
  return new Promise((resolve) => {
    const done = (value: T) => {
      window.removeEventListener(names.response, onResponse)
      clearTimeout(timer)
      cleanup?.()
      resolve(value)
    }
    const onResponse = (ev: Event) => {
      try {
        const data = JSON.parse(String((ev as CustomEvent).detail))
        if (data.reqId === reqId) done(data.result ?? fallback)
      } catch {
        // resposta malformada: ignora e espera o timeout
      }
    }
    const timer = setTimeout(() => done(fallback), PROBE_TIMEOUT_MS)
    window.addEventListener(names.response, onResponse)
    window.dispatchEvent(new CustomEvent(names.request, { detail: JSON.stringify({ ...payload, reqId }) }))
  })
}

/** Componente React/Vue do elemento (COMP-01..04), apontado por um atributo temporário. */
export function probeComponent(el: Element): Promise<ComponentInfo | null> {
  return request<ComponentInfo | null>({ request: PROBE_REQUEST, response: PROBE_RESPONSE }, {}, null, (reqId) => {
    el.setAttribute(PROBE_ATTR, reqId)
    return () => el.removeAttribute(PROBE_ATTR)
  })
}

/** Erros de console/rede dos últimos `windowMs` (ERRO-03); sem probe, lista vazia (ERRO-06). */
export async function probeErrors(windowMs: number): Promise<PageError[]> {
  const result = await request<unknown>({ request: ERRORS_REQUEST, response: ERRORS_RESPONSE }, { windowMs }, [])
  return Array.isArray(result) ? (result as PageError[]) : []
}
