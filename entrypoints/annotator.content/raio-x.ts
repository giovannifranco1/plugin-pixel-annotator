import type { scanDocument } from './audit-scan'
import type { CaptureTab } from './screenshot'
import { createAuditReport } from './ui/audit-report'
import { el } from './ui/dom'
import { createGrid } from './ui/grid'
import type { UiHost } from './ui/host'
import { createLoupe, type LoupeDeps } from './ui/loupe'
import { showToast } from './ui/toast'
import { createXray } from './ui/xray'

export interface RaioXActions {
  /** Abre a nota pré-preenchida e cria uma anotação por alvo ao salvar. */
  annotate(targets: Element[], note: string): void
}

/** DETE-05: acima disso, uma anotação só no primeiro elemento (a nota já traz a contagem). */
const MAX_FINDING_ANNOTATIONS = 5

export interface RaioXDeps {
  scan?: typeof scanDocument
  capture?: CaptureTab
  decode?: LoupeDeps['decode']
}

/** Resultado do clique na página com o Raio-X ligado. */
type RaioXPick = { handled: true } | { target: Element; note: string } | null

/** Barra Raio-X do Painel e as quatro ferramentas: Detector, X-ray, Grade e Lupa. */
export function createRaioX(ui: UiHost, actions: RaioXActions, deps: RaioXDeps = {}) {
  const status = el('span', { className: 'pxa-rx-status' })

  /** "Anotar" um Achado: pula elementos que sumiram (e avisa) e limita a 5 alvos (DETE-05). */
  function annotateFinding(elements: Element[], note: string) {
    const alive = elements.filter((e) => e.isConnected)
    const gone = elements.length - alive.length
    if (gone) showToast(ui, gone === 1 ? '1 elemento sumiu da página' : `${gone} elementos sumiram da página`)
    if (alive.length) actions.annotate(alive.length > MAX_FINDING_ANNOTATIONS ? alive.slice(0, 1) : alive, note)
  }

  const report = createAuditReport(ui, { annotate: annotateFinding, onClose: sync }, { scan: deps.scan })
  const xray = createXray(ui, { onNotice: (text) => { status.textContent = text ?? '' } })
  const grid = createGrid(ui)
  const loupe = createLoupe(ui, { capture: deps.capture, decode: deps.decode, onOff: sync })

  const tool = (label: string, title: string, onclick: () => void) => el('button', { type: 'button', textContent: label, title, onclick: () => { onclick(); sync() } })
  const detector = tool('Detector', 'Listar cores, fontes e espaçamentos da página', () => {
    if (report.isOpen()) report.hide()
    else void report.open()
  })
  const xrayBtn = tool('X-ray', 'Contornar elementos e destacar os que vazam', () => xray.setOn(!xray.isOn()))
  const gridBtn = tool('Grade', 'Grade de 8px / 4px e linha de base', () => grid.cycle())
  const loupeBtn = tool('Lupa', 'Zoom pixel com a cor em hex (clique copia, Esc sai)', () => loupe.setOn(!loupe.isOn()))
  const toolbar = el('div', { className: 'pxa-rx-bar' }, el('span', { className: 'pxa-rx-title', textContent: 'Raio-X' }), detector, xrayBtn, gridBtn, loupeBtn, status)
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', 'Raio-X')

  function sync() {
    detector.setAttribute('aria-pressed', String(report.isOpen()))
    xrayBtn.setAttribute('aria-pressed', String(xray.isOn()))
    gridBtn.setAttribute('aria-pressed', String(grid.step() !== 0))
    gridBtn.textContent = grid.step() ? `Grade ${grid.step()}px` : 'Grade'
    loupeBtn.setAttribute('aria-pressed', String(loupe.isOn()))
  }
  sync()

  return {
    toolbar,
    /** Leituras de todas as ferramentas; devolve as escritas (tick: ler tudo, depois escrever). */
    measure(): () => void {
      const writes = [report.measure(), xray.measure(), grid.measure(), loupe.measure()]
      return () => { for (const write of writes) write() }
    },
    /** Lupa consome o clique (LUPA-02); X-ray devolve alvo + nota do vermelho (XRAY-04); senão, fluxo normal (XRAY-05). */
    pick(target: Element): RaioXPick {
      if (loupe.isOn()) {
        void loupe.copy()
        return { handled: true }
      }
      return xray.isOn() ? xray.pickLeak(target) : null
    },
    /** Desliga tudo (saída do Modo Anotação). */
    reset() {
      report.hide()
      xray.setOn(false)
      grid.off()
      loupe.setOn(false)
      sync()
    },
  }
}
