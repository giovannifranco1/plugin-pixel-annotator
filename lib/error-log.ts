import type { PageError, PageErrorKind } from './types'

export const ERROR_LOG_MAX = 50
export const ERROR_MESSAGE_LIMIT = 500

/** O que os hooks entregam; o log completa horário, contador e (na rede) a mensagem. */
export type ErrorInput = Omit<PageError, 'at' | 'count' | 'message'> & { message?: string }

export const clip = (text: string, max = ERROR_MESSAGE_LIMIT): string => (text.length > max ? text.slice(0, max) : text)

/** URL sem query string e sem fragmento (privacidade: tokens costumam ir na query). */
export function sanitizeUrl(url: string, base?: string): string {
  try {
    const u = new URL(url, base)
    u.search = ''
    u.hash = ''
    return u.href
  } catch {
    return url.split(/[?#]/, 1)[0] ?? ''
  }
}

const networkMessage = (e: PageError) => `${e.method ?? 'GET'} ${e.url ?? ''} → ${e.status ? e.status : 'falha de rede'}`
const keyOf = (e: PageError) => [e.kind, e.message, e.source, e.method, e.url, e.status].join('|')

/**
 * Registro de erros do main world (ERRO-02): no máximo `max` entradas (FIFO). Repetição idêntica
 * soma no contador e vira a entrada mais recente, para erro em loop não explodir a memória.
 */
export function createErrorLog({ max = ERROR_LOG_MAX, now = () => new Date() } = {}) {
  const entries = new Map<string, PageError>() // ordem de inserção = ordem cronológica

  return {
    push(input: ErrorInput): void {
      const entry: PageError = { ...input, message: '', at: now().toISOString(), count: 1 }
      if (input.url !== undefined) entry.url = sanitizeUrl(input.url)
      entry.message = clip(input.kind === 'network' ? networkMessage(entry) : (input.message ?? ''))
      const key = keyOf(entry)
      const prev = entries.get(key)
      if (prev) {
        entries.delete(key)
        entry.count = prev.count + 1
      }
      entries.set(key, entry)
      if (entries.size > max) entries.delete(entries.keys().next().value!)
    },
    list: (): PageError[] => [...entries.values()],
    /** Erros cuja última ocorrência caiu nos últimos `windowMs` (ERRO-03). */
    since(windowMs: number): PageError[] {
      const from = now().getTime() - windowMs
      return [...entries.values()].filter((e) => Date.parse(e.at) >= from)
    },
  }
}

export type ErrorLog = ReturnType<typeof createErrorLog>

const ERROR_LABEL: Record<PageErrorKind, string> = { console: 'console.error', exception: 'erro', rejection: 'promise rejeitada', network: 'rede' }

/** Uma linha legível do erro, sem horário: usada no editor de nota e no feedback.md. */
export const errorText = (e: PageError): string =>
  `${ERROR_LABEL[e.kind]}: ${e.message}${e.source ? ` (${e.source})` : ''}${e.count > 1 ? ` ×${e.count}` : ''}`
