import { annotate, BASE, expect, exportZip, pngSize, pxa, test } from './harness'

test('CAPT-01/CAPT-03 categoria, largura e breakpoint em 390px e 1440px', async ({ page, toggle }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/index.html?tab=2#topo`)
  await toggle(page)
  await expect(pxa(page).locator('.pxa-panel')).toHaveClass(/pxa-collapsed/) // não cobre a página no mobile
  await annotate(page, '#save', 'no mobile')
  await page.setViewportSize({ width: 1440, height: 900 })
  await annotate(page, 'h1.page-title', 'no desktop')
  const { md } = await exportZip(page)
  expect(md).toContain('## #1 · 📱 mobile · 390px (`base`) · `/index.html?tab=2#topo`')
  expect(md).toContain('- **Viewport:** 390×844 · DPR 1 · retrato')
  expect(md).toContain('## #2 · 🖥️ desktop · 1440px (`xl`)')
  expect(md).toContain('- **Seletor:** `#save`')
})

test('CAPT-07 shots/01.png é PNG válido com o recorte do elemento + margem', async ({ page, toggle }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'print')
  const { files, md } = await exportZip(page)
  const png = pngSize(files['shots/01.png']!)
  expect(png.valid).toBe(true)
  expect(png.width).toBeGreaterThanOrEqual(150) // 120 + 2×16 = 152 (±arredondamento)
  expect(png.width).toBeLessThanOrEqual(154)
  expect(png.height).toBeGreaterThanOrEqual(70) // 40 + 2×16 = 72
  expect(png.height).toBeLessThanOrEqual(74)
  expect(md).toContain('- **Print:** ![#1](shots/01.png)\n')
})

test('CAPT-08 rola até o elemento antes do print; elemento maior que o viewport sai parcial', async ({ page, toggle }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await page.locator('#abaixo').click()
  await page.evaluate(() => window.scrollTo(0, 0)) // elemento sai da tela antes de confirmar
  const ta = pxa(page).locator('.pxa-editor textarea')
  await ta.fill('abaixo da dobra')
  await ta.press('Enter')
  await expect(pxa(page).locator('li.pxa-item')).toHaveCount(1)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000)
  await annotate(page, '#gigante', 'gigante')
  const { files, md } = await exportZip(page)
  expect(pngSize(files['shots/01.png']!).valid).toBe(true)
  expect(md).toContain('- **Print:** ![#1](shots/01.png)\n')
  expect(md).toContain('- **Print:** ![#2](shots/02.png) (print parcial)')
})

test('COMP-01 React: export cita ClienteCard ← ClienteList ← Dashboard', async ({ page, toggle }) => {
  await page.goto(`${BASE}/react.html`)
  await expect(page.locator('[data-testid="card-Ana"]')).toBeVisible()
  await toggle(page)
  await annotate(page, '[data-testid="card-Ana"] .card-footer', 'footer apertado')
  const { md } = await exportZip(page)
  expect(md).toContain('- **Componente:** `ClienteCard` ← `ClienteList` ← `Dashboard` ← `App` (React)')
  expect(md).toContain('- **Seletor:** `div[data-testid="card-Ana"].cliente-card > div.card-footer`')
})

test('COMP-02/COMP-03 Vue: export cita ClienteCard e o arquivo .vue', async ({ page, toggle }) => {
  await page.goto(`${BASE}/vue.html`)
  await expect(page.locator('.cliente-card').first()).toBeVisible()
  await toggle(page)
  await annotate(page, '.cliente-card >> nth=1', 'card Bia')
  const { md } = await exportZip(page)
  expect(md).toContain('- **Componente:** `ClienteCard` ← `CardList` ← `App` (Vue)')
  expect(md).toContain('- **Arquivo:** `src/components/ClienteCard.vue`')
})

test('COMP-04 página sem framework: anotação sem linha "Componente"', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#card', 'sem framework')
  const { md } = await exportZip(page)
  expect(md).not.toContain('**Componente:**')
  expect(md).toContain('- **Seletor:** `#card`')
})
