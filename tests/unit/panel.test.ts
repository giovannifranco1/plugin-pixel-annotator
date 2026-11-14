import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { createPanel, type PanelActions } from '@/entrypoints/annotator.content/ui/panel'
import { createStore, type AnnotationStore } from '@/lib/store'
import { draft } from './fixtures/annotations'

let ui: UiHost
let store: AnnotationStore
let actions: { [K in keyof PanelActions]: ReturnType<typeof vi.fn<PanelActions[K]>> }

beforeEach(() => {
  ui = createHost()
  store = createStore()
  actions = {
    onFocus: vi.fn<PanelActions['onFocus']>(), onEdit: vi.fn<PanelActions['onEdit']>(), onDelete: vi.fn<PanelActions['onDelete']>(),
    onExportZip: vi.fn<PanelActions['onExportZip']>(), onCopyMarkdown: vi.fn<PanelActions['onCopyMarkdown']>(), onClearAll: vi.fn<PanelActions['onClearAll']>(),
    onPresent: vi.fn<PanelActions['onPresent']>(), onImport: vi.fn<PanelActions['onImport']>(), onDraw: vi.fn<PanelActions['onDraw']>(),
  }
  createPanel(ui, store, actions).show()
})
afterEach(() => ui.host.remove())

const $ = <T extends Element = HTMLElement>(sel: string) => ui.root.querySelector<T & HTMLElement>(sel)
const $$ = (sel: string) => Array.from(ui.root.querySelectorAll<HTMLElement>(sel))
const button = (label: string) => $$('button').find((b) => b.textContent?.includes(label) || b.getAttribute('aria-label')?.includes(label)) as HTMLButtonElement

