import { hex2, parseCssColor, toHex } from './color'

export const SPACING_PROPS = [
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'row-gap', 'column-gap',
] as const
export type SpacingProp = (typeof SPACING_PROPS)[number]

/** Estilos computados crus de um elemento visível (DETE-01). */
export interface AuditSample {
  /** background-color */
  background: string
  /** color (só com texto próprio) e border-*-color (só com borda > 0) */
  colors: string[]
  /** Largura × altura do elemento: diz quanto da página uma cor de fundo pinta. */
  area: number
  /** Vazios quando o elemento não tem texto próprio. */
  fontSize: string
  fontFamily: string
  spacings: Array<{ prop: SpacingProp; value: string }>
}

export type AuditScale = 4 | 8
export type AuditFlag = 'off-scale' | 'similar' | 'default-font'
export type AuditKind = 'color' | 'font-size' | 'font-family' | 'spacing'

export interface AuditEntry {
  value: string
  /** Nº de elementos distintos que usam o valor. */
  count: number
  /** Índices das amostras (elementos) que usam o valor. */
  elements: number[]
  flags: AuditFlag[]
  /** Valor de referência do Achado: semente parecida ou família dominante. */
  similarTo?: string
  /** Espaçamentos: propriedades onde aparece (lados juntos viram o nome base). */
  props?: string[]
  /** O que usar no lugar (DETE-05). */
  suggestion?: string
}

export interface AuditReport {
  scale: AuditScale
  colors: AuditEntry[]
  fontSizes: AuditEntry[]
  families: AuditEntry[]
  spacings: AuditEntry[]
  /** Espaçamentos distintos fora da escala. */
  offScale: number
  /** Fração dos usos de espaçamento que estão na escala (1 sem espaçamentos). Abaixo de 0,5 a escala não serve à página. */
  scaleFit: number
}

/** ΔE76 em Lab: ~2,3 é o limiar perceptível; até 5 é "quase igual". */
const SIMILAR_DELTA_E = 5
/** Tamanhos de fonte a até 1px são "quase iguais". */
const SIMILAR_FONT_PX = 1
/** Folga para valores subpixel (rem/em/zoom). */
const SCALE_TOLERANCE = 0.5
/** Valores fora dos múltiplos aceitos em cada escala: meios passos do Tailwind (px, 0.5, 1.5, 2.5, 3.5) e hairlines. */
const SCALE_EXTRAS: Record<AuditScale, number[]> = { 4: [1, 2, 6, 10, 14], 8: [1, 2, 4] }
/** Famílias que o navegador usa quando ninguém escolheu uma (corpo, botões, campos). */
const DEFAULT_FAMILIES = new Set([
  'times new roman', 'times', 'serif', 'sans-serif', 'system-ui', 'ui-sans-serif', '-apple-system', 'blinkmacsystemfont',
  'arial', 'helvetica', 'segoe ui', 'roboto',
])

const round2 = (n: number) => Math.round(n * 100) / 100

/** Cor computada → `#rrggbb` (opaca) ou `#rrggbbaa`; `null` para transparente ou formato desconhecido (DETE-08). */
export function normalizeColor(css: string): string | null {
  const c = parseCssColor(css)
  if (!c || c.a <= 0) return null
  const base = toHex(c.r, c.g, c.b)
  return c.a >= 1 ? base : `${base}${hex2(c.a * 255)}`
}

type Lab = [number, number, number]

function toLab(hex: string): Lab | null {
  if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex)) return null
  const lin = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as Lab
  const [r, g, b] = lin
  // sRGB → XYZ (D65), normalizado pelo branco de referência
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

const labDistance = (a: Lab | null, b: Lab | null) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : Infinity)

/** Distância perceptual ΔE76 entre duas cores normalizadas (Infinity se não for hex). */
export const colorDistance = (a: string, b: string): number => labDistance(toLab(a), toLab(b))

/** `auto`/`normal`/percentual → null; negativos contam pelo valor absoluto. */
export function parsePx(v: string): number | null {
  const m = /^(-?\d*\.?\d+)px$/.exec(v.trim())
  return m ? round2(Math.abs(parseFloat(m[1]!))) : null
}

const near = (a: number, b: number) => Math.abs(a - b) < SCALE_TOLERANCE

/** Na escala: múltiplo dela ou um dos meios passos aceitos, com folga de 0,5px (DETE-03). */
export function isOnScale(px: number, scale: AuditScale): boolean {
  return near(px, Math.round(px / scale) * scale) || SCALE_EXTRAS[scale].some((e) => near(px, e))
}

