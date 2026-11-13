const SIDES = ['top', 'right', 'bottom', 'left'] as const

/** Lista fixa de propriedades relevantes (CAPT-06), na ordem de saída. */
export const CSS_PROPERTIES: readonly string[] = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'overflow-x', 'overflow-y',
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self', 'align-content',
  'gap', 'row-gap', 'column-gap', 'flex-grow', 'flex-shrink', 'flex-basis', 'order',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'box-sizing', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  ...SIDES.map((s) => `margin-${s}`),
  ...SIDES.map((s) => `padding-${s}`),
  ...SIDES.map((s) => `border-${s}-width`),
  ...SIDES.map((s) => `border-${s}-style`),
  ...SIDES.map((s) => `border-${s}-color`),
  'border-radius',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'white-space',
  'color', 'background-color', 'background-image', 'opacity', 'box-shadow', 'transform', 'visibility',
]

const ALWAYS_KEEP = new Set(['display', 'width', 'height'])

export type CssEntries = Array<[property: string, value: string]>

/** Mantém só as propriedades da lista que diferem do default da tag (display/width/height sempre). */
export function filterCss(computed: Record<string, string>, defaults: Record<string, string>): CssEntries {
  const out: CssEntries = []
  for (const prop of CSS_PROPERTIES) {
    const value = computed[prop]
    if (value === undefined || value === '') continue
    if (ALWAYS_KEEP.has(prop) || value !== defaults[prop]) out.push([prop, value])
  }
  return out
}

export function readStyle(style: CSSStyleDeclaration): Record<string, string> {
  const out: Record<string, string> = {}
  for (const prop of CSS_PROPERTIES) out[prop] = style.getPropertyValue(prop)
  return out
}

const GROUPS: Array<[shorthand: string, longhands: [string, ...string[]]]> = [
  ['margin', ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']],
  ['padding', ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']],
  ['border-width', ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width']],
  ['border-style', ['border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style']],
  ['border-color', ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color']],
]

/** Junta os 4 lados em shorthand quando todos estão presentes e iguais, na posição do primeiro lado. */
export function compactCss(entries: CssEntries): CssEntries {
  const map = new Map(entries)
  const replaced = new Map<string, [string, string] | null>()
  for (const [short, [first, ...rest]] of GROUPS) {
    const value = map.get(first)
    if (value !== undefined && rest.every((l) => map.get(l) === value)) {
      replaced.set(first, [short, value])
      for (const l of rest) replaced.set(l, null)
    }
  }
  const out: CssEntries = []
  for (const [p, v] of entries) {
    if (!replaced.has(p)) out.push([p, v])
    else {
      const r = replaced.get(p)
      if (r) out.push(r)
    }
  }
  return out
}
