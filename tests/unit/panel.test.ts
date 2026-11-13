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
    expect(items[0]!.textContent).toContain('📱')
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

  test('PAIN-01 hide oculta o painel', () => {
    const ui2 = createHost()
    const p = createPanel(ui2, store, actions)
    p.show()
    p.hide()
    expect(ui2.root.querySelector<HTMLElement>('.pxa-panel')!.style.display).toBe('none')
    ui2.host.remove()
  })
})
