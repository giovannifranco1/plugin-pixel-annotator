import { auditHeadline, buildAuditReport, findingNote, type AuditEntry, type AuditKind, type AuditReport, type AuditScale } from '@/lib/design-audit'
import { scanDocument, SCAN_LIMIT, type ScanResult } from '../audit-scan'
import { createBoxes, type BoxSpec } from './boxes'
import type { UiHost } from './host'
import { el } from './dom'

export interface AuditReportActions {
  annotate(elements: Element[], note: string): void
  onClose(): void
}

/** Teto de caixas do destaque por hover (DETE-04). */
const MAX_HIGHLIGHT = 300

const SECTIONS: Array<{ kind: AuditKind; title: string; pick(r: AuditReport): AuditEntry[] }> = [
  { kind: 'color', title: 'Cores', pick: (r) => r.colors },
  { kind: 'font', title: 'Fontes', pick: (r) => r.fonts },
  { kind: 'spacing', title: 'Espaçamentos', pick: (r) => r.spacings },
]

const tagText = (e: AuditEntry, scale: number) =>
  e.flags.map((f) => (f === 'off-scale' ? `fora da escala de ${scale}px` : f === 'similar' ? `parecida com ${e.similarTo}` : 'órfã'))

const routeKey = () => location.href

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
  const scaleBtn = el('button', { type: 'button', onclick: () => setScale(scale === 4 ? 8 : 4) })
  const rescan = el('button', { type: 'button', textContent: 'Varrer de novo', onclick: () => void run() })
  const notices = el('div', { className: 'pxa-audit-notices' })
  const body = el('div', { className: 'pxa-audit-body' })
  const foot = el('div', { className: 'pxa-audit-foot' })
  const box = el(
    'section',
    { className: 'pxa-audit' },
    el('header', {}, head, close),
    el('div', { className: 'pxa-audit-tools' }, scaleBtn, rescan),
    notices,
    body,
    foot,
  )
  box.setAttribute('aria-label', 'Relatório do Detector')
  box.style.display = 'none'
  ui.layer.append(box)
  const boxes = createBoxes(ui, 'pxa-audit-hl')

  let open = false
  let scale: AuditScale = 4
  let result: ScanResult | null = null
  let report: AuditReport | null = null
  let scannedAt = ''
  let stale = false
  let hovered: Element[] = []
  let runId = 0

  function setScale(next: AuditScale) {
    scale = next
    render()
  }

  function renderNotices() {
    const lines: string[] = []
    if (result?.truncated) lines.push(`Cortado em ${SCAN_LIMIT.toLocaleString('pt-BR')} elementos.`)
    if (stale) lines.push('A página mudou. Varra de novo.')
    notices.replaceChildren(...lines.map((t) => el('p', { textContent: t })))
  }

  function row(kind: AuditKind, e: AuditEntry, elements: Element[]) {
    const targets = e.elements.map((i) => elements[i]!)
    const li = el(
      'li',
      { className: 'pxa-audit-row', onmouseenter: () => { hovered = targets }, onmouseleave: () => { hovered = [] } },
      ...(kind === 'color' ? [swatch(e.value)] : []),
      el('span', { className: 'pxa-audit-value', textContent: e.value, title: e.value }),
      el('span', { className: 'pxa-audit-count', textContent: `${e.count}×` }),
      ...tagText(e, scale).map((t) => el('span', { className: 'pxa-tag', textContent: t })),
    )
    li.dataset.value = e.value
    if (e.flags.length) {
      li.append(el('button', { type: 'button', className: 'pxa-audit-annotate', textContent: 'Anotar', onclick: () => actions.annotate(targets, findingNote(kind, e, scale)) }))
    }
    return li
  }

  function render() {
    scaleBtn.textContent = `Escala: ${scale}px`
    renderNotices()
    if (!result) return
    report = buildAuditReport(result.samples, scale)
    const elements = result.elements
    head.textContent = auditHeadline(report)
    body.replaceChildren(
      ...SECTIONS.flatMap(({ kind, title, pick }) => {
        const entries = pick(report!)
        return [el('h3', { textContent: title }), el('ul', {}, ...entries.map((e) => row(kind, e, elements)))]
      }),
    )
    foot.textContent = `${elements.length.toLocaleString('pt-BR')} elementos em ${Math.round(result.ms)} ms`
  }

  async function run() {
    const id = ++runId
    hovered = []
    stale = false
    result = null
    head.textContent = 'Varrendo…'
    body.replaceChildren()
    foot.textContent = ''
    renderNotices()
    const r = await scan({ onProgress: (n) => { if (id === runId) foot.textContent = `${n.toLocaleString('pt-BR')} elementos lidos…` } })
    if (id !== runId || !open) return
    result = r
    scannedAt = routeKey()
    render()
  }

  function hide() {
    if (!open) return
    open = false
    runId++
    hovered = []
    box.style.display = 'none'
    actions.onClose()
  }

  /** Lê os retângulos do destaque e percebe troca de rota; devolve a escrita (tick). */
  function measure(): () => void {
    const changedRoute = open && result !== null && !stale && routeKey() !== scannedAt
    const specs: BoxSpec[] = []
    for (const target of hovered) {
      if (specs.length >= MAX_HIGHLIGHT) break
      if (!target.isConnected) continue
      const r = target.getBoundingClientRect()
      if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue
      specs.push({ left: r.left, top: r.top, width: r.width, height: r.height })
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
