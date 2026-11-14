import { annotate, BASE, expect, exportZip, markers, panel, pxa, test } from './harness'

type Page = Parameters<typeof pxa>[0]
const mascot = (page: Page) => pxa(page).locator('.pxa-mascot')
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const NOITE_PAPER = 'rgb(27, 23, 38)'
const BRAND_PINK = '#ff3e7f' // corpo do mascote, igual nos dois temas (Revisão 2)

// Outra origem, com CSP restritiva, servida pelo próprio Playwright.
const PLAIN_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Outra</title></head>
<body><button id="alvo">Alvo</button></body></html>`

test('MASC-01/MASC-02 mascote no cabeçalho reage à anotação; sem nível nem conquistas', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await expect(mascot(page)).toBeVisible()
  await expect(mascot(page)).toHaveAttribute('data-mood', 'idle')
  await annotate(page, '#save', 'botão')
  await expect(mascot(page)).toHaveAttribute('data-mood', 'feliz')
  await expect(pxa(page).locator('.pxa-level, .pxa-trophy-toast')).toHaveCount(0)
  await expect(pxa(page).getByRole('button', { name: 'Conquistas' })).toHaveCount(0)
})

test('MASC-03 export .zip faz festa', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await exportZip(page)
  await expect(mascot(page)).toHaveAttribute('data-mood', 'festa')
})

test('TEMA-02 tema Noite sobrevive ao recarregar e vale em outra origem; mascote não muda de cor', async ({ page, context, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  const select = pxa(page).getByLabel('Tema')
  await expect(select.locator('option')).toHaveText(['Padrão', 'Noite'])
  await select.selectOption('noite')
  await expect(panel(page)).toHaveCSS('background-color', NOITE_PAPER)
  await expect(mascot(page).locator(`rect[fill="${BRAND_PINK}"]`).first()).toBeAttached()

  await page.reload()
  await toggle(page)
  await expect(pxa(page).getByLabel('Tema')).toHaveValue('noite')
  await expect(panel(page)).toHaveCSS('background-color', NOITE_PAPER)

  await context.route('http://outra.test/**', (route) => route.fulfill({ contentType: 'text/html', body: PLAIN_PAGE }))
  const other = await context.newPage()
  await other.goto('http://outra.test/')
  await toggle(other)
  await expect(pxa(other).getByLabel('Tema')).toHaveValue('noite')
})

test('TEMA-05 no tema Noite os botões do cabeçalho são só o ícone, todo branco, sem caixa', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  const exportBtn = pxa(page).getByRole('button', { name: 'Exportar .zip' })
  await expect(exportBtn).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)') // Padrão: caixa branca, como antes
  await pxa(page).getByLabel('Tema').selectOption('noite')
  for (const name of ['Exportar .zip', 'Recolher painel']) {
    const btn = pxa(page).getByRole('button', { name })
    await expect(btn).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(btn).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    const fills = await btn.locator('rect').evaluateAll((rects) => [...new Set(rects.map((r) => getComputedStyle(r).fill))])
    expect(fills).toEqual(['rgb(230, 225, 240)']) // --pxa-head-fg do Noite
  }
})

test('TEMA-04 marcadores mantêm a cor da categoria no tema Noite', async ({ page, toggle }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await pxa(page).getByLabel('Tema').selectOption('noite')
  await expect(markers(page).first()).toHaveCSS('background-color', 'rgb(74, 140, 255)') // desktop
})

test('SOM-01 botão de som com ícone pixel, sem emoji, e a escolha persiste', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  const off = pxa(page).getByRole('button', { name: 'Ligar som' })
  await expect(off).toHaveText('')
  await expect(off.locator('svg[shape-rendering="crispEdges"]')).toBeVisible()
  await off.click()
  await expect(pxa(page).getByRole('button', { name: 'Desligar som' })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await toggle(page)
  await expect(pxa(page).getByRole('button', { name: 'Desligar som' })).toBeVisible()
})

test('EGG-01/EGG-02 Konami faz o mascote dançar e as teclas chegam à página', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await page.evaluate(() => {
    const w = window as unknown as { keys: string[] }
    w.keys = []
    document.addEventListener('keydown', (e) => w.keys.push(e.key))
  })
  await toggle(page)
  for (const key of KONAMI) await page.keyboard.press(key)
  await expect(mascot(page)).toHaveAttribute('data-mood', 'festa')
  expect(await page.evaluate(() => (window as unknown as { keys: string[] }).keys)).toEqual(KONAMI)
})

test('MASC-05 com prefers-reduced-motion o humor troca sem animação', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'um')
  await expect(mascot(page).locator('svg')).not.toHaveCSS('animation-name', 'none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(mascot(page)).toHaveAttribute('data-mood', 'feliz')
  await expect(mascot(page).locator('svg')).toHaveCSS('animation-name', 'none')
})

test('SOM-04 página com CSP restritiva: mascote, som e tema funcionam sem erro', async ({ page, context, toggle }) => {
  await context.route('http://csp.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', headers: { 'content-security-policy': "default-src 'none'" }, body: PLAIN_PAGE }))
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('http://csp.test/')
  await toggle(page)
  await expect(mascot(page)).toBeVisible()
  await pxa(page).getByRole('button', { name: 'Ligar som' }).click()
  // Konami em vez de anotar: anotar em página servida por context.route já falhava antes desta feature (ver STATE.md).
  for (const key of KONAMI) await page.keyboard.press(key)
  await expect(mascot(page)).toHaveAttribute('data-mood', 'festa')
  await pxa(page).getByLabel('Tema').selectOption('noite')
  await expect(panel(page)).toHaveCSS('background-color', NOITE_PAPER)
  expect(errors).toEqual([])
})
