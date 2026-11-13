import { createCaptureQueue } from '@/lib/capture-queue'
import { ANNOTATOR_FILE, BLOCKED_TITLE, DEFAULT_TITLE, PROBE_FILE, type PxaMessage } from '@/lib/messages'

async function setBadge(tabId: number, text: string, title: string): Promise<void> {
  await Promise.all([browser.action.setBadgeText({ tabId, text }), browser.action.setTitle({ tabId, title })])
}

/**
 * Alterna o Modo Anotação na aba (ANOT-01/02). Pergunta ao isolated world se o annotator já existe
 * e injeta annotator + probe só na primeira vez. Qualquer falha marca a aba como não anotável (PLAT-02).
 */
export async function toggle(tabId: number): Promise<void> {
  const target = { tabId }
  try {
    const [check] = await browser.scripting.executeScript({
      target,
      func: () => Boolean((window as unknown as Record<string, unknown>).__pxaAnnotator),
    })
    if (!check?.result) {
      await Promise.all([
        browser.scripting.executeScript({ target, files: [ANNOTATOR_FILE] }),
        // COMP-04: sem o probe a anotação sai sem componente, mas o modo funciona.
        browser.scripting.executeScript({ target, files: [PROBE_FILE], world: 'MAIN' }).catch(() => undefined),
      ])
    }
    await browser.tabs.sendMessage(tabId, { type: 'pxa:toggle' } satisfies PxaMessage)
  } catch {
    return setBadge(tabId, '!', BLOCKED_TITLE)
  }
  await setBadge(tabId, '', DEFAULT_TITLE)
}

export default defineBackground(() => {
  const queue = createCaptureQueue(() => browser.tabs.captureVisibleTab({ format: 'png' }))

  browser.action.onClicked.addListener((tab) => {
    if (tab.id !== undefined) void toggle(tab.id)
  })

  // Chrome (sem polyfill) não aceita Promise como retorno do listener: sendResponse + `return true`.
  browser.runtime.onMessage.addListener((msg: PxaMessage, _sender, sendResponse) => {
    if (msg?.type !== 'pxa:capture') return undefined
    queue.enqueue().then(
      (dataUrl) => sendResponse({ dataUrl }),
      (err) => sendResponse({ error: String(err) }),
    )
    return true
  })

  // Gancho só no build de E2E: o Playwright não consegue clicar no ícone da extensão.
  if (import.meta.env.MODE === 'e2e') (globalThis as Record<string, unknown>).__pxaToggle = toggle
})
