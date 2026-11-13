import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { probeComponent } from '@/entrypoints/annotator.content/probe-client'

let off: (() => void) | undefined
function fakeProbe(respond: (reqId: string, el: Element | null) => unknown) {
  const handler = (ev: Event) => {
    const { reqId } = JSON.parse(String((ev as CustomEvent).detail))
    const el = document.querySelector(`[data-pxa-probe="${reqId}"]`)
    const detail = respond(reqId, el)
    if (detail !== undefined) window.dispatchEvent(new CustomEvent('pxa:probe-response', { detail: JSON.stringify(detail) }))
  }
  window.addEventListener('pxa:probe-request', handler)
  off = () => window.removeEventListener('pxa:probe-request', handler)
}

beforeEach(() => { document.body.innerHTML = '<button>ok</button>' })
afterEach(() => { off?.(); off = undefined; vi.useRealTimers() })
const btn = () => document.querySelector('button')!

describe('probe-client', () => {
  test('COMP-01 recebe o resultado do probe para o reqId certo', async () => {
    const info = { framework: 'react', name: 'Card', chain: ['List'] }
    fakeProbe((reqId, el) => ({ reqId, result: el === btn() ? info : null }))
    expect(await probeComponent(btn())).toEqual(info)
  })

  test('COMP-04 timeout de 300ms → null', async () => {
    vi.useFakeTimers()
    const p = probeComponent(btn())
    await vi.advanceTimersByTimeAsync(300)
    expect(await p).toBeNull()
  })

  test('COMP-04 ignora resposta de outro reqId', async () => {
    vi.useFakeTimers()
    fakeProbe(() => ({ reqId: 'outro', result: { framework: 'vue3', name: 'X', chain: [] } }))
    const p = probeComponent(btn())
    await vi.advanceTimersByTimeAsync(300)
    expect(await p).toBeNull()
  })

  test('COMP-04 remove data-pxa-probe sempre (sucesso e timeout)', async () => {
    fakeProbe((reqId) => ({ reqId, result: null }))
    await probeComponent(btn())
    expect(btn().hasAttribute('data-pxa-probe')).toBe(false)
    off?.(); off = undefined
    vi.useFakeTimers()
    const p = probeComponent(btn())
    expect(btn().hasAttribute('data-pxa-probe')).toBe(true)
    await vi.advanceTimersByTimeAsync(300)
    await p
    expect(btn().hasAttribute('data-pxa-probe')).toBe(false)
  })
})
