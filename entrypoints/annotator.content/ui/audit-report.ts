import { intersectsViewport } from '@/lib/crop'
import { auditHeadline, buildAuditReport, findingNote, flagTexts, type AuditEntry, type AuditKind, type AuditReport, type AuditScale } from '@/lib/design-audit'
import { scanDocument, SCAN_LIMIT, type ScanResult } from '../audit-scan'
import { createBoxes, type BoxSpec } from './boxes'
import type { UiHost } from './host'
import { el } from './dom'

export interface AuditReportActions {
  annotate(elements: Element[], note: string): void
  onClose(): void
}

/** Destaque do hover (DETE-04): no máximo 300 caixas, lendo no máximo 2.000 elementos por frame. */
const MAX_HIGHLIGHT = 300
const MAX_HIGHLIGHT_READS = 2000

const SECTIONS: Array<{ kind: AuditKind; title: string; pick(r: AuditReport): AuditEntry[] }> = [
  { kind: 'color', title: 'Cores', pick: (r) => r.colors },
  { kind: 'font-size', title: 'Tamanhos de fonte', pick: (r) => r.fontSizes },
  { kind: 'font-family', title: 'Famílias', pick: (r) => r.families },
  { kind: 'spacing', title: 'Espaçamentos', pick: (r) => r.spacings },
]

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
  const scaleBtn = el('button', { type: 'button', onclick: () => { scale = scale === 4 ? 8 : 4; render() } })
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
  let scannedAt = ''
  let stale = false
  /** Fração dos espaçamentos na escala atual (aviso abaixo de 50%). */
  let scaleFit = 1
  let hovered: Element[] = []
  let runId = 0

  function renderNotices() {
    const lines: string[] = []
    if (result?.truncated) lines.push(`Cortado em ${SCAN_LIMIT.toLocaleString('pt-BR')} elementos.`)
    if (stale) lines.push('A página mudou. Varra de novo.')
    if (scaleFit < 0.5) lines.push(`Só ${Math.round(scaleFit * 100)}% dos espaçamentos seguem a escala de ${scale}px: a página talvez use outra escala.`)
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
      ...(e.props?.length ? [el('span', { className: 'pxa-audit-props', textContent: e.props.join(', ') })] : []),
      ...flagTexts(kind, e, scale).map((t) => el('span', { className: 'pxa-tag', textContent: t })),
    )
    li.dataset.value = e.value
    li.dataset.kind = kind
    if (e.flags.length) {
      li.append(el('button', { type: 'button', className: 'pxa-audit-annotate', textContent: 'Anotar', onclick: () => actions.annotate(targets(), findingNote(kind, e, scale)) }))
    }
    return li
  }

  function render() {
    scaleBtn.textContent = `Escala: ${scale}px`
    const report = result && buildAuditReport(result.samples, scale)
    scaleFit = report?.scaleFit ?? 1
    renderNotices()
    if (!result || !report) return
    const elements = result.elements
    head.textContent = auditHeadline(report)
    body.replaceChildren(
      ...SECTIONS.flatMap(({ kind, title, pick }) => {
        const entries = pick(report)
        const findings = entries.filter((e) => e.flags.length)
        const rest = entries.filter((e) => !e.flags.length)
        const rows = (list: AuditEntry[]) => el('ul', {}, ...list.map((e) => row(kind, e, elements)))
        // DETE-09: Achados à vista, o resto recolhido.
        const more = rest.length
          ? [el('details', {}, el('summary', { textContent: rest.length === 1 ? '1 outro valor' : `${rest.length} outros valores` }), rows(rest))]
          : []
        return [el('h3', { textContent: title }), rows(findings), ...more]
      }),
    )
    foot.textContent = `${elements.length.toLocaleString('pt-BR')} elementos em ${Math.round(result.ms)} ms`
  }

  async function run() {
    const id = ++runId
    hovered = []
    stale = false
    result = null
    scaleFit = 1
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
    // Solta a varredura (até 10.000 elementos) e as linhas: reabrir varre de novo.
    result = null
    body.replaceChildren()
    box.style.display = 'none'
    actions.onClose()
  }

  /** Lê os retângulos do destaque e percebe troca de rota; devolve a escrita (tick). */
  function measure(): () => void {
    const changedRoute = open && result !== null && !stale && routeKey() !== scannedAt
    const specs: BoxSpec[] = []
    for (const target of hovered.slice(0, MAX_HIGHLIGHT_READS)) {
      if (specs.length >= MAX_HIGHLIGHT) break
      if (!target.isConnected) continue
      const r = target.getBoundingClientRect()
      if (intersectsViewport(r, innerWidth, innerHeight)) specs.push({ left: r.left, top: r.top, width: r.width, height: r.height })
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
