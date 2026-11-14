import type { UiHost } from './host'
import { el } from './dom'
import type { PageError } from '@/lib/types'
import { errorCountLabel, errorText } from '@/lib/error-log'

export interface EditorOptions {
  anchor: DOMRect
  initial?: string
  /** Erros de console/rede do momento (ERRO-04); a Promise é o pedido ao probe em andamento. */
  errors?: readonly PageError[] | Promise<readonly PageError[]>
  /** `errors` = os que sobraram, só quando a opção `errors` foi passada. */
  onSave(note: string, errors?: PageError[]): void
  onCancel(): void
}

/** Lista de erros removíveis do editor. Some quando não sobra nenhum. */
function createErrorList(form: HTMLElement, before: Node) {
  let list: PageError[] = []
  const box = el('div', { className: 'pxa-errors' })
  function render() {
    if (list.length === 0) return box.remove()
    box.replaceChildren(
      el('span', { className: 'pxa-errors-title', textContent: errorCountLabel(list.length) }),
      el('ul', {}, ...list.map((e, i) => {
        const remove = el('button', { type: 'button', className: 'pxa-icon', textContent: '✕', title: 'Remover erro', onclick: () => { list = list.filter((_, j) => j !== i); render() } })
        remove.setAttribute('aria-label', `Remover erro ${i + 1}`)
        return el('li', {}, el('span', { textContent: errorText(e), title: errorText(e) }), remove)
      })),
    )
    if (!box.isConnected) form.insertBefore(box, before)
  }
  return {
    set(errors: readonly PageError[]) { list = [...errors]; render() },
    get: () => list,
  }
}

/** Campo de nota junto ao elemento. Enter salva, Shift+Enter quebra linha, Esc cancela (ANOT-05/06, PAIN-03). */
export function openNoteEditor(ui: UiHost, opts: EditorOptions): { close(): void } {
  const ta = el('textarea', { value: opts.initial ?? '', rows: 3, placeholder: 'O que ajustar aqui?' })
  ta.setAttribute('aria-label', 'Nota da anotação')
  const cancel = el('button', { type: 'button', textContent: 'Cancelar' })
  const hint = el('span', { className: 'pxa-hint', textContent: 'Enter salva · Esc cancela' })
  const form = el(
    'form',
    { className: 'pxa-editor' },
    ta,
    hint,
    cancel,
    el('button', { type: 'submit', textContent: 'Salvar' }),
  )

  const vw = window.innerWidth
  const vh = window.innerHeight
  const below = opts.anchor.bottom + 8
  const top = below + 130 > vh ? Math.max(8, opts.anchor.top - 138) : below
  const left = Math.max(8, Math.min(opts.anchor.left, vw - 336))
  Object.assign(form.style, { left: `${left}px`, top: `${top}px` })
  ui.layer.append(form)

  let closed = false
  let saving = false
  const errors = createErrorList(form, hint)
  // O probe responde em até 300ms; quem salvar antes disso espera a lista chegar (não perde os erros).
  let pending: Promise<void> | null = null
  if (opts.errors instanceof Promise) pending = opts.errors.then((list) => { if (!closed) errors.set(list) }, () => undefined)
  else if (opts.errors) errors.set(opts.errors)

  const close = () => {
    closed = true
    form.remove()
  }
  const submit = () => {
    const note = ta.value.trim()
    if (!note || saving) return // ANOT-06
    const finish = () => {
      if (closed) return // cancelado enquanto esperava o probe
      close()
      if (opts.errors === undefined) opts.onSave(note)
      else opts.onSave(note, errors.get())
    }
    if (!pending) return finish()
    saving = true
    void pending.then(finish)
  }
  const doCancel = () => {
    close()
    opts.onCancel()
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    submit()
  })
  cancel.addEventListener('click', doCancel)
  ta.addEventListener('keydown', (e) => {
    e.stopPropagation() // atalhos da página não disparam enquanto digita
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      doCancel()
    }
  })
  queueMicrotask(() => { if (!closed) ta.focus() })
  return { close }
}
