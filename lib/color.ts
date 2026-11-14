/** Canal 0–255 → 2 dígitos hex (arredonda e limita). */
export const hex2 = (n: number): string => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')

/** RGB → `#rrggbb`. Usado pelo Detector e pela Lupa, para os dois mostrarem o mesmo hex. */
export const toHex = (r: number, g: number, b: number): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`

/** Cor sRGB de 8 bits por canal; alfa 0–1. */
export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

type Vec3 = [number, number, number]

const mul = (m: readonly Vec3[], v: Vec3): Vec3 => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vec3

// Matrizes do CSS Color 4 (https://www.w3.org/TR/css-color-4/#color-conversion-code).
const D50_TO_D65: Vec3[] = [
  [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
  [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
  [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
]
const XYZ65_TO_LINEAR_SRGB: Vec3[] = [
  [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
  [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
  [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
]
const LINEAR_P3_TO_XYZ65: Vec3[] = [
  [0.4865709486482162, 0.26566769316909306, 0.1982172852343625],
  [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
  [0, 0.04511338185890264, 1.043944368900976],
]
const D50_WHITE: Vec3 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585]

const toLinear = (c: number) => (Math.abs(c) <= 0.04045 ? c / 12.92 : Math.sign(c) * ((Math.abs(c) + 0.055) / 1.055) ** 2.4)
const fromLinear = (c: number) => (Math.abs(c) <= 0.0031308 ? 12.92 * c : Math.sign(c) * (1.055 * Math.abs(c) ** (1 / 2.4) - 0.055))

/** CIE Lab (D50, como no CSS) → sRGB linear. */
function labToLinear([L, a, b]: Vec3): Vec3 {
  const e = 216 / 24389
  const k = 24389 / 27
  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const xyz50: Vec3 = [
    (fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k) * D50_WHITE[0],
    (L > k * e ? fy ** 3 : L / k) * D50_WHITE[1],
    (fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k) * D50_WHITE[2],
  ]
  return mul(XYZ65_TO_LINEAR_SRGB, mul(D50_TO_D65, xyz50))
}

/** OKLab → sRGB linear (Björn Ottosson). */
function oklabToLinear([L, a, b]: Vec3): Vec3 {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const polar = ([L, C, H]: Vec3): Vec3 => [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)]

/** Número CSS: `none` = 0; `%` vira fração de `pct` (o valor que 100% representa). */
function num(token: string | undefined, pct = 1): number {
  if (!token || token === 'none') return 0
  return token.endsWith('%') ? (parseFloat(token) / 100) * pct : parseFloat(token)
}

const encode = (lin: Vec3, alpha: number): Rgba => {
  const [r, g, b] = lin.map((c) => Math.round(Math.min(1, Math.max(0, fromLinear(c))) * 255))
  return { r: r!, g: g!, b: b!, a: alpha }
}

/** Funções de cor com 3 canais → sRGB linear. */
const SPACES: Record<string, (c: [string, string, string]) => Vec3> = {
  lab: ([l, a, b]) => labToLinear([num(l, 100), num(a, 125), num(b, 125)]),
  lch: ([l, c, h]) => labToLinear(polar([num(l, 100), num(c, 150), num(h)])),
  oklab: ([l, a, b]) => oklabToLinear([num(l), num(a, 0.4), num(b, 0.4)]),
  oklch: ([l, c, h]) => oklabToLinear(polar([num(l), num(c, 0.4), num(h)])),
  srgb: (c) => c.map((v) => toLinear(num(v))) as Vec3,
  'srgb-linear': (c) => c.map((v) => num(v)) as Vec3,
  'display-p3': (c) => mul(XYZ65_TO_LINEAR_SRGB, mul(LINEAR_P3_TO_XYZ65, c.map((v) => toLinear(num(v))) as Vec3)),
}

/**
 * Qualquer cor computada → sRGB 8 bits (DETE-08). Entende hex, `rgb()/rgba()`, `lab()/lch()`,
 * `oklab()/oklch()` e `color(srgb|srgb-linear|display-p3 …)`; fora do gamut corta no limite.
 * `null` para transparente, `currentcolor` e formatos não suportados.
 */
export function parseCssColor(css: string): Rgba | null {
  const v = css.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3,8})$/.exec(v)
  if (hex) {
    let h = hex[1]!
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
    if (h.length !== 6 && h.length !== 8) return null
    const ch = (i: number) => parseInt(h.slice(i, i + 2), 16)
    return { r: ch(0), g: ch(2), b: ch(4), a: h.length === 8 ? ch(6) / 255 : 1 }
  }
  const fn = /^([a-z-]+)\(([^)]*)\)$/.exec(v)
  if (!fn) return null
  const [main = '', alphaPart] = fn[2]!.split('/')
  const parts = main.trim().split(/[\s,]+/).filter(Boolean)
  const name = fn[1] === 'color' ? parts.shift() ?? '' : fn[1]!
  const alpha = alphaPart !== undefined ? num(alphaPart.trim()) : parts.length === 4 ? num(parts.pop()) : 1
  if (parts.length !== 3) return null
  const channels = parts as [string, string, string]
  if (name === 'rgb' || name === 'rgba') {
    const [r, g, b] = channels.map((c) => Math.round(Math.min(255, Math.max(0, num(c, 255)))))
    return { r: r!, g: g!, b: b!, a: alpha }
  }
  const toLin = SPACES[name]
  return toLin ? encode(toLin(channels), alpha) : null
}
