import { SPACING_PROPS, type AuditSample } from '@/lib/design-audit'

export interface ScanResult {
  elements: Element[]
  samples: AuditSample[]
  truncated: boolean
  ms: number
}

export interface ScanOptions {
  /** Elementos por fatia antes de ceder a vez à página (DETE-06). */
  batch?: number
  /** Máximo de elementos visíveis lidos (DETE-06). */
  limit?: number
  onProgress?(done: number): void
  /** Agenda a próxima fatia. Padrão: requestIdleCallback (timeout 50ms) ou setTimeout. */
  idle?: (cb: () => void) => void
}

const SCAN_BATCH = 500
export const SCAN_LIMIT = 10_000

/** Walker de elementos a partir do `<body>`, sem entrar na UI do PxA. */
function pageWalker(): TreeWalker {
  return document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => ((n as Element).hasAttribute('data-pxa-ignore') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
}

/** Próximo elemento depois da subárvore do nó atual (ex: pular um `display:none` inteiro). */
function skipSubtree(walker: TreeWalker): Element | null {
  for (;;) {
    const next = walker.nextSibling()
    if (next) return next as Element
    if (!walker.parentNode()) return null
  }
}

/**
 * Visível = tem caixa maior que 1×1 (`sr-only` fica de fora) e não está escondido
 * (`display:none` zera o retângulo também nos descendentes).
 */
function isVisible(style: CSSStyleDeclaration, rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0 && (rect.width > 1 || rect.height > 1) && style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
}

const BORDERS = (['top', 'right', 'bottom', 'left'] as const).map((side) => [`border-${side}-width`, `border-${side}-color`] as const)
const TEXT_CONTROLS = new Set(['input', 'textarea', 'select'])

const defaultIdle = (cb: () => void) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => cb(), { timeout: 50 })
  else setTimeout(cb, 0)
}

function hasOwnText(el: Element): boolean {
  if (TEXT_CONTROLS.has(el.localName)) return true
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === Node.TEXT_NODE && /\S/.test((n as Text).data)) return true
  return false
}

/**
 * Espaçamentos diferentes de 0 que são token de escala: sem margem `auto` e sem percentual. Cada valor é
 * lido uma vez. `getComputedStyle` devolve `auto` e `%` já resolvidos em px; no Chrome o Typed OM ainda diz
 * `auto`/`%` (um `computedStyleMap()` só para quem tem espaçamento). Sem ele (Firefox), margens laterais
 * iguais e > 0 contam como `auto`.
 */
function readSpacings(el: Element, style: CSSStyleDeclaration): AuditSample['spacings'] {
  const spacings: AuditSample['spacings'] = []
  for (const prop of SPACING_PROPS) {
    const value = style.getPropertyValue(prop)
    const n = parseFloat(value)
    if (n && !Number.isNaN(n)) spacings.push({ prop, value }) // 0, vazio, auto e normal ficam de fora
  }
  if (!spacings.length) return spacings
  const map = (el as Element & { computedStyleMap?: () => StylePropertyMapReadOnly }).computedStyleMap?.call(el)
  if (map) {
    return spacings.filter(({ prop }) => {
      const typed = String(map.get(prop))
      return typed !== 'auto' && !typed.endsWith('%')
    })
  }
  const left = spacings.find((s) => s.prop === 'margin-left')?.value
  const centered = left !== undefined && parseFloat(left) > 0 && left === spacings.find((s) => s.prop === 'margin-right')?.value
  return centered ? spacings.filter((s) => s.prop !== 'margin-left' && s.prop !== 'margin-right') : spacings
}

/** Estilos computados crus de um elemento (DETE-01/02). */
function readSample(el: Element, style: CSSStyleDeclaration, rect: DOMRect): AuditSample {
  const text = hasOwnText(el)
  const colors: string[] = []
  if (text) colors.push(style.getPropertyValue('color'))
  for (const [width, color] of BORDERS) {
    if (parseFloat(style.getPropertyValue(width)) > 0) colors.push(style.getPropertyValue(color))
  }
  return {
    background: style.getPropertyValue('background-color'),
    colors,
    area: rect.width * rect.height,
    fontSize: text ? style.getPropertyValue('font-size') : '',
    fontFamily: text ? style.getPropertyValue('font-family') : '',
    spacings: readSpacings(el, style),
  }
}

/** Varre os elementos visíveis do documento em fatias, sem travar a página (DETE-01, DETE-06). */
export async function scanDocument(opts: ScanOptions = {}): Promise<ScanResult> {
  const { batch = SCAN_BATCH, limit = SCAN_LIMIT, idle = defaultIdle, onProgress } = opts
  const start = performance.now()
  const elements: Element[] = []
  const samples: AuditSample[] = []
  const walker = pageWalker()
  let node: Element | null = document.body
  let seen = 0
  while (node && samples.length < limit) {
    for (let i = 0; node && i < batch && samples.length < limit; i++, seen++) {
      const style = getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      if (isVisible(style, rect)) {
        elements.push(node)
        samples.push(readSample(node, style, rect))
      }
      // display:none esconde a subárvore inteira; o interior de um <svg> é desenho, não layout.
      node = style.display === 'none' || node.localName === 'svg' ? skipSubtree(walker) : (walker.nextNode() as Element | null)
    }
    if (node && samples.length < limit) {
      onProgress?.(seen)
      await new Promise<void>((r) => idle(r))
    }
  }
  return { elements, samples, truncated: node !== null, ms: performance.now() - start }
}
