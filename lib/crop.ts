import type { Rect } from './types'

const SHOT_MARGIN = 16

export function isFullyVisible(rect: Rect, vw: number, vh: number): boolean {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= vw && rect.y + rect.height <= vh
}

export interface CropPlan {
  crop: Rect // em px da imagem
  outline: Rect // em px da imagem, relativo ao crop
  partial: boolean
  scale: number
}

/** Recorte do print (CAPT-07/08): margem em px CSS, limitado ao viewport, convertido para px da imagem. */
export function planCrop(el: Rect, vw: number, vh: number, imageWidth: number, imageHeight: number): CropPlan {
  const scale = imageWidth / vw
  const margin = SHOT_MARGIN
  const x0 = Math.max(0, el.x - margin)
  const y0 = Math.max(0, el.y - margin)
  const x1 = Math.min(vw, el.x + el.width + margin)
  const y1 = Math.min(vh, el.y + el.height + margin)
  const left = Math.round(x0 * scale)
  const top = Math.round(y0 * scale)
  const crop: Rect = {
    x: left,
    y: top,
    width: Math.min(imageWidth, Math.round(x1 * scale)) - left,
    height: Math.min(imageHeight, Math.round(y1 * scale)) - top,
  }
  const outline: Rect = {
    x: Math.round((el.x - x0) * scale),
    y: Math.round((el.y - y0) * scale),
    width: Math.round(el.width * scale),
    height: Math.round(el.height * scale),
  }
  return { crop, outline, partial: !isFullyVisible(el, vw, vh), scale }
}
