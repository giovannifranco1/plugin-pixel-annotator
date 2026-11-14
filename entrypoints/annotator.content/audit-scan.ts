import type { AuditSample } from '@/lib/design-audit'

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

export const SCAN_BATCH = 500
export const SCAN_LIMIT = 10_000

const SIDES = ['top', 'right', 'bottom', 'left'] as const
const TEXT_CONTROLS = new Set(['input', 'textarea', 'select'])

const defaultIdle = (cb: () => void) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => cb(), { timeout: 50 })
  else setTimeout(cb, 0)
}

/** Visível = tem caixa e não está escondido (`display:none` zera o retângulo também nos descendentes). */
export function isVisible(style: CSSStyleDeclaration, rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
}

const hasOwnText = (el: Element) =>
  TEXT_CONTROLS.has(el.localName) || Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '')

/**
 * `getComputedStyle` devolve margem `auto` já resolvida em px. No Chrome o Typed OM ainda diz `auto`;
 * sem ele (Firefox), margens laterais iguais e > 0 são tratadas como centralização por `auto`.
 */
function autoMargin(el: Element, side: 'left' | 'right', style: CSSStyleDeclaration): boolean {
  const value = style.getPropertyValue(`margin-${side}`)
  if (value === 'auto') return true
  if (parseFloat(value) <= 0 || Number.isNaN(parseFloat(value))) return false
  const map = (el as Element & { computedStyleMap?: () => StylePropertyMapReadOnly }).computedStyleMap
  if (map) return String(map.call(el).get(`margin-${side}`)) === 'auto'
  return style.getPropertyValue('margin-left') === style.getPropertyValue('margin-right')
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
  for (const side of SIDES) {
    if ((side === 'left' || side === 'right') && autoMargin(el, side, style)) continue
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
  let truncated = false
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => ((n as Element).hasAttribute('data-pxa-ignore') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
  let node: Element | null = document.body
  let seen = 0
  while (node) {
    for (let i = 0; node && i < batch; i++, seen++) {
      if (samples.length >= limit) {
        truncated = true
        node = null
        break
      }
      const style = getComputedStyle(node)
      if (isVisible(style, node.getBoundingClientRect())) {
        elements.push(node)
        samples.push(readSample(node, style))
      }
      node = walker.nextNode() as Element | null
    }
    if (node) {
      onProgress?.(seen)
      await new Promise<void>((r) => idle(r))
    }
  }
  return { elements, samples, truncated, ms: performance.now() - start }
}
