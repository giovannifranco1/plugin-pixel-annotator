import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { createLoupe } from '@/entrypoints/annotator.content/ui/loupe'
import { toHex } from '@/lib/color'
import type { Pixels } from '@/lib/loupe'

let ui: UiHost
let loupe: ReturnType<typeof createLoupe> | null = null
const onOff = vi.fn()
const writeText = vi.fn(async (_: string) => {})

/** Print com escala `dpr` em relação ao viewport; o pixel (x, y) tem cor (x % 256, y % 256, 7). */
function shot(dpr = 1): Pixels {
  const width = innerWidth * dpr
  const height = innerHeight * dpr
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set([x % 256, y % 256, 7, 255], (y * width + x) * 4)
  return { width, height, data }
}

beforeEach(() => {
  ui = createHost()
  onOff.mockClear()
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})
afterEach(() => {
  loupe?.setOn(false)
  loupe = null
  vi.useRealTimers()
  ui.host.remove()
})

const $ = (sel: string) => ui.root.querySelector<HTMLElement>(sel)
const move = (x: number, y: number) => window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }))
const draw = () => loupe!.measure()()

function setup(opts: { dpr?: number; fail?: boolean } = {}) {
  const capture = vi.fn(async () => {
    if (opts.fail) throw new Error('sem permissão')
    expect(ui.host.style.visibility).toBe('hidden') // print sem a UI do PxA
    return 'data:image/png;base64,'
  })
  const pixels = shot(opts.dpr)
  loupe = createLoupe(ui, { capture, decode: async () => pixels, onOff })
  return capture
}

describe('loupe ui', () => {
  test('LUPA-01 ligar pede um print sem a UI e mostra zoom com o hex do pixel sob o cursor', async () => {
    const capture = setup()
    loupe!.setOn(true)
    await vi.waitFor(() => expect(loupe!.ready()).toBe(true))
    expect(capture).toHaveBeenCalledTimes(1)
    move(40, 30)
    draw()
    expect($('.pxa-loupe')!.style.display).toBe('block')
    expect($('.pxa-loupe-hex')!.textContent).toBe(toHex(40, 30, 7))
    expect($('.pxa-loupe')!.style.left).toBe('56px') // 16px à direita do cursor
  })

  test('LUPA-04 considera o DPR: com print 2× o pixel físico é o dobro do ponto CSS', async () => {
    setup({ dpr: 2 })
    loupe!.setOn(true)
    await vi.waitFor(() => expect(loupe!.ready()).toBe(true))
    move(40, 30)
    draw()
    expect($('.pxa-loupe-hex')!.textContent).toBe(toHex(80, 60, 7))
  })

  test('LUPA-02 copiar grava o hex na área de transferência e avisa; Esc desliga', async () => {
    setup()
    loupe!.setOn(true)
    await vi.waitFor(() => expect(loupe!.ready()).toBe(true))
    move(10, 20)
    await loupe!.copy()
    expect(writeText).toHaveBeenCalledWith(toHex(10, 20, 7))
    expect($('.pxa-toast')!.textContent).toBe(`${toHex(10, 20, 7)} copiado`)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(loupe!.isOn()).toBe(false)
    expect(onOff).toHaveBeenCalled()
    draw()
    expect($('.pxa-loupe')!.style.display).toBe('none')
  })

  test('LUPA-03 rolar invalida o print, mostra "atualizando…" e pede outro só após 300ms parado', async () => {
    const capture = setup()
    loupe!.setOn(true)
    await vi.waitFor(() => expect(loupe!.ready()).toBe(true))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    move(10, 10)
    document.dispatchEvent(new Event('scroll'))
    draw()
    expect(loupe!.ready()).toBe(false)
    expect($('.pxa-loupe-hex')!.textContent).toBe('atualizando…')
    vi.advanceTimersByTime(200)
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(299)
    expect(capture).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    vi.useRealTimers()
    await vi.waitFor(() => expect(loupe!.ready()).toBe(true))
    expect(capture).toHaveBeenCalledTimes(2)
  })

  test('página sem captura: avisa como o print do M1 e desliga', async () => {
    setup({ fail: true })
    loupe!.setOn(true)
    await vi.waitFor(() => expect(loupe!.isOn()).toBe(false))
    expect($('.pxa-toast')!.textContent).toBe('Print indisponível nesta página')
    expect(onOff).toHaveBeenCalled()
  })
})
