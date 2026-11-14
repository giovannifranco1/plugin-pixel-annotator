import { deltaE, hex2, parseCssColor, toHex, type Rgba } from './color'

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
  /** Usos da referência (`similarTo`), para dizer quão mais usada ela é. */
  similarCount?: number
  /** Cores: variantes imperceptíveis (ΔE < 1) somadas a esta linha. */
  variants?: string[]
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
/** Abaixo disso ninguém vê a diferença (arredondamento de oklch()/color-mix()): é a mesma cor. */
const SAME_COLOR_DELTA_E = 1
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

/** Cor visível → `#rrggbb` (opaca) ou `#rrggbbaa`. */
function hexOf(c: Rgba): string {
  const base = toHex(c.r, c.g, c.b)
  return c.a >= 1 ? base : `${base}${hex2(c.a * 255)}`
}

/** Cor computada → sRGB visível, ou `null` para transparente e formato desconhecido (DETE-08). */
function visibleColor(css: string): Rgba | null {
  const c = parseCssColor(css)
  return c && c.a > 0 ? c : null
}

/** Cor computada → `#rrggbb` (opaca) ou `#rrggbbaa`; `null` para transparente ou formato desconhecido (DETE-08). */
export function normalizeColor(css: string): string | null {
  const c = visibleColor(css)
  return c && hexOf(c)
}

/** Distância perceptual ΔE76 entre duas cores CSS (Infinity se alguma não for cor). */
export function colorDistance(a: string, b: string): number {
  const ca = parseCssColor(a)
  const cb = parseCssColor(b)
  return ca && cb ? deltaE(ca, cb) : Infinity
}

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

type Groups = Map<string, Set<number>>

function add<T>(groups: Map<string, Set<T>>, key: string, item: T) {
  let set = groups.get(key)
  if (!set) groups.set(key, (set = new Set()))
  set.add(item)
}

/** Memo por varredura: a página tem poucos valores distintos repetidos em milhares de elementos. */
function memo<T>(fn: (v: string) => T): (v: string) => T {
  const cache = new Map<string, T>()
  return (v) => {
    if (!cache.has(v)) cache.set(v, fn(v))
    return cache.get(v)!
  }
}

const toEntries = (groups: Groups): AuditEntry[] =>
  [...groups].map(([value, set]) => ({ value, count: set.size, elements: [...set], flags: [] as AuditFlag[] }))

const byUse = (a: AuditEntry, b: AuditEntry) => b.count - a.count || a.value.localeCompare(b.value)
/** Achados primeiro, depois os mais usados (DETE-09). */
const sortEntries = (entries: AuditEntry[]) => entries.sort((a, b) => Number(b.flags.length > 0) - Number(a.flags.length > 0) || byUse(a, b))

/** Quando um valor parecido é "perdido" e não token (DETE-03). */
const RARITY = {
  /** A referência tem ao menos 3× os usos do valor: sem referência clara não há o que corrigir. */
  ratio: 3,
  /** Até 2 usos sempre podem ser perdidos; acima disso, até 10% dos usos da referência… */
  floor: 2,
  share: 0.1,
  /** …e nunca mais de 5 (um valor usado 6+ vezes é escolha, não acidente). */
  cap: 5,
  /** Cor de fundo que pinta 10%+ da página é superfície, nunca perdida. */
  surface: 0.1,
}

/** Raro perto da referência: dois valores bem usados são tokens; dois raros não têm referência clara. */
const rareNear = (entry: AuditEntry, ref: AuditEntry) =>
  ref.count >= entry.count * RARITY.ratio && entry.count <= Math.min(RARITY.cap, Math.max(RARITY.floor, Math.floor(ref.count * RARITY.share)))

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
      entry.similarCount = seed.count
      entry.suggestion = `usar ${seed.value}`
    } else {
      seeds.push({ entry, key: k })
    }
  }
}

/**
 * Junta no valor mais usado as variantes que ninguém distingue (ex: `#7c7760` × `#7c775f`): os elementos
 * somam numa linha só. Devolve as variantes de cada valor que ficou.
 */
