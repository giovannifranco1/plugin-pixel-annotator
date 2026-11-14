import { describe, expect, test } from 'vitest'
import { clip, createErrorLog, sanitizeUrl } from '@/lib/error-log'

function clock(start = Date.UTC(2026, 10, 14, 12, 0, 0)) {
  let t = start
  return { now: () => new Date(t), advance: (ms: number) => { t += ms } }
}

describe('error-log', () => {
  test('ERRO-02 FIFO de 50: a 51ª entrada derruba a mais antiga', () => {
    const log = createErrorLog()
    for (let i = 0; i < 51; i++) log.push({ kind: 'console', message: `erro ${i}` })
    const list = log.list()
    expect(list).toHaveLength(50)
    expect(list[0]!.message).toBe('erro 1')
    expect(list[49]!.message).toBe('erro 50')
  })

  test('ERRO-02 repetição idêntica vira ×N, atualiza o horário e vai para o fim', () => {
    const c = clock()
    const log = createErrorLog({ now: c.now })
    log.push({ kind: 'console', message: 'boom' })
    log.push({ kind: 'console', message: 'outro' })
    c.advance(1000)
    log.push({ kind: 'console', message: 'boom' })
    const list = log.list()
    expect(list.map((e) => [e.message, e.count])).toEqual([['outro', 1], ['boom', 2]])
    expect(list[1]!.at).toBe('2026-11-14T12:00:01.000Z')
  })

  test('ERRO-02 erros em loop não passam de 50 entradas', () => {
    const log = createErrorLog()
    for (let i = 0; i < 1000; i++) log.push({ kind: 'exception', message: 'loop', source: 'app.js:1' })
    expect(log.list()).toEqual([expect.objectContaining({ message: 'loop', count: 1000 })])
  })

  test('ERRO-02 tipos diferentes com a mesma mensagem não se juntam', () => {
    const log = createErrorLog()
    log.push({ kind: 'console', message: 'x' })
    log.push({ kind: 'rejection', message: 'x' })
    expect(log.list()).toHaveLength(2)
  })

  test('ERRO-02 mensagem cortada em 500 caracteres', () => {
    const log = createErrorLog()
    log.push({ kind: 'console', message: 'a'.repeat(800) })
    expect(log.list()[0]!.message).toHaveLength(500)
    expect(clip('abc', 2)).toBe('ab')
  })

  test('ERRO-02 URL de rede sem query string e sem fragmento; mensagem de rede montada', () => {
    const log = createErrorLog()
    log.push({ kind: 'network', message: '', method: 'GET', url: 'https://api.app.com/v1/users?token=abc#x', status: 404 })
    log.push({ kind: 'network', message: '', method: 'POST', url: 'https://api.app.com/v1/x', status: 0 })
    const [notFound, failed] = log.list()
    expect(notFound).toMatchObject({ url: 'https://api.app.com/v1/users', message: 'GET https://api.app.com/v1/users → 404' })
    expect(failed!.message).toBe('POST https://api.app.com/v1/x → falha de rede')
  })

  test('ERRO-02 sanitizeUrl resolve relativa e tolera URL inválida', () => {
    expect(sanitizeUrl('/api/x?a=1', 'http://localhost:5177/index.html')).toBe('http://localhost:5177/api/x')
    expect(sanitizeUrl('http://[::1')).toBe('http://[::1')
    expect(sanitizeUrl('nada?q#f')).toBe('nada')
  })

  test('ERRO-03 since(60s) devolve só o que ocorreu na janela (pela última ocorrência)', () => {
    const c = clock()
    const log = createErrorLog({ now: c.now })
    log.push({ kind: 'console', message: 'velho' })
    log.push({ kind: 'console', message: 'repetido' })
    c.advance(61_000)
    log.push({ kind: 'console', message: 'repetido' })
    log.push({ kind: 'console', message: 'novo' })
    expect(log.since(60_000).map((e) => e.message)).toEqual(['repetido', 'novo'])
  })
})
