import type { Page } from '@playwright/test'
import { BASE, editor, expect, exportZip, items, pxa, test, toast } from './harness'

const tool = (page: Page, name: string) => pxa(page).locator('.pxa-rx-bar button', { hasText: name })
const row = (page: Page, value: string) => pxa(page).locator(`.pxa-audit-row[data-value="${value}"]`)

test.beforeEach(async ({ page, toggle }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${BASE}/raio-x.html`)
  await toggle(page)
  await expect(pxa(page).locator('.pxa-rx-bar')).toBeVisible()
})

test('critério de sucesso: aponta 3 espaçamentos fora da escala, 2 cores quase iguais e 1 filho vazando', async ({ page }) => {
  await tool(page, 'Detector').click()
  await expect(pxa(page).locator('.pxa-audit-head')).toContainText('3 espaçamentos fora da escala de 4px')
  for (const v of ['13px', '7px', '10px']) await expect(row(page, v)).toContainText('fora da escala de 4px')
  await expect(row(page, '#7a7a7a')).toContainText('parecida com #777777')
  await expect(row(page, '#777777')).toContainText('3×')

  await tool(page, 'X-ray').click()
  const danger = pxa(page).locator('.pxa-xray .pxa-danger')
  await expect(danger).toHaveCount(1)
  await expect(danger).toHaveText('vaza 60px')
  expect(await pxa(page).locator('.pxa-xray .pxa-box:visible').count()).toBeGreaterThan(5) // contornos (XRAY-01)
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
  await row(page, '#777777').hover()
  await expect(pxa(page).locator('.pxa-audit-hl .pxa-box:visible')).toHaveCount(3)
})

test('DETE-05 "Anotar" um Achado cria a anotação com a nota pré-preenchida', async ({ page }) => {
  await tool(page, 'Detector').click()
  await row(page, '13px').getByRole('button', { name: 'Anotar' }).click()
  await expect(editor(page)).toHaveValue('[Raio-X] espaçamento 13px fora da escala de 4px; usado só 1× (1 elemento)')
  await editor(page).press('Enter')
  await expect(items(page)).toHaveCount(1)
  await expect(items(page).first()).toContainText('[Raio-X] espaçamento 13px')
})

test('XRAY-04/XRAY-05 clique no vermelho abre nota "vaza do pai"; clique comum abre nota vazia', async ({ page }) => {
  await tool(page, 'X-ray').click()
  await expect(pxa(page).locator('.pxa-xray .pxa-danger')).toHaveCount(1)
  await page.locator('#vazando').click()
  await expect(editor(page)).toHaveValue('[Raio-X] vaza do pai #caixa em 60px')
  await editor(page).press('Enter')
  await expect(items(page)).toHaveCount(1)
  await page.locator('#lupa').click()
  await expect(editor(page)).toHaveValue('')
})

test('GRAD-01/GRAD-03 grade ligada aparece na tela, mas o print da anotação sai sem ela', async ({ page }) => {
  await tool(page, 'Grade').click()
  await expect(tool(page, 'Grade')).toHaveText('Grade 8px')
  await expect(pxa(page).locator('.pxa-grid')).toBeVisible()
  await page.locator('#alvo-branco').click()
  await editor(page).fill('fundo branco')
  await editor(page).press('Enter')
  await expect(items(page)).toHaveCount(1)
  const { files } = await exportZip(page)
  const b64 = Buffer.from(files['shots/01.png']!).toString('base64')
  // Centro do recorte = miolo do #alvo-branco. Com a grade no print haveria linhas a cada 4/8px.
  const notWhite = await page.evaluate(async (data) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
    const canvas = new OffscreenCanvas(img.width, img.height)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const px = ctx.getImageData(Math.floor(img.width / 2) - 20, Math.floor(img.height / 2) - 20, 40, 40).data
    let n = 0
    for (let i = 0; i < px.length; i += 4) if (px[i] !== 255 || px[i + 1] !== 255 || px[i + 2] !== 255) n++
    return n
  }, b64)
  expect(notWhite).toBe(0)
  await expect(pxa(page).locator('.pxa-grid')).toBeVisible() // volta depois do print
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
