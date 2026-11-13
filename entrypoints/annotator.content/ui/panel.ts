import type { UiHost } from './host'
import { el } from './dom'
import type { AnnotationStore } from '@/lib/store'
import { CATEGORY_ICON } from '@/lib/viewport'

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
    className: 'pxa-icon pxa-collapse',
    onclick: () => {
      manual = true
      setCollapsed(!collapsed)
    },
  })
  const list = el('ol')
  const footer = el('footer')
  const panel = el('aside', { className: 'pxa-panel' }, el('header', {}, title, collapse), list, footer)
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
        el('span', { className: 'pxa-confirm', textContent: `Apagar ${count} anotações?` }),
        el('button', { type: 'button', textContent: 'Sim', onclick: () => { confirming = false; actions.onClearAll(); render() } }),
        el('button', { type: 'button', textContent: 'Não', onclick: () => { confirming = false; render() } }),
      )
      return
    }
    const empty = count === 0
    footer.replaceChildren(
      el('button', { type: 'button', className: 'pxa-primary', textContent: 'Exportar .zip', disabled: empty, onclick: () => actions.onExportZip() }),
      el('button', { type: 'button', textContent: 'Copiar markdown', disabled: empty, onclick: () => actions.onCopyMarkdown() }),
      el('button', { type: 'button', textContent: 'Limpar tudo', disabled: empty, onclick: () => { confirming = true; render() } }),
    )
  }

  function item(a: ReturnType<AnnotationStore['list']>[number]) {
    const note = a.note.length > NOTE_PREVIEW ? `${a.note.slice(0, NOTE_PREVIEW)}…` : a.note
    const main = el(
      'button',
      { type: 'button', className: 'pxa-item-main', title: 'Ir até o elemento', onclick: () => actions.onFocus(a.id) },
      el('span', { className: 'pxa-item-meta', textContent: `#${a.number} ${CATEGORY_ICON[a.viewport.category]} ${a.viewport.width}px` }),
      el('span', { className: 'pxa-item-path', textContent: a.path }),
      el('span', { className: 'pxa-item-note', textContent: note }),
    )
    const edit = el('button', { type: 'button', className: 'pxa-icon', textContent: '✏️', onclick: () => actions.onEdit(a.id) })
    edit.setAttribute('aria-label', `Editar anotação ${a.number}`)
    const del = el('button', { type: 'button', className: 'pxa-icon', textContent: '🗑️', onclick: () => actions.onDelete(a.id) })
    del.setAttribute('aria-label', `Excluir anotação ${a.number}`)
    const li = el('li', { className: 'pxa-item' }, main, edit, del)
    li.dataset.id = a.id
    return li
  }

  function render() {
    if (!visible) return // oculto: show() renderiza ao voltar
    const items = store.list()
    title.textContent = `PxA · Anotações (${items.length})`
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
