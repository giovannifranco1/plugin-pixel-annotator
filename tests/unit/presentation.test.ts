import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { openPresentation } from '@/entrypoints/annotator.content/ui/presentation'
import { createStore, type AnnotationStore } from '@/lib/store'
import { draft } from './fixtures/annotations'

let ui: UiHost
let store: AnnotationStore
const opened: Array<{ close(): void }> = []
const desktop = { width: 1440, height: 900, breakpoint: 'xl' as const, category: 'desktop' as const, dpr: 1, orientation: 'paisagem' as const }

beforeEach(() => {
  history.replaceState(null, '', '/dashboard')
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
  document.body.innerHTML = '<h1 id="a">A</h1><p id="b">B</p>'
  ui = createHost()
  store = createStore()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:print')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
// O modo escuta o teclado em window: fechar no teardown para não vazar entre testes.
afterEach(() => { for (const p of opened.splice(0)) p.close(); ui.host.remove(); vi.restoreAllMocks() })

function present(onClose = vi.fn()) {
  const p = openPresentation(ui, store, { onClose })
  opened.push(p)
  return { p, onClose }
}
const card = () => ui.root.querySelector<HTMLElement>('.pxa-present')!
const spot = () => ui.root.querySelector<HTMLElement>('.pxa-spot')!
const key = (k: string) => {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
  window.dispatchEvent(ev)
  return ev
}
const btn = (label: string) => card().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!

describe('presentation', () => {
  test('APRE-01 começa na primeira anotação da rota atual e marca a camada como apresentando', () => {
    store.add(draft({ pathname: '/outra', path: '/outra' }))
    store.add(draft({ pathname: '/dashboard', selector: '#b', note: 'segunda' }))
    present()
    expect(ui.layer.classList.contains('pxa-presenting')).toBe(true)
    expect(card().querySelector('.pxa-present-count')!.textContent).toBe('2/2')
    expect(card().textContent).toContain('segunda')
  })

  test('APRE-01 sem anotação na rota atual começa na primeira', () => {
    store.add(draft({ pathname: '/x', note: 'primeira' }))
    present()
    expect(card().querySelector('.pxa-present-count')!.textContent).toBe('1/1')
  })

  test('APRE-02 cartão com #n, ícone, largura e nota; recorte em volta do elemento; rola até ele', () => {
    const target = document.getElementById('a')!
    target.getBoundingClientRect = () => new DOMRect(100, 50, 200, 40)
    const scroll = vi.fn()
    target.scrollIntoView = scroll
    store.add(draft({ pathname: '/dashboard', selector: '#a', note: 'título apertado', viewport: desktop }))
    present()
    expect(card().querySelector('.pxa-present-meta')!.textContent).toContain('#1')
    expect(card().querySelector('.pxa-present-meta svg[shape-rendering="crispEdges"]')).not.toBeNull()
    expect(card().querySelector('.pxa-present-meta')!.textContent).toContain('1440px')
    expect(card().querySelector('.pxa-present-note')!.textContent).toBe('título apertado')
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    expect(spot().style.display).toBe('block')
    expect([spot().style.left, spot().style.top, spot().style.width, spot().style.height]).toEqual(['96px', '46px', '208px', '48px'])
  })

  test('APRE-03 → / Espaço avançam, ← volta, Home/End, sem passar das pontas; teclas não vazam para a página', () => {
    for (const n of ['um', 'dois', 'tres']) store.add(draft({ pathname: '/dashboard', selector: '#a', note: n, viewport: desktop }))
    present()
    const count = () => card().querySelector('.pxa-present-count')!.textContent
    expect(count()).toBe('1/3')
    const ev = key('ArrowRight')
    expect(ev.defaultPrevented).toBe(true)
    expect(count()).toBe('2/3')
    key(' ')
    expect(count()).toBe('3/3')
    key('ArrowRight')
    expect(count()).toBe('3/3')
    key('Home')
    expect(count()).toBe('1/3')
    key('ArrowLeft')
    expect(count()).toBe('1/3')
    key('End')
    expect(count()).toBe('3/3')
    key('ArrowLeft')
    expect(count()).toBe('2/3')
  })

  test('APRE-03 botões ◀ ▶ ✕ no cartão', () => {
    for (const n of ['um', 'dois']) store.add(draft({ pathname: '/dashboard', selector: '#a', note: n, viewport: desktop }))
    const { onClose } = present()
    expect(btn('Anterior').disabled).toBe(true)
    btn('Próxima').click()
    expect(card().querySelector('.pxa-present-note')!.textContent).toBe('dois')
    expect(btn('Próxima').disabled).toBe(true)
    btn('Anterior').click()
    expect(card().querySelector('.pxa-present-note')!.textContent).toBe('um')
    btn('Sair da apresentação').click()
    expect(onClose).toHaveBeenCalled()
  })

  test('APRE-04 anotação de outra rota: sem recorte, com print e "anotada em /rota"', () => {
    store.add(draft({ pathname: '/clientes', path: '/clientes?x=1', viewport: desktop }))
    present()
    expect(spot().style.display).toBe('none')
    expect(card().querySelector('.pxa-present-where')!.textContent).toBe('anotada em /clientes?x=1')
    expect(card().querySelector('img')!.getAttribute('src')).toBe('blob:print')
  })

  test('APRE-04/DESE-04 o print mostrado é o composto quando há Desenho', () => {
    const composite = new Blob(['c'])
    store.add(draft({ pathname: '/clientes', viewport: desktop, drawing: { strokes: [], block: 2, composite } }))
    present()
    expect(URL.createObjectURL).toHaveBeenCalledWith(composite)
  })

  test('caso limite: mesma rota mas elemento sumiu → sem recorte e "elemento não encontrado"', () => {
    store.add(draft({ pathname: '/dashboard', selector: '#sumiu', viewport: desktop }))
    present()
    expect(spot().style.display).toBe('none')
    expect(card().querySelector('.pxa-present-where')!.textContent).toBe('elemento não encontrado')
  })

  test('APRE-05 aviso quando a anotação foi feita em outra categoria de tela', () => {
    store.add(draft({ pathname: '/dashboard', selector: '#a' })) // 390px mobile
    present()
    expect(card().querySelector('.pxa-present-warn')!.textContent).toBe('anotada em 📱 390px, você está em 🖥️ 1440px')
    store.clear()
  })

  test('APRE-05 mesma categoria, sem aviso', () => {
    store.add(draft({ pathname: '/dashboard', selector: '#a', viewport: desktop }))
    present()
    expect(card().querySelector('.pxa-present-warn')).toBeNull()
  })

  test('APRE-06 Esc chama onClose, tira a camada de apresentação e libera o teclado', () => {
    store.add(draft({ pathname: '/clientes', viewport: desktop }))
    const { p, onClose } = present()
    key('Escape')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(ui.layer.classList.contains('pxa-presenting')).toBe(false)
    expect(ui.root.querySelector('.pxa-present')).toBeNull()
    expect(ui.root.querySelector('.pxa-spot')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:print')
    const ev = key('ArrowRight')
    expect(ev.defaultPrevented).toBe(false)
    p.close() // idempotente, não chama onClose de novo
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
