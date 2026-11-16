import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import background, { navigateForFocus, onTabUpdated, toggle } from '@/entrypoints/background'
import type { MockInstance } from 'vitest'
import { ANNOTATOR_FILE, BLOCKED_TITLE, PROBE_FILE } from '@/lib/messages'

const TAB = 7
// As assinaturas do @wxt-dev/browser não descrevem o retorno real das APIs; o spy precisa de um tipo livre.
type AnyFn = (...args: any[]) => any
const spy = (obj: object, key: string) => vi.spyOn(obj as Record<string, AnyFn>, key) as MockInstance<AnyFn>

/** executeScript falso: a checagem (`func`) responde se o annotator já está na aba. */
function fakeExec({ injected = false, failProbe = false, blocked = false } = {}) {
  return spy(browser.scripting, 'executeScript').mockImplementation(async (opts: any) => {
    if (blocked) throw new Error('Cannot access a chrome:// URL')
    if (opts.func) return [{ result: injected }]
    if (opts.world === 'MAIN' && failProbe) throw new Error('world MAIN indisponível')
    return []
  })
}

beforeEach(() => {
  fakeBrowser.reset()
  vi.restoreAllMocks()
})

describe('background', () => {
  test('ANOT-01 primeira vez: injeta annotator e probe (MAIN) e envia toggle', async () => {
    const exec = fakeExec()
    const send = spy(browser.tabs, 'sendMessage').mockResolvedValue({ active: true })
    await toggle(TAB)
    expect(exec).toHaveBeenCalledWith({ target: { tabId: TAB }, files: [ANNOTATOR_FILE] })
    expect(exec).toHaveBeenCalledWith({ target: { tabId: TAB }, files: [PROBE_FILE], world: 'MAIN' })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(TAB, { type: 'pxa:toggle' })
  })

  test('ANOT-02 já injetado: só envia toggle, não reinjeta', async () => {
    const exec = fakeExec({ injected: true })
    const send = spy(browser.tabs, 'sendMessage').mockResolvedValue({ active: false })
    await toggle(TAB)
    expect(exec).toHaveBeenCalledTimes(1) // só a checagem
    expect(send).toHaveBeenCalledTimes(1)
  })

  test('PLAT-02 injeção falha: badge "!" e título "PxA não pode anotar esta página" na aba', async () => {
    fakeExec({ blocked: true })
    spy(browser.tabs, 'sendMessage').mockResolvedValue({ active: true })
    await toggle(TAB)
    expect(await browser.action.getBadgeText({ tabId: TAB })).toBe('!')
    expect(await browser.action.getTitle({ tabId: TAB })).toBe(BLOCKED_TITLE)
  })

  test('PLAT-02 sucesso limpa badge e título', async () => {
    await browser.action.setBadgeText({ tabId: TAB, text: '!' })
    fakeExec({ injected: true })
    spy(browser.tabs, 'sendMessage').mockResolvedValue({ active: true })
    await toggle(TAB)
    expect(await browser.action.getBadgeText({ tabId: TAB })).toBe('')
    expect(await browser.action.getTitle({ tabId: TAB })).toBe('PixelAnnotator')
  })

  test('COMP-04 probe falha mas annotator injeta: toggle segue', async () => {
    fakeExec({ failProbe: true })
    const send = spy(browser.tabs, 'sendMessage').mockResolvedValue({ active: true })
    await toggle(TAB)
    expect(send).toHaveBeenCalledTimes(1)
    expect(await browser.action.getBadgeText({ tabId: TAB })).toBe('')
  })

  test('PAIN-02 foco em outra rota: navega a aba, marca reinjeção e reativa no fim do carregamento', async () => {
    const update = spy(browser.tabs, 'update').mockResolvedValue({})
    await navigateForFocus(TAB, 'https://site/app/x')
    expect(update).toHaveBeenCalledWith(TAB, { url: 'https://site/app/x' })
    const exec = fakeExec()
    const send = spy(browser.tabs, 'sendMessage').mockResolvedValue({ active: true })
    await onTabUpdated(TAB, 'loading') // ainda carregando: não reinjeta
    await onTabUpdated(999, 'complete') // outra aba, sem pendência
    expect(exec).not.toHaveBeenCalled()
    await onTabUpdated(TAB, 'complete')
    expect(exec).toHaveBeenCalledWith({ target: { tabId: TAB }, files: [ANNOTATOR_FILE] })
    expect(send).toHaveBeenCalledWith(TAB, { type: 'pxa:toggle' })
    exec.mockClear()
    await onTabUpdated(TAB, 'complete') // pendência já consumida: não reinjeta de novo
    expect(exec).not.toHaveBeenCalled()
  })

  test('PAIN-02 falha ao navegar não deixa a aba marcada para reinjeção', async () => {
    spy(browser.tabs, 'update').mockRejectedValue(new Error('aba sumiu'))
    await navigateForFocus(TAB, 'https://site/app/x')
    const exec = fakeExec()
    spy(browser.tabs, 'sendMessage').mockResolvedValue({ active: true })
    await onTabUpdated(TAB, 'complete')
    expect(exec).not.toHaveBeenCalled()
  })

  test('CAPT-07 pxa:capture responde via sendResponse e o listener retorna true', async () => {
    const add = vi.spyOn(browser.runtime.onMessage, 'addListener')
    spy(browser.tabs, 'captureVisibleTab').mockResolvedValue('data:image/png;base64,AAAA')
    background.main()
    const listener = add.mock.calls[0]![0] as (msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => unknown
    const sendResponse = vi.fn()
    expect(listener({ type: 'pxa:capture' }, {}, sendResponse)).toBe(true)
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ dataUrl: 'data:image/png;base64,AAAA' }))
    expect(listener({ type: 'outra' }, {}, vi.fn())).toBeUndefined()
  })
})
