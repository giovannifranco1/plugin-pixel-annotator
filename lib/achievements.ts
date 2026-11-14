import type { Profile } from './profile'
import type { ScreenCategory } from './types'

export type AchievementId = 'primeiro-pixel' | 'cacador-mobile' | 'pixel-perfect' | 'speedrun' | 'quest-completa' | 'maratona' | 'codigo-secreto'

export interface Achievement {
  id: AchievementId
  name: string
  description: string
  secret: boolean
}

/** Estatísticas da aba atual (memória): Pixel Perfect, Speedrun e Maratona são "na mesma aba". */
export interface TabStats {
  adds: number
  categories: ScreenCategory[]
  /** Instantes (ms) das anotações recentes, para o Speedrun. */
  recent: number[]
  konami: boolean
}

export type FunEvent =
  | { type: 'annotated'; category: ScreenCategory; at: number }
  /** Só o .zip; `fresh` = anotações ainda não exportadas nesta aba. */
  | { type: 'exported'; fresh: number }
  | { type: 'konami' }

export const XP_PER_ANNOTATION = 10
export const XP_PER_EXPORTED = 5
const SPEEDRUN_COUNT = 5
const SPEEDRUN_MS = 60_000

interface Rule extends Achievement {
  done(p: Profile, tab: TabStats): boolean
}

const RULES: readonly Rule[] = [
  { id: 'primeiro-pixel', name: 'Primeiro Pixel', description: 'Fez a primeira anotação.', secret: false, done: (p) => p.stats.annotations >= 1 },
  { id: 'cacador-mobile', name: 'Caçador Mobile', description: '10 anotações em tela mobile.', secret: false, done: (p) => p.stats.mobile >= 10 },
  { id: 'pixel-perfect', name: 'Pixel Perfect', description: 'Anotou em mobile, tablet e desktop na mesma aba.', secret: false, done: (_, t) => new Set(t.categories).size === 3 },
  {
    id: 'speedrun', name: 'Speedrun', description: '5 anotações em menos de 60s.', secret: false,
    done: (_, t) => t.recent.length >= SPEEDRUN_COUNT && t.recent.at(-1)! - t.recent.at(-SPEEDRUN_COUNT)! < SPEEDRUN_MS,
  },
  { id: 'quest-completa', name: 'Quest Completa', description: 'Exportou o primeiro .zip.', secret: false, done: (p) => p.stats.zips >= 1 },
  { id: 'maratona', name: 'Maratona', description: '20 anotações na mesma aba.', secret: false, done: (_, t) => t.adds >= 20 },
  { id: 'codigo-secreto', name: 'Código Secreto', description: '↑↑↓↓←→←→BA com o modo ativo.', secret: true, done: (_, t) => t.konami },
]

export const ACHIEVEMENTS: readonly Achievement[] = RULES.map(({ done: _, ...a }) => a)

export function createTabStats(): TabStats {
  return { adds: 0, categories: [], recent: [], konami: false }
}

/** Aplica um evento ao Perfil e à aba (puro): XP ganho e Conquistas desbloqueadas agora, em ordem de catálogo. */
export function applyEvent(profile: Profile, tab: TabStats, event: FunEvent, nowIso: string) {
  let xp = 0
  const p: Profile = { ...profile, stats: { ...profile.stats }, achievements: { ...profile.achievements } }
  const t: TabStats = { ...tab }
  if (event.type === 'annotated') {
    xp = XP_PER_ANNOTATION
    p.stats.annotations++
    if (event.category === 'mobile') p.stats.mobile++
    t.adds++
    if (!t.categories.includes(event.category)) t.categories = [...t.categories, event.category]
    t.recent = [...t.recent, event.at].slice(-SPEEDRUN_COUNT)
  } else if (event.type === 'exported') {
    xp = XP_PER_EXPORTED * event.fresh
    p.stats.zips++
  } else {
    t.konami = true
  }
  p.xp += xp
  const unlocked: AchievementId[] = []
  for (const rule of RULES) {
    if (p.achievements[rule.id] || !rule.done(p, t)) continue
    p.achievements[rule.id] = nowIso
    unlocked.push(rule.id)
  }
  return { profile: p, tab: t, xp, unlocked }
}
