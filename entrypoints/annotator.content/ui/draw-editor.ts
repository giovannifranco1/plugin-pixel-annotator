import type { UiHost } from './host'
import { el } from './dom'
import type { Drawing, DrawTool, Stroke } from '@/lib/types'
import { blockFor, DRAW_COLORS, rasterStroke } from '@/lib/drawing'

type Compose = (shot: Blob, strokes: Stroke[], block: number) => Promise<Blob>

export interface DrawEditorOptions {
  shot: Blob // print original
  drawing?: Drawing // Desenho anterior, para continuar
  dpr: number // da Anotação: define o bloco de 2px CSS
  onSave(drawing: Drawing | undefined): void // undefined = sem traços, remove o Desenho
  onCancel(): void
  compose?: Compose
  loadImage?: (blob: Blob) => Promise<ImageBitmap>
}

const TOOLS: Array<[DrawTool, string]> = [['brush', 'Pincel'], ['arrow', 'Seta'], ['circle', 'Círculo'], ['cross', 'X']]

/** Pinta os traços em blocos inteiros: sem antialias (DESE-02). */
function paintStrokes(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], block: number): void {
  for (const s of strokes) {
    ctx.fillStyle = s.color
    for (const [x, y] of rasterStroke(s, block)) ctx.fillRect(x, y, block, block)
  }
}

/** Print + traços num PNG (o composto do export e da miniatura, DESE-03/04). */
export const composeDrawing: Compose = async (shot, strokes, block) => {
  const img = await createImageBitmap(shot)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d indisponível')
    ctx.drawImage(img, 0, 0)
    paintStrokes(ctx, strokes, block)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('falha ao gerar o PNG')
    return blob
  } finally {
    img.close()
  }
}

/**
 * Editor de Desenho sobre a página (DESE-01..05): o print no tamanho real, exibido escalado e
 * pixelado; traços em coordenadas do print. Ctrl/Cmd+Z desfaz, Esc cancela.
 */
