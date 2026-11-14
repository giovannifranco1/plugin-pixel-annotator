import { clips, contentOverflow, leakNote, overflowOutside, shortSelector } from '@/lib/leak'
import { isVisible } from '../audit-scan'
import { createBoxes, type BoxSpec } from './boxes'
import type { UiHost } from './host'

/** Paleta pixel por profundidade (XRAY-01). O vermelho fica reservado aos vazamentos. */
const DEPTH_COLORS = ['#3ec6ff', '#ffd23e', '#7ddc3e', '#b77bff', '#ff9a3e', '#3effc4']
/** Acima disso no viewport, só os vazamentos (XRAY-06). */
export const XRAY_LIMIT = 1500
/** Mudanças de layout sem rolagem (conteúdo carregando, animação) entram a cada 500ms. */
const REFRESH_MS = 500

interface Leak {
  note: string
  px: number
  /** Regra "fora do pai": o contêiner de onde vaza. */
  from?: Element
}

export interface XrayOptions {
  limit?: number
  /** Aviso na barra do Raio-X; `null` apaga. */
  onNotice?(text: string | null): void
}

/** Contornos por profundidade e vazamentos em vermelho, só no viewport (XRAY-01..06). */
export function createXray(ui: UiHost, opts: XrayOptions = {}) {
  const limit = opts.limit ?? XRAY_LIMIT
  const boxes = createBoxes(ui, 'pxa-xray')
  let on = false
  let dirty = false
  let leaks = new Map<Element, Leak>()
  let notice: string | null = null
  let timer: ReturnType<typeof setInterval> | undefined
  const markDirty = () => { dirty = true }

  function setOn(next: boolean) {
    if (next === on) return
    on = next
    dirty = true
    if (on) {
      document.addEventListener('scroll', markDirty, { capture: true, passive: true })
      window.addEventListener('resize', markDirty)
      timer = setInterval(markDirty, REFRESH_MS)
    } else {
      document.removeEventListener('scroll', markDirty, { capture: true })
      window.removeEventListener('resize', markDirty)
      clearInterval(timer)
      leaks = new Map()
    }
  }

  /** Contêiner do elemento para a regra "fora do pai": o pai com caixa (absolute usa o offsetParent). */
  function containerOf(el: Element, style: CSSStyleDeclaration, rects: Map<Element, DOMRect>): Element | null {
    let p: Element | null = style.position === 'absolute' && el instanceof HTMLElement ? el.offsetParent ?? el.parentElement : el.parentElement
    while (p && p !== document.documentElement) {
      const r = rects.get(p) ?? p.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return p
      p = p.parentElement
    }
    return null
  }

  function leakOf(el: Element, style: CSSStyleDeclaration, rect: DOMRect, rects: Map<Element, DOMRect>, styles: Map<Element, CSSStyleDeclaration>): Leak | null {
    if (style.position === 'fixed') return null // o bloco de contenção é o viewport
    const parent = containerOf(el, style, rects)
    if (parent) {
      let ps = styles.get(parent)
      if (!ps) styles.set(parent, (ps = getComputedStyle(parent)))
      const px = overflowOutside(rect, rects.get(parent) ?? parent.getBoundingClientRect(), clips(ps.overflowX), clips(ps.overflowY))
      if (px) return { px, note: leakNote('parent', shortSelector(parent), px), from: parent }
    }
    if (el === document.body) return null // body/html rolam o viewport
    const px = contentOverflow(el.scrollWidth, el.clientWidth, el.scrollHeight, el.clientHeight, !clips(style.overflowX), !clips(style.overflowY))
    return px ? { px, note: leakNote('content', shortSelector(el), px) } : null
  }

  function measure(): () => void {
    if (!on) {
      if (!dirty) return () => {}
      dirty = false
      return () => {
        boxes.clear()
        setNotice(null)
      }
    }
    if (!dirty) return () => {}
    dirty = false
    const vw = innerWidth
    const vh = innerHeight
    const rects = new Map<Element, DOMRect>()
    const styles = new Map<Element, CSSStyleDeclaration>()
    const depth = new Map<Element, number>()
    const seen: Array<{ node: Element; outline: BoxSpec; leak: Leak | null }> = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => ((n as Element).hasAttribute('data-pxa-ignore') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    })
    for (let node: Element | null = document.body; node; node = walker.nextNode() as Element | null) {
      const d = node === document.body ? 0 : (depth.get(node.parentElement!) ?? 0) + 1
      depth.set(node, d)
      const r = node.getBoundingClientRect()
      rects.set(node, r)
      if (r.width <= 0 || r.height <= 0 || r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue
      const style = getComputedStyle(node)
      styles.set(node, style)
      if (!isVisible(style, r)) continue
      const outline = { left: r.left, top: r.top, width: r.width, height: r.height, color: DEPTH_COLORS[d % DEPTH_COLORS.length] }
      seen.push({ node, outline, leak: leakOf(node, style, r, rects, styles) })
    }
    // O pai que transborda só porque um filho vaza dele não fica vermelho de novo: o achado é o filho.
    const sources = new Set(seen.flatMap(({ leak }) => (leak?.from ? [leak.from] : [])))
    const outlines: BoxSpec[] = []
    const danger: BoxSpec[] = []
    const nextLeaks = new Map<Element, Leak>()
    for (const { node, outline, leak } of seen) {
      if (!leak || (!leak.from && sources.has(node))) {
        outlines.push(outline)
        continue
      }
      nextLeaks.set(node, leak)
      danger.push({ ...outline, color: undefined, danger: true, label: `vaza ${Math.round(leak.px)}px` })
    }
    leaks = nextLeaks
    const total = seen.length
    const tooMany = total > limit
    // Vermelhos por último: ficam por cima dos contornos.
    const specs = tooMany ? danger : [...outlines, ...danger]
    const text = tooMany ? `X-ray: ${total.toLocaleString('pt-BR')} elementos na tela, mostrando só vazamentos` : null
    return () => {
      boxes.draw(specs)
      setNotice(text)
    }
  }

  function setNotice(text: string | null) {
    if (text === notice) return
    notice = text
    opts.onNotice?.(text)
  }

  return {
    setOn,
    isOn: () => on,
    measure,
    /** O clique caiu num elemento vermelho (ou dentro dele)? Devolve o alvo e a nota (XRAY-04). */
    pickLeak(el: Element): { target: Element; note: string } | null {
      for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
        const leak = leaks.get(n)
        if (leak) return { target: n, note: leak.note }
      }
      return null
    },
  }
}
