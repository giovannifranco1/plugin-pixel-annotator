export type PxaMessage = { type: 'pxa:toggle' } | { type: 'pxa:capture' }
export type CaptureResponse = { dataUrl: string } | { error: string }

export const ANNOTATOR_FILE = '/content-scripts/annotator.js'
export const PROBE_FILE = '/component-probe.js'
export const DEFAULT_TITLE = 'PixelAnnotator'
export const BLOCKED_TITLE = 'PxA não pode anotar esta página'
