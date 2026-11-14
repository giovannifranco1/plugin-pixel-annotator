import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { createPanel } from '@/entrypoints/annotator.content/ui/panel'
import { createFun } from '@/entrypoints/annotator.content/ui/fun'
import { MASCOT_PALETTE } from '@/entrypoints/annotator.content/ui/mascot'
import type { SoundName } from '@/entrypoints/annotator.content/ui/sound'
import { createProfileStorage, type ProfileStorage } from '@/entrypoints/annotator.content/profile-storage'
import { KONAMI } from '@/lib/konami'
import { defaultProfile, type Profile } from '@/lib/profile'
import { createStore, type AnnotationStore } from '@/lib/store'
import type { ScreenCategory } from '@/lib/types'
import { draft } from './fixtures/annotations'

let ui: UiHost
let store: AnnotationStore
let storage: ProfileStorage
let sound: { play: ReturnType<typeof vi.fn<(name: SoundName) => void>> }
let panel: ReturnType<typeof createPanel>
let fun: ReturnType<typeof createFun>
let undo: Array<() => void>

/** Espera a fila do storage esvaziar e os `.then` de quem gravou rodarem. */
const flush = async () => {
  await storage.load()
  for (let i = 0; i < 5; i++) await Promise.resolve()
}
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => ui.root.querySelector<T>(sel)!
const mood = () => $('.pxa-mascot').dataset.mood
const mascotFills = () => new Set(Array.from(ui.root.querySelectorAll('.pxa-mascot rect')).map((r) => r.getAttribute('fill')))
const add = (category: ScreenCategory = 'desktop') => store.add(draft({ viewport: { ...draft().viewport, category } }))
const profile = () => storage.load()
const pressKonami = () => { for (const key of KONAMI) document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })) }

async function setup(start: Profile = defaultProfile()) {
  storage = createProfileStorage(undefined)
  await storage.update(() => start)
  fun = createFun(ui, store, panel.mount, { storage, sound })
  await flush()
}
const activate = () => undo.push(fun.activate())

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  ui = createHost()
  store = createStore()
  sound = { play: vi.fn<(name: SoundName) => void>() }
  undo = []
  panel = createPanel(ui, store, { onFocus() {}, onEdit() {}, onDelete() {}, onExportZip() {}, onCopyMarkdown() {}, onClearAll() {}, onPresent() {}, onImport() {}, onDraw() {} })
  panel.show()
})
afterEach(() => {
  for (const u of undo) u()
  ui.host.remove()
  vi.useRealTimers()
})

