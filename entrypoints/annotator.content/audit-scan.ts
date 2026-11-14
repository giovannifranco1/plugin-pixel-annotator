import type { AuditSample } from '@/lib/design-audit'
import { isVisible, pageWalker, skipSubtree } from './page'

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
 * Margens laterais `auto`. `getComputedStyle` devolve `auto` já resolvido em px; no Chrome o Typed OM
 * ainda diz `auto` (um `computedStyleMap()` por elemento, só se houver margem lateral > 0). Sem ele
 * (Firefox), margens laterais iguais e > 0 contam como centralização por `auto`.
 */
function autoMargins(el: Element, style: CSSStyleDeclaration): { left: boolean; right: boolean } {
  const left = style.getPropertyValue('margin-left')
  const right = style.getPropertyValue('margin-right')
  const positive = (v: string) => parseFloat(v) > 0
  if (!positive(left) && !positive(right)) return { left: left === 'auto', right: right === 'auto' }
  const map = (el as Element & { computedStyleMap?: () => StylePropertyMapReadOnly }).computedStyleMap?.call(el)
  if (map) return { left: String(map.get('margin-left')) === 'auto', right: String(map.get('margin-right')) === 'auto' }
  const centered = left === right
  return { left: centered, right: centered }
}

/** Estilos computados crus de um elemento (DETE-01/02). */
function readSample(el: Element, style: CSSStyleDeclaration): AuditSample {
  const text = hasOwnText(el)
  const colors = [style.getPropertyValue('background-color')]
  if (text) colors.push(style.getPropertyValue('color'))
  for (const side of SIDES) {
    if (parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0) colors.push(style.getPropertyValue(`border-${side}-color`))
  }
  const spacings: string[] = []
  const auto = autoMargins(el, style)
  for (const side of SIDES) {
    if ((side === 'left' || side === 'right') && auto[side]) continue
    spacings.push(style.getPropertyValue(`margin-${side}`))
  }
  for (const side of SIDES) spacings.push(style.getPropertyValue(`padding-${side}`))
  spacings.push(style.getPropertyValue('row-gap'), style.getPropertyValue('column-gap'))
  return {
    colors: colors.filter(Boolean),
    fontSize: text ? style.getPropertyValue('font-size') : '',
    fontFamily: text ? style.getPropertyValue('font-family') : '',
    fontWeight: text ? style.getPropertyValue('font-weight') : '',
    spacings: spacings.filter((v) => v && v !== 'auto' && v !== 'normal'),
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
      if (isVisible(style, node.getBoundingClientRect())) {
        elements.push(node)
        samples.push(readSample(node, style))
      }
      // display:none esconde a subárvore inteira: não lê os descendentes.
      node = style.display === 'none' ? skipSubtree(walker) : (walker.nextNode() as Element | null)
    }
    if (node && samples.length < limit) {
      onProgress?.(seen)
      await new Promise<void>((r) => idle(r))
    }
  }
  return { elements, samples, truncated: node !== null, ms: performance.now() - start }
}
