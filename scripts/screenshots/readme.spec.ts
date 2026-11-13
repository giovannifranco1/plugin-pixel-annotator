import { chromium, test, type BrowserContext, type Page } from '@playwright/test'
import path from 'node:path'
import { annotate, BASE, editor, panel } from '../../tests/e2e/harness'

const EXT = path.resolve('.output/chrome-mv3-e2e')
const MEDIA = path.resolve('media')

async function open(width: number, height: number, scale = 2): Promise<{ context: BrowserContext; page: Page }> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    deviceScaleFactor: scale,
    viewport: { width, height },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  })
  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'))
  const page = await context.newPage()
  await page.goto(`${BASE}/demo.html`)
  await page.locator('.cliente-card').first().waitFor()
  await page.bringToFront()
  const tabId = await sw.evaluate(async () => {
    const chrome = (globalThis as any).chrome
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    return tab.id as number
  })
  await sw.evaluate((id) => (globalThis as any).__pxaToggle(id), tabId)
  await panel(page).waitFor()
  return { context, page }
}

/** Rodapé de botões do n-ésimo card de cliente. */
const footer = (n: number) => `.cliente-card >> nth=${n} >> .card-footer`

test('hero: anotações em desktop, tablet e mobile com hover', async () => {
  // 1440px: a página demo (1040px) cabe inteira ao lado do painel
  const { context, page } = await open(1440, 760)
  await annotate(page, footer(0), 'botões saindo pra fora do card')
  await annotate(page, '.btn', 'botão principal com pouco contraste')
  await page.setViewportSize({ width: 820, height: 760 })
  await annotate(page, 'h1', 'título colado no topo no tablet')
  await page.setViewportSize({ width: 390, height: 760 })
  await annotate(page, '.stat >> nth=0', 'card de número estourando no mobile')
  await page.setViewportSize({ width: 1440, height: 760 })
  await page.locator('.stat >> nth=1').hover()
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${MEDIA}/hero.png` })
  await context.close()
})

test('editor: nota sobre o elemento clicado', async () => {
  const { context, page } = await open(1440, 760)
  await page.locator(footer(1)).click()
  await editor(page).fill('quebra em duas linhas no tablet')
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${MEDIA}/editor.png` })
  await context.close()
})

test('mobile: painel recolhido em 390px', async () => {
  const { context, page } = await open(390, 760, 3)
  await annotate(page, footer(0), 'botões saindo pra fora do card')
  await annotate(page, 'h1', 'título grande demais no mobile')
  // Mouse sobre a barra do PxA: nenhum elemento da página fica destacado no print.
  await panel(page).hover()
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${MEDIA}/mobile.png` })
  await context.close()
})
