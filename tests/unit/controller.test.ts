import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createController as create, type ControllerDeps } from '@/entrypoints/annotator.content/controller'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { draft } from './fixtures/annotations'
import { strToU8, zipSync } from 'fflate'
import { buildManifest } from '@/lib/manifest'
import type { PageError } from '@/lib/types'

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

  const err: PageError = { kind: 'console', message: 'boom', at: '2026-11-14T12:00:00.000Z', count: 1 }
  const button = (label: string) => Array.from(ui.root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent === label || b.getAttribute('aria-label') === label)!

  test('ERRO-03 erros do probe pedidos no clique entram na anotação salva', async () => {
    const errors = vi.fn(async () => [err])
    const c = createController({ ui, capture, errors })
    c.toggle()
    click(document.getElementById('alvo')!)
    expect(errors).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(ui.root.querySelector('.pxa-errors')).not.toBeNull())
    await typeNote('com erro')
    await vi.waitFor(() => expect(c.store.list()).toHaveLength(1))
    expect(c.store.list()[0]!.errors).toEqual([err])
  })

  test('ERRO-03/ERRO-06 sem erros (ou probe ausente) a anotação sai sem o campo errors', async () => {
    const c = createController({ ui, capture, errors: async () => [] })
    c.toggle()
    click(document.getElementById('alvo')!)
    await typeNote('limpa')
    await vi.waitFor(() => expect(c.store.list()).toHaveLength(1))
    expect(c.store.list()[0]!).not.toHaveProperty('errors')
  })

  test('ERRO-04 editar a nota permite remover os erros já anexados', () => {
    const c = createController({ ui, capture })
    c.store.add(draft({ errors: [err] }))
    c.toggle()
    ui.root.querySelector<HTMLButtonElement>('button[aria-label^="Editar"]')!.click()
    ui.root.querySelector<HTMLButtonElement>('.pxa-errors button')!.click()
    const ta = ui.root.querySelector('textarea')!
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(c.store.list()[0]!.errors).toBeUndefined()
  })

  test('APRE-01 apresentar entra no modo, tira o Painel da frente e desliga o clique de anotar', () => {
    const c = createController({ ui, capture })
    c.store.add(draft({ selector: '#alvo', pathname: '/' }))
    c.toggle()
    button('Apresentar').click()
    expect(c.state()).toBe('presenting')
    expect(ui.layer.classList.contains('pxa-presenting')).toBe(true)
    click(document.getElementById('outro')!)
    expect(ui.root.querySelector('.pxa-editor')).toBeNull()
  })

  test('APRE-06 sair da apresentação volta para active com o Painel como estava', () => {
    const c = createController({ ui, capture })
    c.store.add(draft({ selector: '#alvo', pathname: '/' }))
    c.toggle()
    button('Recolher painel').click()
    button('Apresentar').click()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(c.state()).toBe('active')
    expect(ui.layer.classList.contains('pxa-presenting')).toBe(false)
    expect(panel().classList.contains('pxa-collapsed')).toBe(true)
  })

  test('APRE-06 desligar o modo pelo ícone durante a apresentação fecha tudo', () => {
    const c = createController({ ui, capture })
    c.store.add(draft({ selector: '#alvo', pathname: '/' }))
    c.toggle()
    button('Apresentar').click()
    c.toggle()
    expect(c.state()).toBe('inactive')
    expect(ui.root.querySelector('.pxa-present')).toBeNull()
  })

  test('DESE-01 Desenhar abre o editor; cancelar volta para active', async () => {
    const c = createController({ ui, capture })
    c.store.add(draft())
    c.toggle()
    button('Desenhar no print da anotação 1').click()
    expect(c.state()).toBe('editing')
    expect(ui.root.querySelector('.pxa-draw')).not.toBeNull()
    button('Cancelar').click()
    expect(c.state()).toBe('active')
  })

  async function importFile(manifestOrigin: string) {
    const m = buildManifest([{ ...draft({ selector: '#alvo', pathname: '/' }), id: 'imp-1', number: 5, createdAt: '', updatedAt: '' }], { origin: manifestOrigin, exportedAt: new Date() })
    return new File([zipSync({ 'pxa.json': strToU8(JSON.stringify(m)) }) as BlobPart], 'pxa.zip')
  }

  test('IMPO-03/IMPO-04 importar de outra origem avisa e importa mesmo assim', async () => {
    const c = createController({ ui, capture })
    c.toggle()
    const input = ui.root.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(input, 'files', { configurable: true, value: [await importFile('https://staging.app.com')] })
    input.dispatchEvent(new Event('change'))
    await vi.waitFor(() => expect(c.store.list()).toHaveLength(1))
    expect(c.store.list()[0]!.importedFrom).toEqual({ origin: 'https://staging.app.com', number: 5 })
    expect(ui.root.querySelector('.pxa-toast')!.textContent).toBe('1 anotação importada · anotações de staging.app.com')
    expect(c.store.isDirty()).toBe(true)
  })

  test('IMPO-06 importar de novo não duplica e avisa', async () => {
    const c = createController({ ui, capture })
    c.toggle()
    const input = ui.root.querySelector<HTMLInputElement>('input[type="file"]')!
    for (let i = 0; i < 2; i++) {
      Object.defineProperty(input, 'files', { configurable: true, value: [await importFile(location.origin)] })
      input.dispatchEvent(new Event('change'))
      await vi.waitFor(() => expect(c.store.list()).toHaveLength(1))
    }
    await vi.waitFor(() => expect(ui.root.querySelector('.pxa-toast')!.textContent).toBe('Nada novo: essas anotações já estão aqui.'))
  })

  test('IMPO-02 zip inválido mostra o motivo e não importa', async () => {
    const c = createController({ ui, capture })
    c.toggle()
    const input = ui.root.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([zipSync({ 'feedback.md': strToU8('x') }) as BlobPart], 'velho.zip')] })
    input.dispatchEvent(new Event('change'))
    await vi.waitFor(() => expect(ui.root.querySelector('.pxa-toast')?.textContent).toContain('não tem pxa.json'))
    expect(c.store.list()).toHaveLength(0)
  })

  test('IMPO-05 importada sem elemento na página mostra "elemento não encontrado" no Painel', async () => {
    const c = createController({ ui, capture })
    c.toggle()
    c.store.importAnnotations([{ ...draft({ selector: '#nao-existe', pathname: '/' }), id: 'x', number: 1, createdAt: '', updatedAt: '' }], 'https://a.com')
    c.store.importAnnotations([{ ...draft({ selector: '#alvo', pathname: '/' }), id: 'y', number: 2, createdAt: '', updatedAt: '' }], 'https://a.com')
    expect(ui.root.querySelectorAll('.pxa-missing')).toHaveLength(1)
    expect(ui.root.querySelector('li[data-id="x"] .pxa-missing')).not.toBeNull()
  })
})

