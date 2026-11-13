import { BASE, expect, panel, test } from './harness'

test('smoke: toggle mostra o painel', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await expect(panel(page)).toBeVisible()
})
