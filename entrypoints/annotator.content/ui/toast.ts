import type { UiHost } from './host'
import { el } from './dom'

export function showToast(ui: UiHost, text: string, ms = 2500): void {
  ui.root.querySelector('.pxa-toast')?.remove()
  const toast = el('div', { className: 'pxa-toast', textContent: text })
  toast.setAttribute('role', 'status')
  ui.layer.append(toast)
  setTimeout(() => toast.remove(), ms)
}
