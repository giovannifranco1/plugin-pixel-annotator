import {
  AUDIT_KINDS, auditHeadline, buildAuditReport, findingNote, flagTexts, isFinding, KIND_LIST, plural, scaleNotice,
  type AuditEntry, type AuditKind, type AuditReport, type AuditScale,
} from '@/lib/design-audit'
import { scanDocument, SCAN_LIMIT, type ScanResult } from '../audit-scan'
import { createBoxes, type BoxSpec } from './boxes'
import { makeDraggable } from './draggable'
import type { UiHost } from './host'
import { el } from './dom'
import { circleCheck } from './icons'

export interface AuditReportActions {
  annotate(elements: Element[], note: string): void
  onClose(): void
}

/** Destaque do hover (DETE-04): no máximo 300 caixas, lendo no máximo 2.000 elementos por frame. */
const MAX_HIGHLIGHT = 300
const MAX_HIGHLIGHT_READS = 2000

const routeKey = () => location.href
const count = (n: number) => n.toLocaleString('pt-BR')
const inViewport = (r: DOMRect) => r.right >= 0 && r.bottom >= 0 && r.left <= innerWidth && r.top <= innerHeight

/** `<span>` só quando há texto. */
const optional = (className: string, text: string | false | undefined, title = '') => (text ? [el('span', { className, textContent: text, title })] : [])

function swatch(color: string) {
  const s = el('span', { className: 'pxa-swatch' })
  s.style.background = color
  return s
}

