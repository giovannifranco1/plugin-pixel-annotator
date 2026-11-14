import { createKonami } from '@/lib/konami'
import { defaultProfile, type Profile, type ThemeId } from '@/lib/profile'
import type { AnnotationStore } from '@/lib/store'
import { createProfileStorage, type ProfileStorage } from '../profile-storage'
import { el } from './dom'
import type { UiHost } from './host'
import { pixelIcon, SPEAKER_OFF, SPEAKER_ON } from './icons'
import { createMascot } from './mascot'
import { createSound, type SoundName } from './sound'
import { applyTheme, THEMES } from './themes'

/** Onde a Diversão entra no Painel (pontos de inserção de `ui/panel.ts`). */
export interface PanelMount {
  header: HTMLElement
  headStart: HTMLElement
}

export interface FunDeps {
  storage?: ProfileStorage
  sound?: { play(name: SoundName): void }
}

const HAPPY_MS = 1500
const PARTY_MS = 2000
const SLEEP_AFTER_MS = 60_000
const SLEEP_CHECK_MS = 1000

/**
 * Mascote, sons e temas (feature Diversão). Ouve o store para saber de anotação nova
 * (número acima da marca; editar/excluir não cria número) e o controller para export/cópia.
 */
export function createFun(ui: UiHost, store: AnnotationStore, mount: PanelMount, deps: FunDeps = {}) {
  const storage = deps.storage ?? createProfileStorage()
  const sound = deps.sound ?? createSound()
  const mascot = createMascot()
  let profile = defaultProfile()
  let lastNumber = store.list().at(-1)?.number ?? 0
  mount.headStart.append(mascot.el)

  // Barra abaixo do cabeçalho: tema e som (TEMA-02, SOM-01)
  const theme = el('select', {
    onchange: () => save({ theme: theme.value as ThemeId }),
  }, ...THEMES.map((t) => el('option', { value: t.id, textContent: t.label })))
  theme.setAttribute('aria-label', 'Tema')
  const soundBtn = el('button', { type: 'button', className: 'pxa-sound', onclick: () => save({ sound: !profile.sound }) })
  mount.header.after(el('div', { className: 'pxa-fun-bar' }, el('label', {}, 'Tema ', theme), soundBtn))

  /** Aplica na hora e grava no Perfil. */
  function save(change: Partial<Profile>) {
    render({ ...profile, ...change })
    void storage.update((p) => ({ ...p, ...change })).catch(() => {})
  }

  function render(p: Profile) {
    if (ui.layer.dataset.pxaTheme !== p.theme) {
      applyTheme(ui.layer, p.theme)
      mascot.setTheme(p.theme) // MASC-07
    }
    if (p.sound !== profile.sound || !soundBtn.firstChild) {
      soundBtn.replaceChildren(pixelIcon(p.sound ? SPEAKER_ON : SPEAKER_OFF))
      soundBtn.setAttribute('aria-label', p.sound ? 'Desligar som' : 'Ligar som')
      soundBtn.setAttribute('aria-pressed', String(p.sound))
    }
    profile = p
    theme.value = p.theme
  }
  render(profile)

  const play = (name: SoundName) => { if (profile.sound) sound.play(name) }
  const party = () => mascot.set('festa', PARTY_MS)

  store.subscribe(() => {
    const list = store.list()
    if ((list.at(-1)?.number ?? 0) <= lastNumber) return // edição, exclusão ou limpeza
    for (const a of list.filter((x) => x.number > lastNumber)) {
      lastNumber = a.number
      mascot.set(a.viewport.category === 'mobile' ? 'susto' : 'feliz', HAPPY_MS) // MASC-02
      play('blip')
    }
  })

  storage.onChange(render)
  void storage.load().then(render).catch(() => {})

  return {
    /** Com o modo ativo: sono por inatividade (MASC-04) e Konami (EGG-01/02). Devolve o desfazer. */
    activate(): () => void {
      const konami = createKonami()
      let last = Date.now()
      const wake = () => {
        last = Date.now()
        if (mascot.mood() === 'dormindo') mascot.set('idle')
      }
      // Passivo: nunca preventDefault/stopPropagation, a página recebe todas as teclas (EGG-02).
      const onKey = (e: KeyboardEvent) => {
        wake()
        const inEditor = e.composedPath().some((n) => n instanceof Element && n.classList.contains('pxa-editor'))
        if (!inEditor && konami(e.key)) {
          party()
          play('jingle')
        }
      }
      const opts = { capture: true, passive: true }
      window.addEventListener('pointermove', wake, opts)
      window.addEventListener('pointerdown', wake, opts)
      window.addEventListener('keydown', onKey, opts)
      const timer = setInterval(() => {
        if (Date.now() - last >= SLEEP_AFTER_MS && mascot.mood() !== 'dormindo') mascot.set('dormindo')
      }, SLEEP_CHECK_MS)
      return () => {
        window.removeEventListener('pointermove', wake, opts)
        window.removeEventListener('pointerdown', wake, opts)
        window.removeEventListener('keydown', onKey, opts)
        clearInterval(timer)
        if (mascot.mood() === 'dormindo') mascot.set('idle')
      }
    },
    /** Export .zip ou cópia de markdown concluídos: festa (MASC-03); fanfarra só no .zip (SOM-02). */
    exported(kind: 'zip' | 'markdown') {
      party()
      if (kind === 'zip') play('fanfare')
    },
  }
}
