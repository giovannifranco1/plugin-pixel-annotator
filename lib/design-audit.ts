import { hex2, toHex } from './color'

/** Estilos computados crus de um elemento visível (DETE-01). */
export interface AuditSample {
  /** color, background-color, border-{top,right,bottom,left}-color */
  colors: string[]
  fontSize: string
  fontFamily: string
  fontWeight: string
  /** margin-*, padding-*, row-gap, column-gap */
  spacings: string[]
}

export type AuditScale = 4 | 8
export type AuditFlag = 'off-scale' | 'similar' | 'orphan'
export type AuditKind = 'color' | 'font' | 'spacing'

export interface AuditEntry {
  value: string
  /** Nº de elementos distintos que usam o valor. */
  count: number
  /** Índices das amostras (elementos) que usam o valor. */
  elements: number[]
  flags: AuditFlag[]
  similarTo?: string
}

export interface AuditReport {
  scale: AuditScale
  colors: AuditEntry[]
  fonts: AuditEntry[]
  spacings: AuditEntry[]
  /** Tamanhos de fonte distintos. */
  fontSizes: number
  /** Espaçamentos distintos fora da escala. */
  offScale: number
}

/** Usado 1 ou 2 vezes na página. */
const ORPHAN_MAX = 2
/** ΔE76 em Lab: ~2,3 é o limiar perceptível; até 5 é "quase igual". */
const SIMILAR_DELTA_E = 5
/** Tolerância para valores vindos de rem/em/zoom (ex: 12.004px). */
const SCALE_TOLERANCE = 0.01

const round2 = (n: number) => Math.round(n * 100) / 100

function channel(v: string, max: number): number {
  return v.endsWith('%') ? (parseFloat(v) / 100) * max : parseFloat(v)
}

/** Cor computada → `#rrggbb` (opaca) ou `#rrggbbaa`; `null` para transparente. Formatos sem conversão (oklch, color()) ficam como texto. */
export function normalizeColor(css: string): string | null {
  const v = css.trim().toLowerCase()
  if (!v || v === 'transparent' || v === 'currentcolor') return null
  const hex = /^#([0-9a-f]{3,8})$/.exec(v)
  if (hex) {
    let h = hex[1]!
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
    if (h.length === 8 && h.endsWith('ff')) h = h.slice(0, 6)
    if (h.length === 8 && h.endsWith('00')) return null
    return h.length === 6 || h.length === 8 ? `#${h}` : v
  }
  const fn = /^rgba?\(([^)]*)\)$/.exec(v)
  if (!fn) return v
  const parts = fn[1]!.split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3) return v
  const [r, g, b] = parts.slice(0, 3).map((p) => channel(p, 255)) as [number, number, number]
  const a = parts[3] === undefined ? 1 : channel(parts[3], 1)
  if (a <= 0) return null
  const base = toHex(r, g, b)
  return a >= 1 ? base : `${base}${hex2(a * 255)}`
}

type Lab = [number, number, number]

function toLab(hex: string): Lab | null {
  if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex)) return null
  const lin = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  const [r, g, b] = lin
  // sRGB → XYZ (D65), normalizado pelo branco de referência
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

/** Distância perceptual ΔE76 entre duas cores normalizadas (Infinity se não for hex). */
export const colorDistance = (a: string, b: string): number => labDistance(toLab(a), toLab(b))

const labDistance = (a: Lab | null, b: Lab | null) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : Infinity)

/** `auto`/`normal`/não-px → null; negativos contam pelo valor absoluto. */
export function parsePx(v: string): number | null {
  const m = /^(-?\d*\.?\d+)px$/.exec(v.trim())
  return m ? round2(Math.abs(parseFloat(m[1]!))) : null
}

export function isOnScale(px: number, scale: number): boolean {
  const rest = px % scale
  return rest <= SCALE_TOLERANCE || scale - rest <= SCALE_TOLERANCE
}

const firstFamily = (family: string) => (family.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '')
const alphaOf = (hex: string) => (hex.length === 9 ? hex.slice(7) : 'ff')

type Groups = Map<string, Set<number>>

function add(groups: Groups, value: string, index: number) {
  let set = groups.get(value)
  if (!set) groups.set(value, (set = new Set()))
  set.add(index)
}

