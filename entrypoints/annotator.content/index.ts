import { createController } from './controller'
import type { PxaMessage, ToggleResponse } from '@/lib/messages'

export default defineContentScript({
  // Sem `matches`: com registration 'runtime' o WXT copiaria `matches` para host_permissions (PLAT-01).
  registration: 'runtime',
  main() {
    const w = window as unknown as Record<string, unknown>
    if (w.__pxaAnnotator) return // já injetado nesta aba: o background só alterna
    const controller = createController()
    w.__pxaAnnotator = controller
    // Resposta síncrona via sendResponse (Chrome sem polyfill não aceita Promise como retorno).
    browser.runtime.onMessage.addListener((msg: PxaMessage, _sender, sendResponse) => {
      if (msg?.type !== 'pxa:toggle') return undefined
      controller.toggle()
      sendResponse({ active: controller.isActive() } satisfies ToggleResponse)
      return undefined
    })
  },
})
