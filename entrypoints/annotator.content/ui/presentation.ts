import type { UiHost } from './host'
import { captureKeys, el } from './dom'
import { CATEGORY_PIXEL_ICON, pixelIcon } from './icons'
import { startTick } from '../tick'
import type { AnnotationStore } from '@/lib/store'
import { displayShot } from '@/lib/export-names'
import { locate } from '@/lib/resolve'
import { CATEGORY_ICON, categoryOf } from '@/lib/viewport'

export interface PresentationOptions {
  /** Saída pelo usuário (Esc ou ✕). `close()` chamado de fora não dispara isto. */
  onClose(): void
}

/** Folga do recorte em volta do elemento, em px. */
const SPOT_PAD = 4
export const PRESENTING_CLASS = 'pxa-presenting'

/**
 * Modo Apresentação (APRE-01..06): uma Anotação por vez, com recorte (spotlight) em volta do
 * elemento e um cartão grande. Teclado na captura em `window` para a página não reagir (Espaço não rola).
 * A classe `pxa-presenting` na camada tira o Painel da frente sem mexer no estado dele.
 */
export function openPresentation(ui: UiHost, store: AnnotationStore, opts: PresentationOptions): { close(): void } {
  const list = [...store.list()]
  let index = Math.max(0, list.findIndex((a) => a.pathname === location.pathname))
  let target: Element | null = null
  let shotUrl: string | null = null
  let drawn = ''
  let closed = false

  const spot = el('div', { className: 'pxa-spot' })
  const card = el('section', { className: 'pxa-present' })
  card.setAttribute('aria-label', 'Apresentação das anotações')
  card.setAttribute('aria-live', 'polite')
  ui.layer.classList.add(PRESENTING_CLASS)
  ui.layer.append(spot, card)

  /** Acompanha a rolagem suave e mudanças de layout: lê o rect e escreve só se mudou. */
  function placeSpot() {
    const r = target?.getBoundingClientRect()
    const box = r ? [r.left - SPOT_PAD, r.top - SPOT_PAD, r.width + 2 * SPOT_PAD, r.height + 2 * SPOT_PAD] : null
    const key = box ? box.join() : 'none'
    if (key === drawn) return
    drawn = key
    if (!box) {
      spot.style.display = 'none'
      return
    }
    const [left, top, width, height] = box.map((v) => `${v}px`)
    Object.assign(spot.style, { display: 'block', left, top, width, height })
  }

  const nav = (label: string, text: string, onclick: () => void, disabled = false) => {
    const b = el('button', { type: 'button', textContent: text, onclick, disabled })
    b.setAttribute('aria-label', label)
    return b
  }

  function show(i: number) {
    index = Math.min(list.length - 1, Math.max(0, i))
    const a = list[index]!
    const where = locate(store, a.id)
    target = typeof where === 'string' ? null : where
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    placeSpot()

    if (shotUrl) URL.revokeObjectURL(shotUrl)
    shotUrl = null
    const extra: Node[] = []
    const v = a.viewport
    const here = categoryOf(innerWidth)
    if (v.category !== here) {
      extra.push(el('p', { className: 'pxa-present-warn', textContent: `anotada em ${CATEGORY_ICON[v.category]} ${v.width}px, você está em ${CATEGORY_ICON[here]} ${innerWidth}px` }))
    }
    if (!target) {
      extra.push(el('p', { className: 'pxa-present-where', textContent: where === 'missing' ? 'elemento não encontrado' : `anotada em ${a.path}` }))
      const shot = displayShot(a)
      if (shot) {
        shotUrl = URL.createObjectURL(shot)
        extra.push(el('img', { className: 'pxa-present-shot', src: shotUrl, alt: `Print da anotação ${a.number}` }))
      }
    }

    card.replaceChildren(
      el(
        'header',
        {},
        el('span', { className: 'pxa-present-meta' }, `#${a.number} `, el('span', { className: 'pxa-cat', title: v.category }, pixelIcon(CATEGORY_PIXEL_ICON[v.category], 2)), ` ${v.width}px`),
        el('span', { className: 'pxa-present-count', textContent: `${index + 1}/${list.length}` }),
      ),
      el('p', { className: 'pxa-present-note', textContent: a.note }),
      ...extra,
      el(
        'footer',
        {},
        nav('Anterior', '◀', () => show(index - 1), index === 0),
        nav('Próxima', '▶', () => show(index + 1), index === list.length - 1),
        nav('Sair da apresentação', '✕', exit),
      ),
    )
  }

  const KEYS: Record<string, () => void> = {
    ArrowRight: () => show(index + 1),
    ' ': () => show(index + 1),
    ArrowLeft: () => show(index - 1),
    Home: () => show(0),
    End: () => show(list.length - 1),
    Escape: () => exit(),
  }
  const releaseKeys = captureKeys((ev) => KEYS[ev.key])
  let stopTick = () => {}

  function close() {
    if (closed) return
    closed = true
    stopTick()
    releaseKeys()
    if (shotUrl) URL.revokeObjectURL(shotUrl)
    spot.remove()
    card.remove()
    ui.layer.classList.remove(PRESENTING_CLASS)
  }
  function exit() {
    close()
    opts.onClose()
  }

  if (list.length === 0) {
    exit()
    return { close }
  }
  show(index)
  stopTick = startTick(placeSpot)
  return { close }
}