/** Valores aceitos logo abaixo e logo acima de `px` (sugestão da nota). */
export function scaleNeighbors(px: number, scale: AuditScale): [number, number] {
  const lo = Math.floor(px / scale) * scale
  const candidates = [lo, lo + scale, ...SCALE_EXTRAS[scale]]
  const below = Math.max(...candidates.filter((c) => c <= px))
  const above = Math.min(...candidates.filter((c) => c >= px))
  return [below, above]
}

const firstFamily = (family: string) => (family.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '')
const alphaOf = (hex: string) => (hex.length === 9 ? hex.slice(7) : 'ff')

type Groups = Map<string, Set<number>>

function add(groups: Groups, value: string, index: number) {
  let set = groups.get(value)
  if (!set) groups.set(value, (set = new Set()))
  set.add(index)
}

const toEntries = (groups: Groups): AuditEntry[] =>
  [...groups].map(([value, set]) => ({ value, count: set.size, elements: [...set], flags: [] as AuditFlag[] }))

const byUse = (a: AuditEntry, b: AuditEntry) => b.count - a.count || a.value.localeCompare(b.value)
/** Achados primeiro, depois os mais usados (DETE-09). */
const sortEntries = (entries: AuditEntry[]) => entries.sort((a, b) => Number(b.flags.length > 0) - Number(a.flags.length > 0) || byUse(a, b))

/**
 * Raro perto da referência: a referência tem ao menos 3× os usos, e o valor tem até 5 usos (até 2, ou
 * 10% da referência). Dois valores bem usados são tokens; dois raros não têm referência clara.
 */
const rareNear = (entry: AuditEntry, ref: AuditEntry) =>
  ref.count >= entry.count * 3 && entry.count <= Math.min(5, Math.max(2, Math.floor(ref.count * 0.1)))
/** Fração da página que uma cor de fundo precisa pintar para ser superfície (nunca "perdida"). */
const SURFACE_SHARE = 0.1

/**
 * Agrupamento por semente: em ordem de uso, cada valor perto de uma semente e raro perto dela vira
 * Achado "parecido"; perto mas bem usado vira semente também (é token). Longe de todas: semente.
 */
function markSimilar<K>(entries: AuditEntry[], key: (e: AuditEntry) => K, isNear: (a: K, b: K) => boolean, canStray: (e: AuditEntry) => boolean = () => true) {
  const seeds: Array<{ entry: AuditEntry; key: K }> = []
  for (const entry of [...entries].sort(byUse)) {
    const k = key(entry)
    const seed = seeds.find((s) => isNear(s.key, k))?.entry
    if (seed && canStray(entry) && rareNear(entry, seed)) {
      entry.flags.push('similar')
      entry.similarTo = seed.value
      entry.suggestion = `usar ${seed.value}`
    } else {
      seeds.push({ entry, key: k })
    }
  }
}

/** Família padrão do navegador em poucos elementos, quando a página escolheu outra (botão/campo sem `font: inherit`). */
function markDefaultFonts(families: AuditEntry[]) {
  const dominant = [...families].sort(byUse)[0]
  if (!dominant || DEFAULT_FAMILIES.has(dominant.value.toLowerCase())) return
  for (const f of families) {
    if (f === dominant || !DEFAULT_FAMILIES.has(f.value.toLowerCase()) || !rareNear(f, dominant)) continue
    f.flags.push('default-font')
    f.similarTo = dominant.value
    f.suggestion = 'usar font-family: inherit'
  }
}

/** Propriedades na ordem do CSS; os 4 lados juntos viram `margin`/`padding`, os 2 gaps viram `gap`. */
function collapseProps(props: Set<SpacingProp>): string[] {
  const out: string[] = []
  for (const base of ['margin', 'padding'] as const) {
    const sides = (['top', 'right', 'bottom', 'left'] as const).map((s) => `${base}-${s}` as SpacingProp)
    if (sides.every((p) => props.has(p))) out.push(base)
    else out.push(...sides.filter((p) => props.has(p)))
  }
  if (props.has('row-gap') && props.has('column-gap')) out.push('gap')
  else out.push(...(['row-gap', 'column-gap'] as const).filter((p) => props.has(p)))
  return out
}

