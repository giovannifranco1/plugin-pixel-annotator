import { annotate, BASE, expect, items, markers, pxa, test } from './harness'

test('PAIN-01..04 cria 3, edita a 2ª, exclui a 1ª → painel com #2 e #3 e nota atualizada', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'primeira')
  await annotate(page, 'li.item >> nth=0', 'segunda')
  await annotate(page, '#card', 'terceira')
  await expect(items(page).first()).toContainText('#1')
  await expect(items(page).first()).toContainText('/index.html')
  await pxa(page).getByRole('button', { name: 'Editar anotação 2' }).click()
  const ta = pxa(page).locator('.pxa-editor textarea')
  await expect(ta).toHaveValue('segunda')
  await ta.fill('segunda editada')
  await ta.press('Enter')
  await pxa(page).getByRole('button', { name: 'Excluir anotação 1' }).click()
  await expect(items(page)).toHaveCount(2)
  await expect(items(page).nth(0)).toContainText('#2')
  await expect(items(page).nth(0)).toContainText('segunda editada')
  await expect(items(page).nth(1)).toContainText('#3')
  await expect(markers(page)).toHaveText(['2', '3'])
})

test('PAIN-02 clicar no item rola até o elemento; removido mostra "elemento não encontrado nesta tela"', async ({ page, toggle }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#abaixo', 'lá embaixo')
  await page.evaluate(() => window.scrollTo(0, 0))
  await items(page).first().locator('.pxa-item-main').click()
  await expect(page.locator('#abaixo')).toBeInViewport()
  await page.evaluate(() => document.getElementById('abaixo')!.remove())
  await items(page).first().locator('.pxa-item-main').click()
  await expect(pxa(page).locator('.pxa-toast')).toHaveText('elemento não encontrado nesta tela')
})

test('PAIN-05 vazio desabilita export e mostra instrução', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await expect(pxa(page).locator('.pxa-empty')).toContainText('Clique em um elemento')
  for (const name of ['Exportar .zip', 'Copiar markdown', 'Limpar tudo']) {
    await expect(pxa(page).getByRole('button', { name })).toBeDisabled()
  }
})

test('PAIN-06 SPA: marcador só na rota da anotação; item continua no painel', async ({ page, toggle }) => {
  await page.goto(`${BASE}/spa.html`)
  await toggle(page)
  await annotate(page, '#titulo-a', 'título A')
  await expect(markers(page).first()).toBeVisible()
  await page.evaluate(() => (window as any).go('/b'))
  await expect(page.locator('#titulo-b')).toBeVisible()
  await expect(markers(page).first()).toBeHidden()
  await expect(items(page)).toHaveCount(1)
  await page.evaluate(() => (window as any).go('/spa.html?outra=1'))
  await expect(page.locator('#titulo-a')).toBeVisible()
  await expect(markers(page).first()).toBeVisible() // nó recriado, achado pelo seletor; query ignorada
})

test('MARC-01/MARC-02 marcador mobile verde e esmaecido no desktop', async ({ page, toggle }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'mobile')
  const marker = markers(page).first()
  await expect(marker).toHaveCSS('background-color', 'rgb(63, 191, 95)')
  await expect(marker).toHaveCSS('opacity', '1')
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(marker).toHaveCSS('opacity', '0.35')
})
