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
    expect(Array.from($('footer')!.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['Limpar tudo', 'Copiar markdown'])
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

  test('PAIN-01 botão de recolher é seta pixel 12px (não glifo de texto) e inverte ao recolher', () => {
    const collapse = button('Recolher painel')
    expect(collapse.textContent).toBe('')
    const svg = collapse.querySelector('svg[shape-rendering="crispEdges"]')!
    expect(svg.getAttribute('width')).toBe('12')
    const down = collapse.innerHTML
    collapse.click()
    expect(button('Expandir painel').innerHTML).not.toBe(down)
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
})
