import { ACHIEVEMENTS, type AchievementId } from './achievements'

/** Chave do Perfil em `storage.local`: é do dev, não do site (CONQ-07). */
export const PROFILE_KEY = 'pxa:profile'

export const THEME_IDS = ['padrao', 'gameboy', 'nes', 'crt', 'noite'] as const
export type ThemeId = (typeof THEME_IDS)[number]

export interface ProfileStats {
  annotations: number
  mobile: number
  zips: number
}

export interface Profile {
  version: 1
  xp: number
  /** id → ISO do desbloqueio. */
  achievements: Partial<Record<AchievementId, string>>
  stats: ProfileStats
  theme: ThemeId
  sound: boolean
}

export function defaultProfile(): Profile {
  return { version: 1, xp: 0, achievements: {}, stats: { annotations: 0, mobile: 0, zips: 0 }, theme: 'padrao', sound: false }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0)

/** Perfil corrompido ou de versão antiga: cada campo inválido volta ao padrão, o resto fica. */
export function normalizeProfile(raw: unknown): Profile {
  const p = defaultProfile()
  if (!isRecord(raw)) return p
  p.xp = count(raw.xp)
  if (THEME_IDS.includes(raw.theme as ThemeId)) p.theme = raw.theme as ThemeId
  if (typeof raw.sound === 'boolean') p.sound = raw.sound
  const stats = isRecord(raw.stats) ? raw.stats : {}
  p.stats = { annotations: count(stats.annotations), mobile: count(stats.mobile), zips: count(stats.zips) }
  if (isRecord(raw.achievements)) {
    for (const { id } of ACHIEVEMENTS) {
      const at = raw.achievements[id]
      if (typeof at === 'string') p.achievements[id] = at
    }
  }
  return p
}

/** XP acumulado para chegar ao Nv n+1: 50·n·(n+1)/2 (CONQ-03). */
const threshold = (level: number) => 25 * level * (level - 1)

/** Nível atual e progresso dentro dele, para a barra do cabeçalho. */
export function levelOf(xp: number): { level: number; into: number; span: number } {
  let level = 1
  while (xp >= threshold(level + 1)) level++
  const start = threshold(level)
  return { level, into: xp - start, span: threshold(level + 1) - start }
}
