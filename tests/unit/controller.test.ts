import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createController as create, type ControllerDeps } from '@/entrypoints/annotator.content/controller'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { draft } from './fixtures/annotations'

let ui: UiHost
const created: Array<ReturnType<typeof create>> = []
// Cada controller instala listeners em window: desativar no teardown para não vazar entre testes.
const createController = (deps: ControllerDeps) => { const c = create(deps); created.push(c); return c }
const capture = vi.fn(async (_el: Element, note: string) => draft({ note, selector: '#alvo', pathname: location.pathname }))

beforeEach(() => {
  history.replaceState(null, '', '/')
  document.body.innerHTML = '<button id="alvo">Salvar</button><p id="outro">x</p>'
  ui = createHost()
  capture.mockClear()
})
afterEach(() => {
  for (const c of created.splice(0)) if (c.isActive()) c.toggle()
  ui.host.remove()
})

const panel = () => ui.root.querySelector<HTMLElement>('.pxa-panel')!
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
const typeNote = async (text: string, key = 'Enter') => {
  const ta = ui.root.querySelector('textarea')!
  ta.value = text
  ta.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  await vi.waitFor(() => expect(capture.mock.calls.length + (key === 'Escape' ? 1 : 0)).toBeGreaterThan(0))
}

describe('controller', () => {
  test('ANOT-01 toggle ativa: painel visível e interceptor instalado', () => {
    const c = createController({ ui, capture })
    c.toggle()
    expect(c.isActive()).toBe(true)
    expect(panel().style.display).toBe('flex')
    const page = vi.fn()
    document.getElementById('alvo')!.addEventListener('click', page)
    click(document.getElementById('alvo')!)
    expect(page).not.toHaveBeenCalled()
    expect(ui.root.querySelector('.pxa-editor')).not.toBeNull()
  })

  test('ANOT-02 toggle desativa: painel e marcadores ocultos, store mantém anotações; reativar mostra de novo', async () => {
    const c = createController({ ui, capture })
    c.toggle()
    click(document.getElementById('alvo')!)
    await typeNote('cor errada')
    await vi.waitFor(() => expect(c.store.list()).toHaveLength(1))
    c.toggle()
    expect(c.isActive()).toBe(false)
    expect(panel().style.display).toBe('none')
    expect(ui.root.querySelector<HTMLElement>('.pxa-marker')?.style.display ?? 'none').toBe('none')
    const page = vi.fn()
    document.getElementById('alvo')!.addEventListener('click', page)
    click(document.getElementById('alvo')!)
    expect(page).toHaveBeenCalled() // interceptor removido
    expect(c.store.list()).toHaveLength(1)
    c.toggle()
    expect(panel().style.display).toBe('flex')
    expect(ui.root.querySelectorAll('.pxa-item')).toHaveLength(1)
  })

  test('ANOT-04 em largura mobile o painel abre recolhido para não cobrir a página', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    const c = createController({ ui, capture })
    c.toggle()
    expect(panel().classList.contains('pxa-collapsed')).toBe(true)
    c.toggle()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    c.toggle()
    expect(panel().classList.contains('pxa-collapsed')).toBe(false)
  })

  test('ANOT-02 toggle durante editing fecha o editor sem criar anotação', () => {
    const c = createController({ ui, capture })
    c.toggle()
    click(document.getElementById('alvo')!)
    expect(c.state()).toBe('editing')
    c.toggle()
    expect(ui.root.querySelector('.pxa-editor')).toBeNull()
    expect(c.store.list()).toHaveLength(0)
    expect(capture).not.toHaveBeenCalled()
  })

  test('ANOT-05 pick → save cria anotação #1 e volta para active', async () => {
    const c = createController({ ui, capture })
    c.toggle()
    click(document.getElementById('alvo')!)
    await typeNote('padding maior')
    await vi.waitFor(() => expect(c.state()).toBe('active'))
    expect(capture).toHaveBeenCalledWith(document.getElementById('alvo'), 'padding maior')
    expect(c.store.list().map((a) => [a.number, a.note])).toEqual([[1, 'padding maior']])
  })

  test('ANOT-06 pick → cancel não cria anotação', () => {
    const c = createController({ ui, capture })
    c.toggle()
    click(document.getElementById('alvo')!)
    const ta = ui.root.querySelector('textarea')!
    ta.value = 'algo'
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(c.state()).toBe('active')
    expect(c.store.list()).toHaveLength(0)
  })

  test('PAIN-02 onFocus de anotação não encontrada mostra "elemento não encontrado nesta tela"', async () => {
    const c = createController({ ui, capture })
    c.toggle()
    click(document.getElementById('alvo')!)
    await typeNote('x')
    await vi.waitFor(() => expect(c.store.list()).toHaveLength(1))
    document.getElementById('alvo')!.remove()
    ui.root.querySelector<HTMLButtonElement>('.pxa-item-main')!.click()
    expect(ui.root.querySelector('.pxa-toast')!.textContent).toBe('elemento não encontrado nesta tela')
  })

  test('PAIN-03 editar pelo painel atualiza a nota sem recapturar', async () => {
    const c = createController({ ui, capture })
    c.toggle()
    click(document.getElementById('alvo')!)
    await typeNote('velha')
    await vi.waitFor(() => expect(c.store.list()).toHaveLength(1))
    ui.root.querySelector<HTMLButtonElement>('button[aria-label^="Editar"]')!.click()
    const ta = ui.root.querySelector('textarea')!
    expect(ta.value).toBe('velha')
    ta.value = 'nova'
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(c.store.list()[0]!.note).toBe('nova')
    expect(capture).toHaveBeenCalledTimes(1)
  })
})
