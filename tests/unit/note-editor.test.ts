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
})
