import type { UiHost } from './host'
import { el } from './dom'

/** Um toast por classe: o novo substitui o anterior da mesma classe. */
export function showToast(ui: UiHost, text: string, ms = 2500, className = 'pxa-toast'): void {
  ui.root.querySelector(`.${className}`)?.remove()
  const toast = el('div', { className, textContent: text })
  toast.setAttribute('role', 'status')
  ui.layer.append(toast)
  setTimeout(() => toast.remove(), ms)
}
