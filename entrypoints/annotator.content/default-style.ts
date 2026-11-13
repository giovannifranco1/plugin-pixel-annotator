import { readStyle } from '@/lib/css-filter'
import type { UiHost } from './ui/host'

/**
 * CSS padrão do navegador por tag (CAPT-06), medido num iframe vazio dentro do shadow root:
 * não herda o CSS da página e não aparece no DOM visível.
 */
export function createDefaultStyle(ui: UiHost) {
  let frame: HTMLIFrameElement | null = null
  const cache = new Map<string, Record<string, string>>()
  return (tag: string): Record<string, string> => {
    const hit = cache.get(tag)
    if (hit) return hit
    if (!frame) {
      frame = document.createElement('iframe')
      frame.setAttribute('aria-hidden', 'true')
      frame.tabIndex = -1
      frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden'
      ui.root.append(frame)
    }
    const doc = frame.contentDocument
    const win = frame.contentWindow
    if (!doc || !win) return {}
    const probe = doc.createElement(tag)
    doc.body.append(probe)
    const style = readStyle(win.getComputedStyle(probe))
    probe.remove()
    cache.set(tag, style)
    return style
  }
}
