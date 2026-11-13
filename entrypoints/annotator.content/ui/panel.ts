import type { UiHost } from './host'
import { el } from './dom'
import { CATEGORY_PIXEL_ICON, DOWNLOAD, PENCIL, pixelIcon, TRASH } from './icons'
import type { AnnotationStore } from '@/lib/store'

export interface PanelActions {
  onFocus(id: string): void
  onEdit(id: string): void
  onDelete(id: string): void
  onExportZip(): void
  onCopyMarkdown(): void
  onClearAll(): void
}

const NOTE_PREVIEW = 60

/** Painel estilo quest log (PAIN-01..05, EXPO-05). */
export function createPanel(ui: UiHost, store: AnnotationStore, actions: PanelActions) {
  const title = el('span', { className: 'pxa-title' })
  const collapse = el('button', {
    type: 'button',
    className: 'pxa-icon pxa-head-btn',
    onclick: () => {
      manual = true
      setCollapsed(!collapsed)
    },
  })
  // Export .zip fica no cabeçalho: continua à mão com o painel recolhido.
  const exportZip = el('button', { type: 'button', className: 'pxa-icon pxa-head-btn', title: 'Exportar .zip', onclick: () => actions.onExportZip() }, pixelIcon(DOWNLOAD))
  exportZip.setAttribute('aria-label', 'Exportar .zip')
  const list = el('ol')
  const footer = el('footer')
  const panel = el('aside', { className: 'pxa-panel' }, el('header', {}, title, exportZip, collapse), list, footer)
  panel.setAttribute('aria-label', 'Anotações do PxA')
  panel.style.display = 'none'
  ui.layer.append(panel)
  let visible = false
  let confirming = false
  let collapsed = false
  let manual = false // o dev recolheu/expandiu à mão: a largura da tela deixa de decidir

  // Recolhido = só a barra com o contador, no rodapé da tela. Continua visível (PAIN-01) sem cobrir a página.
  function setCollapsed(value: boolean) {
    collapsed = value
    panel.classList.toggle('pxa-collapsed', value)
    collapse.textContent = value ? '▴' : '▾'
    collapse.setAttribute('aria-label', value ? 'Expandir painel' : 'Recolher painel')
    collapse.setAttribute('aria-expanded', String(!value))
  }
  setCollapsed(false)

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

  function item(a: ReturnType<AnnotationStore['list']>[number]) {
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
      ),
      el('span', { className: 'pxa-item-path', textContent: a.path }),
      el('span', { className: 'pxa-item-note', textContent: note }),
    )
    const edit = el('button', { type: 'button', className: 'pxa-icon', title: 'Editar nota', onclick: () => actions.onEdit(a.id) }, pixelIcon(PENCIL))
    edit.setAttribute('aria-label', `Editar anotação ${a.number}`)
    const del = el('button', { type: 'button', className: 'pxa-icon pxa-danger', title: 'Excluir anotação', onclick: () => actions.onDelete(a.id) }, pixelIcon(TRASH))
    del.setAttribute('aria-label', `Excluir anotação ${a.number}`)
    const li = el('li', { className: 'pxa-item' }, main, edit, del)
    li.dataset.id = a.id
    return li
  }

  function render() {
    if (!visible) return // oculto: show() renderiza ao voltar
    const items = store.list()
    title.textContent = `PxA · Anotações (${items.length})`
    exportZip.disabled = items.length === 0
    if (items.length === 0) confirming = false
    list.replaceChildren(
      ...(items.length === 0
        ? [el('p', { className: 'pxa-empty', textContent: 'Clique em um elemento da página para anotar. Clique no ícone do PxA para sair.' })]
        : items.map(item)),
    )
    renderFooter(items.length)
  }

  store.subscribe(render)
  return {
    show() {
      visible = true
      manual = false
      panel.style.display = 'flex'
      render()
    },
    hide() {
      visible = false
      confirming = false
      panel.style.display = 'none'
    },
    /** Recolhe em tela mobile e expande fora dela, até o dev decidir à mão. */
    autoCollapse(mobile: boolean) {
      if (!manual && mobile !== collapsed) setCollapsed(mobile)
    },
  }
}
