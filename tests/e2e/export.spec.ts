import { annotate, BASE, expect, exportZip, items, markers, pxa, test, toast } from './harness'

test.beforeEach(async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await annotate(page, '#card', 'card com `crases` e **markdown**')
})

test('EXPO-01/EXPO-02 zip com feedback.md e shots/01.png, 02.png', async ({ page }) => {
  const { name, files, md } = await exportZip(page)
  expect(name).toMatch(/^pxa-feedback-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/)
  expect(Object.keys(files).sort()).toEqual(['feedback.md', 'shots/01.png', 'shots/02.png'])
  expect(md).toContain('# Feedback PxA — localhost:5174')
  expect(md).toContain('- **Anotações:** 2')
  expect(md).toContain('```text\ncard com `crases` e **markdown**\n```')
  expect(md).toContain('**CSS relevante:**')
  expect(md).toContain('```html\n<button id="save"')
})

test('EXPO-03 copiar markdown sem links de imagem', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE })
  await pxa(page).getByRole('button', { name: 'Copiar markdown' }).click()
  await expect(toast(page)).toHaveText('Markdown copiado')
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('# Feedback PxA')
  expect(text).not.toContain('](shots/')
  expect(text).toContain('(print disponível no .zip)')
})

test('EXPO-04 após exportar, painel mantém as anotações', async ({ page }) => {
  await exportZip(page)
  await expect(items(page)).toHaveCount(2)
  await expect(toast(page)).toHaveText('Zip exportado')
})

test('EXPO-05 limpar tudo + confirmar → painel vazio e sem marcadores', async ({ page }) => {
  await pxa(page).getByRole('button', { name: 'Limpar tudo' }).click()
  await expect(pxa(page).locator('.pxa-confirm')).toHaveText('Apagar 2 anotações?')
  await pxa(page).getByRole('button', { name: 'Não' }).click()
  await expect(items(page)).toHaveCount(2)
  await pxa(page).getByRole('button', { name: 'Limpar tudo' }).click()
  await pxa(page).getByRole('button', { name: 'Sim' }).click()
  await expect(items(page)).toHaveCount(0)
  await expect(markers(page)).toHaveCount(0)
  await expect(pxa(page).locator('.pxa-empty')).toBeVisible()
})

test('AVIS-01 aviso de saída com anotação não exportada; some após exportar .zip', async ({ page }) => {
  const dialogs: string[] = []
  page.on('dialog', async (d) => { dialogs.push(d.type()); await d.dismiss() })
  await page.close({ runBeforeUnload: true })
  await expect.poll(() => dialogs).toEqual(['beforeunload'])
})

test('AVIS-01 sem aviso depois do export .zip', async ({ page }) => {
  await exportZip(page)
  const dialogs: string[] = []
  page.on('dialog', async (d) => { dialogs.push(d.type()); await d.dismiss() })
  await page.close({ runBeforeUnload: true })
  await expect.poll(() => page.isClosed()).toBe(true) // sem aviso a página fecha direto
  expect(dialogs).toEqual([])
})
