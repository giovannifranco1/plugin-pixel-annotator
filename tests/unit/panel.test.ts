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
const menuBtn = () => $<HTMLButtonElement>('header button[aria-label="Ações"]')!
/** Abre o ⋮ da anotação n (se fechado) e devolve o item do menu. */
const itemMenu = (n: number, label: string) => {
  const kebab = $<HTMLButtonElement>(`button[aria-label="Ações da anotação ${n}"]`)!
  if (kebab.getAttribute('aria-expanded') !== 'true') kebab.click()
  return $$('.pxa-menu .pxa-menu-item').find((b) => b.textContent === label) as HTMLButtonElement
}
/** Abre o menu de ações (se fechado) e devolve o item. */
const menuItem = (label: string) => {
  if (menuBtn().getAttribute('aria-expanded') !== 'true') menuBtn().click()
  return $$('.pxa-menu .pxa-menu-item').find((b) => b.textContent === label) as HTMLButtonElement
}

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

  test('PAIN-03/PAIN-04 editar e excluir no ⋮ da anotação', () => {
    const a = store.add(draft())
    itemMenu(1, 'Editar').click()
    expect(actions.onEdit).toHaveBeenCalledWith(a.id)
    expect($('.pxa-menu')!.hidden).toBe(true)
    itemMenu(1, 'Excluir').click()
    expect(actions.onDelete).toHaveBeenCalledWith(a.id)
  })

  test('PAIN-03/PAIN-04 cada item tem só o ⋮ (ícone pixel, sem emoji) e Excluir vem por último, destacado', () => {
    store.add(draft())
    const li = $('li.pxa-item')!
    const btns = Array.from(li.querySelectorAll(':scope > button'))
    expect(btns.map((b) => b.getAttribute('aria-label') ?? 'main')).toEqual(['main', 'Ações da anotação 1'])
    const kebab = btns[1]!
    expect(kebab.querySelector('svg[shape-rendering="crispEdges"][width="12"]')).not.toBeNull()
    expect(kebab.textContent).toBe('')
    expect(kebab.getAttribute('aria-haspopup')).toBe('menu')
    itemMenu(1, 'Editar')
    expect(kebab.getAttribute('aria-expanded')).toBe('true')
    expect($$('.pxa-menu .pxa-menu-item').map((b) => b.textContent)).toEqual(['Editar', 'Desenhar no print', 'Excluir'])
    expect($('.pxa-menu .pxa-danger')!.textContent).toBe('Excluir')
  })

  test('abrir o ⋮ de outra anotação troca o menu; abrir o do cabeçalho também', () => {
    store.add(draft())
    store.add(draft())
    itemMenu(1, 'Editar')
    itemMenu(2, 'Editar')
    expect(ui.root.querySelector('button[aria-label="Ações da anotação 1"]')!.getAttribute('aria-expanded')).toBe('false')
    expect(ui.root.querySelector('button[aria-label="Ações da anotação 2"]')!.getAttribute('aria-expanded')).toBe('true')
    menuBtn().click()
    expect($$('.pxa-menu .pxa-menu-item').map((b) => b.textContent)).toEqual(['Apresentar', 'Importar .zip', 'Exportar .zip'])
  })

  test('EXPO-01 exportar .zip fica no menu de ações do cabeçalho; rodapé só com limpar e copiar', () => {
    store.add(draft())
    expect(menuBtn().querySelector('svg[shape-rendering="crispEdges"]')).not.toBeNull()
    expect(menuBtn().getAttribute('aria-haspopup')).toBe('menu')
    menuItem('Exportar .zip').click()
    expect(actions.onExportZip).toHaveBeenCalled()
    expect($('.pxa-menu')!.hidden).toBe(true) // escolher um item fecha o menu
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
    expect(menuItem('Exportar .zip').disabled).toBe(true)
    for (const l of ['Copiar markdown', 'Limpar tudo']) expect(button(l).disabled, l).toBe(true)
    store.add(draft()) // com o menu aberto: ele é redesenhado
    expect(menuItem('Exportar .zip').disabled).toBe(false)
    for (const l of ['Copiar markdown', 'Limpar tudo']) expect(button(l).disabled, l).toBe(false)
    menuItem('Exportar .zip').click()
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

  test('APRE-01 "Apresentar" no menu de ações, habilitado só com anotações', () => {
    expect(menuItem('Apresentar').disabled).toBe(true)
    store.add(draft())
    menuItem('Apresentar').click()
    expect(actions.onPresent).toHaveBeenCalled()
  })

  test('IMPO-02 "Importar .zip" abre o seletor de arquivo e entrega o arquivo escolhido', () => {
    expect(menuItem('Importar .zip').disabled).toBe(false) // funciona com o painel vazio
    const input = $<HTMLInputElement>('input[type="file"]')!
    expect(input.accept).toContain('.zip')
    const picked = vi.spyOn(input, 'click').mockImplementation(() => {})
    menuItem('Importar .zip').click()
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

  test('DESE-01/DESE-05 "Desenhar no print" no ⋮ só em itens com print', () => {
    const withShot = store.add(draft())
    store.add(draft({ shot: null }))
    itemMenu(2, 'Editar')
    expect($$('.pxa-menu .pxa-menu-item').map((b) => b.textContent)).toEqual(['Editar', 'Excluir'])
    itemMenu(1, 'Desenhar no print').click()
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

  test('menu de ações: ordem dos itens, setas, Esc fecha e devolve o foco ao botão', () => {
    store.add(draft())
    menuBtn().click()
    expect(menuBtn().getAttribute('aria-expanded')).toBe('true')
    expect($$('.pxa-menu .pxa-menu-item').map((b) => b.textContent)).toEqual(['Apresentar', 'Importar .zip', 'Exportar .zip'])
    const items = $$('.pxa-menu .pxa-menu-item')
    expect(ui.root.activeElement).toBe(items[0])
    const key = (k: string) => ui.root.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }))
    key('ArrowDown')
    expect(ui.root.activeElement).toBe(items[1])
    key('ArrowUp')
    key('ArrowUp') // dá a volta
    expect(ui.root.activeElement).toBe(items[2])
    key('Escape')
    expect($('.pxa-menu')!.hidden).toBe(true)
    expect(menuBtn().getAttribute('aria-expanded')).toBe('false')
    expect(ui.root.activeElement).toBe(menuBtn())
  })

  test('menu de ações fecha ao clicar fora dele (no resto do painel), não só no próprio ⋮', () => {
    store.add(draft())
    const down = (node: Element) => node.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }))
    // Cabeçalho: abre pelo ⋮ e fecha clicando num item qualquer da lista (fora do menu).
    menuBtn().click()
    expect(menuBtn().getAttribute('aria-expanded')).toBe('true')
    down($('.pxa-item-main')!)
    expect($('.pxa-menu')!.hidden).toBe(true)
    expect(menuBtn().getAttribute('aria-expanded')).toBe('false')
    // Clicar dentro do próprio menu não fecha.
    menuBtn().click()
    down($('.pxa-menu .pxa-menu-item')!)
    expect($('.pxa-menu')!.hidden).toBe(false)
    // Item: abre o ⋮ da anotação e fecha clicando no cabeçalho (fora do menu).
    itemMenu(1, 'Editar')
    expect($<HTMLButtonElement>('button[aria-label="Ações da anotação 1"]')!.getAttribute('aria-expanded')).toBe('true')
    down($('.pxa-item-note')!)
    expect($('.pxa-menu')!.hidden).toBe(true)
  })

  test('menu de ações: ferramentas no topo, sem título de grupo, marcadas quando ligadas', () => {
    const ui2 = createHost()
    let on = false
    const tool = { label: 'Lupa', title: 'Zoom', isOn: () => on, toggle: vi.fn(() => { on = !on }) }
    const p = createPanel(ui2, createStore(), actions, [tool])
    p.show()
    const q = (sel: string) => Array.from(ui2.root.querySelectorAll<HTMLElement>(sel))
    const btn = ui2.root.querySelector<HTMLButtonElement>('header button[aria-label="Ações"]')!
    btn.click()
    expect(q('.pxa-menu-label')).toHaveLength(0)
    expect(q('.pxa-menu-sep')).toHaveLength(1)
    const lupa = q('.pxa-menu-item')[0]!
    expect(lupa.getAttribute('role')).toBe('menuitemcheckbox')
    expect(lupa.getAttribute('aria-checked')).toBe('false')
    expect(lupa.querySelector('svg')).toBeNull()
    lupa.click()
    expect(tool.toggle).toHaveBeenCalled()
    p.syncTools()
    expect(btn.classList.contains('pxa-tool-on')).toBe(true) // ferramenta ligada aparece no ícone com o menu fechado
    btn.click()
    expect(q('.pxa-menu-item')[0]!.getAttribute('aria-checked')).toBe('true')
    expect(q('.pxa-menu-item')[0]!.querySelector('svg circle')).not.toBeNull() // check em círculo
    expect(q('.pxa-menu-item')[0]!.textContent).toBe('Lupa')
    expect(p.closeMenu()).toBe(true)
    expect(p.closeMenu()).toBe(false)
    ui2.host.remove()
  })
})
