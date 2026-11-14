import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { createXray } from '@/entrypoints/annotator.content/ui/xray'

let ui: UiHost
let rects: Record<string, DOMRect>
let xray: ReturnType<typeof createXray> | null = null
const onNotice = vi.fn()

beforeEach(() => {
  document.body.innerHTML = `
    <div id="pai" class="card">
      <div id="filho">ok</div>
      <div id="vaza"><b id="dentro">x</b></div>
      <div id="fixo" style="position: fixed">f</div>
    </div>
    <div id="longe">fora do viewport</div>`
  rects = {
    BODY: new DOMRect(0, 0, 1024, 768),
    pai: new DOMRect(10, 10, 200, 100),
    filho: new DOMRect(20, 20, 50, 20),
    vaza: new DOMRect(20, 50, 202, 20), // direita em 222: 12px além do pai (210)
    dentro: new DOMRect(20, 50, 10, 10),
    fixo: new DOMRect(500, 0, 100, 40),
    longe: new DOMRect(0, 2000, 100, 100),
  }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return rects[this.id || this.tagName] ?? new DOMRect(0, 0, 0, 0)
  })
  ui = createHost()
  onNotice.mockClear()
})
afterEach(() => {
  xray?.setOn(false)
  xray = null
  vi.restoreAllMocks()
  ui.host.remove()
})

const boxes = () => Array.from(ui.root.querySelectorAll<HTMLElement>('.pxa-xray .pxa-box')).filter((b) => b.style.display !== 'none')
const draw = () => xray!.measure()()

describe('xray', () => {
  test('XRAY-01 contorna os elementos visíveis no viewport com cor por profundidade', () => {
    xray = createXray(ui, { onNotice })
    xray.setOn(true)
    draw()
    const drawn = boxes()
    expect(drawn).toHaveLength(6) // body, pai, filho, vaza, dentro, fixo (longe está fora)
    const color = (left: number, top: number) => drawn.find((b) => b.style.left === `${left}px` && b.style.top === `${top}px`)!.style.borderColor
    expect(color(10, 10)).not.toBe(color(20, 20)) // pai × filho: profundidades diferentes
    expect(color(20, 20)).toBe(color(500, 0)) // filho × fixo: mesma profundidade
  })

  test('XRAY-02 elemento que vaza do pai fica vermelho com rótulo; fixed é ignorado', () => {
    xray = createXray(ui, { onNotice })
    xray.setOn(true)
    draw()
    const danger = boxes().filter((b) => b.classList.contains('pxa-danger'))
    expect(danger).toHaveLength(1)
    expect(danger[0]!.textContent).toBe('vaza 12px')
    expect(danger[0]!.style.top).toBe('50px')
  })

  test('XRAY-02 conteúdo maior que a caixa com overflow visível também vaza', () => {
    const filho = document.getElementById('filho')!
    Object.defineProperties(filho, { scrollWidth: { value: 90 }, clientWidth: { value: 50 }, scrollHeight: { value: 20 }, clientHeight: { value: 20 } })
    xray = createXray(ui, { onNotice })
    xray.setOn(true)
    draw()
    expect(xray.pickLeak(filho)).toEqual({ target: filho, note: '[Raio-X] conteúdo vaza de #filho em 40px' })
  })

  test('XRAY-02 pai cujo conteúdo transborda só por causa do filho vermelho não fica vermelho também', () => {
    const pai = document.getElementById('pai')!
    Object.defineProperties(pai, { scrollWidth: { value: 212 }, clientWidth: { value: 200 }, scrollHeight: { value: 100 }, clientHeight: { value: 100 } })
    xray = createXray(ui, { onNotice })
    xray.setOn(true)
    draw()
    expect(boxes().filter((b) => b.classList.contains('pxa-danger'))).toHaveLength(1)
    expect(xray.pickLeak(pai)).toBeNull()
  })

  test('XRAY-03 só recalcula depois de rolar ou redimensionar', () => {
    xray = createXray(ui, { onNotice })
    xray.setOn(true)
    draw()
    rects.pai = new DOMRect(10, 300, 200, 100)
    draw()
    expect(boxes().some((b) => b.style.top === '300px')).toBe(false)
    document.dispatchEvent(new Event('scroll'))
    draw()
    expect(boxes().some((b) => b.style.top === '300px')).toBe(true)
    rects.pai = new DOMRect(10, 400, 200, 100)
    window.dispatchEvent(new Event('resize'))
    draw()
    expect(boxes().some((b) => b.style.top === '400px')).toBe(true)
  })

  test('XRAY-04 pickLeak sobe até o elemento vermelho e devolve a nota pré-preenchida', () => {
    xray = createXray(ui, { onNotice })
    xray.setOn(true)
    draw()
    const vaza = document.getElementById('vaza')!
    expect(xray.pickLeak(document.getElementById('dentro')!)).toEqual({ target: vaza, note: '[Raio-X] vaza do pai #pai em 12px' })
    expect(xray.pickLeak(document.getElementById('filho')!)).toBeNull()
  })

  test('XRAY-06 acima do limite desenha só os vazamentos e avisa', () => {
    xray = createXray(ui, { onNotice, limit: 3 })
    xray.setOn(true)
    draw()
    expect(boxes()).toHaveLength(1)
    expect(onNotice).toHaveBeenLastCalledWith(expect.stringContaining('só vazamentos'))
  })

  test('desligar apaga os contornos e o aviso', () => {
    xray = createXray(ui, { onNotice, limit: 3 })
    xray.setOn(true)
    draw()
    xray.setOn(false)
    draw()
    expect(boxes()).toHaveLength(0)
    expect(onNotice).toHaveBeenLastCalledWith(null)
    expect(xray.pickLeak(document.getElementById('vaza')!)).toBeNull()
  })
})
