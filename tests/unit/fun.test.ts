import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHost, type UiHost } from '@/entrypoints/annotator.content/ui/host'
import { createPanel } from '@/entrypoints/annotator.content/ui/panel'
import { createFun } from '@/entrypoints/annotator.content/ui/fun'
import type { SoundName } from '@/entrypoints/annotator.content/ui/sound'
import { createProfileStorage, type ProfileStorage } from '@/entrypoints/annotator.content/profile-storage'
import { KONAMI } from '@/lib/konami'
import { defaultProfile } from '@/lib/profile'
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
const $$ = (sel: string) => Array.from(ui.root.querySelectorAll<HTMLElement>(sel))
const mood = () => $('.pxa-mascot').dataset.mood
const add = (category: ScreenCategory = 'desktop') => store.add(draft({ viewport: { ...draft().viewport, category } }))
const profile = () => storage.load()

async function setup(start = defaultProfile()) {
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
  panel = createPanel(ui, store, { onFocus() {}, onEdit() {}, onDelete() {}, onExportZip() {}, onCopyMarkdown() {}, onClearAll() {} })
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

  test('MASC-02 anotação salva: feliz por 1,5s; mobile faz susto', async () => {
    await setup({ ...defaultProfile(), achievements: { 'primeiro-pixel': 'x' } })
    add('desktop')
    expect(mood()).toBe('feliz')
    vi.advanceTimersByTime(1500)
    expect(mood()).toBe('idle')
    add('mobile')
    expect(mood()).toBe('susto')
  })

  test('CONQ-01 anotação nova dá 10 XP; editar e excluir não', async () => {
    await setup()
    const a = add()
    await flush()
    expect((await profile()).xp).toBe(10)
    store.updateNote(a.id, 'outra')
    store.remove(a.id)
    await flush()
    expect((await profile()).xp).toBe(10)
  })

  test('CONQ-03 cabeçalho mostra Nv n e barra de progresso', async () => {
    await setup({ ...defaultProfile(), xp: 75 })
    expect($('.pxa-level').textContent).toContain('Nv 2')
    expect($('.pxa-xp-fill').style.width).toBe('25%')
    for (let i = 0; i < 8; i++) add()
    await flush()
    expect($('.pxa-level').textContent).toContain('Nv 3') // 155 XP
  })

  test('CONQ-04 conquista nova: toast 🏆, mascote em festa e persistência', async () => {
    await setup()
    add()
    await flush()
    expect($('.pxa-trophy-toast').textContent).toBe('🏆 Primeiro Pixel')
    expect(mood()).toBe('festa')
    expect((await profile()).achievements['primeiro-pixel']).toBeTruthy()
    expect(ui.root.querySelector('.pxa-toast')).toBeNull() // não briga com o toast normal
  })

  test('CONQ-04 várias conquistas de uma vez: toasts em fila, um por vez', async () => {
    await setup({ ...defaultProfile(), stats: { annotations: 0, mobile: 9, zips: 0 } })
    add('mobile')
    await flush()
    expect($$('.pxa-trophy-toast')).toHaveLength(1)
    expect($('.pxa-trophy-toast').textContent).toBe('🏆 Primeiro Pixel')
    vi.advanceTimersByTime(2500)
    expect($$('.pxa-trophy-toast')).toHaveLength(1)
    expect($('.pxa-trophy-toast').textContent).toBe('🏆 Caçador Mobile')
    vi.advanceTimersByTime(2500)
    expect($$('.pxa-trophy-toast')).toHaveLength(0)
  })

  test('MASC-03 export .zip e cópia de markdown fazem festa por ~2s', async () => {
    await setup({ ...defaultProfile(), achievements: { 'quest-completa': 'x' } })
    fun.exported('markdown')
    expect(mood()).toBe('festa')
    vi.advanceTimersByTime(2000)
    expect(mood()).toBe('idle')
    fun.exported('zip')
    expect(mood()).toBe('festa')
  })

  test('CONQ-02 export .zip dá 5×N só pelas anotações ainda não exportadas; markdown não dá XP', async () => {
    await setup()
    add(); add(); add()
    await flush()
    fun.exported('markdown')
    await flush()
    expect((await profile()).xp).toBe(30)
    fun.exported('zip')
    await flush()
    expect((await profile()).xp).toBe(45)
    fun.exported('zip')
    await flush()
    expect((await profile()).xp).toBe(45)
    const a = add()
    add()
    store.remove(a.id)
    fun.exported('zip')
    await flush()
    expect((await profile()).xp).toBe(45 + 20 + 5)
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

  test('SOM-01 som começa desligado; o botão liga e a escolha persiste', async () => {
    await setup()
    const btn = $('button[aria-label="Ligar som"]')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.textContent).toBe('🔇')
    add()
    expect(sound.play).not.toHaveBeenCalled()
    btn.click()
    await flush()
    expect((await profile()).sound).toBe(true)
    expect($('button[aria-label="Desligar som"]').textContent).toBe('🔈')
  })

  test('SOM-02 com som: blip ao salvar, fanfarra no .zip, jingle na conquista', async () => {
    await setup({ ...defaultProfile(), sound: true })
    add()
    expect(sound.play).toHaveBeenNthCalledWith(1, 'blip')
    await flush()
    expect(sound.play).toHaveBeenNthCalledWith(2, 'jingle') // Primeiro Pixel
    fun.exported('zip')
    expect(sound.play).toHaveBeenNthCalledWith(3, 'fanfare')
    fun.exported('markdown')
    await flush()
    expect(sound.play.mock.calls.map((c) => c[0])).toEqual(['blip', 'jingle', 'fanfare', 'jingle']) // Quest Completa
  })

  test('TEMA-02 seletor troca o tema na hora e persiste', async () => {
    await setup()
    const select = $<HTMLSelectElement>('select[aria-label="Tema"]')
    expect(select.value).toBe('padrao')
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['Padrão', 'Game Boy', 'NES', 'CRT', 'Noite'])
    select.value = 'crt'
    select.dispatchEvent(new Event('change'))
    expect(ui.layer.dataset.pxaTheme).toBe('crt')
    await flush()
    expect((await profile()).theme).toBe('crt')
  })

  test('TEMA-02 tema e som salvos voltam ao abrir', async () => {
    await setup({ ...defaultProfile(), theme: 'noite', sound: true })
    expect(ui.layer.dataset.pxaTheme).toBe('noite')
    expect($<HTMLSelectElement>('select[aria-label="Tema"]').value).toBe('noite')
    expect($('button[aria-label="Desligar som"]')).not.toBeNull()
  })

  test('CONQ-06 visão Conquistas: todas listadas, bloqueadas em silhueta, secreta com ???', async () => {
    await setup({ ...defaultProfile(), achievements: { 'primeiro-pixel': '2026-11-14T10:00:00.000Z' } })
    const trophy = $('button[aria-label="Conquistas"]')
    trophy.click()
    expect($('.pxa-panel').classList.contains('pxa-show-achievements')).toBe(true)
    expect(trophy.getAttribute('aria-pressed')).toBe('true')
    const rows = $$('.pxa-achievement')
    expect(rows).toHaveLength(7)
    expect(rows[0]!.classList.contains('pxa-locked')).toBe(false)
    expect(rows[0]!.textContent).toContain('Fez a primeira anotação.')
    expect(rows[1]!.classList.contains('pxa-locked')).toBe(true)
    const secret = rows[6]!
    expect(secret.textContent).toContain('Código Secreto')
    expect(secret.textContent).toContain('???')
    expect(secret.textContent).not.toContain('↑')
    expect($('.pxa-achievements').textContent).toContain('1/7')
    trophy.click()
    expect($('.pxa-panel').classList.contains('pxa-show-achievements')).toBe(false)
  })

  test('CONQ-06 com o painel recolhido, abrir Conquistas expande o painel', async () => {
    await setup()
    $('.pxa-panel header button[aria-label="Recolher painel"]').click()
    $('button[aria-label="Conquistas"]').click()
    expect($('.pxa-panel').classList.contains('pxa-collapsed')).toBe(false)
    expect($('.pxa-panel').classList.contains('pxa-show-achievements')).toBe(true)
  })

  test('EGG-01 Konami com o modo ativo desbloqueia Código Secreto e faz o mascote dançar', async () => {
    await setup({ ...defaultProfile(), sound: true })
    activate()
    for (const key of KONAMI) document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    await flush()
    expect((await profile()).achievements['codigo-secreto']).toBeTruthy()
    expect(mood()).toBe('festa')
    expect(sound.play.mock.calls).toEqual([['jingle']]) // um jingle só, não um do Konami e outro da conquista
    for (const key of KONAMI) document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    await flush()
    expect(sound.play.mock.calls).toHaveLength(2) // repetir: dança e jingle de novo, sem toast novo
    expect($$('.pxa-trophy-toast')).toHaveLength(1)
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
    await flush()
    expect((await profile()).achievements['codigo-secreto']).toBeUndefined()
  })

  test('EGG-01 com o modo inativo o Konami não faz nada', async () => {
    await setup()
    for (const key of KONAMI) document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    await flush()
    expect((await profile()).achievements['codigo-secreto']).toBeUndefined()
  })

  test('CONQ-07 mudança de outra aba atualiza o Nv', async () => {
    let emit: (p: unknown) => void = () => {}
    const base = createProfileStorage(undefined)
    storage = { ...base, onChange: (cb) => { emit = cb as never; return () => {} } }
    fun = createFun(ui, store, panel.mount, { storage, sound })
    await flush()
    emit({ ...defaultProfile(), xp: 300 })
    expect($('.pxa-level').textContent).toContain('Nv 4')
  })
})
