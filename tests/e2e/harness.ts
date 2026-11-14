import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test'
import path from 'node:path'
import { PORT } from './port'

// `wxt build --mode e2e` sai com sufixo do modo; o build de produção nunca recebe o host permission de E2E.
const EXT = path.resolve('.output/chrome-mv3-e2e')
export const BASE = `http://localhost:${PORT}`

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

/**
 * Apaga as anotações salvas no site (PERS-01), como se fosse o navegador de outra pessoa.
 * Feche antes as páginas com o PxA ativo nessa origem: conexão aberta bloqueia a exclusão.
 */
export async function forgetSaved(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('pxa-annotator')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('banco ainda aberto em outra página'))
  }))
}

/** Abre o ⋮ da anotação n e clica num item do menu dela (Editar, Desenhar no print, Excluir). */
export async function itemAction(page: Page, n: number, label: string) {
  await pxa(page).getByRole('button', { name: `Ações da anotação ${n}`, exact: true }).click()
  await pxa(page).locator('.pxa-menu .pxa-menu-item').filter({ hasText: new RegExp(`^${label}$`) }).click()
}

/** Item do menu de ações do cabeçalho (abre o menu se estiver fechado). */
export async function menuItem(page: Page, name: string) {
  const menu = pxa(page).locator('.pxa-menu')
  if (!(await menu.isVisible())) await pxa(page).getByRole('button', { name: 'Ações', exact: true }).click()
  return menu.locator('.pxa-menu-item').filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
}

/** Clica em "Exportar .zip" (menu de ações) e devolve nome, caminho e arquivos do zip baixado. */
export async function exportZip(page: Page) {
  const { readFile } = await import('node:fs/promises')
  const { unzipSync, strFromU8 } = await import('fflate')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    menuItem(page, 'Exportar .zip').then((item) => item.click()),
  ])
  const zipPath = (await download.path())!
  const files = unzipSync(new Uint8Array(await readFile(zipPath)))
  return { name: download.suggestedFilename(), path: zipPath, files, md: strFromU8(files['feedback.md']!) }
}

/** Largura e altura de um PNG lidas do cabeçalho IHDR. */
export function pngSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const signature = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
  return { valid: signature, width: view.getUint32(16), height: view.getUint32(20) }
}
