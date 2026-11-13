import { STYLES } from './styles'

export interface UiHost {
  host: HTMLElement
  root: ShadowRoot
  layer: HTMLElement
  setHidden(hidden: boolean): void
  /** O evento (pelo composedPath) veio da UI do PxA? (ANOT-07) */
  isPxa(path: EventTarget[]): boolean
}

/** Host único da UI, em Shadow DOM e acima de qualquer z-index da página. */
export function createHost(doc: Document = document): UiHost {
  const host = doc.createElement('pxa-root')
  host.setAttribute('data-pxa-ignore', '')
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;'
  const root = host.attachShadow({ mode: 'open' })
  const style = doc.createElement('style')
  style.textContent = STYLES
  const layer = doc.createElement('div')
  layer.className = 'pxa-layer'
  root.append(style, layer)
  doc.documentElement.append(host)
  return {
    host,
    root,
    layer,
    setHidden(hidden) {
      host.style.visibility = hidden ? 'hidden' : 'visible'
    },
    isPxa: (path) => path.includes(host),
  }
}