/** Agrupa as amostras em Cores, Tamanhos de fonte, Famílias e Espaçamentos e marca os Achados (DETE-02/03). */
export function buildAuditReport(samples: readonly AuditSample[], scale: AuditScale): AuditReport {
  const colors: Groups = new Map()
  const sizes: Groups = new Map()
  const families: Groups = new Map()
  const spacings: Groups = new Map()
  const spacingProps = new Map<string, Set<SpacingProp>>()
  const backgroundArea = new Map<string, number>()
  let pageArea = 0
  samples.forEach((s, i) => {
    pageArea = Math.max(pageArea, s.area)
    const bg = normalizeColor(s.background)
    if (bg) {
      add(colors, bg, i)
      backgroundArea.set(bg, (backgroundArea.get(bg) ?? 0) + s.area)
    }
    for (const c of s.colors) {
      const hex = normalizeColor(c)
      if (hex) add(colors, hex, i)
    }
    const size = parsePx(s.fontSize)
    if (size !== null) add(sizes, `${size}px`, i)
    const family = firstFamily(s.fontFamily)
    if (family) add(families, family, i)
    for (const { prop, value } of s.spacings) {
      const px = parsePx(value)
      if (!px) continue // 0 não é inconsistência; auto/percentual não têm valor de escala
      const key = `${px}px`
      add(spacings, key, i)
      let props = spacingProps.get(key)
      if (!props) spacingProps.set(key, (props = new Set()))
      props.add(prop)
    }
  })

  const colorEntries = toEntries(colors)
  markSimilar(
    colorEntries,
    (e) => ({ alpha: alphaOf(e.value), lab: toLab(e.value) }),
    (a, b) => a.alpha === b.alpha && labDistance(a.lab, b.lab) <= SIMILAR_DELTA_E,
    (e) => (backgroundArea.get(e.value) ?? 0) < pageArea * SURFACE_SHARE, // superfície grande (ex: fundo da página) não é cor perdida
  )
  const sizeEntries = toEntries(sizes)
  markSimilar(sizeEntries, (e) => parseFloat(e.value), (a, b) => Math.abs(a - b) <= SIMILAR_FONT_PX)
  const familyEntries = toEntries(families)
  markDefaultFonts(familyEntries)
  const spacingEntries = toEntries(spacings)
  for (const e of spacingEntries) {
    e.props = collapseProps(spacingProps.get(e.value)!)
    const px = parseFloat(e.value)
    if (isOnScale(px, scale)) continue
    const [lo, hi] = scaleNeighbors(px, scale)
    e.flags.push('off-scale')
    e.suggestion = lo > 0 && lo !== hi ? `usar ${lo}px ou ${hi}px` : `usar ${hi}px`
  }
  return {
    scale,
    colors: sortEntries(colorEntries),
    fontSizes: sortEntries(sizeEntries),
    families: sortEntries(familyEntries),
    spacings: sortEntries(spacingEntries),
    offScale: spacingEntries.filter((e) => e.flags.length > 0).length,
    scaleFit: fit(spacingEntries),
  }
}

/** Fração dos usos (elementos × valor) que estão na escala. */
function fit(spacings: AuditEntry[]): number {
  const total = spacings.reduce((n, e) => n + e.count, 0)
  return total ? spacings.reduce((n, e) => n + (e.flags.length ? 0 : e.count), 0) / total : 1
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Cabeçalho do relatório (DETE-02). */
export function auditHeadline(r: AuditReport): string {
  return [
    plural(r.colors.length, 'cor', 'cores'),
    plural(r.fontSizes.length, 'tamanho de fonte', 'tamanhos de fonte'),
    plural(r.families.length, 'família', 'famílias'),
    `${plural(r.offScale, 'espaçamento', 'espaçamentos')} fora da escala de ${r.scale}px`,
  ].join(' · ')
}

const SUBJECT: Record<AuditKind, string> = {
  color: 'cor',
  'font-size': 'tamanho de fonte',
  'font-family': 'família',
  spacing: 'espaçamento',
}

/** Motivo de cada marca: curto na etiqueta do relatório, completo na nota. */
function reason(kind: AuditKind, flag: AuditFlag, e: AuditEntry, scale: number, long: boolean): string {
  if (flag === 'off-scale') return `fora da escala de ${scale}px`
  if (flag === 'similar') return `${kind === 'color' ? 'parecida' : 'parecido'} com ${e.similarTo}`
  return long ? `é a fonte padrão do navegador (a página usa ${e.similarTo})` : 'fonte padrão do navegador'
}

/** Etiquetas da linha do relatório. */
export const flagTexts = (kind: AuditKind, e: AuditEntry, scale: number): string[] => e.flags.map((f) => reason(kind, f, e, scale, false))

/** Nota pré-preenchida do Achado: o que é, onde, por quê e o que usar (DETE-05). */
export function findingNote(kind: AuditKind, e: AuditEntry, scale: number): string {
  const where = e.props?.length ? ` (${e.props.join(', ')})` : ''
  const why = e.flags.map((f) => reason(kind, f, e, scale, true)).join('; ')
  const fix = e.suggestion ? `: ${e.suggestion}` : ''
  return `[Raio-X] ${SUBJECT[kind]} ${e.value}${where} ${why}${fix} (${plural(e.count, 'elemento', 'elementos')})`
}
