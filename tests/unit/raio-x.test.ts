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
  document.body.innerHTML = '<div id="pai" style="width: 10px"><p id="filho">x</p></div>'
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  rx = createRaioX(ui, { annotate }, { scan, capture: async () => 'data:', decode: async () => pixels })
  ui.layer.append(rx.toolbar)
})
afterEach(() => {
  rx.reset()
  vi.restoreAllMocks()
  ui.host.remove()
})

const button = (label: string) => Array.from(rx.toolbar.querySelectorAll('button')).find((b) => b.textContent!.startsWith(label))!
const pressed = (label: string) => button(label).getAttribute('aria-pressed')

describe('raio-x', () => {
  test('barra com Detector, X-ray, Grade e Lupa, cada um alternando aria-pressed', async () => {
    expect(Array.from(rx.toolbar.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['Detector', 'X-ray', 'Grade', 'Lupa'])
    button('Detector').click()
    expect(pressed('Detector')).toBe('true')
    await vi.waitFor(() => expect(scan).toHaveBeenCalled())
    button('X-ray').click()
    expect(pressed('X-ray')).toBe('true')
    button('Grade').click()
    expect(button('Grade').textContent).toBe('Grade 8px')
    button('Grade').click()
    expect(button('Grade').textContent).toBe('Grade 4px')
    button('Lupa').click()
    expect(pressed('Lupa')).toBe('true')
    button('Detector').click()
    expect(pressed('Detector')).toBe('false')
  })

  test('LUPA-02 com a Lupa ligada o clique copia o hex e não segue para a anotação', async () => {
    button('Lupa').click()
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 0 }))
    await vi.waitFor(async () => {
      expect(rx.pick(document.body)).toEqual({ handled: true })
      await Promise.resolve()
      expect(writeText).toHaveBeenCalledWith('#ff0000')
    })
  })

  test('XRAY-04/05 com X-ray: clique num vermelho devolve alvo e nota; fora dele segue normal', () => {
    const rects: Record<string, DOMRect> = { pai: new DOMRect(0, 0, 10, 10), filho: new DOMRect(0, 0, 40, 10) }
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return rects[this.id] ?? new DOMRect(0, 0, 0, 0)
    })
    expect(rx.pick(document.getElementById('filho')!)).toBeNull() // X-ray desligado
    button('X-ray').click()
    rx.measure()()
    expect(rx.pick(document.getElementById('filho')!)).toEqual({ target: document.getElementById('filho'), note: '[Raio-X] vaza do pai #pai em 30px' })
    expect(rx.pick(document.getElementById('pai')!)).toBeNull()
  })

  test('reset desliga todas as ferramentas', () => {
    button('X-ray').click()
    button('Grade').click()
    button('Lupa').click()
    rx.reset()
    expect(['X-ray', 'Lupa'].map(pressed)).toEqual(['false', 'false'])
    expect(button('Grade').textContent).toBe('Grade')
    rx.measure()()
    expect(ui.root.querySelector<HTMLElement>('.pxa-grid')!.style.display).toBe('none')
  })
})
