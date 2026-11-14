import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { makeDraggable } from '@/entrypoints/annotator.content/ui/draggable'

let box: HTMLElement
let handle: HTMLElement
let close: HTMLButtonElement

/** happy-dom não faz layout: a caixa mede 300×200 na posição do style. */
beforeEach(() => {
  document.body.innerHTML = '<section id="box"><header id="handle">Relatório <button id="close">×</button></header></section>'
  box = document.getElementById('box')!
  handle = document.getElementById('handle')!
  close = document.getElementById('close') as HTMLButtonElement
  Object.assign(box.style, { position: 'fixed', left: '12px', top: '12px' })
  vi.spyOn(box, 'getBoundingClientRect').mockImplementation(() => new DOMRect(parseFloat(box.style.left), parseFloat(box.style.top), 300, 200))
})
afterEach(() => vi.restoreAllMocks())

const pointer = (target: Element, type: string, x: number, y: number) =>
  target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 }))
const key = (k: string) => handle.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
const pos = () => [box.style.left, box.style.top]

describe('draggable', () => {
  test('DETE-11 arrastar o cabeçalho move a janela junto com o ponteiro', () => {
    makeDraggable(box, handle)
    pointer(handle, 'pointerdown', 20, 20)
    pointer(handle, 'pointermove', 220, 120)
    expect(pos()).toEqual(['212px', '112px'])
    pointer(handle, 'pointerup', 220, 120)
    pointer(handle, 'pointermove', 500, 500) // soltou: não move mais
    expect(pos()).toEqual(['212px', '112px'])
  })

  test('DETE-11 a janela nunca sai da tela', () => {
    makeDraggable(box, handle)
    pointer(handle, 'pointerdown', 20, 20)
    pointer(handle, 'pointermove', 5000, 5000)
    expect(pos()).toEqual([`${innerWidth - 300}px`, `${innerHeight - 200}px`])
    pointer(handle, 'pointermove', -5000, -5000)
    expect(pos()).toEqual(['0px', '0px'])
  })

  test('DETE-11 botões do cabeçalho continuam sendo botões (não começam arraste)', () => {
    makeDraggable(box, handle)
    pointer(close, 'pointerdown', 20, 20)
    pointer(handle, 'pointermove', 220, 120)
    expect(pos()).toEqual(['12px', '12px'])
  })

  test('DETE-11 setas do teclado movem 16px; o cabeçalho é focável e diz como mover', () => {
    makeDraggable(box, handle)
    expect(handle.tabIndex).toBe(0)
    expect(handle.title).toContain('Arraste')
    key('ArrowRight')
    key('ArrowDown')
    key('ArrowDown')
    expect(pos()).toEqual(['28px', '44px'])
    key('ArrowLeft')
    key('ArrowUp')
    expect(pos()).toEqual(['12px', '28px'])
  })
})
