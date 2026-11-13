import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { captureContext } from '@/entrypoints/annotator.content/capture'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { CSS_PROPERTIES } from '@/lib/css-filter'

let ui: UiHost
const failCapture = vi.fn(async () => { throw new Error('sem print') })
const noProbe = vi.fn(async () => null)
const defaults = () => Object.fromEntries(CSS_PROPERTIES.map((p) => [p, ''])) as Record<string, string>

beforeEach(() => {
  history.replaceState(null, '', '/dashboard?tab=2#lista')
  document.body.innerHTML = '<main><ul><li class="item">a</li><li class="item" style="color: rgb(255, 0, 0)">b</li></ul></main>'
  ui = createHost()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 })
})
afterEach(() => ui.host.remove())

const target = () => document.querySelectorAll('li')[1]!
const run = (deps = {}) => captureContext(target(), 'cor errada', { ui, defaultStyle: defaults, probe: noProbe, capture: failCapture, ...deps })

describe('captureContext', () => {
  test('CAPT-01 guarda url completa e path com search e hash', async () => {
    const d = await run()
    expect(d.url).toBe(location.href)
    expect(d.path).toBe('/dashboard?tab=2#lista')
    expect(d.pathname).toBe('/dashboard')
    expect(d.note).toBe('cor errada')
  })

  test('CAPT-02 seletor do draft é único para o elemento', async () => {
    const d = await run()
    const found = document.querySelectorAll(d.selector)
    expect(found.length).toBe(1)
    expect(found[0]).toBe(target())
  })

  test('CAPT-03 viewport do draft vem de innerWidth/innerHeight/devicePixelRatio', async () => {
    expect((await run()).viewport).toEqual({ width: 390, height: 844, breakpoint: 'base', category: 'mobile', dpr: 3, orientation: 'retrato' })
  })

  test('CAPT-04 rect e scroll', async () => {
    vi.spyOn(target(), 'getBoundingClientRect').mockReturnValue({ x: 5, y: 6, width: 70, height: 20, left: 5, top: 6, right: 75, bottom: 26, toJSON() {} } as DOMRect)
    const d = await run()
    expect(d.rect).toEqual({ x: 5, y: 6, width: 70, height: 20 })
    expect(d.scroll).toEqual({ x: window.scrollX, y: window.scrollY })
  })

  test('CAPT-05 outerHtml truncado e flag', async () => {
    target().textContent = 'x'.repeat(3000)
    const d = await run()
    expect(d.outerHtml.length).toBe(2000)
    expect(d.outerHtmlTruncated).toBe(true)
  })

  test('CAPT-06 css filtrado contra o default injetado', async () => {
    const d = await run()
    const css = Object.fromEntries(d.css)
    expect(css.color).toBe('rgb(255, 0, 0)')
    expect(Object.keys(css)).toContain('display')
  })

  test('COMP-04 probe null → component null sem erro', async () => {
    expect((await run()).component).toBeNull()
    const info = { framework: 'react' as const, name: 'Item', chain: [] }
    expect((await run({ probe: async () => info })).component).toEqual(info)
  })

  test('CAPT-07 print falhou → shot null e UI restaurada', async () => {
    const hidden = vi.spyOn(ui, 'setHidden')
    const d = await run()
    expect(d.shot).toBeNull()
    expect(hidden).toHaveBeenCalledWith(true)
    expect(hidden).toHaveBeenLastCalledWith(false)
    expect(ui.host.style.visibility).toBe('visible')
  })
})
