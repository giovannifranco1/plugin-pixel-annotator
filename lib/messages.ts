export type PxaMessage =
  | { type: 'pxa:toggle' }
  | { type: 'pxa:capture' }
  // Anotação de outra rota: o content pede para o background navegar a aba até `url` e reativar o
  // PxA quando a nova página carregar (o content não sobrevive à navegação).
  | { type: 'pxa:navigate'; url: string }
export type ToggleResponse = { active: boolean }
export type CaptureResponse = { dataUrl: string } | { error: string }

export const ANNOTATOR_FILE = '/content-scripts/annotator.js'
export const PROBE_FILE = '/component-probe.js'
export const DEFAULT_TITLE = 'PixelAnnotator'
export const BLOCKED_TITLE = 'PxA não pode anotar esta página'

// Ponte isolated ↔ main world (probe de componente). Os dois lados importam daqui.
export const PROBE_REQUEST = 'pxa:probe-request'
export const PROBE_RESPONSE = 'pxa:probe-response'
export const PROBE_ATTR = 'data-pxa-probe'

// Registro de erros do probe (ERRO-01..03). Mesma ponte de CustomEvent com JSON em string.
export const ERRORS_REQUEST = 'pxa:errors-request'
export const ERRORS_RESPONSE = 'pxa:errors-response'
/** Janela dos erros anexados a uma Anotação, contada a partir do clique de anotar. */
export const ERROR_WINDOW_MS = 60_000
