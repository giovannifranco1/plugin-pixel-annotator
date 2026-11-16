import changelogText from '@/CHANGELOG.md?raw'
import { formatDate, hasNews, inlineParts, parseChangelog, type ChangelogEntry } from '@/lib/changelog'
import { createProfileStorage, type ProfileStorage } from '../profile-storage'
import { captureKeys, el } from './dom'
import { makeDraggable } from './draggable'
import type { UiHost } from './host'

export interface ChangelogDeps {
  storage?: ProfileStorage
  /** Versão instalada; padrão: a do manifest (o WXT copia do package.json). */
  version?: string
  /** Conteúdo do CHANGELOG.md; padrão: o arquivo da raiz, embutido no build. */
  text?: string
  /** O ponto de novidade acendeu ou apagou (NOVI-09/10/11). */
  onNewsChange?(news: boolean): void
}

const manifestVersion = () => {
  try {
    return browser.runtime.getManifest().version
  } catch {
    return '0.0.0'
  }
}

/** NOVI-07: só `**negrito**` e `` `código` `` viram marcação; o resto entra como texto (nunca HTML). */
const inline = (text: string) =>
  inlineParts(text).map((p) => (p.kind === 'text' ? p.text : el(p.kind === 'bold' ? 'strong' : 'code', { textContent: p.text })))

/** Janela "Changelog do PxA" (NOVI-02..07) e o ponto de novidade guardado no Perfil (NOVI-08..13). */
export function createChangelog(ui: UiHost, deps: ChangelogDeps = {}) {
  const storage = deps.storage ?? createProfileStorage()
  const version = deps.version ?? manifestVersion()
  let releaseKeys: (() => void) | null = null
  let news = false

  const close = el('button', { type: 'button', className: 'pxa-icon pxa-head-btn', textContent: '×', onclick: () => hide() })
  close.setAttribute('aria-label', 'Fechar changelog')
  const header = el('header', {}, el('span', { className: 'pxa-changelog-title', textContent: 'Changelog do PxA' }), close)
  const body = el('div', { className: 'pxa-changelog-body' })
  const box = el('section', { className: 'pxa-window pxa-changelog' }, header, body)
  box.setAttribute('aria-label', 'Changelog do PxA')
  box.style.display = 'none'
  ui.layer.append(box)
  makeDraggable(box, header) // NOVI-05

  function entry(e: ChangelogEntry) {
    const section = el(
      'section',
      { className: 'pxa-changelog-entry' },
      el(
        'h3',
        {},
        e.version,
        ' ',
        el('span', { className: 'pxa-changelog-date', textContent: formatDate(e.date) }),
        ...(e.version === version ? [' ', el('span', { className: 'pxa-changelog-current', textContent: 'atual' })] : []), // NOVI-03
      ),
      el('ul', {}, ...e.items.map((item) => el('li', {}, ...inline(item)))),
    )
    section.dataset.version = e.version
    return section
  }

  /** Texto e versão não mudam enquanto o content script vive: monta uma vez, na 1ª abertura. */
  function render() {
    const entries = parseChangelog(deps.text ?? changelogText)
    body.replaceChildren(...(entries.length ? entries.map(entry) : [el('p', { className: 'pxa-empty', textContent: 'Nenhuma versão registrada.' })]))
  }

  function setNews(value: boolean) {
    if (value === news) return
    news = value
    deps.onNewsChange?.(value)
  }

  function show() {
    if (!body.firstChild) render()
    box.style.display = 'flex'
    releaseKeys = captureKeys((e) => (e.key === 'Escape' ? hide : undefined)) // NOVI-04
    close.focus()
    // NOVI-10: abriu = viu esta versão. A UI apaga já; o Perfil só grava se mudou.
    setNews(false)
    void storage.update((p) => (p.lastSeenVersion === version ? p : { ...p, lastSeenVersion: version })).catch(() => {})
  }

  function hide() {
    if (!releaseKeys) return
    releaseKeys()
    releaseKeys = null
    box.style.display = 'none'
  }

  // NOVI-08: instalação nova grava a versão atual em silêncio. NOVI-12: storage quebrado = sem ponto.
  void storage
    .update((p) => (p.lastSeenVersion ? p : { ...p, lastSeenVersion: version }))
    .then((p) => setNews(hasNews(version, p.lastSeenVersion)))
    .catch(() => {})
  storage.onChange((p) => setNews(hasNews(version, p.lastSeenVersion))) // NOVI-11

  return {
    toggle: () => (releaseKeys ? hide() : show()),
    hide,
    isOpen: () => releaseKeys !== null,
    hasNews: () => news,
  }
}
