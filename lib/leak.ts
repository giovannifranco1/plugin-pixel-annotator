import { cssEscape, isGeneratedToken } from './selector'

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/** Folga aceita antes de contar como vazamento (arredondamento de subpixel). */
const SLACK = 1

const excess = (n: number) => (n > SLACK ? n : 0)

const CLIPPING = new Set(['hidden', 'clip', 'auto', 'scroll'])

/** `overflow` que corta o conteúdo no eixo. */
export const clips = (overflow: string): boolean => CLIPPING.has(overflow)

/** Quanto o filho passa do retângulo do pai, em px, só nos eixos que o pai não corta (XRAY-02). */
export function overflowOutside(child: Box, parent: Box, clipX: boolean, clipY: boolean): number {
  const x = clipX ? 0 : Math.max(parent.left - child.left, child.right - parent.right)
  const y = clipY ? 0 : Math.max(parent.top - child.top, child.bottom - parent.bottom)
  return excess(Math.max(x, y, 0))
}

/** Conteúdo maior que a caixa (`scrollWidth > clientWidth`) num eixo com `overflow` visível (XRAY-02). */
export function contentOverflow(scrollW: number, clientW: number, scrollH: number, clientH: number, visibleX: boolean, visibleY: boolean): number {
  const x = visibleX ? scrollW - clientW : 0
  const y = visibleY ? scrollH - clientH : 0
  return excess(Math.max(x, y, 0))
}

/** Seletor curto para a nota: `#id`, `tag.classe` (sem classes geradas) ou só a tag. */
export function shortSelector(el: Element): string {
  if (el.id && !isGeneratedToken(el.id)) return `#${cssEscape(el.id)}`
  const cls = Array.from(el.classList).find((c) => !isGeneratedToken(c))
  return cls ? `${el.localName}.${cssEscape(cls)}` : el.localName
}

/** Nota pré-preenchida do clique num elemento vermelho do X-ray (XRAY-04). */
export function leakNote(kind: 'parent' | 'content', selector: string, px: number): string {
  const n = Math.round(px)
  return kind === 'parent' ? `[Raio-X] vaza do pai ${selector} em ${n}px` : `[Raio-X] conteúdo vaza de ${selector} em ${n}px`
}
