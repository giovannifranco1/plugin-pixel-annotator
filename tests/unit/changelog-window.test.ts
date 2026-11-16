import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createChangelog } from '@/entrypoints/annotator.content/ui/changelog'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { createProfileStorage, type ProfileArea, type ProfileStorage } from '@/entrypoints/annotator.content/profile-storage'
import { defaultProfile, PROFILE_KEY, type Profile } from '@/lib/profile'

const TEXT = `# Changelog do PxA

## 1.2.0 — 2026-11-16
- Item **forte** com \`código\` e <b>html</b>.
- Segundo item.

## 1.1.0 — 2026-11-14
- Antigo.
`

let ui: UiHost
let storage: ProfileStorage
let onNews: ReturnType<typeof vi.fn<(news: boolean) => void>>
let changelog: ReturnType<typeof createChangelog>

const $ = (sel: string) => ui.root.querySelector<HTMLElement>(sel)
const $$ = (sel: string) => Array.from(ui.root.querySelectorAll<HTMLElement>(sel))
const box = () => $('.pxa-changelog')!
const visible = () => box().style.display !== 'none'
const flush = async () => {
  await storage.load()
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

async function setup(start: Profile | null, version = '1.2.0', text = TEXT) {
  storage = createProfileStorage(undefined)
  if (start) await storage.update(() => start)
  changelog = createChangelog(ui, { storage, version, text, onNewsChange: onNews })
  await flush()
}

beforeEach(() => {
  ui = createHost()
  onNews = vi.fn<(news: boolean) => void>()
})
afterEach(() => {
  changelog?.hide()
  ui.host.remove()
})

describe('janela do Changelog', () => {
  test('NOVI-02 abre com as entradas da mais nova para a mais antiga, versão e data', async () => {
    await setup({ ...defaultProfile(), lastSeenVersion: '1.2.0' })
    expect(visible()).toBe(false)
    changelog.toggle()
    expect(visible()).toBe(true)
    expect($('.pxa-changelog header')!.textContent).toContain('Changelog do PxA')
    const entries = $$('.pxa-changelog-entry')
    expect(entries.map((e) => e.dataset.version)).toEqual(['1.2.0', '1.1.0'])
    expect(entries[0]!.textContent).toContain('16/11/2026')
    expect(entries[0]!.querySelectorAll('li')).toHaveLength(2)
    expect(box().closest('[data-pxa-ignore]') ?? ui.host.hasAttribute('data-pxa-ignore')).toBeTruthy()
  })

  test('NOVI-03 a versão instalada é marcada como atual', async () => {
    await setup({ ...defaultProfile(), lastSeenVersion: '1.2.0' })
    changelog.toggle()
    const [current, old] = $$('.pxa-changelog-entry')
    expect(current!.querySelector('.pxa-changelog-current')?.textContent).toBe('atual')
    expect(old!.querySelector('.pxa-changelog-current')).toBeNull()
  })

  test('NOVI-14 sem entrada para a versão instalada: mostra o que existe, sem "atual"', async () => {
    await setup({ ...defaultProfile(), lastSeenVersion: '1.3.0' }, '1.3.0')
    changelog.toggle()
    expect($$('.pxa-changelog-entry')).toHaveLength(2)
    expect($('.pxa-changelog-current')).toBeNull()
  })

  test('NOVI-14 changelog vazio: mensagem em vez de lista', async () => {
    await setup(null, '1.2.0', '')
    changelog.toggle()
    expect($('.pxa-changelog-body')!.textContent).toContain('Nenhuma versão registrada')
  })

  test('NOVI-04 Esc, × e toggle fecham', async () => {
    await setup({ ...defaultProfile(), lastSeenVersion: '1.2.0' })
    changelog.toggle()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(visible()).toBe(false)

    changelog.toggle()
    ui.root.querySelector<HTMLButtonElement>('button[aria-label="Fechar changelog"]')!.click()
    expect(visible()).toBe(false)

    changelog.toggle()
    changelog.toggle()
    expect(visible()).toBe(false)
    expect(changelog.isOpen()).toBe(false)
  })

  test('NOVI-04 Esc com a janela fechada não é engolido', async () => {
    await setup({ ...defaultProfile(), lastSeenVersion: '1.2.0' })
    const seen = vi.fn()
    window.addEventListener('keydown', seen)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.removeEventListener('keydown', seen)
    expect(seen).toHaveBeenCalled()
  })

  test('NOVI-05 cabeçalho é a alça de arraste', async () => {
    await setup({ ...defaultProfile(), lastSeenVersion: '1.2.0' })
    expect($('.pxa-changelog header')!.tabIndex).toBe(0)
  })

  test('NOVI-07 negrito e código viram marcação; HTML do arquivo vira texto', async () => {
    await setup({ ...defaultProfile(), lastSeenVersion: '1.2.0' })
    changelog.toggle()
    const li = $('.pxa-changelog-entry li')!
    expect(li.querySelector('strong')!.textContent).toBe('forte')
    expect(li.querySelector('code')!.textContent).toBe('código')
    expect(li.querySelector('b')).toBeNull()
    expect(li.textContent).toContain('<b>html</b>')
  })
})

describe('ponto de novidade', () => {
  test('NOVI-08 instalação nova grava a versão atual e não avisa', async () => {
    await setup(null)
    expect((await storage.load()).lastSeenVersion).toBe('1.2.0')
    expect(changelog.hasNews()).toBe(false)
    expect(onNews).not.toHaveBeenCalledWith(true)
  })

  test('NOVI-09 versão maior que a vista avisa', async () => {
    await setup({ ...defaultProfile(), lastSeenVersion: '1.1.0' })
    expect(changelog.hasNews()).toBe(true)
    expect(onNews).toHaveBeenLastCalledWith(true)
  })

  test('NOVI-10 abrir a janela grava a versão como vista e tira o aviso', async () => {
    await setup({ ...defaultProfile(), theme: 'noite', lastSeenVersion: '1.1.0' })
    changelog.toggle()
    await flush()
    expect(changelog.hasNews()).toBe(false)
    expect(onNews).toHaveBeenLastCalledWith(false)
    expect(await storage.load()).toMatchObject({ theme: 'noite', lastSeenVersion: '1.2.0' }) // não apaga o resto do Perfil
  })

  test('NOVI-11 outra aba viu a versão: o aviso some aqui também', async () => {
    const listeners: Array<(c: Record<string, { newValue?: unknown }>) => void> = []
    let stored: unknown = { ...defaultProfile(), lastSeenVersion: '1.1.0' }
    const area: ProfileArea = {
      get: async () => ({ [PROFILE_KEY]: stored }),
      set: async (items) => { stored = items[PROFILE_KEY] },
      onChanged: { addListener: (cb) => listeners.push(cb), removeListener: () => {} },
    }
    storage = createProfileStorage(area)
    changelog = createChangelog(ui, { storage, version: '1.2.0', text: TEXT, onNewsChange: onNews })
    await flush()
    expect(changelog.hasNews()).toBe(true)
    stored = { ...defaultProfile(), lastSeenVersion: '1.2.0' }
    for (const cb of listeners) cb({ [PROFILE_KEY]: { newValue: stored } })
    expect(changelog.hasNews()).toBe(false)
    expect(onNews).toHaveBeenLastCalledWith(false)
  })

  test('NOVI-12 storage quebrado: sem aviso e a janela abre', async () => {
    const area: ProfileArea = { get: () => Promise.reject(new Error('negado')), set: () => Promise.reject(new Error('negado')) }
    storage = createProfileStorage(area)
    changelog = createChangelog(ui, { storage, version: '1.2.0', text: TEXT, onNewsChange: onNews })
    await flush()
    expect(changelog.hasNews()).toBe(false)
    changelog.toggle()
    expect(visible()).toBe(true)
  })
})
