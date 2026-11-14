import { toHex } from './color'

export { toHex }

/** Pixels RGBA do print da aba (mesma forma do ImageData). */
export interface Pixels {
  width: number
  height: number
  data: Uint8ClampedArray
}

export const LOUPE_SIZE = 15

/**
 * Ponto do cursor (px CSS) → pixel físico do print (LUPA-04). A escala vem do próprio print
 * (largura da imagem / largura do viewport), o que cobre DPR e zoom do navegador.
 */
export function physicalPoint(cssX: number, cssY: number, img: { width: number; height: number }, vw: number, vh: number) {
  const x = Math.floor((cssX * img.width) / vw)
  const y = Math.floor((cssY * img.height) / vh)
  return { x: Math.min(img.width - 1, Math.max(0, x)), y: Math.min(img.height - 1, Math.max(0, y)) }
}

/** Janela size×size centrada em (cx, cy), linha a linha; `null` fora do print (LUPA-01). */
export function sampleWindow(px: Pixels, cx: number, cy: number, size = LOUPE_SIZE): Array<string | null> {
  const half = Math.floor(size / 2)
  const out: Array<string | null> = []
  for (let y = cy - half; y <= cy + half; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      if (x < 0 || y < 0 || x >= px.width || y >= px.height) {
        out.push(null)
        continue
      }
      const i = (y * px.width + x) * 4
      out.push(toHex(px.data[i]!, px.data[i + 1]!, px.data[i + 2]!))
    }
  }
  return out
}
