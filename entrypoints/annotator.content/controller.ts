import { createStore, type AnnotationDraft, type AnnotationStore } from '@/lib/store'
import { resolveElement } from '@/lib/resolve'
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
import { showToast } from './ui/toast'

export type ControllerState = 'inactive' | 'active' | 'editing' | 'capturing'

export interface ControllerDeps {
  ui?: UiHost
  store?: AnnotationStore
  capture?: (el: Element, note: string) => Promise<AnnotationDraft>
}

const FOCUS_HIGHLIGHT_MS = 1500
/** Abaixo disto (categoria mobile) o painel aberto cobriria a página: começa recolhido. */
const COLLAPSE_BELOW = 768

/**
 * Máquina de estados do Modo Anotação (ANOT-01..08). Anotações vivem no store enquanto a aba
 * existir; desativar o modo só esconde a UI (ANOT-02).
 */
export function createController(deps: ControllerDeps = {}) {
  const ui = deps.ui ?? createHost()
  const store = deps.store ?? createStore()
  const defaultStyle = createDefaultStyle(ui)
  const capture = deps.capture ?? ((el: Element, note: string) => captureContext(el, note, { ui, defaultStyle }))
  const overlay = createOverlay(ui)
  const markers = createMarkers(ui, store)

  let state: ControllerState = 'inactive'
  let uninstall: (() => void) | null = null
  let stopTick: (() => void) | null = null
  let editor: { close(): void } | null = null
  let focusTimer: ReturnType<typeof setTimeout> | undefined

  const isOn = () => state !== 'inactive'

  function resolve(id: string): Element | null {
    const a = store.get(id)
    return a ? resolveElement(a, store.refOf(id), location.pathname, document) : null
  }

  function closeEditor() {
    editor?.close()
    editor = null
  }

  function onPick(el: Element) {
    if (state !== 'active') return
    state = 'editing'
    overlay.highlight(el)
    editor = openNoteEditor(ui, {
      anchor: el.getBoundingClientRect(),
      onCancel() {
        editor = null
        if (state === 'editing') state = 'active'
      },
      onSave(note) {
        editor = null
        void save(el, note)
      },
    })
  }

  async function save(el: Element, note: string) {
    state = 'capturing'
    overlay.hide()
    try {
      const draft = await capture(el, note)
      store.add(draft, el)
    } catch {
      showToast(ui, 'Falha ao anotar')
    } finally {
      if (state === 'capturing') state = 'active'
    }
  }

  const panel = createPanel(ui, store, {
    onFocus(id) {
      const el = resolve(id)
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
      closeEditor()
      const el = resolve(id)
      const anchor = el?.getBoundingClientRect() ?? new DOMRect(Math.max(8, innerWidth - 680), 80, 0, 0)
      state = 'editing'
      editor = openNoteEditor(ui, {
        anchor,
        initial: a.note,
        onCancel() {
          editor = null
          if (state === 'editing') state = 'active'
        },
        onSave(note) {
          editor = null
          store.updateNote(id, note)
          if (state === 'editing') state = 'active'
        },
      })
    },
    onDelete: (id) => store.remove(id),
    onExportZip: () => void exportZip(ui, store),
    onCopyMarkdown: () => void copyMarkdown(ui, store),
    onClearAll: () => store.clear(),
  })

  installUnloadGuard(store)

  function activate() {
    state = 'active'
    uninstall = installInterceptor(ui, {
      onHover: (el) => { if (state === 'active') overlay.highlight(el) },
      onPick,
    })
    panel.setCollapsed(innerWidth < COLLAPSE_BELOW)
    panel.show()
    stopTick = startTick(() => {
      overlay.update()
      markers.update()
    })
  }

  function deactivate() {
    state = 'inactive'
    closeEditor()
    uninstall?.()
    uninstall = null
    stopTick?.()
    stopTick = null
    clearTimeout(focusTimer)
    overlay.hide()
    markers.hideAll()
    panel.hide()
  }

  return {
    toggle() {
      if (isOn()) deactivate()
      else activate()
    },
    isActive: isOn,
    state: () => state,
    store,
  }
}

export type Controller = ReturnType<typeof createController>
