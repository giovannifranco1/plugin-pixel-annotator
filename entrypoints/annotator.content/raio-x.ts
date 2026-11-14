import type { scanDocument } from './audit-scan'
import type { CaptureTab } from './screenshot'
import { createAuditReport } from './ui/audit-report'
import { el } from './ui/dom'
import type { UiHost } from './ui/host'
import { createLoupe, type LoupeDeps } from './ui/loupe'
import { showToast } from './ui/toast'

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

/** Barra Raio-X do Painel com as ferramentas Detector e Lupa. */
export function createRaioX(ui: UiHost, actions: RaioXActions, deps: RaioXDeps = {}) {
  /** "Anotar" um Achado: pula elementos que sumiram (e avisa) e limita a 5 alvos (DETE-05). */
  function annotateFinding(elements: Element[], note: string) {
    const alive = elements.filter((e) => e.isConnected)
    const gone = elements.length - alive.length
    if (gone) showToast(ui, gone === 1 ? '1 elemento sumiu da página' : `${gone} elementos sumiram da página`)
    if (alive.length) actions.annotate(alive.length > MAX_FINDING_ANNOTATIONS ? alive.slice(0, 1) : alive, note)
  }

  const report = createAuditReport(ui, { annotate: annotateFinding, onClose: sync }, { scan: deps.scan })
  const loupe = createLoupe(ui, { capture: deps.capture, decode: deps.decode, onOff: sync })

  const tool = (label: string, title: string, onclick: () => void) => el('button', { type: 'button', textContent: label, title, onclick: () => { onclick(); sync() } })
  const detector = tool('Detector', 'Listar cores, fontes e espaçamentos da página', () => {
    if (report.isOpen()) report.hide()
    else void report.open()
  })
  const loupeBtn = tool('Lupa', 'Zoom pixel com a cor em hex (clique copia, Esc sai)', () => loupe.setOn(!loupe.isOn()))
  const toolbar = el('div', { className: 'pxa-rx-bar' }, el('span', { className: 'pxa-rx-title', textContent: 'Raio-X' }), detector, loupeBtn)
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', 'Raio-X')

  function sync() {
    detector.setAttribute('aria-pressed', String(report.isOpen()))
    loupeBtn.setAttribute('aria-pressed', String(loupe.isOn()))
  }
  sync()

  return {
    toolbar,
    /** Leituras de todas as ferramentas; devolve as escritas (tick: ler tudo, depois escrever). */
    measure(): () => void {
      const writes = [report.measure(), loupe.measure()]
      return () => { for (const write of writes) write() }
    },
    /** Com a Lupa ligada o clique copia o hex e não vira anotação (LUPA-02). Devolve se consumiu o clique. */
    pick(): boolean {
      if (!loupe.isOn()) return false
      void loupe.copy()
      return true
    },
    /** Desliga tudo (saída do Modo Anotação). */
    reset() {
      report.hide()
      loupe.setOn(false)
      sync()
    },
  }
}
