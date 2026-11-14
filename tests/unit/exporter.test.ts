import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { buildZip, copyMarkdown, exportZip } from '@/entrypoints/annotator.content/exporter'
import { installUnloadGuard } from '@/entrypoints/annotator.content/unload-guard'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { createStore, type AnnotationStore } from '@/lib/store'
import { draft } from './fixtures/annotations'

let ui: UiHost
let store: AnnotationStore

beforeEach(() => {
  ui = createHost()
  store = createStore()
  store.add(draft())
  store.add(draft({ shot: null }))
  store.add(draft())
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pxa')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => { ui.host.remove(); vi.restoreAllMocks() })

const toast = () => ui.root.querySelector('.pxa-toast')?.textContent

describe('exporter', () => {
  test('EXPO-01 zip contém feedback.md e shots/NN.png só para anotações com print', async () => {
    const files = unzipSync(await buildZip(store, new Date(2026, 10, 13, 14, 32), 'localhost:3000'))
    expect(Object.keys(files).sort()).toEqual(['feedback.md', 'shots/01.png', 'shots/03.png'])
    expect(Array.from(files['shots/01.png']!)).toEqual([137, 80, 78, 71])
  })

  test('EXPO-02 feedback.md do zip tem links shots/NN.png', async () => {
    const md = strFromU8(unzipSync(await buildZip(store, new Date(), 'localhost:3000'))['feedback.md']!)
    expect(md).toContain('](shots/01.png)')
    expect(md).toContain('](shots/03.png)')
    expect(md).toContain('- **Anotações:** 3')
  })

  test('EXPO-04 exportar não apaga anotações; AVIS-01 exportZip chama markExported', async () => {
    let clicked: HTMLAnchorElement | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked = this })
    expect(store.isDirty()).toBe(true)
    expect(await exportZip(ui, store, new Date(2026, 10, 13, 9, 5))).toBe(true) // MASC-03: o controller comemora só no sucesso
    expect(clicked!.download).toBe('pxa-feedback-2026-11-13-0905.zip')
    expect(store.list()).toHaveLength(3)
    expect(store.isDirty()).toBe(false)
    expect(toast()).toBe('Zip exportado')
  })

  test('EXPO-03 copyMarkdown escreve a versão compacta, mostra confirmação e não limpa dirty', async () => {
    const writeText = vi.fn(async (_text: string) => {})
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    expect(await copyMarkdown(ui, store)).toBe(true)
    const md = writeText.mock.calls[0]![0]
    expect(md).toContain('# PxA · localhost')
    expect(md).toContain('- **#1** botões saindo pra fora do card')
    expect(md).not.toContain('**CSS relevante:**')
    expect(toast()).toBe('Markdown copiado')
    expect(store.isDirty()).toBe(true)
  })

  test('caso limite: clipboard ausente/negado → toast sugerindo o .zip', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('NotAllowedError') } } })
    expect(await copyMarkdown(ui, store)).toBe(false)
    expect(toast()).toBe('Não consegui copiar. Use Exportar .zip.')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    await copyMarkdown(ui, store)
    expect(toast()).toBe('Não consegui copiar. Use Exportar .zip.')
  })

  test('erro ao gerar o zip → toast de falha e dirty mantido', async () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('boom') })
    expect(await exportZip(ui, store)).toBe(false)
    expect(toast()).toBe('Falha ao exportar')
    expect(store.isDirty()).toBe(true)
  })

  test('AVIS-01 beforeunload com dirty → defaultPrevented; sem dirty → não', () => {
    const off = installUnloadGuard(store)
    const ev1 = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(ev1)
    expect(ev1.defaultPrevented).toBe(true)
    store.markExported()
    const ev2 = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(ev2)
    expect(ev2.defaultPrevented).toBe(false)
    off()
  })
})
