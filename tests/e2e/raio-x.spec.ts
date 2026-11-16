import type { Page } from '@playwright/test'
import { actionsButton, BASE, editor, expect, items, menuItem, pxa, test, toast } from './harness'

/** Liga/desliga uma ferramenta do Raio-X pelo menu de ações. */
const tool = async (page: Page, name: string) => (await menuItem(page, name)).click()
const row = (page: Page, value: string, kind = value.startsWith('#') ? 'color' : 'spacing') =>
  pxa(page).locator(`.pxa-audit-row[data-value="${value}"][data-kind="${kind}"]`)
const flagged = (page: Page, kind: string) => pxa(page).locator(`.pxa-audit-row[data-kind="${kind}"]:has(.pxa-audit-annotate)`)

test.beforeEach(async ({ page, toggle }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${BASE}/raio-x.html`)
  await toggle(page)
  await expect(actionsButton(page)).toBeVisible()
})

test('critério de sucesso: aponta espaçamentos, cor, tamanho e fonte errados sem acusar tokens nem cores modernas', async ({ page }) => {
  await tool(page, 'Detector')
  await expect(pxa(page).locator('.pxa-audit-head')).toContainText('3 espaçamentos fora da escala de 4px')
  // tem que achar
  await expect(flagged(page, 'spacing').locator('.pxa-audit-value')).toHaveText(['13px', '18px', '7px'])
  await expect(row(page, '13px')).toContainText('padding')
  await expect(flagged(page, 'color').locator('.pxa-audit-value')).toHaveText(['#7a7a7a'])
  await expect(row(page, '#7a7a7a').locator('.pxa-audit-fix')).toHaveText('→ usar #777777')
  // diferença imperceptível: junta com #777777, sem virar Achado (rev. 3)
  await expect(row(page, '#777777')).toContainText('também #777778')
  await expect(row(page, '#777778')).toHaveCount(0)
  await expect(pxa(page).locator('.pxa-audit-head')).toContainText(/^6 achados · /)
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
  await tool(page, 'Detector')
  await expect(pxa(page).locator('.pxa-audit-head')).toContainText('cores')
  const wall = Date.now() - start
  const foot = await pxa(page).locator('.pxa-audit-foot').textContent()
  const [, count, ms] = /([\d.]+) elementos em (\d+) ms/.exec(foot!)!
  expect(Number(count!.replace(/\./g, ''))).toBeGreaterThanOrEqual(3000)
  expect(Number(ms)).toBeLessThan(1000)
  expect(wall).toBeLessThan(1500) // inclui a latência do Playwright
})

test('DETE-04 hover num valor destaca os elementos que o usam', async ({ page }) => {
  await tool(page, 'Detector')
  await pxa(page).locator('.pxa-audit-row[data-kind="color"]').first().locator('xpath=ancestor::section//summary').first().click()
  await row(page, '#777777').hover()
  await expect(pxa(page).locator('.pxa-audit-hl .pxa-box:visible')).toHaveCount(4) // 3 #777777 + 1 #777778 (mesma cor)
})

test('DETE-11 arrastar o cabeçalho tira o relatório de cima do conteúdo, sem anotar nada', async ({ page }) => {
  await tool(page, 'Detector')
  const report = pxa(page).locator('.pxa-audit')
  await expect(report.locator('.pxa-audit-foot')).toContainText(' ms') // varredura terminou: o cabeçalho não muda mais
  const before = (await report.boundingBox())!
  const head = (await report.locator('header').boundingBox())!
  await page.mouse.move(head.x + 40, head.y + head.height / 2)
  await page.mouse.down()
  await page.mouse.move(head.x + 340, head.y + head.height / 2 + 40, { steps: 5 })
  await page.mouse.up()
  const after = (await report.boundingBox())!
  expect(Math.round(after.x - before.x)).toBe(300)
  expect(Math.round(after.y - before.y)).toBe(40)
  // não sai da tela: arrastar muito para baixo para no limite
  await page.mouse.move(after.x + 40, after.y + 20)
  await page.mouse.down()
  await page.mouse.move(after.x + 40, after.y + 5000, { steps: 3 })
  await page.mouse.up()
  const clamped = (await report.boundingBox())!
  expect(Math.round(clamped.y + clamped.height)).toBeLessThanOrEqual(720)
  await expect(editor(page)).toHaveCount(0) // arrastar não vira clique na página
  await expect(items(page)).toHaveCount(0)
})

test('DETE-10 clicar no valor rola até o elemento lá embaixo', async ({ page }) => {
  await tool(page, 'Detector')
  await expect(page.locator('#longe')).not.toBeInViewport()
  await row(page, '18px').locator('.pxa-audit-value').click()
  await expect(page.locator('#longe')).toBeInViewport()
})

test('DETE-05 "Anotar" um Achado cria a anotação com a nota que diz o que usar', async ({ page }) => {
  await tool(page, 'Detector')
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
  await tool(page, 'Lupa')
  await page.mouse.move(x, y)
  await expect(pxa(page).locator('.pxa-loupe-hex')).toHaveText('#12ab34')
  await page.mouse.click(x, y)
  await expect(toast(page)).toHaveText('#12ab34 copiado')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('#12ab34')
  await expect(editor(page)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(actionsButton(page)).not.toHaveClass(/pxa-tool-on/)
  await expect(await menuItem(page, 'Lupa')).toHaveAttribute('aria-checked', 'false')
  await expect(pxa(page).locator('.pxa-loupe')).toBeHidden()
})
