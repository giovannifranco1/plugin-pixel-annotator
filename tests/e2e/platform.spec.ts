import { activeTabId, expect, test } from './harness'

test('PLAT-02 toggle em chrome://version → badge "!" e título explicativo', async ({ page, sw, toggle }) => {
  await page.goto('chrome://version')
  await toggle(page)
  const tabId = await activeTabId(sw)
  const state = await sw.evaluate(async (id) => {
    const chrome = (globalThis as any).chrome
    return { badge: await chrome.action.getBadgeText({ tabId: id }), title: await chrome.action.getTitle({ tabId: id }) }
  }, tabId)
  expect(state).toEqual({ badge: '!', title: 'PxA não pode anotar esta página' })
})
