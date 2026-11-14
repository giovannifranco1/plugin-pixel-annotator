import { createController } from './controller'
import { openAnnotationDb } from './annotation-db'
import { createStore } from '@/lib/store'
import { syncStore } from '@/lib/persist'
import type { PxaMessage, ToggleResponse } from '@/lib/messages'

/** Se o IndexedDB não responder a tempo, o PxA segue só na memória (com o aviso de saída). */
const LOAD_TIMEOUT_MS = 1500

/**
 * Carrega as anotações salvas no site antes de criar o controller (PERS-01): assim o store já nasce
 * com elas e nada as trata como "novas" (mascote, sons). Falha ou demora → memória + aviso de saída.
 */
async function boot() {
  try {
    const db = await Promise.race([
      openAnnotationDb(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('IndexedDB demorou')), LOAD_TIMEOUT_MS)),
    ])
    const store = createStore(undefined, undefined, await db.load())
    let warned = false
    syncStore(store, db, (e) => {
      if (warned) return
      warned = true
      console.warn('[PxA] não consegui salvar as anotações neste site', e)
    })
    return createController({ store, unloadGuard: false })
  } catch (e) {
    console.warn('[PxA] anotações só na memória desta aba', e)
    return createController()
  }
}

export default defineContentScript({
  // Sem `matches`: com registration 'runtime' o WXT copiaria `matches` para host_permissions (PLAT-01).
  registration: 'runtime',
  main() {
    const w = window as unknown as Record<string, unknown>
    if (w.__pxaAnnotator) return // já injetado nesta aba: o background só alterna
    const ready = boot().then((controller) => {
      w.__pxaAnnotator = controller
      return controller
    })
    w.__pxaAnnotator = ready // marca a aba já na injeção: um segundo clique não injeta de novo
    // Responde depois do carregamento (`return true` mantém o canal aberto no Chrome).
    browser.runtime.onMessage.addListener((msg: PxaMessage, _sender, sendResponse) => {
      if (msg?.type !== 'pxa:toggle') return undefined
      void ready.then((controller) => {
        controller.toggle()
        sendResponse({ active: controller.isActive() } satisfies ToggleResponse)
      })
      return true
    })
  },
})
