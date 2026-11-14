import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { openDrawEditor, type DrawEditorOptions } from '@/entrypoints/annotator.content/ui/draw-editor'
import type { Drawing } from '@/lib/types'

let ui: UiHost
const shot = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
const composite = new Blob(['composto'])
const loadImage = vi.fn(async () => ({ width: 200, height: 100, close() {} }) as unknown as ImageBitmap)

// Cada editor escuta o teclado em window: fechar todos no teardown para não vazar entre testes.
const opened: Array<{ close(): void }> = []
beforeEach(() => { ui = createHost() })
afterEach(() => { for (const h of opened.splice(0)) h.close(); ui.host.remove() })

async function open(over: Partial<DrawEditorOptions> = {}) {
  const opts = {
    shot, dpr: 1, loadImage,
    compose: vi.fn<NonNullable<DrawEditorOptions['compose']>>(async () => composite),
    onSave: vi.fn<DrawEditorOptions['onSave']>(), onCancel: vi.fn<DrawEditorOptions['onCancel']>(),
    ...over,
  }
  const handle = openDrawEditor(ui, opts)
  opened.push(handle)
  await vi.waitFor(() => expect(canvas().width).toBe(200))
  return { opts, handle }
}

const canvas = () => ui.root.querySelector<HTMLCanvasElement>('.pxa-draw canvas')!
const btn = (label: string) => Array.from(ui.root.querySelectorAll<HTMLButtonElement>('.pxa-draw button')).find((b) => b.textContent === label || b.getAttribute('aria-label') === label)!
const pointer = (type: string, x: number, y: number) => canvas().dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1 }))
const drag = (...pts: Array<[number, number]>) => {
  pointer('pointerdown', ...pts[0]!)
  for (const p of pts.slice(1)) pointer('pointermove', ...p)
  pointer('pointerup', ...pts.at(-1)!)
}
const key = (k: string, mods: KeyboardEventInit = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...mods }))
const save = async (opts: Awaited<ReturnType<typeof open>>['opts']) => {
  btn('Salvar').click()
  await vi.waitFor(() => expect(opts.onSave).toHaveBeenCalled())
  return vi.mocked(opts.onSave).mock.calls[0]![0]
}

describe('draw editor', () => {
  test('DESE-02 ferramentas pincel, seta, círculo e X; 3 cores; desfazer e limpar', async () => {
    await open()
    for (const label of ['Pincel', 'Seta', 'Círculo', 'X', 'Cor rosa', 'Cor amarelo', 'Cor ciano', 'Desfazer', 'Limpar', 'Cancelar', 'Salvar']) expect(btn(label), label).toBeTruthy()
    expect(btn('Pincel').getAttribute('aria-pressed')).toBe('true')
    expect(btn('Cor rosa').getAttribute('aria-pressed')).toBe('true')
  })

  test('DESE-02 pincel acumula os pontos do arrasto, na cor escolhida', async () => {
    const { opts } = await open()
    btn('Cor ciano').click()
    expect(btn('Cor ciano').getAttribute('aria-pressed')).toBe('true')
    drag([10, 10], [20, 15], [30, 40])
    const d = (await save(opts)) as Drawing
    expect(d.strokes).toEqual([{ tool: 'brush', color: '#3fd0e0', points: [[10, 10], [20, 15], [30, 40]] }])
  })

  test('DESE-02 formas guardam só início e fim do arrasto', async () => {
    const { opts } = await open()
    btn('Seta').click()
    drag([10, 10], [20, 20], [50, 30])
    btn('X').click()
    drag([0, 0], [5, 5])
    const d = (await save(opts)) as Drawing
    expect(d.strokes.map((s) => [s.tool, s.points])).toEqual([['arrow', [[10, 10], [50, 30]]], ['cross', [[0, 0], [5, 5]]]])
  })

  test('DESE-02 Ctrl+Z / Cmd+Z / Desfazer tiram o último traço; Limpar tira todos', async () => {
    const { opts } = await open()
    drag([1, 1], [2, 2]); drag([3, 3], [4, 4]); drag([5, 5], [6, 6]); drag([7, 7], [8, 8])
    key('z', { ctrlKey: true })
    key('z', { metaKey: true })
    btn('Desfazer').click()
    const d = (await save(opts)) as Drawing
    expect(d.strokes.map((s) => s.points[0])).toEqual([[1, 1]])
  })

  test('DESE-02 Limpar remove todos os traços; salvar sem traços remove o Desenho', async () => {
    const { opts } = await open()
    drag([1, 1], [2, 2])
    btn('Limpar').click()
    expect(await save(opts)).toBeUndefined()
    expect(opts.compose).not.toHaveBeenCalled()
  })

  test('DESE-03 Salvar compõe o print com os traços e devolve o Desenho (camada + composto)', async () => {
    const { opts } = await open({ dpr: 2 })
    drag([10, 10], [12, 12])
    const d = (await save(opts)) as Drawing
    expect(opts.compose).toHaveBeenCalledWith(shot, d.strokes, 4)
    expect(d).toEqual({ strokes: d.strokes, block: 4, composite })
    expect(ui.root.querySelector('.pxa-draw')).toBeNull()
  })

  test('DESE-03 abre com o Desenho anterior para continuar', async () => {
    const previous: Drawing = { strokes: [{ tool: 'circle', color: '#f2c94c', points: [[0, 0], [9, 9]] }], block: 2, composite }
    const { opts } = await open({ drawing: previous })
    drag([1, 1], [2, 2])
    const d = (await save(opts)) as Drawing
    expect(d.strokes).toHaveLength(2)
    expect(d.strokes[0]).toEqual(previous.strokes[0])
  })

  test('DESE-05 Esc fecha sem salvar', async () => {
    const { opts } = await open()
    drag([1, 1], [2, 2])
    key('Escape')
    expect(opts.onCancel).toHaveBeenCalled()
    expect(opts.onSave).not.toHaveBeenCalled()
    expect(ui.root.querySelector('.pxa-draw')).toBeNull()
  })

  test('DESE-05 Cancelar fecha sem salvar e solta o teclado', async () => {
    const { opts } = await open()
    btn('Cancelar').click()
    expect(opts.onCancel).toHaveBeenCalled()
    key('Escape')
    expect(opts.onCancel).toHaveBeenCalledTimes(1)
  })

  test('falha ao abrir o print cancela o editor', async () => {
    const onCancel = vi.fn()
    opened.push(openDrawEditor(ui, { shot, dpr: 1, loadImage: async () => { throw new Error('png quebrado') }, onSave: vi.fn(), onCancel }))
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalled())
    expect(ui.root.querySelector('.pxa-draw')).toBeNull()
  })
})
