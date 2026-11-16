import { createStore, type AnnotationDraft, type AnnotationStore } from '@/lib/store'
import { locate, resolveAnnotation } from '@/lib/resolve'
import { categoryOf } from '@/lib/viewport'
import { ERROR_WINDOW_MS, type PxaMessage } from '@/lib/messages'
import { hostOf, plural } from '@/lib/format'
import { readImportFile } from '@/lib/import'
import type { PageError } from '@/lib/types'
import { probeErrors } from './probe-client'
import { openDrawEditor } from './ui/draw-editor'
import { openPresentation } from './ui/presentation'
import { captureContext } from './capture'
import { createDefaultStyle } from './default-style'
import { copyMarkdown, exportZip } from './exporter'
import { installInterceptor } from './interceptor'
import { startTick } from './tick'
import { installUnloadGuard } from './unload-guard'
import { createRaioX, type RaioXDeps } from './raio-x'
import { createHost, type UiHost } from './ui/host'
import { createMarkers } from './ui/markers'
import { openNoteEditor } from './ui/note-editor'
import { createOverlay } from './ui/overlay'
import { createPanel } from './ui/panel'
import { createFun } from './ui/fun'
import { showToast } from './ui/toast'

export type ControllerState = 'inactive' | 'active' | 'editing' | 'capturing' | 'presenting'

export interface ControllerDeps {
  ui?: UiHost
  store?: AnnotationStore
  capture?: (el: Element, note: string) => Promise<AnnotationDraft>
  raioX?: RaioXDeps
  /** Aviso nativo de saída com algo não exportado. Desligado quando as anotações são salvas no site (PERS-01). */
  unloadGuard?: boolean
  /** Erros de console/rede do momento (ERRO-03); padrão: pedido ao probe. */
  errors?: () => Promise<PageError[]>
}

const FOCUS_HIGHLIGHT_MS = 1500
/** Chave (sessionStorage) com o id da anotação a refocar depois de navegar até a rota dela. */
const PENDING_FOCUS_KEY = 'pxa:pending-focus'
/** Após navegar, o elemento pode só existir depois da hidratação: tenta reencontrá-lo por até tanto tempo. */
const PENDING_FOCUS_TIMEOUT_MS = 8000
const PENDING_FOCUS_RETRY_MS = 150
/** Painel aberto cobriria a página no mobile: recolhe sozinho nessa categoria de tela. */
const isMobile = () => categoryOf(innerWidth) === 'mobile'

