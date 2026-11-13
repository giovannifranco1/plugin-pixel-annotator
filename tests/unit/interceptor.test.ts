import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { installInterceptor } from '@/entrypoints/annotator.content/interceptor'
import { createOverlay } from '@/entrypoints/annotator.content/ui/overlay'

let ui: UiHost
let uninstall: () => void
const onHover = vi.fn()
const onPick = vi.fn()

beforeEach(() => {
  document.body.innerHTML = '<button id="save">Salvar</button><a href="/outra">link</a>'
  ui = createHost()
  onHover.mockReset(); onPick.mockReset()
  uninstall = installInterceptor(ui, { onHover, onPick })
})
afterEach(() => { uninstall(); ui.host.remove() })

const fire = (el: Element, type: string) => {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, composed: true })
  el.dispatchEvent(ev)
  return ev
}

describe('interceptor', () => {
  test('ANOT-04 clique na página: preventDefault + handler da página não roda + onPick(el)', () => {
    const page = vi.fn()
    const btn = document.getElementById('save')!
    btn.addEventListener('click', page)
    const ev = fire(btn, 'click')
    expect(page).not.toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(true)
    expect(onPick).toHaveBeenCalledWith(btn)
    expect(fire(document.querySelector('a')!, 'click').defaultPrevented).toBe(true)
  })

  test('ANOT-04 pointerdown/mousedown também bloqueados', () => {
    const page = vi.fn()
    const btn = document.getElementById('save')!
    btn.addEventListener('mousedown', page)
    btn.addEventListener('pointerdown', page)
    expect(fire(btn, 'mousedown').defaultPrevented).toBe(true)
    expect(fire(btn, 'pointerdown').defaultPrevented).toBe(true)
    expect(page).not.toHaveBeenCalled()
    expect(onPick).not.toHaveBeenCalled()
  })

  test('ANOT-07 clique dentro do host não é bloqueado nem vira pick', () => {
    const inner = document.createElement('button')
    ui.layer.append(inner)
    const handler = vi.fn()
    inner.addEventListener('click', handler)
    const ev = fire(inner, 'click')
    expect(handler).toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(false)
    expect(onPick).not.toHaveBeenCalled()
  })

  test('ANOT-03 hover chama onHover(el); rótulo "button 120×40"', () => {
    const btn = document.getElementById('save')!
    fire(btn, 'pointermove')
    expect(onHover).toHaveBeenCalledWith(btn)
    vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 50, width: 120, height: 40, x: 10, y: 50, right: 130, bottom: 90, toJSON() {} } as DOMRect)
    const overlay = createOverlay(ui)
    overlay.highlight(btn)
    overlay.update() // o tick desenha
    expect(ui.root.querySelector('.pxa-label')!.textContent).toBe('button 120×40')
    const box = ui.root.querySelector<HTMLElement>('.pxa-outline')!
    expect(box.style.width).toBe('120px')
    overlay.highlight(null)
    overlay.update()
    expect(box.style.display).toBe('none')
  })

  test('ANOT-03 uninstall remove todos os listeners', () => {
    uninstall()
    const page = vi.fn()
    const btn = document.getElementById('save')!
    btn.addEventListener('click', page)
    fire(btn, 'click')
    fire(btn, 'pointermove')
    expect(page).toHaveBeenCalled()
    expect(onPick).not.toHaveBeenCalled()
    expect(onHover).not.toHaveBeenCalled()
    uninstall = () => {}
  })
})
