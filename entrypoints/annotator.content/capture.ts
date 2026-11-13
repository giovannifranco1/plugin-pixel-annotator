import type { AnnotationDraft } from '@/lib/store'
import { buildSelector } from '@/lib/selector'
import { readViewport } from '@/lib/viewport'
import { truncateHtml } from '@/lib/outer-html'
import { filterCss, readStyle } from '@/lib/css-filter'
import { probeComponent } from './probe-client'
import { shootElement, type CaptureTab } from './screenshot'
import type { UiHost } from './ui/host'

export interface CaptureDeps {
  ui: UiHost
  defaultStyle(tag: string): Record<string, string>
  probe?: typeof probeComponent
  capture?: CaptureTab
}

/**
 * Contexto da anotação no momento da confirmação da nota (CAPT-01..08, COMP-01..04).
 * Rect/scroll/viewport são lidos antes de um eventual scroll do print: refletem o que o dev via.
 */
export async function captureContext(el: Element, note: string, deps: CaptureDeps): Promise<AnnotationDraft> {
  const { pathname, search, hash, href } = location
  const selector = buildSelector(el)
  const viewport = readViewport(window)
  const r = el.getBoundingClientRect()
  const scroll = { x: window.scrollX, y: window.scrollY }
  const { html, truncated } = truncateHtml(el.outerHTML)
  const css = filterCss(readStyle(getComputedStyle(el)), deps.defaultStyle(el.localName))
  const componentP = (deps.probe ?? probeComponent)(el).catch(() => null)
  const { shot, partial } = await shootElement(el, deps.ui, deps.capture)
  return {
    note,
    url: href,
    path: `${pathname}${search}${hash}`,
    pathname,
    selector,
    viewport,
    rect: { x: r.x, y: r.y, width: r.width, height: r.height },
    scroll,
    outerHtml: html,
    outerHtmlTruncated: truncated,
    css,
    component: await componentP,
    shot,
    shotPartial: partial,
  }
}
