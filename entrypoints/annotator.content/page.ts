/** Varredura da página pelas ferramentas do Raio-X (Detector e X-ray). */

/** Walker de elementos a partir do `<body>`, sem entrar na UI do PxA. */
export function pageWalker(): TreeWalker {
  return document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => ((n as Element).hasAttribute('data-pxa-ignore') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
}

/** Próximo elemento depois da subárvore do nó atual (ex: pular um `display:none` inteiro). */
export function skipSubtree(walker: TreeWalker): Element | null {
  for (;;) {
    const next = walker.nextSibling()
    if (next) return next as Element
    if (!walker.parentNode()) return null
  }
}

/** Visível = tem caixa e não está escondido (`display:none` zera o retângulo também nos descendentes). */
export function isVisible(style: CSSStyleDeclaration, rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
}
