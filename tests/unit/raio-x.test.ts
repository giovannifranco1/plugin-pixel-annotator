import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { createRaioX } from '@/entrypoints/annotator.content/raio-x'

let ui: UiHost
let rx: ReturnType<typeof createRaioX>
const annotate = vi.fn()
const writeText = vi.fn(async (_: string) => {})
const scan = vi.fn(async () => ({ elements: [], samples: [], truncated: false, ms: 1 }))
const pixels = { width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255]) }

beforeEach(() => {
  ui = createHost()
  document.body.innerHTML = '<p>x</p>'
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  rx = createRaioX(ui, { annotate }, { scan, capture: async () => 'data:', decode: async () => pixels })
})
afterEach(() => {
  rx.reset()
  vi.restoreAllMocks()
  ui.host.remove()
})

const tool = (label: string) => rx.tools.find((t) => t.label === label)!
const button = (label: string) => ({ click: () => tool(label).toggle() })
const pressed = (label: string) => String(tool(label).isOn())

describe('raio-x', () => {
  test('ferramentas Detector e Lupa para o menu, cada uma ligando e desligando', async () => {
    expect(rx.tools.map((t) => t.label)).toEqual(['Detector', 'Lupa'])
    button('Detector').click()
    expect(pressed('Detector')).toBe('true')
    await vi.waitFor(() => expect(scan).toHaveBeenCalled())
    button('Lupa').click()
    expect(pressed('Lupa')).toBe('true')
    button('Detector').click()
    expect(pressed('Detector')).toBe('false')
  })

  test('LUPA-02 com a Lupa ligada o clique copia o hex e não segue para a anotação', async () => {
    button('Lupa').click()
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 0 }))
    await vi.waitFor(async () => {
      expect(rx.pick()).toBe(true)
      await Promise.resolve()
      expect(writeText).toHaveBeenCalledWith('#ff0000')
    })
  })

  test('sem a Lupa o clique segue para a anotação', () => {
    expect(rx.pick()).toBe(false)
  })

  test('reset desliga o Detector e a Lupa', async () => {
    button('Detector').click()
    button('Lupa').click()
    rx.reset()
    expect(['Detector', 'Lupa'].map(pressed)).toEqual(['false', 'false'])
    expect(ui.root.querySelector<HTMLElement>('.pxa-audit')!.style.display).toBe('none')
  })
})