const toEntries = (groups: Groups, flagsOf: (value: string, count: number) => AuditFlag[]): AuditEntry[] =>
  [...groups].map(([value, set]) => ({ value, count: set.size, elements: [...set], flags: flagsOf(value, set.size) }))

const sortEntries = (entries: AuditEntry[]) =>
  entries.sort((a, b) => Number(b.flags.length > 0) - Number(a.flags.length > 0) || b.count - a.count || a.value.localeCompare(b.value))

const orphan = (count: number): AuditFlag[] => (count <= ORPHAN_MAX ? ['orphan'] : [])

/** Cada cor entra no grupo da primeira semente (mais usada) com o mesmo alfa a ΔE ≤ 5. */
function markSimilar(colors: AuditEntry[]) {
  const seeds: Array<{ entry: AuditEntry; alpha: string; lab: Lab | null }> = []
  for (const c of [...colors].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))) {
    const alpha = alphaOf(c.value)
    const lab = toLab(c.value)
    const seed = seeds.find((s) => s.alpha === alpha && labDistance(s.lab, lab) <= SIMILAR_DELTA_E)?.entry
    if (!seed) {
      seeds.push({ entry: c, alpha, lab })
      continue
    }
    c.flags = ['similar', ...c.flags]
    c.similarTo = seed.value
  }
}

/** Agrupa as amostras em Cores, Fontes e Espaçamentos e marca os Achados (DETE-02/03). */
export function buildAuditReport(samples: readonly AuditSample[], scale: AuditScale): AuditReport {
  const colors: Groups = new Map()
  const fonts: Groups = new Map()
  const spacings: Groups = new Map()
  const sizes = new Set<number>()
  samples.forEach((s, i) => {
    for (const c of s.colors) {
      const hex = normalizeColor(c)
      if (hex) add(colors, hex, i)
    }
    const size = parsePx(s.fontSize)
    if (size !== null) {
      sizes.add(size)
      add(fonts, `${size}px ${firstFamily(s.fontFamily)} ${s.fontWeight}`, i)
    }
    for (const sp of s.spacings) {
      const px = parsePx(sp)
      if (px !== null) add(spacings, `${px}px`, i)
    }
  })
  const colorEntries = toEntries(colors, (_, n) => orphan(n))
  markSimilar(colorEntries)
  const spacingEntries = toEntries(spacings, (v, n) => [...(isOnScale(parseFloat(v), scale) ? [] : ['off-scale' as const]), ...orphan(n)])
  return {
    scale,
    colors: sortEntries(colorEntries),
    fonts: sortEntries(toEntries(fonts, (_, n) => orphan(n))),
    spacings: sortEntries(spacingEntries),
    fontSizes: sizes.size,
    offScale: spacingEntries.filter((e) => e.flags.includes('off-scale')).length,
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Cabeçalho do relatório (DETE-02). */
export function auditHeadline(r: AuditReport): string {
  return [
    plural(r.colors.length, 'cor', 'cores'),
    plural(r.fontSizes, 'tamanho de fonte', 'tamanhos de fonte'),
    `${plural(r.offScale, 'espaçamento', 'espaçamentos')} fora da escala de ${r.scale}px`,
  ].join(' · ')
}

const SUBJECT: Record<AuditKind, { label: string; used: string }> = {
  color: { label: 'cor', used: 'usada' },
  font: { label: 'fonte', used: 'usada' },
  spacing: { label: 'espaçamento', used: 'usado' },
}

/**
 * Texto de cada marca do Achado. `kind` ausente = etiqueta curta da linha do relatório ("órfã");
 * com `kind` = frase da nota ("usado só 2×").
 */
export function flagTexts(e: AuditEntry, scale: number, kind?: AuditKind): string[] {
  return e.flags.map((f) =>
    f === 'off-scale' ? `fora da escala de ${scale}px` : f === 'similar' ? `parecida com ${e.similarTo}` : kind ? `${SUBJECT[kind].used} só ${e.count}×` : 'órfã',
  )
}

/** Nota pré-preenchida do Achado (DETE-05). */
export function findingNote(kind: AuditKind, e: AuditEntry, scale: number): string {
  return `[Raio-X] ${SUBJECT[kind].label} ${e.value} ${flagTexts(e, scale, kind).join('; ')} (${plural(e.count, 'elemento', 'elementos')})`
}