/**
 * Máquina de estados do Modo Anotação (ANOT-01..08). Anotações vivem no store (salvo no site pelo
 * index.ts, PERS-01); desativar o modo só esconde a UI (ANOT-02).
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
  const recentErrors = deps.errors ?? (() => probeErrors(ERROR_WINDOW_MS))

  let state: ControllerState = 'inactive'
  let teardown: Array<() => void> = []
  let editor: { close(): void } | null = null // editor de nota, de Desenho ou a Apresentação
  let focusTimer: ReturnType<typeof setTimeout> | undefined
  let pendingFocusTimer: ReturnType<typeof setTimeout> | undefined

  /** Abre o editor de nota; `onSaved` decide o que fazer com a nota (e os erros que sobraram) confirmada. */
  function openEditor(
    anchor: DOMRect,
    initial: string | undefined,
    errors: PageError[] | Promise<PageError[]>,
    onSaved: (note: string, errors: PageError[]) => void,
  ) {
    editor?.close()
    state = 'editing'
    editor = openNoteEditor(ui, {
      anchor,
      initial,
      errors,
      onCancel() {
        editor = null
        if (state === 'editing') state = 'active'
      },
      onSave(note, kept) {
        editor = null
        onSaved(note, kept ?? [])
      },
    })
  }

  function onPick(el: Element) {
    if (state !== 'active') return
    if (panel.closeMenu()) return // clique fora do menu aberto só fecha o menu
    if (raioX.pick()) return
    overlay.highlight(el)
    // Pedido no clique (não no Enter): o editor mostra os erros para o dev remover (ERRO-04).
    openEditor(el.getBoundingClientRect(), undefined, recentErrors().catch(() => []), (note, errors) => void save(el, note, errors))
  }

  /** Uma nota pré-preenchida (editável) para vários elementos: um print por elemento ao salvar (Raio-X). */
  function annotateElements(targets: Element[], note: string) {
    const first = targets[0]
    if (state !== 'active' || !first) return
    first.scrollIntoView({ block: 'center', inline: 'nearest' })
    overlay.highlight(first)
    // Os erros do momento valem para o lote todo, como numa anotação comum (ERRO-03/ERRO-04).
    openEditor(first.getBoundingClientRect(), note, recentErrors().catch(() => []), async (final, errors) => {
      for (const t of targets) {
        if (state === 'inactive') break
        if (t.isConnected) await save(t, final, errors)
      }
    })
  }

  async function save(el: Element, note: string, errors: PageError[]) {
    state = 'capturing'
    overlay.hide()
    try {
      store.add({ ...(await capture(el, note)), errors }, el)
    } catch {
      showToast(ui, 'Falha ao anotar')
    } finally {
      if (state === 'capturing') state = 'active'
    }
  }

  /** Rola até o elemento e o destaca por um instante (foco de uma anotação, PAIN-02). */
  function focusElement(el: Element) {
    el.scrollIntoView({ block: 'center', inline: 'nearest' })
    overlay.highlight(el)
    clearTimeout(focusTimer)
    focusTimer = setTimeout(() => {
      if (overlay.current() === el && state === 'active') overlay.hide()
    }, FOCUS_HIGHLIGHT_MS)
  }

  /** Guarda o foco pendente e pede ao background para abrir a URL e reativar o PxA ao carregar. */
  function navigateToAnnotation(id: string, url: string) {
    try { sessionStorage.setItem(PENDING_FOCUS_KEY, id) } catch { /* sem sessionStorage: segue sem refoco */ }
    showToast(ui, 'Abrindo a página da anotação…')
    void Promise.resolve(browser.runtime.sendMessage({ type: 'pxa:navigate', url } satisfies PxaMessage)).catch(() => {})
  }

  /** Depois de navegar por uma anotação de outra rota: refoca quando o elemento aparecer (pode hidratar tarde). */
  function focusPendingAfterNavigation() {
    let id: string | null = null
    try { id = sessionStorage.getItem(PENDING_FOCUS_KEY) } catch { /* sem sessionStorage */ }
    if (!id) return
    try { sessionStorage.removeItem(PENDING_FOCUS_KEY) } catch { /* idem */ }
    if (!store.get(id)) return
    const target = id
    const started = Date.now()
    const attempt = () => {
      if (state !== 'active') return
      const el = resolveAnnotation(store, target)
      if (el) return focusElement(el)
      if (Date.now() - started >= PENDING_FOCUS_TIMEOUT_MS) return void showToast(ui, 'elemento não encontrado nesta tela')
      pendingFocusTimer = setTimeout(attempt, PENDING_FOCUS_RETRY_MS)
    }
    attempt()
  }

  const raioX = createRaioX(ui, { annotate: annotateElements, onToolsChange: () => panel.syncTools() }, deps.raioX)
  const panel = createPanel(ui, store, {
    onFocus(id) {
      const where = locate(store, id)
      if (where instanceof Element) return focusElement(where)
      // Anotação de outra rota: vai até a URL onde foi anotada e refoca quando a página carregar.
      const a = store.get(id)
      if (where === 'other-route' && a?.url && a.url !== location.href) return navigateToAnnotation(id, a.url)
      showToast(ui, 'elemento não encontrado nesta tela')
    },
    onEdit(id) {
      const a = store.get(id)
      if (!a || state !== 'active') return
      const anchor = resolveAnnotation(store, id)?.getBoundingClientRect() ?? new DOMRect(Math.max(8, innerWidth - 680), 80, 0, 0)
      openEditor(anchor, a.note, a.errors ?? [], (note, errors) => {
        store.update(id, { note, errors })
        if (state === 'editing') state = 'active'
      })
    },
    onPresent,
    onDraw,
    onImport: (file) => void importZip(file),
    onDelete: (id) => store.remove(id),
    onExportZip: () => void exportZip(ui, store).then((ok) => ok && fun.exported('zip')),
    onCopyMarkdown: () => void copyMarkdown(ui, store).then((ok) => ok && fun.exported('markdown')),
    onClearAll: () => store.clear(),
  }, raioX.tools)

  const fun = createFun(ui, store, panel.mount)
  if (deps.unloadGuard ?? true) installUnloadGuard(store)

  /** Modo Apresentação (APRE-01..06): hover/clique de anotar ignoram estados fora de `active`. */
  function onPresent() {
    if (state !== 'active' || store.list().length === 0) return
    state = 'presenting'
    overlay.hide()
    editor = openPresentation(ui, store, {
      onClose() {
        editor = null
        if (state === 'presenting') state = 'active'
      },
    })
  }

  /** Editor de Desenho sobre o print (DESE-01..05). */
  function onDraw(id: string) {
    const a = store.get(id)
    if (!a?.shot || state !== 'active') return
    const back = () => {
      editor = null
      if (state === 'editing') state = 'active'
    }
    state = 'editing'
    editor = openDrawEditor(ui, {
      shot: a.shot,
      drawing: a.drawing,
      dpr: a.viewport.dpr,
      onCancel: back,
      onSave(drawing) {
        back()
        store.update(id, { drawing })
      },
    })
  }

  /** Importar .zip de outro PxA (IMPO-02..07). */
  async function importZip(file: File) {
    const result = await readImportFile(file)
    if (!result.ok) return showToast(ui, result.error, 5000)
    const added = store.importAnnotations(result.annotations, result.origin)
    if (added === 0) return showToast(ui, 'Nada novo: essas anotações já estão aqui.')
    const foreign = result.origin !== location.origin ? ` · anotações de ${hostOf(result.origin)}` : '' // IMPO-04
    showToast(ui, `${plural(added, 'anotação importada', 'anotações importadas')}${foreign}`, foreign ? 5000 : 2500)
  }

  function activate() {
    state = 'active'
    panel.show()
    panel.autoCollapse(isMobile())
    focusPendingAfterNavigation() // reativado após navegar por uma anotação: refoca o elemento
    teardown = [
      fun.activate(), // antes do interceptor: ele interrompe os eventos na captura em window
      installInterceptor(ui, {
        onHover: (el) => { if (state === 'active') overlay.highlight(el) },
        onPick,
      }),
      startTick(() => {
        panel.autoCollapse(isMobile())
        // Todas as leituras de layout primeiro, depois todas as escritas: no máximo um layout por frame.
        const writes = [overlay.measure(), markers.measure(), raioX.measure()]
        for (const write of writes) write()
      }),
      () => clearTimeout(focusTimer),
      () => clearTimeout(pendingFocusTimer),
    ]
  }

  function deactivate() {
    state = 'inactive'
    editor?.close()
    editor = null
    for (const undo of teardown.splice(0)) undo()
    raioX.reset()
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
