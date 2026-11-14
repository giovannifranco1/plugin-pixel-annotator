import type { Page } from '@playwright/test'
import { BASE, editor, expect, items, pxa, test, toast } from './harness'

const tool = (page: Page, name: string) => pxa(page).locator('.pxa-rx-bar button', { hasText: name })
const row = (page: Page, value: string, kind = value.startsWith('#') ? 'color' : 'spacing') =>
  pxa(page).locator(`.pxa-audit-row[data-value="${value}"][data-kind="${kind}"]`)
const flagged = (page: Page, kind: string) => pxa(page).locator(`.pxa-audit-row[data-kind="${kind}"]:has(.pxa-audit-annotate)`)

test.beforeEach(async ({ page, toggle }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${BASE}/raio-x.html`)
  await toggle(page)
  await expect(pxa(page).locator('.pxa-rx-bar')).toBeVisible()
})

test('critério de sucesso: aponta espaçamentos, cor, tamanho e fonte errados sem acusar tokens nem cores modernas', async ({ page }) => {
  await tool(page, 'Detector').click()
  await expect(pxa(page).locator('.pxa-audit-head')).toContainText('3 espaçamentos fora da escala de 4px')
  // tem que achar
  await expect(flagged(page, 'spacing').locator('.pxa-audit-value')).toHaveText(['13px', '18px', '7px'])
  await expect(row(page, '13px')).toContainText('padding')
  await expect(flagged(page, 'color').locator('.pxa-audit-value')).toHaveText(['#7a7a7a'])
  await expect(row(page, '#7a7a7a')).toContainText('parecida com #777777')
  await expect(flagged(page, 'font-size').locator('.pxa-audit-value')).toHaveText(['15px'])
  await expect(row(page, '15px', 'font-size')).toContainText('parecido com 16px')
  await expect(flagged(page, 'font-family')).toHaveCount(1)
  await expect(flagged(page, 'font-family')).toContainText('fonte padrão do navegador')
  // não pode acusar: tokens do Tailwind, cor oklch() (vira #ff0000), sr-only (3px)
  for (const v of ['2px', '6px', '10px', '14px']) await expect(row(page, v).locator('.pxa-audit-annotate')).toHaveCount(0)
  await expect(row(page, '#ff0000')).toHaveCount(1)
  await expect(pxa(page).locator('.pxa-audit')).not.toContainText('oklch')
  await expect(row(page, '3px')).toHaveCount(0)
})

test('DETE-01/DETE-06 página média (3.000 elementos): relatório em menos de 1s', async ({ page, toggle }) => {
  await page.goto(`${BASE}/raio-x.html?n=3000`)
  await toggle(page)
  const start = Date.now()
  await tool(page, 'Detector').click()
  await expect(pxa(page).locator('.pxa-audit-head')).toContainText('cores')
  const wall = Date.now() - start
  const foot = await pxa(page).locator('.pxa-audit-foot').textContent()
  const [, count, ms] = /([\d.]+) elementos em (\d+) ms/.exec(foot!)!
  expect(Number(count!.replace(/\./g, ''))).toBeGreaterThanOrEqual(3000)
  expect(Number(ms)).toBeLessThan(1000)
  expect(wall).toBeLessThan(1500) // inclui a latência do Playwright
})

test('DETE-04 hover num valor destaca os elementos que o usam', async ({ page }) => {
  await tool(page, 'Detector').click()
  await pxa(page).locator('.pxa-audit-row[data-kind="color"]').first().locator('xpath=ancestor::section//summary').first().click()
  await row(page, '#777777').hover()
  await expect(pxa(page).locator('.pxa-audit-hl .pxa-box:visible')).toHaveCount(3)
})

test('DETE-10 clicar no valor rola até o elemento lá embaixo', async ({ page }) => {
  await tool(page, 'Detector').click()
  await expect(page.locator('#longe')).not.toBeInViewport()
  await row(page, '18px').locator('.pxa-audit-value').click()
  await expect(page.locator('#longe')).toBeInViewport()
})

test('DETE-05 "Anotar" um Achado cria a anotação com a nota que diz o que usar', async ({ page }) => {
  await tool(page, 'Detector').click()
  await row(page, '13px').getByRole('button', { name: 'Anotar' }).click()
  await expect(editor(page)).toHaveValue('[Raio-X] espaçamento 13px (padding) fora da escala de 4px: usar 12px ou 14px (1 elemento)')
  await editor(page).press('Enter')
  await expect(items(page)).toHaveCount(1)
  await expect(items(page).first()).toContainText('[Raio-X] espaçamento 13px')
})

test('LUPA-01/LUPA-02 lupa mostra o hex sob o cursor e o clique copia sem criar anotação', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE })
  const box = (await page.locator('#lupa').boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await tool(page, 'Lupa').click()
  await page.mouse.move(x, y)
  await expect(pxa(page).locator('.pxa-loupe-hex')).toHaveText('#12ab34')
  await page.mouse.click(x, y)
  await expect(toast(page)).toHaveText('#12ab34 copiado')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('#12ab34')
  await expect(editor(page)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(tool(page, 'Lupa')).toHaveAttribute('aria-pressed', 'false')
  await expect(pxa(page).locator('.pxa-loupe')).toBeHidden()
})
