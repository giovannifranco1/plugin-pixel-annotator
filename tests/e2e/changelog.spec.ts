import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { actionsButton, BASE, expect, menuItem, pxa, test } from './harness'

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
const win = (page: Page) => pxa(page).locator('.pxa-changelog')

test('NOVI-01..04 Changelog no menu de ações abre a janela com a versão atual; Esc fecha', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await (await menuItem(page, 'Changelog')).click()
  await expect(win(page)).toBeVisible()
  await expect(win(page).locator('header')).toContainText('Changelog do PxA')
  const first = win(page).locator('.pxa-changelog-entry').first()
  await expect(first).toHaveAttribute('data-version', version)
  await expect(first.locator('.pxa-changelog-current')).toHaveText('atual')
  await page.keyboard.press('Escape')
  await expect(win(page)).toBeHidden()
})

test('NOVI-08 instalação nova não mostra o ponto de novidade', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await expect(actionsButton(page)).toBeVisible()
  await expect(actionsButton(page)).not.toHaveClass(/pxa-news/)
})

test('NOVI-09/10 depois de atualizar: ponto no ⋮ até abrir o Changelog', async ({ page, sw, toggle }) => {
  await sw.evaluate(() => (globalThis as any).chrome.storage.local.set({ 'pxa:profile': { version: 1, theme: 'padrao', sound: false, lastSeenVersion: '0.9.0' } }))
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await expect(actionsButton(page)).toHaveClass(/pxa-news/)
  const item = await menuItem(page, 'Changelog')
  await expect(item.locator('.pxa-news-dot')).toBeVisible()
  await item.click()
  await expect(win(page)).toBeVisible()
  await expect(actionsButton(page)).not.toHaveClass(/pxa-news/)
  await expect.poll(() => sw.evaluate(async () => (await (globalThis as any).chrome.storage.local.get('pxa:profile'))['pxa:profile']?.lastSeenVersion)).toBe(version)
})
