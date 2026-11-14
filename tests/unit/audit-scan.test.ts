import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { scanDocument } from '@/entrypoints/annotator.content/audit-scan'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'

let ui: UiHost
const now = (cb: () => void) => cb()

beforeEach(() => {
  ui = createHost()
  // happy-dom não faz layout: tamanho 0 só para quem tem data-zero.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return this.hasAttribute('data-zero') ? new DOMRect(0, 0, 0, 0) : new DOMRect(0, 0, 100, 20)
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  ui.host.remove()
})

describe('audit-scan', () => {
  test('DETE-01 varre só elementos visíveis, fora da UI do PxA', async () => {
    document.body.innerHTML = `
      <div id="a" style="color: rgb(1, 2, 3); padding: 13px">texto</div>
      <p id="none" style="display: none">x<b id="dentro-do-none">y</b></p>
      <p id="hidden" style="visibility: hidden">x</p>
      <p id="zero" data-zero>x</p>`
    ui.layer.append(document.createElement('div'))
    const r = await scanDocument({ idle: now })
    expect(r.elements.map((e) => e.id || e.localName)).toEqual(['body', 'a'])
    expect(r.truncated).toBe(false)
    const a = r.samples[1]!
    expect(a.colors).toContain('rgb(1, 2, 3)')
    expect(a.spacings).toContain('13px')
    expect(a.fontSize).toBe('16px')
  })

  test('DETE-01 cor do texto e fonte só contam em elemento com texto próprio; borda só com largura', async () => {
    document.body.innerHTML = '<div id="w" style="color: rgb(9, 9, 9); border-top: 0px solid rgb(5, 5, 5)"><b style="border-top: 2px solid rgb(7, 7, 7)">oi</b></div>'
    const r = await scanDocument({ idle: now })
    const w = r.samples[r.elements.findIndex((e) => e.id === 'w')]!
    const b = r.samples[r.elements.findIndex((e) => e.localName === 'b')]!
    expect(w.colors).not.toContain('rgb(9, 9, 9)')
    expect(w.colors).not.toContain('rgb(5, 5, 5)')
    expect(w.fontSize).toBe('')
    expect(b.colors).toContain('rgb(7, 7, 7)')
    expect(b.fontSize).toBe('16px')
  })

  test('DETE-01 margem horizontal auto não conta como espaçamento', async () => {
    document.body.innerHTML = '<div style="margin: 13px auto">x</div>'
    const r = await scanDocument({ idle: now })
    expect(r.samples[1]!.spacings.filter((s) => s === '13px')).toHaveLength(2) // só top e bottom
    expect(r.samples[1]!.spacings).not.toContain('auto')
  })

  test('DETE-06 varre em lotes, cedendo a vez entre eles, e avisa o progresso', async () => {
    document.body.innerHTML = '<i>1</i><i>2</i><i>3</i><i>4</i><i>5</i>'
    const idle = vi.fn(now)
    const onProgress = vi.fn()
    const r = await scanDocument({ batch: 2, idle, onProgress })
    expect(r.elements).toHaveLength(6) // body + 5
    expect(idle).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenLastCalledWith(4)
  })

  test('DETE-06 corta no limite e marca truncated', async () => {
    document.body.innerHTML = '<i>1</i><i>2</i><i>3</i>'
    const r = await scanDocument({ limit: 2, idle: now })
    expect(r.elements).toHaveLength(2)
    expect(r.truncated).toBe(true)
  })
})
