import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { createMarkers } from '@/entrypoints/annotator.content/ui/markers'
import { createStore, type AnnotationStore } from '@/lib/store'
import { draft } from './fixtures/annotations'

let ui: UiHost
let store: AnnotationStore
const rect = (left: number, top: number) => ({ left, top, width: 10, height: 10, x: left, y: top, right: left + 10, bottom: top + 10, toJSON() {} }) as DOMRect
const markers = () => Array.from(ui.root.querySelectorAll<HTMLElement>('.pxa-marker'))

beforeEach(() => {
  history.replaceState(null, '', '/a')
  document.body.innerHTML = '<p id="p1">1</p><p id="p2">2</p>'
  ui = createHost()
  store = createStore()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
})
afterEach(() => ui.host.remove())

const add = (id: string, over = {}) => store.add(draft({ selector: `#${id}`, pathname: '/a', ...over }), document.getElementById(id)!)

describe('markers', () => {
  test('ANOT-05 cria marcador numerado para cada anotação', () => {
    add('p1'); add('p2')
    createMarkers(ui, store).update()
    expect(markers().map((m) => m.textContent)).toEqual(['1', '2'])
  })

  test('ANOT-08 reposiciona conforme getBoundingClientRect muda', () => {
    const p = document.getElementById('p1')!
    const spy = vi.spyOn(p, 'getBoundingClientRect').mockReturnValue(rect(10, 20))
    add('p1')
    const m = createMarkers(ui, store)
    m.update()
    expect(markers()[0]!.style.left).toBe('10px')
    spy.mockReturnValue(rect(40, 300))
    m.update()
    expect(markers()[0]!.style.left).toBe('40px')
    expect(markers()[0]!.style.top).toBe('300px')
  })

  test('PAIN-06 oculta marcadores de outra rota e mantém os da rota atual', () => {
    add('p1')
    add('p2', { pathname: '/b' })
    const m = createMarkers(ui, store)
    m.update()
    expect(markers().map((x) => x.style.display)).toEqual(['block', 'none'])
    history.pushState(null, '', '/b')
    m.update()
    expect(markers().map((x) => x.style.display)).toEqual(['none', 'block'])
  })

  test('caso limite: elemento removido e seletor sem match → marcador oculto', () => {
    add('p1')
    document.getElementById('p1')!.remove()
    createMarkers(ui, store).update()
    expect(markers()[0]!.style.display).toBe('none')
  })

  test('PAIN-04 remove marcador da anotação excluída', () => {
    const a = add('p1'); add('p2')
    const m = createMarkers(ui, store)
    m.update()
    store.remove(a.id)
    m.update()
    expect(markers().map((x) => x.textContent)).toEqual(['2'])
  })

  test('MARC-01 cor por categoria', () => {
    add('p1')
    add('p2', { viewport: { width: 1440, height: 900, breakpoint: 'xl', category: 'desktop', dpr: 1, orientation: 'paisagem' } })
    createMarkers(ui, store).update()
    expect(markers()[0]!.style.background).toMatch(/#3fbf5f|rgb\(63, 191, 95\)/)
    expect(markers()[1]!.style.background).toMatch(/#4a8cff|rgb\(74, 140, 255\)/)
  })

  test('MARC-02 opacidade 0.35 quando a categoria atual difere', () => {
    add('p1')
    const m = createMarkers(ui, store)
    m.update()
    expect(markers()[0]!.style.opacity).toBe('1')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    m.update()
    expect(markers()[0]!.style.opacity).toBe('0.35')
  })
})
