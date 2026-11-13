import type { UiHost } from './host'

export function showToast(ui: UiHost, text: string, ms = 2500): void {
  ui.root.querySelector('.pxa-toast')?.remove()
  const toast = document.createElement('div')
  toast.className = 'pxa-toast'
  toast.setAttribute('role', 'status')
  toast.textContent = text
  ui.layer.append(toast)
  setTimeout(() => toast.remove(), ms)
}
