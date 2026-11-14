import { annotate, BASE, expect, exportZip, items, markers, pxa, test, toast } from './harness'
import { PORT } from './port'

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
  expect(md).toContain(`# Feedback PxA — localhost:${PORT}`)
  expect(md).toContain('- **Anotações:** 2')
  expect(md).toContain('```text\ncard com `crases` e **markdown**\n```')
  expect(md).toContain('**CSS relevante:**')
  expect(md).toContain('```html\n<button id="save"')
})

test('EXPO-03 copiar markdown compacto', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE })
  await pxa(page).getByRole('button', { name: 'Copiar markdown' }).click()
  await expect(toast(page)).toHaveText('Markdown copiado')
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain(`# PxA · localhost:${PORT} · 2 ajustes visuais`)
  expect(text).toContain('- **#1** botão\n  🖥️ 1280px `xl` · `/index.html` · `#save`')
  expect(text).not.toContain('**CSS relevante:**')
  expect(text.split('\n').length).toBeLessThanOrEqual(8)
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
