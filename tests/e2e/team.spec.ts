import type { Page } from '@playwright/test'
import { annotate, BASE, editor, expect, exportZip, items, markers, pngSize, pxa, test, toast } from './harness'
import { PORT } from './port'

const button = (page: Page, name: string) => pxa(page).getByRole('button', { name, exact: true })
const markerBoxes = (page: Page) => markers(page).evaluateAll((els) => els.map((e) => {
  const r = e.getBoundingClientRect()
  return [e.textContent, Math.round(r.left), Math.round(r.top)]
}))

test('ERRO-01/ERRO-04/ERRO-05 console.error e fetch 404 vão para a nota, o Painel e o feedback.md', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  // Main world da página, depois da injeção do probe. Accept JSON: o Vite só devolve 404 fora do fallback de HTML.
  await page.evaluate(async () => {
    console.error('Falha simulada', new Error('cliente sem id'))
    await fetch('/api/nao-existe.json?token=segredo', { headers: { Accept: 'application/json' } })
  })
  await page.locator('#save').click()
  await expect(pxa(page).locator('.pxa-errors li')).toHaveCount(2)
  await expect(pxa(page).locator('.pxa-errors-title')).toHaveText('⚠ 2 erros')
  await editor(page).fill('salvar quebra')
  await editor(page).press('Enter')
  await expect(items(page)).toHaveCount(1)
  await expect(pxa(page).locator('.pxa-err')).toHaveText('⚠ 2')

  const { md } = await exportZip(page)
  expect(md).toContain('**Erros no console:**')
  expect(md).toMatch(/\d\d:\d\d:\d\d console\.error: Falha simulada Error: cliente sem id/)
  expect(md).toMatch(new RegExp(`\\d\\d:\\d\\d:\\d\\d rede: GET http://localhost:${PORT}/api/nao-existe\\.json → 404`))
  expect(md).not.toContain('segredo')
})

test('ERRO-01 a página continua recebendo o resultado original de fetch e console.error', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  const logged: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') logged.push(m.text()) })
  await toggle(page)
  const status = await page.evaluate(async () => {
    console.error('ainda chega no console')
    return (await fetch('/api/nao-existe.json', { headers: { Accept: 'application/json' } })).status
  })
  expect(status).toBe(404)
  await expect.poll(() => logged.some((t) => t.includes('ainda chega no console'))).toBe(true)
})

test('IMPO-01..05 exportar numa aba e importar em outra recria os marcadores nas mesmas posições; IMPO-06 sem duplicar', async ({ page, context, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await annotate(page, '#card', 'card')
  await expect(markers(page)).toHaveCount(2)
  const original = await markerBoxes(page)
  const { path, files } = await exportZip(page)
  expect(files['pxa.json']).toBeTruthy()

  const other = await context.newPage()
  await other.goto(`${BASE}/index.html`)
  await toggle(other)
  await pxa(other).locator('input[type="file"]').setInputFiles(path)
  await expect(items(other)).toHaveCount(2)
  await expect(toast(other)).toHaveText('2 anotações importadas')
  await expect(markers(other)).toHaveCount(2)
  await expect.poll(() => markerBoxes(other)).toEqual(original)
  await expect(pxa(other).locator('.pxa-imported')).toHaveText([`#1 de localhost:${PORT}`, `#2 de localhost:${PORT}`])

  await pxa(other).locator('input[type="file"]').setInputFiles(path)
  await expect(toast(other)).toHaveText('Nada novo: essas anotações já estão aqui.')
  await expect(items(other)).toHaveCount(2)
})

test('IMPO-05 importada sem elemento na página: item avisa e não tem Marcador', async ({ page, context, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  const { path } = await exportZip(page)

  const other = await context.newPage()
  await other.goto(`${BASE}/index.html`)
  await other.evaluate(() => document.getElementById('save')!.remove())
  await toggle(other)
  await pxa(other).locator('input[type="file"]').setInputFiles(path)
  await expect(pxa(other).locator('.pxa-missing')).toHaveText('elemento não encontrado')
  await expect(markers(other).filter({ visible: true })).toHaveCount(0)
})

test('APRE-01..06 Apresentar pelo teclado: spotlight, contador, sair restaura o Painel', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'primeira')
  await annotate(page, '#abaixo', 'segunda, abaixo da dobra')
  await button(page, 'Apresentar').click()
  const card = pxa(page).locator('.pxa-present')
  await expect(card.locator('.pxa-present-count')).toHaveText('1/2')
  await expect(card.locator('.pxa-present-note')).toHaveText('primeira')
  await expect(pxa(page).locator('.pxa-panel')).toBeHidden()
  await expect(pxa(page).locator('.pxa-spot')).toBeVisible()

  await page.keyboard.press('ArrowRight')
  await expect(card.locator('.pxa-present-count')).toHaveText('2/2')
  // rolagem suave até o elemento abaixo da dobra; o recorte acompanha
  await expect.poll(async () => {
    const [spot, el] = await Promise.all([
      pxa(page).locator('.pxa-spot').boundingBox(),
      page.locator('#abaixo').boundingBox(),
    ])
    return spot && el ? Math.abs(spot.y + 4 - el.y) <= 2 : false
  }).toBe(true)
  await page.keyboard.press('Home')
  await expect(card.locator('.pxa-present-count')).toHaveText('1/2')

  await page.keyboard.press('Escape')
  await expect(card).toHaveCount(0)
  await expect(pxa(page).locator('.pxa-panel')).toBeVisible()
  await annotate(page, '#card', 'voltou a anotar') // APRE-06: estado ativo de novo
})

test('DESE-01..04 desenhar no print: miniatura no Painel e export com composto + original', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await button(page, 'Desenhar no print da anotação 1').click()
  const canvas = pxa(page).locator('.pxa-draw canvas')
  await expect.poll(async () => (await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(50)
  await button(page, 'Círculo').click()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 10, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 })
  await page.mouse.move(box.x + box.width - 10, box.y + box.height - 10, { steps: 5 })
  await page.mouse.up()
  await button(page, 'Salvar').click()
  await expect(pxa(page).locator('.pxa-draw')).toHaveCount(0)
  await expect(pxa(page).locator('img.pxa-thumb')).toBeVisible()

  const { files, md } = await exportZip(page)
  const composite = files['shots/01.png']!
  const original = files['shots/01-original.png']!
  expect(pngSize(composite)).toEqual(pngSize(original))
  expect(pngSize(composite).valid).toBe(true)
  expect(Buffer.from(composite).equals(Buffer.from(original))).toBe(false)
  expect(md).toContain('(com desenho; original em `shots/01-original.png`)')
})

test('DESE-05 Esc fecha o editor de desenho sem salvar', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await button(page, 'Desenhar no print da anotação 1').click()
  await expect(pxa(page).locator('.pxa-draw canvas')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(pxa(page).locator('.pxa-draw')).toHaveCount(0)
  await expect(pxa(page).locator('img.pxa-thumb')).toHaveCount(0)
})
