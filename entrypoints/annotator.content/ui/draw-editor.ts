import type { UiHost } from './host'
import { captureKeys, el } from './dom'
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

const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('falha ao gerar o PNG'))), 'image/png'))

/** Botão alternável de um grupo (ferramenta ou cor): só um fica com aria-pressed. */
function toggleGroup(buttons: Array<[HTMLButtonElement, () => void]>): HTMLElement {
  for (const [b, pick] of buttons) {
    b.type = 'button'
    b.onclick = () => {
      pick()
      for (const [other] of buttons) other.setAttribute('aria-pressed', String(other === b))
    }
  }
  return el('div', { className: 'pxa-draw-group' }, ...buttons.map(([b]) => b))
}

function labeled(b: HTMLButtonElement, label: string, pressed: boolean): HTMLButtonElement {
  b.setAttribute('aria-label', label)
  b.setAttribute('aria-pressed', String(pressed))
  return b
}

/**
 * Editor de Desenho sobre a página (DESE-01..05): o print no tamanho real, exibido escalado e
 * pixelado; traços em coordenadas do print. Ctrl/Cmd+Z desfaz, Esc cancela.
 * Os traços salvos ficam numa camada base (print + traços), refeita só ao fechar um traço, desfazer
 * ou limpar; durante o arrasto cada frame pinta a base e só o traço em andamento.
 */
export function openDrawEditor(ui: UiHost, opts: DrawEditorOptions): { close(): void } {
  const block = blockFor(opts.dpr)
  const strokes: Stroke[] = [...(opts.drawing?.strokes ?? [])]
  let tool: DrawTool = 'brush'
  let color: string = DRAW_COLORS.rosa
  let current: Stroke | null = null
  let image: ImageBitmap | null = null
  let closed = false
  let frame = 0

  const canvas = el('canvas', { width: 1, height: 1 })
  canvas.setAttribute('aria-label', 'Print para desenhar')
  const ctx = canvas.getContext('2d')
  const base = document.createElement('canvas')
  const baseCtx = base.getContext('2d')
  // Padrão: o próprio canvas do editor já é print + traços; sem decodificar o print de novo.
  const compose: Compose = opts.compose ?? (() => toPng(canvas))

  function paint() {
    frame = 0
    if (!ctx || !image) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(base, 0, 0)
    if (current) paintStrokes(ctx, [current], block)
  }
  /** Refaz a camada base (print + traços salvos) e pinta já. */
  function rebuild() {
    if (baseCtx && image) {
      baseCtx.clearRect(0, 0, base.width, base.height)
      baseCtx.drawImage(image, 0, 0)
      paintStrokes(baseCtx, strokes, block)
    }
    cancelAnimationFrame(frame)
    paint()
  }
  /** Arrasto: no máximo uma pintura por frame. */
  const schedule = () => { frame ||= requestAnimationFrame(paint) }

  const undo = () => {
    strokes.pop()
    rebuild()
  }
  const toolbar = el(
    'div',
    { className: 'pxa-draw-bar' },
    toggleGroup(TOOLS.map(([t, label]) => [labeled(el('button', { textContent: label }), label, t === tool), () => { tool = t }])),
    toggleGroup(Object.entries(DRAW_COLORS).map(([name, hex]) => {
      const swatch = labeled(el('button', { className: 'pxa-swatch', title: name }), `Cor ${name}`, hex === color)
      swatch.style.background = hex
      return [swatch, () => { color = hex }]
    })),
    el('button', { type: 'button', textContent: 'Desfazer', title: 'Ctrl/Cmd+Z', onclick: undo }),
    el('button', { type: 'button', textContent: 'Limpar', onclick: () => { strokes.length = 0; rebuild() } }),
  )

  const cancelBtn = el('button', { type: 'button', textContent: 'Cancelar' })
  const saveBtn = el('button', { type: 'button', className: 'pxa-primary', textContent: 'Salvar' })
  const box = el('div', { className: 'pxa-draw-box' }, toolbar, el('div', { className: 'pxa-draw-canvas' }, canvas), el('div', { className: 'pxa-draw-actions' }, cancelBtn, saveBtn))
  const modal = el('div', { className: 'pxa-draw' }, box)
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-label', 'Desenhar no print')
  ui.layer.append(modal)

  /** Exibe o print o maior possível na tela; ampliação em escala inteira para os pixels ficarem nítidos. */
  function fitCanvas() {
    const fit = Math.min(Math.min(innerWidth * 0.9, 960) / canvas.width, (innerHeight * 0.65) / canvas.height)
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
    schedule()
  })
  canvas.addEventListener('pointermove', (ev) => {
    if (!current) return
    const p = toShot(ev)
    if (current.tool === 'brush') current.points.push(p)
    else current.points = [current.points[0]!, p] // formas: início + ponto atual
    schedule()
  })
  const finishStroke = () => {
    if (!current) return
    strokes.push(current)
    current = null
    rebuild()
  }
  canvas.addEventListener('pointerup', finishStroke)
  canvas.addEventListener('pointercancel', finishStroke)

  const releaseKeys = captureKeys((ev) => {
    if (ev.key === 'Escape') return cancel
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') return undo
    return undefined
  })

  function close() {
    if (closed) return
    closed = true
    releaseKeys()
    cancelAnimationFrame(frame)
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
      canvas.width = base.width = img.width
      canvas.height = base.height = img.height
      fitCanvas()
      rebuild()
    },
    () => { if (!closed) cancel() },
  )

  return { close }
}
