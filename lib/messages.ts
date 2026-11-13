export type PxaMessage = { type: 'pxa:toggle' } | { type: 'pxa:capture' }
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