/** Janela do Detector: varre, mostra o relatório, destaca no hover e anota Achados (DETE-02/04/05/06). */
export function createAuditReport(ui: UiHost, actions: AuditReportActions, deps: { scan?: typeof scanDocument } = {}) {
  const scan = deps.scan ?? scanDocument
  const head = el('div', { className: 'pxa-audit-head' })
  const close = el('button', { type: 'button', className: 'pxa-icon pxa-head-btn', textContent: '×', onclick: () => hide() })
  close.setAttribute('aria-label', 'Fechar relatório')
  const header = el('header', {}, head, close)
  const scaleBtn = el('button', { type: 'button', onclick: () => { scale = scale === 4 ? 8 : 4; render() } })
  const rescan = el('button', { type: 'button', textContent: 'Varrer de novo', onclick: () => void run() })
  const notices = el('div', { className: 'pxa-audit-notices' })
  const body = el('div', { className: 'pxa-audit-body' })
  const foot = el('div', { className: 'pxa-audit-foot' })
  const box = el(
    'section',
    { className: 'pxa-window pxa-audit' },
    header,
    el('div', { className: 'pxa-audit-tools' }, scaleBtn, rescan),
    notices,
    body,
    foot,
  )
  box.setAttribute('aria-label', 'Relatório do Detector')
  box.style.display = 'none'
  ui.layer.append(box)
  makeDraggable(box, header) // DETE-11: tira a janela de cima do que o dev está olhando
  const boxes = createBoxes(ui, 'pxa-audit-hl')

  let open = false
  let scale: AuditScale = 4
  let result: ScanResult | null = null
  let report: AuditReport | null = null
  let scannedAt = ''
  let stale = false
  let hovered: Element[] = []
  let runId = 0

  function renderNotices() {
    const lines: string[] = []
    if (result?.truncated) lines.push(`Cortado em ${count(SCAN_LIMIT)} elementos.`)
    if (stale) lines.push('A página mudou. Varra de novo.')
    const fit = report && scaleNotice(report)
    if (fit) lines.push(fit)
    notices.replaceChildren(...lines.map((t) => el('p', { textContent: t })))
  }

  function row(kind: AuditKind, e: AuditEntry, elements: readonly Element[]) {
    // Índices → elementos só quando usados (hover/clique/Anotar): uma cor comum pode ter milhares.
    const targets = () => e.elements.map((i) => elements[i]!)
    let next = 0
    /** DETE-10: cada clique rola até o próximo elemento vivo que usa o valor. */
    const goToNext = () => {
      const alive = targets().filter((t) => t.isConnected)
      const target = alive[next++ % Math.max(1, alive.length)]
      if (!target) return
      target.scrollIntoView({ block: 'center', inline: 'nearest' })
      hovered = alive
    }
    const li = el(
      'li',
      { className: 'pxa-audit-row', onmouseenter: () => { hovered = targets() }, onmouseleave: () => { hovered = [] } },
      ...(kind === 'color' ? [swatch(e.value)] : []),
      el('button', { type: 'button', className: 'pxa-audit-value', textContent: e.value, title: `${e.value}: ir até o próximo elemento`, onclick: goToNext }),
      el('span', { className: 'pxa-audit-count', textContent: `${e.count}×` }),
      ...optional('pxa-audit-props', e.props?.join(', ')),
      ...optional('pxa-audit-props', e.variants && `também ${e.variants.join(', ')}`, 'Diferença imperceptível: conta como a mesma cor'),
      ...flagTexts(kind, e, scale).map((t) => el('span', { className: 'pxa-tag', textContent: t })),
      ...optional('pxa-audit-fix', e.suggestion && `→ ${e.suggestion}`), // sugestão só existe em Achado
    )
    li.dataset.value = e.value
    li.dataset.kind = kind
    if (isFinding(e)) {
      li.append(el('button', { type: 'button', className: 'pxa-audit-annotate', textContent: 'Anotar', onclick: () => actions.annotate(targets(), findingNote(kind, e, scale)) }))
    }
    return li
  }

  function render() {
    scaleBtn.textContent = `Escala: ${scale}px`
    report = result && buildAuditReport(result.samples, scale)
    renderNotices()
    if (!result || !report) return
    const { elements } = result
    const current = report
    head.textContent = auditHeadline(current)
    body.replaceChildren(
      ...KIND_LIST.flatMap((kind) => {
        const entries = AUDIT_KINDS[kind].entries(current)
        const findings = entries.filter(isFinding)
        const rest = entries.filter((e) => !isFinding(e))
        const rows = (list: AuditEntry[]) => el('ul', {}, ...list.map((e) => row(kind, e, elements)))
        // DETE-09: Achados à vista; seção sem Achado diz que está tudo certo; o resto recolhido.
        const top = findings.length ? rows(findings) : el('p', { className: 'pxa-audit-ok' }, circleCheck(), 'tudo certo')
        const more = rest.length ? [el('details', {}, el('summary', { textContent: plural(rest.length, 'valor sem problema', 'valores sem problema') }), rows(rest))] : []
        return [el('h3', { textContent: AUDIT_KINDS[kind].title }), top, ...more]
      }),
    )
    foot.textContent = `${count(elements.length)} elementos em ${Math.round(result.ms)} ms`
  }

  /** Cancela a varredura em andamento e solta a anterior (até 10.000 elementos) e as linhas. */
  function reset() {
    runId++
    hovered = []
    result = null
    report = null
    body.replaceChildren()
  }

  async function run() {
    reset()
    const id = runId
    stale = false
    head.textContent = 'Varrendo…'
    foot.textContent = ''
    renderNotices()
    const r = await scan({ onProgress: (n) => { if (id === runId) foot.textContent = `${count(n)} elementos lidos…` } })
    if (id !== runId || !open) return
    result = r
    scannedAt = routeKey()
    render()
  }

  function hide() {
    if (!open) return
    open = false
    reset() // reabrir varre de novo
    box.style.display = 'none'
    actions.onClose()
  }

  /** Lê os retângulos do destaque e percebe troca de rota; devolve a escrita (tick). */
  function measure(): () => void {
    const changedRoute = open && result !== null && !stale && routeKey() !== scannedAt
    const specs: BoxSpec[] = []
    for (let i = 0, n = Math.min(hovered.length, MAX_HIGHLIGHT_READS); i < n && specs.length < MAX_HIGHLIGHT; i++) {
      const target = hovered[i]!
      if (!target.isConnected) continue
      const r = target.getBoundingClientRect()
      if (inViewport(r)) specs.push(r)
    }
    return () => {
      if (changedRoute) {
        stale = true
        renderNotices()
      }
      boxes.draw(specs)
    }
  }

  return {
    async open() {
      open = true
      box.style.display = 'flex'
      await run()
    },
    hide,
    isOpen: () => open,
    measure,
  }
}
