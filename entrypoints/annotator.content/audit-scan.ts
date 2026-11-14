import { SPACING_PROPS, type AuditSample, type SpacingProp } from '@/lib/design-audit'

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

const SIDES = ['top', 'right', 'bottom', 'left'] as const
const TEXT_CONTROLS = new Set(['input', 'textarea', 'select'])

const defaultIdle = (cb: () => void) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => cb(), { timeout: 50 })
  else setTimeout(cb, 0)
}

function hasOwnText(el: Element): boolean {
  if (TEXT_CONTROLS.has(el.localName)) return true
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '') return true
  return false
}

/**
 * Espaçamentos que não são token de escala: margem `auto` e percentuais. `getComputedStyle` devolve os
 * dois já resolvidos em px; no Chrome o Typed OM ainda diz `auto`/`%` (um `computedStyleMap()` só para
 * elementos com espaçamento > 0). Sem ele (Firefox), margens laterais iguais e > 0 contam como `auto`.
 */
function layoutSpacings(el: Element, style: CSSStyleDeclaration): Set<SpacingProp> {
  const positive = SPACING_PROPS.filter((p) => parseFloat(style.getPropertyValue(p)) > 0)
  if (!positive.length) return new Set()
  const map = (el as Element & { computedStyleMap?: () => StylePropertyMapReadOnly }).computedStyleMap?.call(el)
  if (map) {
    return new Set(positive.filter((p) => {
      const typed = String(map.get(p))
      return typed === 'auto' || typed.endsWith('%')
    }))
  }
  const left = style.getPropertyValue('margin-left')
  return left === style.getPropertyValue('margin-right') && parseFloat(left) > 0 ? new Set(['margin-left', 'margin-right']) : new Set()
}

/** Estilos computados crus de um elemento (DETE-01/02). */
function readSample(el: Element, style: CSSStyleDeclaration, rect: DOMRect): AuditSample {
  const text = hasOwnText(el)
  const colors: string[] = []
  if (text) colors.push(style.getPropertyValue('color'))
  for (const side of SIDES) {
    if (parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0) colors.push(style.getPropertyValue(`border-${side}-color`))
  }
  const skip = layoutSpacings(el, style)
  const spacings = SPACING_PROPS.filter((prop) => !skip.has(prop))
    .map((prop) => ({ prop, value: style.getPropertyValue(prop) }))
    .filter(({ value }) => value && value !== 'auto' && value !== 'normal')
  return {
    background: style.getPropertyValue('background-color'),
    colors: colors.filter(Boolean),
    area: rect.width * rect.height,
    fontSize: text ? style.getPropertyValue('font-size') : '',
    fontFamily: text ? style.getPropertyValue('font-family') : '',
    spacings,
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