describe('diversão', () => {
  test('MASC-01 mascote no cabeçalho, à esquerda do título, também recolhido', async () => {
    await setup()
    const header = $('.pxa-panel header')
    const mascot = $('.pxa-mascot')
    expect(header.contains(mascot)).toBe(true)
    expect(mascot.compareDocumentPosition($('.pxa-title')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    $('.pxa-panel header button[aria-label="Recolher painel"]').click()
    expect($('.pxa-panel').classList.contains('pxa-collapsed')).toBe(true)
    expect(header.contains(mascot)).toBe(true)
  })

  test('Revisão 1: sem nível, XP nem conquistas na UI', async () => {
    await setup()
    add()
    await flush()
    expect(ui.root.querySelector('.pxa-level, .pxa-achievements, .pxa-trophy-toast')).toBeNull()
    expect(ui.root.querySelector('button[aria-label="Conquistas"]')).toBeNull()
  })

  test('MASC-02 anotação salva: feliz por 1,5s; mobile faz susto; editar não reage', async () => {
    await setup()
    const a = add('desktop')
    expect(mood()).toBe('feliz')
    vi.advanceTimersByTime(1500)
    expect(mood()).toBe('idle')
    store.updateNote(a.id, 'outra')
    expect(mood()).toBe('idle')
    add('mobile')
    expect(mood()).toBe('susto')
  })

  test('MASC-03 export .zip e cópia de markdown fazem festa por ~2s', async () => {
    await setup()
    fun.exported('markdown')
    expect(mood()).toBe('festa')
    vi.advanceTimersByTime(2000)
    expect(mood()).toBe('idle')
    fun.exported('zip')
    expect(mood()).toBe('festa')
  })

  test('MASC-04 60s sem interação: dormindo; próxima interação volta a idle', async () => {
    await setup()
    activate()
    vi.advanceTimersByTime(59_000)
    window.dispatchEvent(new PointerEvent('pointermove'))
    vi.advanceTimersByTime(59_000)
    expect(mood()).toBe('idle')
    vi.advanceTimersByTime(2000)
    expect(mood()).toBe('dormindo')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }))
    expect(mood()).toBe('idle')
  })

  test('MASC-04 com o modo desativado não dorme nem escuta', async () => {
    await setup()
    activate()
    undo.pop()!()
    vi.advanceTimersByTime(120_000)
    expect(mood()).toBe('idle')
  })

  test('SOM-01 som começa desligado; botão com ícone pixel liga e a escolha persiste', async () => {
    await setup()
    const btn = $('button[aria-label="Ligar som"]')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.textContent).toBe('') // sem emoji
    expect(btn.querySelector('svg[shape-rendering="crispEdges"]')).not.toBeNull()
    const off = btn.innerHTML
    add()
    expect(sound.play).not.toHaveBeenCalled()
    btn.click()
    await flush()
    expect((await profile()).sound).toBe(true)
    const on = $('button[aria-label="Desligar som"]')
    expect(on.getAttribute('aria-pressed')).toBe('true')
    expect(on.innerHTML).not.toBe(off) // ícone muda entre ligado e desligado
  })

  test('SOM-02 com som: blip ao salvar, fanfarra no .zip, nada ao copiar markdown', async () => {
    await setup({ ...defaultProfile(), sound: true })
    add()
    fun.exported('zip')
    fun.exported('markdown')
    expect(sound.play.mock.calls).toEqual([['blip'], ['fanfare']])
  })

  test('TEMA-02 seletor troca o tema na hora e persiste', async () => {
    await setup()
    const select = $<HTMLSelectElement>('select[aria-label="Tema"]')
    expect(select.value).toBe('padrao')
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['Padrão', 'Noite'])
    select.value = 'noite'
    select.dispatchEvent(new Event('change'))
    expect(ui.layer.dataset.pxaTheme).toBe('noite')
    await flush()
    expect((await profile()).theme).toBe('noite')
  })

  test('Revisão 2: o mascote tem as mesmas cores no Padrão e no Noite', async () => {
    await setup()
    const before = mascotFills()
    expect(before).toContain(MASCOT_PALETTE.P)
    const select = $<HTMLSelectElement>('select[aria-label="Tema"]')
    select.value = 'noite'
    select.dispatchEvent(new Event('change'))
    expect(ui.layer.dataset.pxaTheme).toBe('noite')
    expect(mascotFills()).toEqual(before)
  })

  test('TEMA-02 tema e som salvos voltam ao abrir', async () => {
    await setup({ ...defaultProfile(), theme: 'noite', sound: true })
    expect(ui.layer.dataset.pxaTheme).toBe('noite')
    expect($<HTMLSelectElement>('select[aria-label="Tema"]').value).toBe('noite')
    expect($('button[aria-label="Desligar som"]')).not.toBeNull()
  })

  test('TEMA-02 mudança de outra aba aplica o tema', async () => {
    let emit: (p: Profile) => void = () => {}
    const base = createProfileStorage(undefined)
    storage = { ...base, onChange: (cb) => { emit = cb; return () => {} } }
    fun = createFun(ui, store, panel.mount, { storage, sound })
    await flush()
    emit({ ...defaultProfile(), theme: 'noite' })
    expect(ui.layer.dataset.pxaTheme).toBe('noite')
  })

  test('EGG-01 Konami com o modo ativo: mascote dança e toca o jingle (com som), sem toast', async () => {
    await setup({ ...defaultProfile(), sound: true })
    activate()
    pressKonami()
    expect(mood()).toBe('festa')
    expect(sound.play.mock.calls).toEqual([['jingle']])
    expect(ui.root.querySelector('.pxa-toast, .pxa-trophy-toast')).toBeNull()
    pressKonami()
    expect(sound.play.mock.calls).toHaveLength(2)
  })

  test('EGG-02 o listener não segura as teclas da página', async () => {
    await setup()
    activate()
    const page = vi.fn()
    document.body.addEventListener('keydown', page)
    const events = KONAMI.map((key) => new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    for (const e of events) document.body.dispatchEvent(e)
    expect(page).toHaveBeenCalledTimes(KONAMI.length)
    expect(events.some((e) => e.defaultPrevented)).toBe(false)
    document.body.removeEventListener('keydown', page)
  })

  test('EGG-01 teclas digitadas no editor de nota não contam', async () => {
    await setup()
    activate()
    const form = document.createElement('form')
    form.className = 'pxa-editor'
    const ta = document.createElement('textarea')
    form.append(ta)
    ui.layer.append(form)
    for (const key of KONAMI) ta.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }))
    expect(mood()).toBe('idle')
  })

  test('EGG-01 com o modo inativo o Konami não faz nada', async () => {
    await setup()
    pressKonami()
    expect(mood()).toBe('idle')
  })
})
