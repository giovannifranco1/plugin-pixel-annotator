import { annotate, BASE, expect, items, markers, panel, pxa, test } from './harness'

test.beforeEach(async ({ page, toggle }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await expect(panel(page)).toBeVisible()
})

test('ANOT-01/ANOT-05 anota 2 elementos → marcadores 1 e 2 e 2 itens no painel', async ({ page }) => {
  await annotate(page, '#save', 'botão maior')
  await annotate(page, 'h1.page-title', 'padding maior em cima')
  await expect(markers(page)).toHaveText(['1', '2'])
  await expect(markers(page).first()).toBeVisible()
  await expect(items(page)).toHaveCount(2)
  await expect(items(page).nth(1)).toContainText('padding maior em cima')
})

test('ANOT-02 desativar oculta tudo e reativar mostra as mesmas anotações', async ({ page, toggle }) => {
  await annotate(page, '#save', 'nota')
  await toggle(page)
  await expect(panel(page)).toBeHidden()
  await expect(markers(page).first()).toBeHidden()
  await page.locator('#save').click()
  expect(await page.evaluate(() => (window as any).clicks)).toBe(1) // página volta a reagir
  await toggle(page)
  await expect(panel(page)).toBeVisible()
  await expect(items(page)).toHaveCount(1)
  await expect(markers(page).first()).toBeVisible()
})

test('ANOT-03 hover mostra rótulo "button L×A"', async ({ page }) => {
  await page.locator('#save').hover()
  await expect(pxa(page).locator('.pxa-label')).toHaveText('button 120×40')
  await expect(pxa(page).locator('.pxa-outline')).toBeVisible()
})

test('ANOT-04 clique em button#save não incrementa window.clicks; clique no link não navega', async ({ page }) => {
  await page.locator('#save').click()
  expect(await page.evaluate(() => (window as any).clicks)).toBe(0)
  await expect(pxa(page).locator('.pxa-editor')).toBeVisible()
  await pxa(page).locator('.pxa-editor textarea').press('Escape')
  const url = page.url()
  await page.locator('#link').click()
  await page.waitForTimeout(300)
  expect(page.url()).toBe(url)
  await expect(pxa(page).locator('.pxa-editor')).toBeVisible()
})

test('ANOT-06 Esc e nota vazia não criam anotação', async ({ page }) => {
  await page.locator('#save').click()
  const ta = pxa(page).locator('.pxa-editor textarea')
  await ta.fill('vou desistir')
  await ta.press('Escape')
  await expect(pxa(page).locator('.pxa-editor')).toHaveCount(0)
  await page.locator('#save').click()
  await ta.fill('   ')
  await ta.press('Enter')
  await expect(pxa(page).locator('.pxa-editor')).toBeVisible()
  await expect(items(page)).toHaveCount(0)
  await expect(markers(page)).toHaveCount(0)
})

test('ANOT-07 hover/clique no painel não destaca nem anota', async ({ page }) => {
  await pxa(page).locator('.pxa-panel header').hover()
  await expect(pxa(page).locator('.pxa-outline')).toBeHidden()
  await pxa(page).locator('.pxa-panel header').click()
  await expect(pxa(page).locator('.pxa-editor')).toHaveCount(0)
})

test('ANOT-08 marcador acompanha o elemento após scroll e resize', async ({ page }) => {
  await annotate(page, '#card', 'card')
  const marker = markers(page).first()
  const before = (await marker.boundingBox())!
  await page.evaluate(() => window.scrollBy(0, 150))
  await expect.poll(async () => Math.round((await marker.boundingBox())!.y)).toBe(Math.round(before.y - 150))
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(() => { document.body.style.paddingLeft = '200px' })
  await expect.poll(async () => Math.round((await marker.boundingBox())!.x)).toBe(Math.round(before.x + 176))
})

test('caso limite: CSS genérico da página não muda o painel; host acima do z-index alto', async ({ page }) => {
  const color = await pxa(page).locator('.pxa-panel header').evaluate((el) => getComputedStyle(el).color)
  expect(color).toBe('rgb(255, 255, 255)')
  const font = await pxa(page).locator('.pxa-panel header').evaluate((el) => getComputedStyle(el).fontFamily)
  expect(font).not.toContain('serif,')
  expect(font).not.toBe('serif')
  const z = await pxa(page).evaluate((el) => getComputedStyle(el).zIndex)
  expect(z).toBe('2147483647')
})
