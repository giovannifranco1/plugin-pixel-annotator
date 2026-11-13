import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test'
import path from 'node:path'

// `wxt build --mode e2e` sai com sufixo do modo; o build de produção nunca recebe o host permission de E2E.
const EXT = path.resolve('.output/chrome-mv3-e2e')
export const BASE = 'http://localhost:5174'

type Fixtures = {
  context: BrowserContext
  sw: Worker
  toggle: (page: Page) => Promise<void>
}

export const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
      acceptDownloads: true,
    })
    await use(context)
    await context.close()
  },
  sw: async ({ context }, use) => {
    let [sw] = context.serviceWorkers()
    if (!sw) sw = await context.waitForEvent('serviceworker')
    await use(sw)
  },
  toggle: async ({ sw }, use) => {
    await use(async (page) => {
      await page.bringToFront()
      const tabId = await activeTabId(sw)
      await sw.evaluate((id) => (globalThis as any).__pxaToggle(id), tabId)
    })
  },
})

export const expect = test.expect

/** Raiz da UI do PxA. Locators do Playwright atravessam shadow root aberto. */
export const pxa = (page: Page) => page.locator('pxa-root')
export const panel = (page: Page) => pxa(page).locator('.pxa-panel')
export const items = (page: Page) => pxa(page).locator('li.pxa-item')
export const markers = (page: Page) => pxa(page).locator('.pxa-marker')
export const editor = (page: Page) => pxa(page).locator('.pxa-editor textarea')
export const toast = (page: Page) => pxa(page).locator('.pxa-toast')

/** Id da aba ativa, consultado no service worker. */
export function activeTabId(sw: Worker): Promise<number> {
  return sw.evaluate(async () => {
    const chrome = (globalThis as any).chrome
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    return tab.id as number
  })
}

/** Clica no elemento da página e salva uma nota no editor do PxA. */
export async function annotate(page: Page, selector: string, note: string) {
  const before = await items(page).count()
  await page.locator(selector).first().click()
  const ta = editor(page)
  await ta.fill(note)
  await ta.press('Enter')
  await expect(items(page)).toHaveCount(before + 1)
}

/** Clica em "Exportar .zip" e devolve nome + arquivos do zip baixado. */
export async function exportZip(page: Page) {
  const { readFile } = await import('node:fs/promises')
  const { unzipSync, strFromU8 } = await import('fflate')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    pxa(page).getByRole('button', { name: 'Exportar .zip' }).click(),
  ])
  const files = unzipSync(new Uint8Array(await readFile((await download.path())!)))
  return { name: download.suggestedFilename(), files, md: strFromU8(files['feedback.md']!) }
}

/** Largura e altura de um PNG lidas do cabeçalho IHDR. */
export function pngSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const signature = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
  return { valid: signature, width: view.getUint32(16), height: view.getUint32(20) }
}