describe('panel', () => {
  test('PAIN-01 lista itens em ordem com número, ícone, largura, caminho e início da nota', () => {
    store.add(draft({ note: 'primeira' }))
    store.add(draft({ note: 'segunda', path: '/x?y=1' }))
    const items = $$('li.pxa-item')
    expect(items).toHaveLength(2)
    expect(items[0]!.textContent).toContain('#1')
    const cat = items[0]!.querySelector('.pxa-cat')!
    expect(cat.getAttribute('title')).toBe('mobile')
    expect(cat.querySelector('svg[width="12"]')).not.toBeNull()
    expect(items[0]!.textContent).not.toMatch(/📱|📟|🖥/)
    expect(items[0]!.textContent).toContain('390px')
    expect(items[0]!.textContent).toContain('/dashboard?tab=2')
    expect(items[0]!.textContent).toContain('primeira')
    expect(items[1]!.textContent).toContain('/x?y=1')
    expect($('header')!.textContent).toContain('(2)')
  })

  test('PAIN-01 nota longa cortada em 60 caracteres com reticências', () => {
    store.add(draft({ note: 'a'.repeat(80) }))
    expect($('.pxa-item-note')!.textContent).toBe('a'.repeat(60) + '…')
  })

  test('PAIN-02 clique no item chama onFocus com o id', () => {
    const a = store.add(draft())
    $('.pxa-item-main')!.click()
    expect(actions.onFocus).toHaveBeenCalledWith(a.id)
  })

  test('PAIN-03/PAIN-04 botões editar e excluir', () => {
    const a = store.add(draft())
    button('Editar').click()
    expect(actions.onEdit).toHaveBeenCalledWith(a.id)
    button('Excluir').click()
    expect(actions.onDelete).toHaveBeenCalledWith(a.id)
  })

  test('PAIN-03/PAIN-04 editar e excluir usam ícones pixel art, não emoji', () => {
    store.add(draft())
    for (const name of ['Editar', 'Excluir']) {
      const b = button(name)
      expect(b.querySelector('svg[shape-rendering="crispEdges"][width="12"]'), name).not.toBeNull()
      expect(b.textContent).toBe('')
      expect(b.title).toContain(name)
    }
  })

  test('EXPO-01 exportar .zip fica no cabeçalho como ícone; rodapé só com copiar e limpar', () => {
    store.add(draft())
    const exp = $('header')!.querySelector<HTMLButtonElement>('button[aria-label="Exportar .zip"]')!
    expect(exp.querySelector('svg[shape-rendering="crispEdges"]')).not.toBeNull()
    expect(exp.title).toBe('Exportar .zip')
    exp.click()
    expect(actions.onExportZip).toHaveBeenCalled()
    expect(Array.from($('footer')!.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['Apresentar', 'Importar .zip', 'Limpar tudo', 'Copiar markdown'])
    expect($('footer .pxa-primary')!.textContent).toBe('Copiar markdown')
  })

  test('EXPO-05 confirmação no singular com 1 anotação', () => {
    store.add(draft())
    button('Limpar tudo').click()
    expect($('.pxa-confirm')!.textContent).toBe('Apagar 1 anotação?')
  })

  test('PAIN-05 vazio mostra instrução e desabilita exportar/copiar/limpar', () => {
    expect($('.pxa-empty')!.textContent).toContain('Clique em um elemento')
    for (const l of ['Exportar .zip', 'Copiar markdown', 'Limpar tudo']) expect(button(l).disabled, l).toBe(true)
    store.add(draft())
    for (const l of ['Exportar .zip', 'Copiar markdown', 'Limpar tudo']) expect(button(l).disabled, l).toBe(false)
    button('Exportar .zip').click()
    button('Copiar markdown').click()
    expect(actions.onExportZip).toHaveBeenCalled()
    expect(actions.onCopyMarkdown).toHaveBeenCalled()
  })

  test('EXPO-05 limpar tudo pede confirmação; "Não" não apaga; "Sim" chama onClearAll', () => {
    store.add(draft()); store.add(draft())
    button('Limpar tudo').click()
    expect($('.pxa-confirm')!.textContent).toContain('Apagar 2 anotações?')
    button('Não').click()
    expect(actions.onClearAll).not.toHaveBeenCalled()
    expect($('.pxa-confirm')).toBeNull()
    button('Limpar tudo').click()
    button('Sim').click()
    expect(actions.onClearAll).toHaveBeenCalled()
  })

  test('PAIN-01 recolher deixa só a barra com o contador; expandir volta a lista', () => {
    store.add(draft())
    button('Recolher painel').click()
    expect($('.pxa-panel')!.classList.contains('pxa-collapsed')).toBe(true)
    expect($('header')!.textContent).toContain('(1)')
    button('Expandir painel').click()
    expect($('.pxa-panel')!.classList.contains('pxa-collapsed')).toBe(false)
  })

  test('ANOT-04 autoCollapse segue a largura até o dev recolher/expandir à mão', () => {
    const ui2 = createHost()
    const p = createPanel(ui2, store, actions)
    const cls = () => ui2.root.querySelector('.pxa-panel')!.classList
    p.show()
    p.autoCollapse(true)
    expect(cls().contains('pxa-collapsed')).toBe(true)
    p.autoCollapse(false)
    expect(cls().contains('pxa-collapsed')).toBe(false)
    ui2.root.querySelector<HTMLButtonElement>('button[aria-label="Recolher painel"]')!.click()
    p.autoCollapse(false)
    expect(cls().contains('pxa-collapsed')).toBe(true) // escolha manual vence
    p.hide(); p.show()
    p.autoCollapse(false)
    expect(cls().contains('pxa-collapsed')).toBe(false) // reativar devolve o controle à largura
    ui2.host.remove()
  })

  test('PAIN-01 hide oculta o painel', () => {
    const ui2 = createHost()
    const p = createPanel(ui2, store, actions)
    p.show()
    p.hide()
    expect(ui2.root.querySelector<HTMLElement>('.pxa-panel')!.style.display).toBe('none')
    ui2.host.remove()
  })

  test('APRE-01 "Apresentar" no rodapé, habilitado só com anotações', () => {
    expect(button('Apresentar').disabled).toBe(true)
    store.add(draft())
    button('Apresentar').click()
    expect(actions.onPresent).toHaveBeenCalled()
  })

  test('IMPO-02 "Importar .zip" abre o seletor de arquivo e entrega o arquivo escolhido', () => {
    expect(button('Importar .zip').disabled).toBe(false) // funciona com o painel vazio
    const input = $<HTMLInputElement>('input[type="file"]')!
    expect(input.accept).toContain('.zip')
    const picked = vi.spyOn(input, 'click').mockImplementation(() => {})
    button('Importar .zip').click()
    expect(picked).toHaveBeenCalled()
    const file = new File([new Uint8Array([1])], 'pxa.zip', { type: 'application/zip' })
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    input.dispatchEvent(new Event('change'))
    expect(actions.onImport).toHaveBeenCalledWith(file)
    expect(input.value).toBe('') // escolher o mesmo arquivo de novo dispara change outra vez
  })

  test('ERRO-04 selo ⚠ N no item com erros', () => {
    const err = { kind: 'console' as const, message: 'x', at: '2026-11-14T12:00:00.000Z', count: 1 }
    store.add(draft({ errors: [err, { ...err, message: 'y' }] }))
    store.add(draft())
    const badges = $$('.pxa-err')
    expect(badges).toHaveLength(1)
    expect(badges[0]!.textContent).toBe('⚠ 2')
    expect(badges[0]!.title).toBe('2 erros no console')
  })

  test('DESE-01/DESE-05 ícone pixel "Desenhar" só em itens com print', () => {
    const withShot = store.add(draft())
    store.add(draft({ shot: null }))
    const draws = $$('button[title="Desenhar"]')
    expect(draws).toHaveLength(1)
    expect(draws[0]!.querySelector('svg[shape-rendering="crispEdges"]')).not.toBeNull()
    expect(draws[0]!.getAttribute('aria-label')).toBe('Desenhar no print da anotação 1')
    draws[0]!.click()
    expect(actions.onDraw).toHaveBeenCalledWith(withShot.id)
  })

  test('DESE-04 item com Desenho mostra a miniatura do print composto; URL reaproveitada e liberada quando o Desenho muda', () => {
    let n = 0
    const urls = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++n}`)
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const composite = new Blob(['c'])
    const a = store.add(draft({ drawing: { strokes: [], block: 2, composite } }))
    store.add(draft())
    expect($$('img.pxa-thumb').map((i) => i.getAttribute('src'))).toEqual(['blob:1'])
    expect(urls).toHaveBeenCalledWith(composite)
    store.update(a.id, { note: 'outra' }) // mesmo composto: sem decodificar de novo
    expect(urls).toHaveBeenCalledTimes(1)
    expect(revoke).not.toHaveBeenCalled()
    store.update(a.id, { drawing: { strokes: [], block: 2, composite: new Blob(['d']) } })
    expect(revoke).toHaveBeenCalledWith('blob:1')
    expect($('img.pxa-thumb')!.getAttribute('src')).toBe('blob:2')
    vi.restoreAllMocks()
  })

  test('IMPO-03 item importado mostra o número e a origem originais', () => {
    store.importAnnotations([{ ...draft(), id: 'x', number: 3, createdAt: '', updatedAt: '' }], 'https://staging.app.com')
    expect($('.pxa-imported')!.textContent).toBe('#3 de staging.app.com')
  })

  test('IMPO-05 importada cujo elemento não está na página avisa no item (outra rota e próprias não)', () => {
    document.body.innerHTML = '<p id="existe">x</p>'
    const here = location.pathname
    const imported = (id: string, selector: string, pathname = here) => ({ ...draft({ selector, pathname }), id, number: 3, createdAt: '', updatedAt: '' })
    store.importAnnotations([imported('x', '#sumiu'), imported('y', '#existe'), imported('z', '#sumiu', '/outra-rota')], 'https://a.com')
    store.add(draft({ selector: '#sumiu', pathname: here }))
    expect($$('li.pxa-item').filter((li) => li.querySelector('.pxa-missing')).map((li) => li.dataset.id)).toEqual(['x'])
    expect($$('.pxa-missing').map((m) => m.textContent)).toEqual(['elemento não encontrado'])
  })
})