function mergeImperceptible(groups: Groups, same: (a: string, b: string) => boolean, onMerge: (from: string, into: string) => void): Map<string, string[]> {
  const kept: string[] = []
  const variants = new Map<string, string[]>()
  for (const [value, set] of [...groups].sort(([a, x], [b, y]) => y.size - x.size || a.localeCompare(b))) {
    const into = kept.find((k) => same(k, value))
    if (!into) {
      kept.push(value)
      continue
    }
    for (const i of set) groups.get(into)!.add(i)
    groups.delete(value)
    onMerge(value, into)
    variants.set(into, [...(variants.get(into) ?? []), value])
  }
  return variants
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
  const rgbaOf = new Map<string, Rgba>()
  const color = memo((css) => {
    const c = visibleColor(css)
    if (!c) return null
    const hex = hexOf(c)
    if (!rgbaOf.has(hex)) rgbaOf.set(hex, c)
    return hex
  })
  const px = memo(parsePx)
  let pageArea = 0
  samples.forEach((s, i) => {
    pageArea = Math.max(pageArea, s.area)
    const bg = color(s.background)
    if (bg) {
      add(colors, bg, i)
      backgroundArea.set(bg, (backgroundArea.get(bg) ?? 0) + s.area)
    }
    for (const c of s.colors) {
      const hex = color(c)
      if (hex) add(colors, hex, i)
    }
    const size = px(s.fontSize)
    if (size !== null) add(sizes, `${size}px`, i)
    const family = firstFamily(s.fontFamily)
    if (family) add(families, family, i)
    for (const { prop, value } of s.spacings) {
      const n = px(value)
      if (!n) continue // 0 não é inconsistência; auto/percentual não têm valor de escala
      add(spacings, `${n}px`, i)
      add(spacingProps, `${n}px`, prop)
    }
  })

  const alpha255 = (c: Rgba) => Math.round(c.a * 255)
  const variants = mergeImperceptible(colors, (a, b) => {
    const ca = rgbaOf.get(a)!
    const cb = rgbaOf.get(b)!
    return alpha255(ca) === alpha255(cb) && deltaE(ca, cb) < SAME_COLOR_DELTA_E
  }, (from, into) => backgroundArea.set(into, (backgroundArea.get(into) ?? 0) + (backgroundArea.get(from) ?? 0)))
  const colorEntries = toEntries(colors)
  for (const e of colorEntries) if (variants.has(e.value)) e.variants = variants.get(e.value)
  markSimilar(
    colorEntries,
    (e) => rgbaOf.get(e.value)!,
    (a, b) => alpha255(a) === alpha255(b) && deltaE(a, b) <= SIMILAR_DELTA_E,
    (e) => (backgroundArea.get(e.value) ?? 0) < pageArea * RARITY.surface, // superfície grande (ex: fundo da página) não é cor perdida
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

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

/** Uma linha por tipo de seção: título no relatório, palavras na nota e no cabeçalho. */
export const AUDIT_KINDS: Record<AuditKind, { title: string; subject: [one: string, many: string]; similar: string; entries(r: AuditReport): AuditEntry[] }> = {
  color: { title: 'Cores', subject: ['cor', 'cores'], similar: 'parecida', entries: (r) => r.colors },
  'font-size': { title: 'Tamanhos de fonte', subject: ['tamanho de fonte', 'tamanhos de fonte'], similar: 'parecido', entries: (r) => r.fontSizes },
  'font-family': { title: 'Famílias', subject: ['família', 'famílias'], similar: 'parecida', entries: (r) => r.families },
  spacing: { title: 'Espaçamentos', subject: ['espaçamento', 'espaçamentos'], similar: 'parecido', entries: (r) => r.spacings },
}

/** Seções na ordem do relatório. */
export const KIND_LIST = Object.keys(AUDIT_KINDS) as AuditKind[]

/** Cabeçalho do relatório (DETE-02): começa pelo número de Achados (DETE-09). */
export function auditHeadline(r: AuditReport): string {
  const count = (kind: AuditKind) => plural(AUDIT_KINDS[kind].entries(r).length, ...AUDIT_KINDS[kind].subject)
  const findings = KIND_LIST.reduce((n, kind) => n + AUDIT_KINDS[kind].entries(r).filter((e) => e.flags.length).length, 0)
  return [
    findings ? plural(findings, 'achado', 'achados') : 'Nenhum achado',
    count('color'),
    count('font-size'),
    count('font-family'),
    `${plural(r.offScale, ...AUDIT_KINDS.spacing.subject)} fora da escala de ${r.scale}px`,
  ].join(' · ')
}

/** Abaixo disso a escala não serve à página: avisar em vez de confiar nos Achados de espaçamento. */
const SCALE_FIT_MIN = 0.5

/** Aviso de escala que não serve à página, ou `null`. */
export function scaleNotice(r: AuditReport): string | null {
  if (r.scaleFit >= SCALE_FIT_MIN) return null
  return `Só ${Math.round(r.scaleFit * 100)}% dos espaçamentos seguem a escala de ${r.scale}px: a página talvez use outra escala.`
}

/** Motivo de cada marca: curto na etiqueta do relatório, completo na nota. */
function reason(kind: AuditKind, flag: AuditFlag, e: AuditEntry, scale: number, long: boolean): string {
  if (flag === 'off-scale') return `fora da escala de ${scale}px`
  if (flag === 'similar') return `${AUDIT_KINDS[kind].similar} com ${e.similarTo}${long ? '' : ` (${e.similarCount}×)`}`
  return long ? `é a fonte padrão do navegador (a página usa ${e.similarTo})` : `fonte padrão do navegador (a página usa ${e.similarTo})`
}

/** Etiquetas da linha do relatório. */
export const flagTexts = (kind: AuditKind, e: AuditEntry, scale: number): string[] => e.flags.map((f) => reason(kind, f, e, scale, false))

/** Nota pré-preenchida do Achado: o que é, onde, por quê e o que usar (DETE-05). */
export function findingNote(kind: AuditKind, e: AuditEntry, scale: number): string {
  const where = e.props?.length ? ` (${e.props.join(', ')})` : ''
  const why = e.flags.map((f) => reason(kind, f, e, scale, true)).join('; ')
  const fix = e.suggestion ? `: ${e.suggestion}` : ''
  return `[Raio-X] ${AUDIT_KINDS[kind].subject[0]} ${e.value}${where} ${why}${fix} (${plural(e.count, 'elemento', 'elementos')})`
}
