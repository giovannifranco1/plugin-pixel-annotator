import { annotate, BASE, expect, exportZip, markers, panel, pxa, test } from './harness'

const mascot = (page: Parameters<typeof pxa>[0]) => pxa(page).locator('.pxa-mascot')
const trophyToast = (page: Parameters<typeof pxa>[0]) => pxa(page).locator('.pxa-trophy-toast')
const level = (page: Parameters<typeof pxa>[0]) => pxa(page).locator('.pxa-level')

// Outra origem, com CSP restritiva, servida pelo próprio Playwright.
const CSP_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>CSP</title></head>
<body><button id="alvo">Alvo</button></body></html>`

test('MASC-01/CONQ-01/CONQ-04 mascote no cabeçalho; anotar dá XP, festa e "Primeiro Pixel"', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await expect(mascot(page)).toBeVisible()
  await expect(mascot(page)).toHaveAttribute('data-mood', 'idle')
  await expect(level(page)).toContainText('Nv 1')
  await annotate(page, '#save', 'botão')
  await expect(trophyToast(page)).toHaveText('🏆 Primeiro Pixel')
  await expect(mascot(page)).toHaveAttribute('data-mood', 'festa')
  await expect(level(page)).toHaveAttribute('title', /^10 XP/)
})

test('MASC-03/CONQ-02 export .zip faz festa e conta Quest Completa', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await expect(trophyToast(page)).toHaveCount(0, { timeout: 5000 })
  await exportZip(page)
  await expect(mascot(page)).toHaveAttribute('data-mood', 'festa')
  await expect(trophyToast(page)).toHaveText('🏆 Quest Completa')
  await expect(level(page)).toHaveAttribute('title', /^15 XP/)
})

test('CONQ-07/TEMA-02 perfil e tema sobrevivem ao recarregar e valem em outra origem', async ({ page, context, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await pxa(page).getByLabel('Tema').selectOption('noite')
  await expect(panel(page)).toHaveCSS('background-color', 'rgb(27, 23, 38)')

  await page.reload()
  await toggle(page)
  await expect(level(page)).toHaveAttribute('title', /^10 XP/)
  await expect(pxa(page).getByLabel('Tema')).toHaveValue('noite')
  await expect(panel(page)).toHaveCSS('background-color', 'rgb(27, 23, 38)')

  await context.route('http://outra.test/**', (route) => route.fulfill({ contentType: 'text/html', body: CSP_PAGE }))
  const other = await context.newPage()
  await other.goto('http://outra.test/')
  await toggle(other)
  await expect(level(other)).toHaveAttribute('title', /^10 XP/)
  await pxa(other).getByRole('button', { name: 'Conquistas' }).click()
  await expect(pxa(other).locator('.pxa-achievement').first()).not.toHaveClass(/pxa-locked/)
  await expect(pxa(other).locator('.pxa-achievement.pxa-locked')).toHaveCount(6)
})

test('TEMA-04 marcadores mantêm a cor da categoria em qualquer tema', async ({ page, toggle }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'botão')
  await pxa(page).getByLabel('Tema').selectOption('gameboy')
  await expect(markers(page).first()).toHaveCSS('background-color', 'rgb(74, 140, 255)') // desktop
})

test('EGG-01/EGG-02 Konami desbloqueia Código Secreto e as teclas chegam à página', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await page.evaluate(() => {
    const w = window as unknown as { keys: string[] }
    w.keys = []
    document.addEventListener('keydown', (e) => w.keys.push(e.key))
  })
  await toggle(page)
  const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
  for (const key of seq) await page.keyboard.press(key)
  await expect(trophyToast(page)).toHaveText('🏆 Código Secreto')
  await expect(mascot(page)).toHaveAttribute('data-mood', 'festa')
  expect(await page.evaluate(() => (window as unknown as { keys: string[] }).keys)).toEqual(seq)
})

test('MASC-05 com prefers-reduced-motion o humor troca sem animação', async ({ page, toggle }) => {
  await page.goto(`${BASE}/index.html`)
  await toggle(page)
  await annotate(page, '#save', 'um')
  await expect(mascot(page).locator('svg')).not.toHaveCSS('animation-name', 'none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(mascot(page)).toHaveAttribute('data-mood', 'festa')
  await expect(mascot(page).locator('svg')).toHaveCSS('animation-name', 'none')
})

test('SOM-04 página com CSP restritiva: mascote, som e conquistas funcionam sem erro', async ({ page, context, toggle }) => {
  await context.route('http://csp.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', headers: { 'content-security-policy': "default-src 'none'" }, body: CSP_PAGE }))
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('http://csp.test/')
  await toggle(page)
  await expect(mascot(page)).toBeVisible()
  await pxa(page).getByRole('button', { name: 'Ligar som' }).click()
  await expect(pxa(page).getByRole('button', { name: 'Desligar som' })).toBeVisible()
  // Konami em vez de anotar: anotar em página servida por context.route já falhava antes desta feature (ver STATE.md).
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(key)
  await expect(trophyToast(page)).toHaveText('🏆 Código Secreto')
  await pxa(page).getByLabel('Tema').selectOption('crt')
  await expect(panel(page)).toHaveCSS('background-color', 'rgb(10, 20, 12)')
  expect(errors).toEqual([])
})
