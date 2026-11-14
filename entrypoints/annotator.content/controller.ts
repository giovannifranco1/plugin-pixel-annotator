import { createStore, type AnnotationDraft, type AnnotationStore } from '@/lib/store'
import { resolveAnnotation } from '@/lib/resolve'
import { categoryOf } from '@/lib/viewport'
import { captureContext } from './capture'
import { createDefaultStyle } from './default-style'
import { copyMarkdown, exportZip } from './exporter'
import { installInterceptor } from './interceptor'
import { startTick } from './tick'
import { installUnloadGuard } from './unload-guard'
import { createHost, type UiHost } from './ui/host'
import { createMarkers } from './ui/markers'
import { openNoteEditor } from './ui/note-editor'
import { createOverlay } from './ui/overlay'
import { createPanel } from './ui/panel'
import { createFun } from './ui/fun'
import { showToast } from './ui/toast'

export type ControllerState = 'inactive' | 'active' | 'editing' | 'capturing'

export interface ControllerDeps {
  ui?: UiHost
  store?: AnnotationStore
  capture?: (el: Element, note: string) => Promise<AnnotationDraft>
}

const FOCUS_HIGHLIGHT_MS = 1500
/** Painel aberto cobriria a página no mobile: recolhe sozinho nessa categoria de tela. */
const isMobile = () => categoryOf(innerWidth) === 'mobile'

/**
 * Máquina de estados do Modo Anotação (ANOT-01..08). Anotações vivem no store enquanto a aba
 * existir; desativar o modo só esconde a UI (ANOT-02).
 * Os `if (state === X) state = 'active'` são compare-and-set: um callback tardio (captura ou
 * editor fechado pelo toggle) não reativa o modo depois de desligado.
 */
export function createController(deps: ControllerDeps = {}) {
  const ui = deps.ui ?? createHost()
  const store = deps.store ?? createStore()
  const defaultStyle = createDefaultStyle(ui)
  const capture = deps.capture ?? ((el: Element, note: string) => captureContext(el, note, { ui, defaultStyle }))
  const overlay = createOverlay(ui)
  const markers = createMarkers(ui, store)

  let state: ControllerState = 'inactive'
  let teardown: Array<() => void> = []
  let editor: { close(): void } | null = null
  let focusTimer: ReturnType<typeof setTimeout> | undefined

  /** Abre o editor de nota; `onSaved` decide o que fazer com a nota confirmada. */
  function openEditor(anchor: DOMRect, initial: string | undefined, onSaved: (note: string) => void) {
    editor?.close()
    state = 'editing'
    editor = openNoteEditor(ui, {
      anchor,
      initial,
      onCancel() {
        editor = null
        if (state === 'editing') state = 'active'
      },
      onSave(note) {
        editor = null
        onSaved(note)
      },
    })
  }

  function onPick(el: Element) {
    if (state !== 'active') return
    overlay.highlight(el)
    openEditor(el.getBoundingClientRect(), undefined, (note) => void save(el, note))
  }

  async function save(el: Element, note: string) {
    state = 'capturing'
    overlay.hide()
    try {
      store.add(await capture(el, note), el)
    } catch {
      showToast(ui, 'Falha ao anotar')
    } finally {
      if (state === 'capturing') state = 'active'
    }
  }

  const panel = createPanel(ui, store, {
    onFocus(id) {
      const el = resolveAnnotation(store, id)
      if (!el) return showToast(ui, 'elemento não encontrado nesta tela')
      el.scrollIntoView({ block: 'center', inline: 'nearest' })
      overlay.highlight(el)
      clearTimeout(focusTimer)
      focusTimer = setTimeout(() => {
        if (overlay.current() === el && state === 'active') overlay.hide()
      }, FOCUS_HIGHLIGHT_MS)
    },
    onEdit(id) {
      const a = store.get(id)
      if (!a || state !== 'active') return
      const anchor = resolveAnnotation(store, id)?.getBoundingClientRect() ?? new DOMRect(Math.max(8, innerWidth - 680), 80, 0, 0)
      openEditor(anchor, a.note, (note) => {
        store.updateNote(id, note)
        if (state === 'editing') state = 'active'
      })
    },
    onDelete: (id) => store.remove(id),
    onExportZip: () => void exportZip(ui, store).then((ok) => ok && fun.exported('zip')),
    onCopyMarkdown: () => void copyMarkdown(ui, store).then((ok) => ok && fun.exported('markdown')),
    onClearAll: () => store.clear(),
  })

  const fun = createFun(ui, store, panel.mount)
  installUnloadGuard(store)

  function activate() {
    state = 'active'
    panel.show()
    panel.autoCollapse(isMobile())
    teardown = [
      fun.activate(), // antes do interceptor: ele interrompe os eventos na captura em window
      installInterceptor(ui, {
        onHover: (el) => { if (state === 'active') overlay.highlight(el) },
        onPick,
      }),
      startTick(() => {
        panel.autoCollapse(isMobile())
        // Todas as leituras de layout primeiro, depois todas as escritas: no máximo um layout por frame.
        const writes = [overlay.measure(), markers.measure()]
        for (const write of writes) write()
      }),
      () => clearTimeout(focusTimer),
    ]
  }

  function deactivate() {
    state = 'inactive'
    editor?.close()
    editor = null
    for (const undo of teardown.splice(0)) undo()
    overlay.hide()
    markers.hideAll()
    panel.hide()
  }

  return {
    toggle() {
      if (state === 'inactive') activate()
      else deactivate()
    },
    isActive: () => state !== 'inactive',
    state: () => state,
    store,
  }
}
