import { ACHIEVEMENTS, applyEvent, createTabStats, type AchievementId, type FunEvent } from '@/lib/achievements'
import { createKonami } from '@/lib/konami'
import { defaultProfile, levelOf, type Profile, type ThemeId } from '@/lib/profile'
import type { AnnotationStore } from '@/lib/store'
import { createProfileStorage, type ProfileStorage } from '../profile-storage'
import { ACHIEVEMENT_ICON, TROPHY } from './achievement-icons'
import { el } from './dom'
import type { UiHost } from './host'
import { pixelIcon } from './icons'
import { showToast } from './toast'
import { createMascot } from './mascot'
import { createSound, type SoundName } from './sound'
import { applyTheme, THEMES } from './themes'

/** Onde a Diversão entra no Painel (pontos de inserção de `ui/panel.ts`). */
export interface PanelMount {
  panel: HTMLElement
  header: HTMLElement
  headStart: HTMLElement
  headEnd: HTMLElement
  expand(): void
}

export interface FunDeps {
  storage?: ProfileStorage
  sound?: { play(name: SoundName): void }
}

const HAPPY_MS = 1500
const PARTY_MS = 2000
const TROPHY_TOAST_MS = 2500
const SLEEP_AFTER_MS = 60_000
const SLEEP_CHECK_MS = 1000

/**
 * Mascote, XP, Conquistas, sons e temas (feature Diversão). Ouve o store para saber de anotação nova
 * (id novo = anotação nova; editar/excluir não cria id) e o controller para export/cópia.
 */
