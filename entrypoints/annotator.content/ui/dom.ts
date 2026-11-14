/** Cria um elemento com propriedades e filhos. Usado por toda a UI do PxA. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children)
  return node
}

/**
 * Atalhos de um modal na captura em `window`: a página não vê a tecla (Espaço não rola, Esc não fecha
 * o modal dela). `pick` escolhe a ação da tecla; sem ação, a tecla segue normal. Devolve o desligador.
 */
export function captureKeys(pick: (ev: KeyboardEvent) => (() => void) | undefined): () => void {
  const onKey = (ev: KeyboardEvent) => {
    const action = pick(ev)
    if (!action) return
    ev.preventDefault()
    ev.stopImmediatePropagation()
    action()
  }
  window.addEventListener('keydown', onKey, { capture: true })
  return () => window.removeEventListener('keydown', onKey, { capture: true })
}
