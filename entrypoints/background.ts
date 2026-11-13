import { createCaptureQueue } from '@/lib/capture-queue'
import { ANNOTATOR_FILE, BLOCKED_TITLE, DEFAULT_TITLE, PROBE_FILE, type PxaMessage } from '@/lib/messages'

const NO_RECEIVER = /Receiving end does not exist|Could not establish connection/i

/** Alterna o Modo Anotação na aba, injetando os scripts sob demanda na primeira vez (ANOT-01/02, PLAT-02). */
export async function toggle(tabId: number): Promise<void> {
  const message: PxaMessage = { type: 'pxa:toggle' }
  try {
    await browser.tabs.sendMessage(tabId, message)
  } catch (err) {
    // Só reinjeta quando não há content script; qualquer outro erro não pode virar um segundo toggle.
    if (!NO_RECEIVER.test(String((err as Error)?.message ?? err))) return
    try {
      await browser.scripting.executeScript({ target: { tabId }, files: [ANNOTATOR_FILE] })
      // COMP-04: sem o probe a anotação sai sem componente, mas o modo funciona.
      await browser.scripting.executeScript({ target: { tabId }, files: [PROBE_FILE], world: 'MAIN' }).catch(() => undefined)
      await browser.tabs.sendMessage(tabId, message)
    } catch {
      await browser.action.setBadgeText({ tabId, text: '!' })
      await browser.action.setTitle({ tabId, title: BLOCKED_TITLE })
      return
    }
  }
  await browser.action.setBadgeText({ tabId, text: '' })
  await browser.action.setTitle({ tabId, title: DEFAULT_TITLE })
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
