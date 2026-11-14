import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { openNoteEditor } from '@/entrypoints/annotator.content/ui/note-editor'

let ui: UiHost
const anchor = { left: 10, top: 10, bottom: 50, right: 100, width: 90, height: 40, x: 10, y: 10, toJSON() {} } as DOMRect
beforeEach(() => { ui = createHost() })
afterEach(() => ui.host.remove())

const textarea = () => ui.root.querySelector('textarea')!
const key = (k: string, shiftKey = false) => textarea().dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true }))

describe('note editor', () => {
  test('ANOT-05 Enter salva nota aparada', () => {
    const onSave = vi.fn()
    openNoteEditor(ui, { anchor, onSave, onCancel: vi.fn() })
    textarea().value = '  padding maior  '
    key('Enter')
    expect(onSave).toHaveBeenCalledWith('padding maior')
    expect(ui.root.querySelector('.pxa-editor')).toBeNull()
  })

  test('ANOT-05 Shift+Enter não salva', () => {
    const onSave = vi.fn()
    openNoteEditor(ui, { anchor, onSave, onCancel: vi.fn() })
    textarea().value = 'linha 1'
    key('Enter', true)
    expect(onSave).not.toHaveBeenCalled()
  })

  test('ANOT-06 Esc cancela e não chama onSave', () => {
    const onSave = vi.fn(); const onCancel = vi.fn()
    openNoteEditor(ui, { anchor, onSave, onCancel })
    textarea().value = 'algo'
    key('Escape')
    expect(onSave).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
    expect(ui.root.querySelector('.pxa-editor')).toBeNull()
  })

  test('ANOT-06 nota vazia ou só espaços não salva', () => {
    const onSave = vi.fn()
    openNoteEditor(ui, { anchor, onSave, onCancel: vi.fn() })
    textarea().value = '   '
    key('Enter')
    ui.root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
    expect(onSave).not.toHaveBeenCalled()
    expect(ui.root.querySelector('.pxa-editor')).not.toBeNull()
  })

  test('PAIN-03 abre com valor inicial para edição', () => {
    openNoteEditor(ui, { anchor, initial: 'nota antiga', onSave: vi.fn(), onCancel: vi.fn() })
    expect(textarea().value).toBe('nota antiga')
  })

  const errs = [
    { kind: 'console' as const, message: 'TypeError: x', at: '2026-11-14T12:00:00.000Z', count: 2 },
    { kind: 'network' as const, message: 'GET http://a/x → 404', at: '2026-11-14T12:00:01.000Z', count: 1, method: 'GET', url: 'http://a/x', status: 404 },
  ]
  const errorItems = () => Array.from(ui.root.querySelectorAll<HTMLElement>('.pxa-errors li'))

  test('ERRO-04 editor mostra os erros e permite remover antes de salvar', () => {
    const onSave = vi.fn()
    openNoteEditor(ui, { anchor, errors: errs, onSave, onCancel: vi.fn() })
    expect(ui.root.querySelector('.pxa-errors-title')!.textContent).toBe('⚠ 2 erros')
    expect(errorItems().map((li) => li.textContent)).toEqual(['console.error: TypeError: x ×2✕', 'rede: GET http://a/x → 404✕'])
    errorItems()[0]!.querySelector('button')!.click()
    expect(ui.root.querySelector('.pxa-errors-title')!.textContent).toBe('⚠ 1 erro')
    textarea().value = 'nota'
    key('Enter')
    expect(onSave).toHaveBeenCalledWith('nota', [errs[1]])
  })

  test('ERRO-04 remover todos some com a lista e salva lista vazia', () => {
    const onSave = vi.fn()
    openNoteEditor(ui, { anchor, errors: [errs[0]!], onSave, onCancel: vi.fn() })
    errorItems()[0]!.querySelector('button')!.click()
    expect(ui.root.querySelector('.pxa-errors')).toBeNull()
    textarea().value = 'nota'
    key('Enter')
    expect(onSave).toHaveBeenCalledWith('nota', [])
  })

  test('ERRO-04 erros chegando por Promise aparecem quando o probe responde', async () => {
    const onSave = vi.fn()
    let resolve!: (v: typeof errs) => void
    openNoteEditor(ui, { anchor, errors: new Promise((r) => { resolve = r }), onSave, onCancel: vi.fn() })
    expect(ui.root.querySelector('.pxa-errors')).toBeNull()
    resolve(errs)
    await vi.waitFor(() => expect(errorItems()).toHaveLength(2))
  })

  test('ERRO-04 salvar antes de o probe responder espera a lista (sem perder os erros)', async () => {
    const onSave = vi.fn()
    let resolve!: (v: typeof errs) => void
    openNoteEditor(ui, { anchor, errors: new Promise((r) => { resolve = r }), onSave, onCancel: vi.fn() })
    textarea().value = 'rápido'
    key('Enter')
    expect(onSave).not.toHaveBeenCalled()
    resolve(errs)
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith('rápido', errs))
  })

  test('ERRO-04 sem erros não mostra a lista', () => {
    openNoteEditor(ui, { anchor, errors: [], onSave: vi.fn(), onCancel: vi.fn() })
    expect(ui.root.querySelector('.pxa-errors')).toBeNull()
  })
})