export function openDrawEditor(ui: UiHost, opts: DrawEditorOptions): { close(): void } {
  const compose = opts.compose ?? composeDrawing
  const block = blockFor(opts.dpr)
  const strokes: Stroke[] = [...(opts.drawing?.strokes ?? [])]
  let tool: DrawTool = 'brush'
  let color: string = DRAW_COLORS.rosa
  let current: Stroke | null = null
  let image: ImageBitmap | null = null
  let closed = false

  const canvas = el('canvas', { width: 1, height: 1 })
  canvas.setAttribute('aria-label', 'Print para desenhar')
  const ctx = canvas.getContext('2d')

  function redraw() {
    if (!ctx || !image) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0)
    paintStrokes(ctx, current ? [...strokes, current] : strokes, block)
  }

  /** Grupo de botões alternáveis (ferramenta ou cor), com aria-pressed. */
  function toggles<T>(items: Array<[T, string, Partial<HTMLButtonElement>?]>, initial: T, pick: (v: T) => void): HTMLElement {
    const buttons = items.map(([value, label, extra]) => {
      const b = el('button', { type: 'button', ...extra })
      if (!extra?.className?.includes('pxa-swatch')) b.textContent = label
      b.setAttribute('aria-label', label)
      b.setAttribute('aria-pressed', String(value === initial))
      b.onclick = () => {
        pick(value)
        for (const other of buttons) other.setAttribute('aria-pressed', String(other === b))
      }
      return b
    })
    return el('div', { className: 'pxa-draw-group' }, ...buttons)
  }

  const undo = () => {
    strokes.pop()
    redraw()
  }
  const toolbar = el(
    'div',
    { className: 'pxa-draw-bar' },
    toggles(TOOLS.map(([t, label]) => [t, label] as [DrawTool, string]), tool, (t) => { tool = t }),
    toggles(
      Object.entries(DRAW_COLORS).map(([name, hex]) => {
        const swatch: Partial<HTMLButtonElement> = { className: 'pxa-swatch', title: name }
        return [hex, `Cor ${name}`, swatch] as [string, string, Partial<HTMLButtonElement>]
      }),
      color,
      (c) => { color = c },
    ),
    el('button', { type: 'button', textContent: 'Desfazer', title: 'Ctrl/Cmd+Z', onclick: undo }),
    el('button', { type: 'button', textContent: 'Limpar', onclick: () => { strokes.length = 0; redraw() } }),
  )
  for (const sw of toolbar.querySelectorAll<HTMLButtonElement>('.pxa-swatch')) sw.style.background = DRAW_COLORS[sw.title as keyof typeof DRAW_COLORS]

  const cancelBtn = el('button', { type: 'button', textContent: 'Cancelar' })
  const saveBtn = el('button', { type: 'button', className: 'pxa-primary', textContent: 'Salvar' })
  const box = el('div', { className: 'pxa-draw-box' }, toolbar, el('div', { className: 'pxa-draw-canvas' }, canvas), el('div', { className: 'pxa-draw-actions' }, cancelBtn, saveBtn))
  const modal = el('div', { className: 'pxa-draw' }, box)
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-label', 'Desenhar no print')
  ui.layer.append(modal)

  /** Exibe o print o maior possível na tela; ampliação em escala inteira para os pixels ficarem nítidos. */
  function fitCanvas() {
    const fit = Math.min((Math.min(innerWidth * 0.9, 960)) / canvas.width, (innerHeight * 0.65) / canvas.height)
    const scale = fit >= 1 ? Math.floor(Math.min(fit, 4)) : fit
    Object.assign(canvas.style, { width: `${Math.round(canvas.width * scale)}px`, height: `${Math.round(canvas.height * scale)}px` })
  }

  /** Coordenadas do ponteiro em pixels do print (o canvas é exibido escalado). */
  function toShot(ev: PointerEvent): [number, number] {
    const r = canvas.getBoundingClientRect()
    const sx = r.width ? canvas.width / r.width : 1
    const sy = r.height ? canvas.height / r.height : 1
    return [Math.round((ev.clientX - r.left) * sx), Math.round((ev.clientY - r.top) * sy)]
  }
  canvas.addEventListener('pointerdown', (ev) => {
    if (!image) return
    canvas.setPointerCapture?.(ev.pointerId)
    current = { tool, color, points: [toShot(ev)] }
    redraw()
  })
  canvas.addEventListener('pointermove', (ev) => {
    if (!current) return
    const p = toShot(ev)
    if (current.tool === 'brush') current.points.push(p)
    else current.points = [current.points[0]!, p] // formas: início + ponto atual
    redraw()
  })
  const finishStroke = () => {
    if (!current) return
    strokes.push(current)
    current = null
    redraw()
  }
  canvas.addEventListener('pointerup', finishStroke)
  canvas.addEventListener('pointercancel', finishStroke)

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') {
      ev.preventDefault()
      ev.stopImmediatePropagation()
      cancel()
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
      ev.preventDefault()
      ev.stopImmediatePropagation()
      undo()
    }
  }
  window.addEventListener('keydown', onKey, { capture: true })

  function close() {
    if (closed) return
    closed = true
    window.removeEventListener('keydown', onKey, { capture: true })
    image?.close()
    modal.remove()
  }
  function cancel() {
    close()
    opts.onCancel()
  }
  cancelBtn.onclick = cancel
  saveBtn.onclick = async () => {
    if (closed || saveBtn.disabled) return
    saveBtn.disabled = true
    if (strokes.length === 0) {
      close()
      return opts.onSave(undefined)
    }
    try {
      const composite = await compose(opts.shot, strokes, block)
      close()
      opts.onSave({ strokes: [...strokes], block, composite })
    } catch {
      saveBtn.disabled = false
    }
  }

  void (opts.loadImage ?? createImageBitmap)(opts.shot).then(
    (img) => {
      if (closed) return img.close()
      image = img
      canvas.width = img.width
      canvas.height = img.height
      fitCanvas()
      redraw()
    },
    () => { if (!closed) cancel() },
  )

  return { close }
}