export function createFun(ui: UiHost, store: AnnotationStore, mount: PanelMount, deps: FunDeps = {}) {
  const storage = deps.storage ?? createProfileStorage()
  const sound = deps.sound ?? createSound()
  const mascot = createMascot()
  let profile = defaultProfile()
  let tab = createTabStats()
  // Numeração do store é monotônica: número acima da marca = anotação nova (editar/excluir não cria número).
  let lastNumber = store.list().at(-1)?.number ?? 0
  const exportedIds = new Set<string>()

  // Cabeçalho: [mascote][título][Nv + barra][🏆][export][recolher] (MASC-01, CONQ-03, CONQ-06)
  const levelText = el('span')
  const xpFill = el('span', { className: 'pxa-xp-fill' })
  const level = el('span', { className: 'pxa-level' }, levelText, el('span', { className: 'pxa-xp' }, xpFill))
  const trophy = el('button', { type: 'button', className: 'pxa-icon pxa-head-btn', title: 'Conquistas', onclick: toggleAchievements }, pixelIcon(TROPHY))
  trophy.setAttribute('aria-label', 'Conquistas')
  trophy.setAttribute('aria-pressed', 'false')
  mount.headStart.append(mascot.el)
  mount.headEnd.append(level, trophy)

  // Barra abaixo do cabeçalho: tema e som (TEMA-02, SOM-01)
  const theme = el('select', {
    onchange: () => {
      const id = theme.value as ThemeId
      applyTheme(ui.layer, id)
      void storage.update((p) => ({ ...p, theme: id })).catch(() => {})
    },
  }, ...THEMES.map((t) => el('option', { value: t.id, textContent: t.label })))
  theme.setAttribute('aria-label', 'Tema')
  const soundBtn = el('button', {
    type: 'button',
    className: 'pxa-sound',
    onclick: () => {
      const on = !profile.sound
      render({ ...profile, sound: on })
      void storage.update((p) => ({ ...p, sound: on })).catch(() => {})
    },
  })
  const bar = el('div', { className: 'pxa-fun-bar' }, el('label', {}, 'Tema ', theme), soundBtn)
  const view = el('section', { className: 'pxa-achievements' })
  view.setAttribute('aria-label', 'Conquistas')
  mount.header.after(bar, view)

  function render(p: Profile) {
    profile = p
    const { level: n, into, span } = levelOf(p.xp)
    levelText.textContent = `Nv ${n}`
    xpFill.style.width = `${Math.floor((into / span) * 100)}%`
    level.title = `${p.xp} XP · faltam ${span - into} para o Nv ${n + 1}`
    if (ui.layer.dataset.pxaTheme !== p.theme) applyTheme(ui.layer, p.theme)
    theme.value = p.theme
    soundBtn.textContent = p.sound ? '🔈' : '🔇'
    soundBtn.setAttribute('aria-label', p.sound ? 'Desligar som' : 'Ligar som')
    soundBtn.setAttribute('aria-pressed', String(p.sound))
    if (mount.panel.classList.contains('pxa-show-achievements')) renderAchievements()
  }

  function renderAchievements() {
    const got = ACHIEVEMENTS.filter((a) => profile.achievements[a.id]).length
    view.replaceChildren(
      el('p', { className: 'pxa-achievements-count', textContent: `Conquistas ${got}/${ACHIEVEMENTS.length}` }),
      el('ul', {}, ...ACHIEVEMENTS.map((a) => {
        const unlocked = Boolean(profile.achievements[a.id])
        const li = el(
          'li',
          { className: `pxa-achievement${unlocked ? '' : ' pxa-locked'}` },
          el('span', { className: 'pxa-achievement-icon' }, pixelIcon(ACHIEVEMENT_ICON[a.id], 2)),
          el('span', {}, el('strong', { textContent: a.name }), el('span', { textContent: a.secret && !unlocked ? '???' : a.description })),
        )
        li.title = unlocked ? 'Desbloqueada' : 'Bloqueada'
        return li
      })),
    )
  }

  function toggleAchievements() {
    const open = !mount.panel.classList.contains('pxa-show-achievements')
    if (open) mount.expand() // recolhido no mobile: abrir Conquistas abre o painel
    mount.panel.classList.toggle('pxa-show-achievements', open)
    trophy.setAttribute('aria-pressed', String(open))
    if (open) renderAchievements()
  }

  // Toasts de Conquista em fila, num elemento próprio (não apaga o toast normal).
  const toasts: string[] = []
  let toasting = false
  function nextToast() {
    const name = toasts.shift()
    toasting = name !== undefined
    if (name === undefined) return
    showToast(ui, `🏆 ${name}`, TROPHY_TOAST_MS, 'pxa-trophy-toast')
    setTimeout(nextToast, TROPHY_TOAST_MS)
  }

  const play = (name: SoundName) => { if (profile.sound) sound.play(name) }

  const party = () => {
    mascot.set('festa', PARTY_MS)
    play('jingle')
  }

  function celebrate(unlocked: AchievementId[]) {
    if (!unlocked.length) return
    party()
    toasts.push(...unlocked.map((id) => ACHIEVEMENTS.find((a) => a.id === id)!.name))
    if (!toasting) nextToast()
  }

  /** Aplica o evento ao Perfil na fila do storage e comemora o que desbloqueou (CONQ-01..04). */
  function record(event: FunEvent): Promise<AchievementId[]> {
    let unlocked: AchievementId[] = []
    return storage
      .update((p) => {
        const r = applyEvent(p, tab, event, new Date().toISOString())
        tab = r.tab
        unlocked = r.unlocked
        return r.profile
      })
      .then((p) => {
        render(p)
        celebrate(unlocked)
        return unlocked
      })
      .catch(() => [])
  }

  store.subscribe(() => {
    for (const a of store.list().filter((x) => x.number > lastNumber)) {
      lastNumber = a.number
      const category = a.viewport.category
      mascot.set(category === 'mobile' ? 'susto' : 'feliz', HAPPY_MS) // MASC-02
      play('blip')
      void record({ type: 'annotated', category, at: Date.now() })
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
        // 1ª vez: a conquista comemora (celebrate); depois, só a dança e o jingle.
        if (!inEditor && konami(e.key)) void record({ type: 'konami' }).then((u) => u.length || party())
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
    /** Export .zip ou cópia de markdown concluídos (MASC-03, CONQ-02). Só o .zip dá XP e fanfarra. */
    exported(kind: 'zip' | 'markdown') {
      mascot.set('festa', PARTY_MS)
      if (kind === 'markdown') return
      play('fanfare')
      const fresh = store.list().filter((a) => !exportedIds.has(a.id))
      for (const a of fresh) exportedIds.add(a.id)
      void record({ type: 'exported', fresh: fresh.length })
    },
  }
}
