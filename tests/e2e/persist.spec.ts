import type { Page } from '@playwright/test'
import { annotate, BASE, editor, expect, exportZip, items, markers, menuItem, pxa, test, itemAction } from './harness'

/** Anotações gravadas no IndexedDB do site (o mesmo banco que o PxA usa). */
const saved = (page: Page) =>
  page.evaluate(() => new Promise<string[]>((resolve) => {
    const req = indexedDB.open('pxa-annotator')
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('annotations')) return resolve([])
      const all = db.transaction('annotations').objectStore('annotations').getAll()
      all.onsuccess = () => resolve(all.result.map((a: { note: string }) => a.note).sort())
    }
  }))

test('PERS-01 refresh: anotações, notas editadas e prints voltam ao reativar; numeração continua', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão salvar')
  await annotate(page, '#card', 'card')
  await itemAction(page, 2, 'Editar')
  await editor(page).fill('card editado')
  await editor(page).press('Enter')
  await expect(items(page).nth(1)).toContainText('card editado')
  await expect.poll(() => saved(page)).toEqual(['botão salvar', 'card editado'])

  await page.reload()
  await toggle(page)
  await expect(items(page)).toHaveCount(2)
  await expect(items(page).nth(0)).toContainText('botão salvar')
  await expect(items(page).nth(1)).toContainText('card editado')
  await expect(markers(page)).toHaveCount(2)

  await annotate(page, 'h1', 'título')
  await expect(items(page).nth(2)).toContainText('#3') // numeração nunca reaproveitada

  const { files } = await exportZip(page)
  expect(Object.keys(files).filter((f) => f.startsWith('shots/')).sort()).toEqual(['shots/01.png', 'shots/02.png', 'shots/03.png'])
})

test('PERS-01 navegar para outra página do site e voltar mantém as anotações', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await expect.poll(() => saved(page)).toEqual(['botão'])
  await page.goto(`${BASE}/spa.html`)
  await toggle(page)
  await expect(items(page)).toHaveCount(1) // o painel lista todas do site
  await expect(markers(page).first()).toBeHidden() // marcador só na página da anotação
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await expect(markers(page).first()).toBeVisible()
})

test('PERS-01 excluir e "Limpar tudo" também valem depois do refresh', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'um')
  await annotate(page, '#card', 'dois')
  await annotate(page, 'h1', 'três')
  await itemAction(page, 2, 'Excluir')
  await expect.poll(() => saved(page)).toEqual(['três', 'um'])
  await page.reload()
  await toggle(page)
  await expect(items(page)).toHaveCount(2)
  await pxa(page).getByRole('button', { name: 'Limpar tudo', exact: true }).click()
  await pxa(page).getByRole('button', { name: 'Sim', exact: true }).click()
  await expect(items(page)).toHaveCount(0)
  await expect.poll(() => saved(page)).toEqual([])
  await page.reload()
  await toggle(page)
  await expect(pxa(page).locator('.pxa-empty')).toBeVisible()
  await expect(await menuItem(page, 'Exportar .zip')).toBeDisabled()
})
