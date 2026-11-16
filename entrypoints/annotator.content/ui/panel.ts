import type { UiHost } from './host'
import { el } from './dom'
import { CATEGORY_PIXEL_ICON, CHEVRON_DOWN, CHEVRON_UP, circleCheck, MENU, pixelIcon } from './icons'
import type { AnnotationStore } from '@/lib/store'
import { hostOf, plural } from '@/lib/format'
import { locate } from '@/lib/resolve'

export interface PanelActions {
  onFocus(id: string): void
  onEdit(id: string): void
  onDelete(id: string): void
  onExportZip(): void
  onCopyMarkdown(): void
  onClearAll(): void
  onPresent(): void // APRE-01
  onImport(file: File): void // IMPO-02
  onDraw(id: string): void // DESE-01
}

/** Ferramenta liga/desliga que outra feature põe no menu de ações (Raio-X: Detector e Lupa). */
export interface MenuTool {
  label: string
  title: string
  isOn(): boolean
  toggle(): void
}

const NOTE_PREVIEW = 60

/** Painel estilo quest log (PAIN-01..05, EXPO-05). */
/** `tools`: ferramentas liga/desliga no topo do menu de ações, separadas das ações por uma linha. */
export function createPanel(ui: UiHost, store: AnnotationStore, actions: PanelActions, tools: readonly MenuTool[] = []) {
  const title = el('span', { className: 'pxa-title' })
  const collapse = el('button', {
    type: 'button',
    className: 'pxa-icon pxa-head-btn',
    onclick: () => {
      manual = true
      setCollapsed(!collapsed)
    },
  })
  // Menu de ações no cabeçalho (Raio-X, Apresentar, Importar, Exportar): continua à mão com o painel recolhido.
  const menuBtn = kebab('pxa-icon pxa-head-btn pxa-menu-btn', 'Ações', () => panelMenu())
  // Um dropdown só, aberto pelo ⋮ do cabeçalho ou pelo ⋮ de uma anotação.
  const menu = el('div', { className: 'pxa-menu', hidden: true })
  menu.setAttribute('role', 'menu')
  menu.addEventListener('keydown', onMenuKey)
  // Clique em qualquer parte da UI do PxA que não seja o menu aberto nem o ⋮ que o abriu fecha o menu.
  // No Shadow root (não em window): clique na página já é tratado pelo onPick (fecha e engole o clique),
  // então escutar aqui cobre só o vão — clicar no resto do painel — sem reabrir/anotar por engano.
  ui.root.addEventListener('pointerdown', (ev) => {
    if (!open) return
    const path = ev.composedPath()
    if (path.includes(menu) || path.includes(open.button)) return
    closeMenu()
  }, true)
  const list = el('ol')
  const footer = el('footer')
  // Ponto de inserção no cabeçalho para outras features (mascote): o painel não conhece o conteúdo.
  const headStart = el('span', { className: 'pxa-head-slot' })
  const header = el('header', {}, headStart, title, menuBtn, collapse)
  const panel = el('aside', { className: 'pxa-panel' }, header, menu, list, footer)
  panel.setAttribute('aria-label', 'Anotações do PxA')
  panel.style.display = 'none'
  ui.layer.append(panel)
  let visible = false
  let confirming = false
  let collapsed = false
  let manual = false // o dev recolheu/expandiu à mão: a largura da tela deixa de decidir
  /** Dropdown aberto: o ⋮ que o abriu e quem desenha os itens (redesenhado quando o store muda). */
  let open: { button: HTMLButtonElement; items: () => Node[] } | null = null
  const thumbUrls = new Map<Blob, string>() // miniatura por print composto; liberada quando o Desenho sai

  // Importar .zip (IMPO-02): o input fica escondido; o item do menu abre o seletor.
  const fileInput = el('input', { type: 'file', accept: '.zip,application/zip', hidden: true })
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    fileInput.value = ''
    if (file) actions.onImport(file)
  })
  panel.append(fileInput)

  // Recolhido = só a barra com o contador, no rodapé da tela. Continua visível (PAIN-01) sem cobrir a página.
  function setCollapsed(value: boolean) {
    closeMenu()
    collapsed = value
    panel.classList.toggle('pxa-collapsed', value)
    collapse.replaceChildren(pixelIcon(value ? CHEVRON_UP : CHEVRON_DOWN))
    collapse.setAttribute('aria-label', value ? 'Expandir painel' : 'Recolher painel')
    collapse.setAttribute('aria-expanded', String(!value))
  }
  setCollapsed(false)

  /** Botão ⋮ que abre/fecha o dropdown com os itens de `items`. */
  function kebab(className: string, label: string, items: () => Node[]) {
    const b: HTMLButtonElement = el('button', { type: 'button', className, title: label, onclick: () => (open?.button === b ? closeMenu(true) : openMenu(b, items)) }, pixelIcon(MENU))
    b.setAttribute('aria-label', label)
    b.setAttribute('aria-haspopup', 'menu')
    b.setAttribute('aria-expanded', 'false')
    return b
  }

  function menuItem(label: string, title: string, run: () => void, disabled = false, danger = false) {
    const b = el('button', { type: 'button', className: danger ? 'pxa-menu-item pxa-danger' : 'pxa-menu-item', textContent: label, title, disabled, onclick: () => { closeMenu(true); run() } })
    b.setAttribute('role', 'menuitem')
    return b
  }

  const sep = () => el('hr', { className: 'pxa-menu-sep' })

  function toolItem(tool: MenuTool) {
    const on = tool.isOn()
    // Ligada: check em círculo à direita, o mesmo do "tudo certo" do Detector.
    const b = el('button', { type: 'button', className: 'pxa-menu-item', title: tool.title, onclick: () => { closeMenu(true); tool.toggle() } }, tool.label, ...(on ? [circleCheck()] : []))
    b.setAttribute('role', 'menuitemcheckbox')
    b.setAttribute('aria-checked', String(on))
    return b
  }

  /** Menu do cabeçalho: ferramentas Raio-X, Apresentar, Importar, Exportar. */
  function panelMenu(): Node[] {
    const empty = store.list().length === 0
    return [
      ...(tools.length ? [...tools.map(toolItem), sep()] : []),
      menuItem('Apresentar', 'Passar pelas anotações uma a uma (← →, Esc sai)', () => actions.onPresent(), empty),
      menuItem('Importar .zip', 'Abrir o .zip exportado por outro PxA', () => fileInput.click()),
      menuItem('Exportar .zip', 'Baixar feedback.md, pxa.json e os prints', () => actions.onExportZip(), empty),
    ]
  }

  /** Menu de uma anotação: editar, desenhar no print (só com print, DESE-05) e excluir. */
  function itemMenu(a: Item): Node[] {
    return [
      menuItem('Editar', `Editar a nota da anotação ${a.number}`, () => actions.onEdit(a.id)),
      ...(a.shot ? [menuItem('Desenhar no print', `Desenhar no print da anotação ${a.number}`, () => actions.onDraw(a.id))] : []),
      sep(),
      menuItem('Excluir', `Excluir a anotação ${a.number}`, () => actions.onDelete(a.id), false, true),
    ]
  }

  function renderMenu() {
    if (!open) return
    const focused = menu.querySelector<HTMLButtonElement>('.pxa-menu-item:focus')?.textContent
    menu.replaceChildren(...open.items())
    // Redesenho com o menu aberto (anotação nova, ferramenta mudou): o foco fica no mesmo item.
    if (focused) menuItems().find((b) => b.textContent === focused)?.focus()
  }

  const menuItems = () => Array.from(menu.querySelectorAll<HTMLButtonElement>('.pxa-menu-item:not(:disabled)'))

  /** Abre embaixo do ⋮, alinhado à direita dele; sem espaço embaixo, abre para cima. */
  function place(button: HTMLButtonElement) {
    menu.style.top = menu.style.right = ''
    if (button === menuBtn) return // cabeçalho: posição do CSS (para cima quando recolhido)
    const p = panel.getBoundingClientRect()
    const b = button.getBoundingClientRect()
    menu.style.right = `${p.right - b.right}px`
    const fitsBelow = b.bottom + 4 + menu.offsetHeight <= p.bottom
    menu.style.top = `${fitsBelow ? b.bottom - p.top + 4 : Math.max(4, b.top - p.top - 4 - menu.offsetHeight)}px`
  }

  function openMenu(button: HTMLButtonElement, items: () => Node[]) {
    closeMenu()
    open = { button, items }
    menu.setAttribute('aria-label', button.getAttribute('aria-label') ?? 'Ações')
    renderMenu()
    menu.hidden = false
    place(button)
    button.setAttribute('aria-expanded', 'true')
    menuItems()[0]?.focus()
  }

  /** Fecha o menu; devolve se estava aberto. `refocus` devolve o foco ao ⋮ que o abriu (teclado). */
  function closeMenu(refocus = false): boolean {
    if (!open) return false
    const { button } = open
    open = null
    menu.hidden = true
    button.setAttribute('aria-expanded', 'false')
    if (refocus && button.isConnected) button.focus()
    return true
  }

  function onMenuKey(ev: KeyboardEvent) {
    const items = menuItems()
    const i = items.indexOf(ev.composedPath()[0] as HTMLButtonElement)
    const go = (n: number) => items[(n + items.length) % items.length]?.focus()
    if (ev.key === 'ArrowDown') go(i + 1)
    else if (ev.key === 'ArrowUp') go(i - 1)
    else if (ev.key === 'Home') go(0)
    else if (ev.key === 'End') go(items.length - 1)
    else if (ev.key === 'Escape') closeMenu(true)
    else if (ev.key === 'Tab') return void closeMenu()
    else return
    ev.preventDefault()
    ev.stopPropagation() // Esc do menu não chega aos atalhos da página nem do PxA
  }

  function renderFooter(count: number) {
    if (confirming) {
      footer.replaceChildren(
        el('span', { className: 'pxa-confirm', textContent: `Apagar ${count} ${count === 1 ? 'anotação' : 'anotações'}?` }),
        el('button', { type: 'button', textContent: 'Sim', onclick: () => { confirming = false; actions.onClearAll(); render() } }),
        el('button', { type: 'button', textContent: 'Não', onclick: () => { confirming = false; render() } }),
      )
      return
    }
    const empty = count === 0
    footer.replaceChildren(
      el('button', { type: 'button', textContent: 'Limpar tudo', disabled: empty, onclick: () => { confirming = true; render() } }),
      el('button', { type: 'button', className: 'pxa-primary', textContent: 'Copiar markdown', disabled: empty, onclick: () => actions.onCopyMarkdown() }),
    )
  }

  type Item = ReturnType<AnnotationStore['list']>[number]

  function item(a: Item) {
    const note = a.note.length > NOTE_PREVIEW ? `${a.note.slice(0, NOTE_PREVIEW)}…` : a.note
    const main = el(
      'button',
      { type: 'button', className: 'pxa-item-main', title: 'Ir até o elemento', onclick: () => actions.onFocus(a.id) },
      el(
        'span',
        { className: 'pxa-item-meta' },
        `#${a.number} `,
        el('span', { className: 'pxa-cat', title: a.viewport.category }, pixelIcon(CATEGORY_PIXEL_ICON[a.viewport.category])),
        ` ${a.viewport.width}px`,
        ...extras(a),
      ),
      el('span', { className: 'pxa-item-path', textContent: a.path }),
      el('span', { className: 'pxa-item-note', textContent: note }),
      ...thumb(a),
    )
    // Editar, Desenhar e Excluir num ⋮ por anotação (pedido do dev: ícones soltos poluíam a linha).
    const actionsBtn = kebab('pxa-icon pxa-item-menu', `Ações da anotação ${a.number}`, () => itemMenu(a))
    const li = el('li', { className: 'pxa-item' }, main, actionsBtn)
    li.dataset.id = a.id
    return li
  }

  /** Selo de erros (ERRO-04), origem importada (IMPO-03) e elemento ausente (IMPO-05). */
  function extras(a: Item): Array<Node | string> {
    const out: Array<Node | string> = []
    if (a.errors?.length) out.push(' ', el('span', { className: 'pxa-err', textContent: `⚠ ${a.errors.length}`, title: `${plural(a.errors.length, 'erro', 'erros')} no console` }))
    if (a.importedFrom) out.push(' ', el('span', { className: 'pxa-imported', textContent: `#${a.importedFrom.number} de ${hostOf(a.importedFrom.origin)}` }))
    if (a.importedFrom && locate(store, a.id) === 'missing') out.push(' ', el('span', { className: 'pxa-missing', textContent: 'elemento não encontrado' }))
    return out
  }

  /** Miniatura do print composto quando há Desenho (DESE-04). A URL é reaproveitada entre renders. */
  function thumb(a: Item): Node[] {
    if (!a.drawing) return []
    const blob = a.drawing.composite
    let url = thumbUrls.get(blob)
    if (!url) thumbUrls.set(blob, (url = URL.createObjectURL(blob)))
    return [el('img', { className: 'pxa-thumb', src: url, alt: `Print com desenho da anotação ${a.number}` })]
  }

  function releaseThumbs(items: readonly Item[]) {
    const live = new Set(items.map((a) => a.drawing?.composite))
    for (const [blob, url] of thumbUrls) {
      if (live.has(blob)) continue
      URL.revokeObjectURL(url)
      thumbUrls.delete(blob)
    }
  }

  function render() {
    const items = store.list()
    releaseThumbs(items)
    if (!visible) return // oculto: show() renderiza ao voltar
    title.textContent = `PxA · Anotações (${items.length})`
    if (items.length === 0) confirming = false
    list.replaceChildren(
      ...(items.length === 0
        ? [el('p', { className: 'pxa-empty', textContent: 'Clique em um elemento da página para anotar. Clique no ícone do PxA para sair.' })]
        : items.map(item)),
    )
    renderFooter(items.length)
    // Lista redesenhada com o menu de uma anotação aberto: o ⋮ dele saiu da página, então fecha.
    if (open && !open.button.isConnected) closeMenu()
    else renderMenu()
  }

  store.subscribe(render)
  return {
    mount: { header, headStart },
    show() {
      visible = true
      manual = false
      panel.style.display = 'flex'
      render()
    },
    hide() {
      closeMenu()
      visible = false
      confirming = false
      panel.style.display = 'none'
    },
    /** Clique na página com o menu aberto só fecha o menu (devolve `true` se fechou). */
    closeMenu: () => closeMenu(),
    /** Redesenha o menu aberto quando uma ferramenta liga/desliga por fora (Esc da Lupa, × do relatório). */
    syncTools() {
      if (open?.button === menuBtn) renderMenu()
      menuBtn.classList.toggle('pxa-tool-on', tools.some((t) => t.isOn()))
    },
    /** Recolhe em tela mobile e expande fora dela, até o dev decidir à mão. */
    autoCollapse(mobile: boolean) {
      if (!manual && mobile !== collapsed) setCollapsed(mobile)
    },
  }
}
