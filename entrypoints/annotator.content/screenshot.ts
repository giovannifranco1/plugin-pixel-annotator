import { isFullyVisible, planCrop } from '@/lib/crop'
import type { CaptureResponse } from '@/lib/messages'
import type { UiHost } from './ui/host'

export type CaptureTab = () => Promise<string>

const twoFrames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

/** Pede ao background a foto da aba visível (a única API de print do MV3 fica lá). */
export const captureTab: CaptureTab = async () => {
  const res = (await browser.runtime.sendMessage({ type: 'pxa:capture' })) as CaptureResponse | undefined
  if (!res || !('dataUrl' in res)) throw new Error(res && 'error' in res ? res.error : 'captura sem resposta')
  return res.dataUrl
}

/**
 * Print do recorte do elemento (CAPT-07/08): rola se preciso, esconde a UI do PxA, fotografa,
 * recorta com margem e desenha o contorno. A UI sempre volta, mesmo se a captura falhar.
 */
export async function shootElement(el: Element, ui: UiHost, capture: CaptureTab = captureTab): Promise<{ shot: Blob | null; partial: boolean }> {
  let rect = el.getBoundingClientRect()
  if (!isFullyVisible(rect, innerWidth, innerHeight)) {
    el.scrollIntoView({ block: 'center', inline: 'center' })
    await twoFrames()
    rect = el.getBoundingClientRect()
  }
  const partial = !isFullyVisible(rect, innerWidth, innerHeight)
  let dataUrl: string
  ui.setHidden(true)
  try {
    await twoFrames()
    dataUrl = await capture()
  } catch {
    return { shot: null, partial }
  } finally {
    ui.setHidden(false)
  }
  try {
    // createImageBitmap a partir do Blob: não depende do img-src da CSP da página.
    const img = await createImageBitmap(await (await fetch(dataUrl)).blob())
    const plan = planCrop(rect, innerWidth, innerHeight, img.width, img.height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, plan.crop.width)
    canvas.height = Math.max(1, plan.crop.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return { shot: null, partial }
    ctx.drawImage(img, plan.crop.x, plan.crop.y, plan.crop.width, plan.crop.height, 0, 0, plan.crop.width, plan.crop.height)
    ctx.strokeStyle = '#ff3e7f'
    ctx.lineWidth = Math.max(2, Math.round(2 * plan.scale))
    ctx.strokeRect(plan.outline.x, plan.outline.y, plan.outline.width, plan.outline.height)
    const shot = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    return { shot, partial: plan.partial }
  } catch {
    return { shot: null, partial }
  }
}
