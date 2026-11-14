import { LOUPE_SIZE, physicalPoint, sampleWindow, type Pixels } from '@/lib/loupe'
import { captureTab, captureWithoutUi, withShotBitmap, type CaptureTab } from '../screenshot'
import type { UiHost } from './host'
import { el } from './dom'
import { showToast } from './toast'

/** Zoom 8×: cada pixel físico vira um bloco de 8×8 px CSS (LUPA-01). */
const ZOOM = 8
const VIEW = LOUPE_SIZE * ZOOM
/** Print novo só depois de 300ms sem rolar/redimensionar (LUPA-03). */
const SETTLE_MS = 300
const OFFSET = 16

export interface LoupeDeps {
  capture?: CaptureTab
  /** dataURL do print → pixels (padrão: createImageBitmap + canvas). */
  decode?: (dataUrl: string) => Promise<Pixels>
  /** A Lupa se desligou sozinha (Esc ou falha): a barra atualiza o botão. */
  onOff?(): void
}

const decodeShot = (dataUrl: string): Promise<Pixels> =>
  withShotBitmap(dataUrl, (img) => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('canvas indisponível')
    ctx.drawImage(img, 0, 0)
    return ctx.getImageData(0, 0, img.width, img.height)
  })

/** Lupa pixel sobre um print congelado da aba (LUPA-01..04). */
export function createLoupe(ui: UiHost, deps: LoupeDeps = {}) {
  const capture = deps.capture ?? captureTab
  const decode = deps.decode ?? decodeShot
  const canvas = el('canvas', { width: VIEW, height: VIEW })
  const hex = el('div', { className: 'pxa-loupe-hex' })
  const view = el('div', { className: 'pxa-loupe' }, canvas, hex)
  view.style.display = 'none'
  ui.layer.append(view)

  let on = false
  let pixels: Pixels | null = null
  let generation = 0
  let settle: ReturnType<typeof setTimeout> | undefined
  let pointer: { x: number; y: number } | null = null
  let drawn = ''
  let listeners: AbortController | null = null

  const onMove = (e: PointerEvent) => { pointer = { x: e.clientX, y: e.clientY } }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopImmediatePropagation()
    turnOff()
  }
  /** Rolar/redimensionar invalida o print; pede outro quando a página parar (LUPA-03). */
  const invalidate = () => {
    generation++
    pixels = null
    clearTimeout(settle)
    settle = setTimeout(() => void refresh(), SETTLE_MS)
  }

  async function refresh() {
    const gen = ++generation
    try {
      const next = await decode(await captureWithoutUi(ui, capture))
      if (gen === generation && on) pixels = next
    } catch {
      if (gen !== generation || !on) return
      showToast(ui, 'Print indisponível nesta página')
      turnOff()
    }
  }

  function turnOff() {
    setOn(false)
    deps.onOff?.()
  }

  function setOn(next: boolean) {
    if (next === on) return
    on = next
    generation++
    pixels = null
    clearTimeout(settle)
    listeners?.abort()
    listeners = null
    if (!on) return
    listeners = new AbortController()
    const { signal } = listeners
    window.addEventListener('pointermove', onMove, { capture: true, passive: true, signal })
    window.addEventListener('keydown', onKey, { capture: true, signal })
    document.addEventListener('scroll', invalidate, { capture: true, passive: true, signal })
    window.addEventListener('resize', invalidate, { signal })
    void refresh()
  }

  /** Hex do pixel físico sob o cursor, ou null sem print/cursor. */
  function sample(): { hex: string; cells: Array<string | null> } | null {
    if (!pixels || !pointer) return null
    const p = physicalPoint(pointer.x, pointer.y, pixels, innerWidth, innerHeight)
    const cells = sampleWindow(pixels, p.x, p.y)
    return { hex: cells[(cells.length - 1) / 2]!, cells }
  }

  function paint(cells: Array<string | null>) {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, VIEW, VIEW)
    cells.forEach((c, i) => {
      ctx.fillStyle = c ?? '#1a1226'
      ctx.fillRect((i % LOUPE_SIZE) * ZOOM, Math.floor(i / LOUPE_SIZE) * ZOOM, ZOOM, ZOOM)
    })
    ctx.strokeStyle = 'rgba(26, 18, 38, .25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 1; i < LOUPE_SIZE; i++) {
      ctx.moveTo(i * ZOOM + 0.5, 0)
      ctx.lineTo(i * ZOOM + 0.5, VIEW)
      ctx.moveTo(0, i * ZOOM + 0.5)
      ctx.lineTo(VIEW, i * ZOOM + 0.5)
    }
    ctx.stroke()
    const mid = Math.floor(LOUPE_SIZE / 2) * ZOOM
    ctx.strokeStyle = '#ff3e7f'
    ctx.lineWidth = 2
    ctx.strokeRect(mid + 1, mid + 1, ZOOM - 2, ZOOM - 2)
  }

  /** Lê cursor e print; devolve a escrita (tick). */
  function measure(): () => void {
    const key = !on || !pointer ? 'off' : `${pointer.x},${pointer.y},${pixels ? 'ready' : 'loading'},${generation}`
    if (key === drawn) return () => {}
    const vw = innerWidth
    const vh = innerHeight
    const s = key === 'off' ? null : sample()
    return () => {
      drawn = key
      if (!on || !pointer) {
        view.style.display = 'none'
        return
      }
      // Ao lado do cursor; vira para o outro lado perto da borda.
      const left = pointer.x + OFFSET + VIEW > vw ? pointer.x - OFFSET - VIEW : pointer.x + OFFSET
      const top = pointer.y + OFFSET + VIEW + 24 > vh ? pointer.y - OFFSET - VIEW - 24 : pointer.y + OFFSET
      Object.assign(view.style, { display: 'block', left: `${Math.max(0, left)}px`, top: `${Math.max(0, top)}px` })
      hex.textContent = s ? s.hex : 'atualizando…'
      if (s) paint(s.cells)
    }
  }

  return {
    setOn,
    isOn: () => on,
    ready: () => pixels !== null,
    measure,
    /** Clique com a Lupa ligada: copia o hex, sem criar Anotação (LUPA-02). */
    async copy() {
      const s = sample()
      if (!s) return showToast(ui, 'Lupa atualizando…')
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard indisponível')
        await navigator.clipboard.writeText(s.hex)
        showToast(ui, `${s.hex} copiado`)
      } catch {
        showToast(ui, `Não consegui copiar ${s.hex}`)
      }
    },
  }
}
