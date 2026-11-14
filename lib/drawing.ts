import type { Stroke } from './types'

type Point = [number, number]

/** Cores do Desenho (DESE-02): rosa do PxA, amarelo e ciano. */
export const DRAW_COLORS = { rosa: '#ff3e7f', amarelo: '#f2c94c', ciano: '#3fd0e0' } as const

const ARROW_ANGLE = Math.PI / 6 // 30°
const ARROW_MIN_BLOCKS = 4
const ARROW_RATIO = 0.25

/** Lado do bloco em pixels do print: 2px CSS na escala do print (prints são tirados em pixels do aparelho). */
export const blockFor = (dpr: number): number => 2 * Math.max(1, Math.round(dpr))

export const snap = ([x, y]: Point, block: number): Point => [Math.floor(x / block) * block, Math.floor(y / block) * block]

/** Bresenham na grade de blocos: linha contínua de `a` até `b`, em origens de bloco. */
export function rasterLine(a: Point, b: Point, block: number): Point[] {
  let x0 = Math.floor(a[0] / block)
  let y0 = Math.floor(a[1] / block)
  const x1 = Math.floor(b[0] / block)
  const y1 = Math.floor(b[1] / block)
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  const out: Point[] = []
  for (;;) {
    out.push([x0 * block, y0 * block])
    if (x0 === x1 && y0 === y1) return out
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; x0 += sx }
    if (e2 <= dx) { err += dx; y0 += sy }
  }
}

const polyline = (points: Point[], block: number): Point[] =>
  points.length === 1 ? [snap(points[0]!, block)] : points.slice(1).flatMap((p, i) => rasterLine(points[i]!, p, block))

function arrow([a, b]: [Point, Point], block: number): Point[] {
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
  const len = Math.max(ARROW_MIN_BLOCKS * block, ARROW_RATIO * Math.hypot(b[0] - a[0], b[1] - a[1]))
  const head = (side: number): Point => [b[0] - len * Math.cos(angle + side * ARROW_ANGLE), b[1] - len * Math.sin(angle + side * ARROW_ANGLE)]
  return [...rasterLine(a, b, block), ...rasterLine(b, head(1), block), ...rasterLine(b, head(-1), block)]
}

/** Elipse inscrita no retângulo `a`→`b`, amostrada e ligada por linhas (continuidade garantida). */
function ellipse([a, b]: [Point, Point], block: number): Point[] {
  const left = Math.min(a[0], b[0])
  const top = Math.min(a[1], b[1])
  const rx = Math.abs(b[0] - a[0]) / 2
  const ry = Math.abs(b[1] - a[1]) / 2
  // Múltiplo de 4: os extremos (0°, 90°, 180°, 270°) entram como amostra e a elipse encosta nas bordas.
  const steps = 4 * Math.max(4, Math.ceil((Math.PI * Math.max(rx, ry)) / (2 * block)))
  const round = (v: number) => Math.round(v * 1e6) / 1e6 // cos/sin de 90° não dão 0/1 exatos
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (2 * Math.PI * i) / steps
    pts.push([round(left + rx + rx * Math.cos(t)), round(top + ry + ry * Math.sin(t))])
  }
  return polyline(pts, block)
}

const cross = ([a, b]: [Point, Point], block: number): Point[] => [
  ...rasterLine(a, b, block),
  ...rasterLine([a[0], b[1]], [b[0], a[1]], block),
]

/** Blocos (origem x,y) de um traço, sem repetição. Só `fillRect` inteiros: pixelado por construção. */
export function rasterStroke(stroke: Stroke, block: number): Point[] {
  const pts = stroke.points
  if (pts.length === 0) return []
  const ends: [Point, Point] = [pts[0]!, pts.at(-1)!]
  const raw =
    stroke.tool === 'brush' || pts.length === 1 ? polyline(pts, block)
    : stroke.tool === 'arrow' ? arrow(ends, block)
    : stroke.tool === 'circle' ? ellipse(ends, block)
    : cross(ends, block)
  const seen = new Set<string>()
  return raw.filter((p) => {
    const k = `${p[0]},${p[1]}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
