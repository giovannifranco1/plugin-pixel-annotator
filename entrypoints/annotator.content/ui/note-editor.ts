import type { UiHost } from './host'

export interface EditorOptions {
  anchor: DOMRect
  initial?: string
  onSave(note: string): void
  onCancel(): void
}

/** Campo de nota junto ao elemento. Enter salva, Shift+Enter quebra linha, Esc cancela (ANOT-05/06, PAIN-03). */
export function openNoteEditor(ui: UiHost, opts: EditorOptions): { close(): void } {
  const form = document.createElement('form')
  form.className = 'pxa-editor'
  const ta = document.createElement('textarea')
  ta.value = opts.initial ?? ''
  ta.rows = 3
  ta.placeholder = 'O que ajustar aqui?'
  ta.setAttribute('aria-label', 'Nota da anotação')
  const hint = document.createElement('span')
  hint.className = 'pxa-hint'
  hint.textContent = 'Enter salva · Esc cancela'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.textContent = 'Cancelar'
  const save = document.createElement('button')
  save.type = 'submit'
  save.textContent = 'Salvar'
  form.append(ta, hint, cancel, save)

  const vw = window.innerWidth
  const vh = window.innerHeight
  const below = opts.anchor.bottom + 8
  const top = below + 130 > vh ? Math.max(8, opts.anchor.top - 138) : below
  const left = Math.max(8, Math.min(opts.anchor.left, vw - 336))
  Object.assign(form.style, { left: `${left}px`, top: `${top}px` })
  ui.layer.append(form)

  let closed = false
  const close = () => {
    closed = true
    form.remove()
  }
  const submit = () => {
    const note = ta.value.trim()
    if (!note) return // ANOT-06
    close()
    opts.onSave(note)
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
