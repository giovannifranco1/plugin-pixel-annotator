import type { UiHost } from './host'
import { el } from './dom'
import { CATEGORY_PIXEL_ICON, pixelIcon } from './icons'
import type { AnnotationStore } from '@/lib/store'
import type { Annotation } from '@/lib/types'
import { resolveAnnotation } from '@/lib/resolve'
import { CATEGORY_ICON, categoryOf } from '@/lib/viewport'

export interface PresentationOptions {
  /** Saída pelo usuário (Esc ou ✕). `close()` chamado de fora não dispara isto. */
  onClose(): void
  resolve?: (id: string) => Element | null
}

/** Folga do recorte em volta do elemento, em px. */
const SPOT_PAD = 4
export const PRESENTING_CLASS = 'pxa-presenting'

const displayShot = (a: Annotation): Blob | null => a.drawing?.composite ?? a.shot

/**
 * Modo Apresentação (APRE-01..06): uma Anotação por vez, com recorte (spotlight) em volta do
 * elemento e um cartão grande. Teclado na captura em `window` para a página não reagir (Espaço não rola).
 * A classe `pxa-presenting` na camada tira o Painel da frente sem mexer no estado dele.
 */
export function openPresentation(ui: UiHost, store: AnnotationStore, opts: PresentationOptions): { close(): void } {
  const resolve = opts.resolve ?? ((id: string) => resolveAnnotation(store, id))
  const list = [...store.list()]
  let index = Math.max(0, list.findIndex((a) => a.pathname === location.pathname))
  let target: Element | null = null
  let shotUrl: string | null = null
  let drawn = ''
  let frame = 0
  let closed = false

  const spot = el('div', { className: 'pxa-spot' })
  const card = el('section', { className: 'pxa-present' })
  card.setAttribute('aria-label', 'Apresentação das anotações')
  card.setAttribute('aria-live', 'polite')
  ui.layer.classList.add(PRESENTING_CLASS)
  ui.layer.append(spot, card)

  function spotKey(): string {
    if (!target) return 'none'
    const r = target.getBoundingClientRect()
    return `${r.left - SPOT_PAD},${r.top - SPOT_PAD},${r.width + 2 * SPOT_PAD},${r.height + 2 * SPOT_PAD}`
  }
  function placeSpot() {
    const key = spotKey()
    if (key === drawn) return
    drawn = key
    if (key === 'none') {
      spot.style.display = 'none'
      return
    }
    const [left, top, width, height] = key.split(',')
    Object.assign(spot.style, { display: 'block', left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` })
  }
  // Acompanha a rolagem suave e mudanças de layout: lê o rect e escreve só se mudou.
  const loop = () => {
    placeSpot()
    frame = requestAnimationFrame(loop)
  }

  const nav = (label: string, text: string, onclick: () => void, disabled = false) => {
    const b = el('button', { type: 'button', textContent: text, onclick, disabled })
    b.setAttribute('aria-label', label)
    return b
  }

  function show(i: number) {
    index = Math.min(list.length - 1, Math.max(0, i))
    const a = list[index]!
    const sameRoute = a.pathname === location.pathname
    target = sameRoute ? resolve(a.id) : null
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    placeSpot()

    if (shotUrl) URL.revokeObjectURL(shotUrl)
    shotUrl = null
    const extra: Node[] = []
    const v = a.viewport
    const nowWidth = innerWidth
    if (v.category !== categoryOf(nowWidth)) {
      const here = CATEGORY_ICON[categoryOf(nowWidth)]
      extra.push(el('p', { className: 'pxa-present-warn', textContent: `anotada em ${CATEGORY_ICON[v.category]} ${v.width}px, você está em ${here} ${nowWidth}px` }))
    }
    if (!target) {
      extra.push(el('p', { className: 'pxa-present-where', textContent: sameRoute ? 'elemento não encontrado' : `anotada em ${a.path}` }))
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
  const onKey = (ev: KeyboardEvent) => {
    const action = KEYS[ev.key]
    if (!action) return
    ev.preventDefault()
    ev.stopImmediatePropagation()
    action()
  }
  window.addEventListener('keydown', onKey, { capture: true })

  function close() {
    if (closed) return
    closed = true
    cancelAnimationFrame(frame)
    window.removeEventListener('keydown', onKey, { capture: true })
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
  frame = requestAnimationFrame(loop)
  return { close }
}
