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
 * Janela `position: fixed` arrastável pela alça (mouse, toque e setas do teclado), sempre dentro da tela,
 * inclusive quando a tela encolhe. Botões dentro da alça continuam funcionando como botões.
 */
export function makeDraggable(box: HTMLElement, handle: HTMLElement): void {
  /** Arraste em andamento: distância do ponteiro ao canto da janela e o tamanho dela (não muda no arraste). */
  let drag: { dx: number; dy: number; width: number; height: number } | null = null

  function place(left: number, top: number, { width, height }: { width: number; height: number } = box.getBoundingClientRect()) {
    Object.assign(box.style, { left: `${clamp(left, innerWidth - width)}px`, top: `${clamp(top, innerHeight - height)}px`, right: 'auto', bottom: 'auto' })
  }

  handle.tabIndex = 0
  handle.title = 'Arraste para mover (ou use as setas)'
  handle.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('button')) return
    const r = box.getBoundingClientRect()
    drag = { dx: r.left - e.clientX, dy: r.top - e.clientY, width: r.width, height: r.height }
    // Captura: movimento e soltura continuam vindo para a alça fora dela, e o click do fim do arraste cai
    // na UI do PxA (ignorada pelo Modo Anotação), não na página, o que abriria o editor de nota.
    // `?.`: o happy-dom (testes) não tem a API.
    handle.setPointerCapture?.(e.pointerId)
    e.preventDefault()
  })
  handle.addEventListener('pointermove', (e) => {
    if (drag) place(e.clientX + drag.dx, e.clientY + drag.dy, drag)
  })
  const end = () => { drag = null }
  handle.addEventListener('pointerup', end)
  handle.addEventListener('pointercancel', end)
  handle.addEventListener('keydown', (e) => {
    const step = ARROWS[e.key]
    if (!step || e.target !== handle) return
    e.preventDefault()
    const r = box.getBoundingClientRect()
    place(r.left + step[0], r.top + step[1], r)
  })
  // Já arrastada (posição no style): a tela encolheu, traz de volta para dentro. A janela vive tanto quanto o content script.
  addEventListener('resize', () => {
    if (!box.style.left) return
    const r = box.getBoundingClientRect()
    place(r.left, r.top, r)
  })
}
