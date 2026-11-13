import { expect, test } from './harness'

test('PLAT-02 toggle em chrome://version → badge "!" e título explicativo', async ({ page, sw, toggle }) => {
  await page.goto('chrome://version')
  await toggle(page)
  const state = await sw.evaluate(async () => {
    const chrome = (globalThis as any).chrome
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    return {
      badge: await chrome.action.getBadgeText({ tabId: tab.id }),
      title: await chrome.action.getTitle({ tabId: tab.id }),
    }
  })
  expect(state).toEqual({ badge: '!', title: 'PxA não pode anotar esta página' })
})
