import { afterEach, describe, expect, test, vi } from 'vitest'
import { createHost } from '@/entrypoints/annotator.content/ui/host'
import { showToast } from '@/entrypoints/annotator.content/ui/toast'

afterEach(() => { document.documentElement.querySelectorAll('pxa-root').forEach((n) => n.remove()); vi.useRealTimers() })

describe('ui host', () => {
  test('ANOT-07 host tem data-pxa-ignore e shadow root aberto', () => {
    const ui = createHost()
    expect(ui.host.hasAttribute('data-pxa-ignore')).toBe(true)
    expect(ui.host.shadowRoot).toBe(ui.root)
    expect(ui.host.isConnected).toBe(true)
  })

  test('caso limite: CSS da página não entra no shadow root', () => {
    const page = document.createElement('style')
    page.textContent = '* { color: red !important }'
    document.head.append(page)
    const ui = createHost()
    const styles = Array.from(ui.root.querySelectorAll('style')).map((s) => s.textContent).join('\n')
    expect(styles).not.toContain('color: red')
    expect(styles).toContain(':host')
    expect(ui.host.style.cssText).toContain('all: initial')
    page.remove()
  })

  test('ANOT-07 isPxa reconhece nós internos via composedPath', () => {
    const ui = createHost()
    const inner = document.createElement('button')
    ui.layer.append(inner)
    let path: EventTarget[] = []
    inner.addEventListener('click', (e) => { path = e.composedPath() })
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(ui.isPxa(path)).toBe(true)
    expect(ui.isPxa([document.body, document.documentElement, document])).toBe(false)
  })

  test('setHidden alterna visibility', () => {
    const ui = createHost()
    ui.setHidden(true)
    expect(ui.host.style.visibility).toBe('hidden')
    ui.setHidden(false)
    expect(ui.host.style.visibility).toBe('visible')
  })

  test('showToast aparece e some após o tempo', () => {
    vi.useFakeTimers()
    const ui = createHost()
    showToast(ui, 'Markdown copiado', 1000)
    const toast = ui.root.querySelector('.pxa-toast')!
    expect(toast.textContent).toBe('Markdown copiado')
    expect(toast.getAttribute('role')).toBe('status')
    vi.advanceTimersByTime(1000)
    expect(ui.root.querySelector('.pxa-toast')).toBeNull()
  })
})
