import { describe, expect, test, vi } from 'vitest'
import { installErrorHooks, type HookWindow } from '@/lib/error-hooks'
import { createErrorLog } from '@/lib/error-log'

class FakeXhr extends EventTarget {
  status = 0
  open(_method: string, _url: string | URL) {}
  send() {}
  /** Simula o fim da requisição. */
  finish(status: number, kind: 'load' | 'error' | 'abort' = 'load') {
    this.status = status
    this.dispatchEvent(new Event(kind))
    this.dispatchEvent(new Event('loadend'))
  }
}

function setup(fetchImpl: (...args: unknown[]) => Promise<unknown> = async () => ({ status: 200, url: 'http://app.test/ok' })) {
  const previousError = vi.fn()
  const events = new EventTarget()
  const win = {
    console: { error: previousError },
    fetch: vi.fn(fetchImpl),
    XMLHttpRequest: class extends FakeXhr {},
    addEventListener: events.addEventListener.bind(events),
  }
  const log = createErrorLog({ base: () => 'http://app.test/pagina?x=1' })
  installErrorHooks(win as unknown as HookWindow, log)
  return { win, log, previousError, events }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('error-hooks', () => {
  test('ERRO-01 console.error registra e chama a função anterior com os mesmos argumentos', () => {
    const { win, log, previousError } = setup()
    const err = new TypeError('x is undefined')
    win.console.error('Falhou:', err, { id: 1 })
    expect(previousError).toHaveBeenCalledWith('Falhou:', err, { id: 1 })
    expect(log.list()).toEqual([expect.objectContaining({ kind: 'console', message: 'Falhou: TypeError: x is undefined {"id":1}' })])
  })

  test('ERRO-01 envolve o que já estava lá (Sentry): wrapper sobre wrapper repassa para os dois', () => {
    const original = vi.fn()
    const sentry = vi.fn(function (this: unknown, ...args: unknown[]) { original(...args) })
    const events = new EventTarget()
    const win = { console: { error: sentry }, fetch: vi.fn(), XMLHttpRequest: FakeXhr, addEventListener: events.addEventListener.bind(events) }
    const log = createErrorLog()
    installErrorHooks(win as unknown as HookWindow, log)
    win.console.error('oi')
    expect(sentry).toHaveBeenCalledWith('oi')
    expect(original).toHaveBeenCalledWith('oi')
    expect(log.list()).toHaveLength(1)
  })

  test('ERRO-01 ErrorEvent vira exception com arquivo:linha (sem query)', () => {
    const { log, events } = setup()
    events.dispatchEvent(new ErrorEvent('error', { message: 'Uncaught ReferenceError: foo', filename: 'http://app.test/main.js?v=9', lineno: 42 }))
    expect(log.list()).toEqual([expect.objectContaining({ kind: 'exception', message: 'Uncaught ReferenceError: foo', source: 'http://app.test/main.js:42' })])
  })

  test('ERRO-01 erro de carregamento de recurso (Event sem mensagem) é ignorado', () => {
    const { log, events } = setup()
    events.dispatchEvent(new Event('error'))
    expect(log.list()).toEqual([])
  })

  test('ERRO-01 unhandledrejection registra a mensagem do reason', () => {
    const { log, events } = setup()
    const ev = Object.assign(new Event('unhandledrejection'), { reason: new Error('promessa quebrou') })
    events.dispatchEvent(ev)
    const ev2 = Object.assign(new Event('unhandledrejection'), { reason: 'texto' })
    events.dispatchEvent(ev2)
    expect(log.list().map((e) => [e.kind, e.message])).toEqual([['rejection', 'Error: promessa quebrou'], ['rejection', 'texto']])
  })

  test('ERRO-01 fetch 404 registrado e a mesma resposta volta para a página', async () => {
    const res = { status: 404, url: 'http://app.test/api/nao-existe?token=1' }
    const { win, log } = setup(async () => res)
    const out = await win.fetch('/api/nao-existe?token=1', { method: 'post' })
    expect(out).toBe(res)
    await flush()
    expect(log.list()).toEqual([expect.objectContaining({ kind: 'network', method: 'POST', url: 'http://app.test/api/nao-existe', status: 404 })])
  })

  test('ERRO-01 fetch com Request usa o método do Request', async () => {
    const { win, log } = setup(async () => ({ status: 500, url: '' }))
    await win.fetch(new Request('http://app.test/r', { method: 'DELETE' }))
    await flush()
    expect(log.list()[0]).toMatchObject({ method: 'DELETE', url: 'http://app.test/r', status: 500 })
  })

  test('ERRO-01 fetch 200 não registra', async () => {
    const { win, log } = setup()
    await win.fetch('/ok')
    await flush()
    expect(log.list()).toEqual([])
  })

  test('ERRO-01 fetch rejeitado vira falha de rede e continua rejeitando para a página', async () => {
    const { win, log } = setup(async () => { throw new TypeError('Failed to fetch') })
    await expect(win.fetch('http://outro.test/x')).rejects.toThrow('Failed to fetch')
    await flush()
    expect(log.list()[0]).toMatchObject({ kind: 'network', status: 0, message: 'GET http://outro.test/x → falha de rede' })
  })

  test('ERRO-01 XHR 500 registrado; 200 e abort não', () => {
    const { win, log } = setup()
    const ok = new win.XMLHttpRequest()
    ok.open('GET', '/ok')
    ok.send()
    ok.finish(200)
    const aborted = new win.XMLHttpRequest()
    aborted.open('GET', '/cancelado')
    aborted.send()
    aborted.finish(0, 'abort')
    const bad = new win.XMLHttpRequest()
    bad.open('put', '/api/salvar?id=3')
    bad.send()
    bad.finish(500)
    const down = new win.XMLHttpRequest()
    down.open('GET', 'http://fora.test/x')
    down.send()
    down.finish(0, 'error')
    expect(log.list().map((e) => e.message)).toEqual(['PUT http://app.test/api/salvar → 500', 'GET http://fora.test/x → falha de rede'])
  })

  test('ERRO-01 falha dentro do hook não quebra a chamada original', () => {
    const { win, previousError } = setup()
    const evil = { toJSON() { throw new Error('não serializa') }, toString() { throw new Error('nem isso') } }
    expect(() => win.console.error(evil)).not.toThrow()
    expect(previousError).toHaveBeenCalledWith(evil)
  })
})
