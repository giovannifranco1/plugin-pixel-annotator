import type { ErrorInput, ErrorLog } from './error-log'

export interface HookWindow {
  console: Console
  fetch: typeof fetch
  XMLHttpRequest: typeof XMLHttpRequest
  addEventListener: Window['addEventListener']
}

/** Argumento do console em texto legível: Error vira "Nome: mensagem", objeto vira JSON. */
function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Liga o Registro de erros no main world (ERRO-01): console.error, `error`, `unhandledrejection`,
 * fetch e XMLHttpRequest. Cada wrapper chama o que já estava lá (Sentry, Datadog…) e devolve o
 * mesmo resultado; registrar nunca pode quebrar a página, por isso tudo passa por `record`.
 */
export function installErrorHooks(win: HookWindow, log: ErrorLog): void {
  const record = (input: () => ErrorInput) => {
    try {
      log.push(input())
    } catch {
      // registro é melhor esforço
    }
  }

  const previousError = win.console.error
  win.console.error = function (this: unknown, ...args: unknown[]) {
    record(() => ({ kind: 'console', message: args.map(describe).join(' ') }))
    return previousError.apply(this, args)
  }

  win.addEventListener('error', (ev) => {
    // Erro de carregamento de recurso chega como Event simples, sem mensagem: não é exceção de script.
    if (!(ev instanceof ErrorEvent) || !ev.message) return
    record(() => ({
      kind: 'exception',
      message: ev.message,
      file: ev.filename,
      line: ev.lineno,
    }))
  })
  win.addEventListener('unhandledrejection', (ev) => {
    record(() => ({ kind: 'rejection', message: describe((ev as PromiseRejectionEvent).reason) }))
  })

  const previousFetch = win.fetch
  win.fetch = function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    const promise = previousFetch.apply(this, [input, init] as Parameters<typeof fetch>)
    const isRequest = typeof Request !== 'undefined' && input instanceof Request
    const method = (init?.method ?? (isRequest ? input.method : 'GET')).toUpperCase()
    const url = isRequest ? input.url : String(input)
    // Observa sem trocar a promise: a página recebe exatamente o que o fetch anterior devolveu.
    promise.then(
      (res) => { if (res.status >= 400) record(() => ({ kind: 'network', method, url, status: res.status })) },
      () => record(() => ({ kind: 'network', method, url, status: 0 })),
    )
    return promise
  } as typeof fetch

  const requests = new WeakMap<XMLHttpRequest, { method: string; url: string }>()
  const proto = win.XMLHttpRequest.prototype
  const previousOpen = proto.open
  const previousSend = proto.send
  proto.open = function (this: XMLHttpRequest, method: string, url: string | URL) {
    requests.set(this, { method: String(method).toUpperCase(), url: String(url) })
    return previousOpen.apply(this, arguments as unknown as Parameters<typeof previousOpen>)
  } as typeof proto.open
  proto.send = function (this: XMLHttpRequest) {
    const req = requests.get(this)
    if (req) {
      let aborted = false
      this.addEventListener('abort', () => { aborted = true }, { once: true })
      this.addEventListener('loadend', () => {
        if (aborted || (this.status > 0 && this.status < 400)) return
        record(() => ({ kind: 'network', method: req.method, url: req.url, status: this.status }))
      }, { once: true })
    }
    return previousSend.apply(this, arguments as unknown as Parameters<typeof previousSend>)
  }
}
