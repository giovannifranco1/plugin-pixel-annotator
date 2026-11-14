/** Passo das setas do teclado. */
const KEY_STEP = 16
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-KEY_STEP, 0],
  ArrowRight: [KEY_STEP, 0],
  ArrowUp: [0, -KEY_STEP],
  ArrowDown: [0, KEY_STEP],
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(v, Math.max(0, max)))

/**
 * Janela `position: fixed` arrastável pela alça (mouse, toque e setas do teclado), sempre dentro da tela.
 * Botões dentro da alça continuam funcionando como botões.
 */
export function makeDraggable(box: HTMLElement, handle: HTMLElement): void {
  let start: { x: number; y: number; left: number; top: number } | null = null

  function place(left: number, top: number) {
    const r = box.getBoundingClientRect()
    Object.assign(box.style, { left: `${clamp(left, innerWidth - r.width)}px`, top: `${clamp(top, innerHeight - r.height)}px`, right: 'auto', bottom: 'auto' })
  }

  handle.tabIndex = 0
  handle.title = 'Arraste para mover (ou use as setas)'
  // Movimento e soltura escutados em window durante o arraste (o ponteiro sai da alça).
  const move = (e: PointerEvent) => {
    if (start) place(start.left + e.clientX - start.x, start.top + e.clientY - start.y)
  }
  const end = () => {
    start = null
    removeEventListener('pointermove', move, true)
    removeEventListener('pointerup', end, true)
    removeEventListener('pointercancel', end, true)
  }
  handle.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('button')) return
    const r = box.getBoundingClientRect()
    start = { x: e.clientX, y: e.clientY, left: r.left, top: r.top }
    addEventListener('pointermove', move, true)
    addEventListener('pointerup', end, true)
    addEventListener('pointercancel', end, true)
    // Captura: o click do fim do arraste vai para a alça (UI do PxA, ignorada pelo Modo Anotação), não
    // para o ancestral comum na página, o que abriria o editor de nota.
    handle.setPointerCapture?.(e.pointerId)
    e.preventDefault()
  })
  handle.addEventListener('keydown', (e) => {
    const step = ARROWS[e.key]
    if (!step || e.target !== handle) return
    e.preventDefault()
    const r = box.getBoundingClientRect()
    place(r.left + step[0], r.top + step[1])
  })
}
