/** Chave do Perfil em `storage.local`: é do dev, não do site. */
export const PROFILE_KEY = 'pxa:profile'

export const THEME_IDS = ['padrao', 'noite'] as const
export type ThemeId = (typeof THEME_IDS)[number]

/** Preferências da Diversão que persistem entre sessões, abas e origens. */
export interface Profile {
  version: 1
  theme: ThemeId
  sound: boolean
}

export function defaultProfile(): Profile {
  return { version: 1, theme: 'padrao', sound: false }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Perfil corrompido ou de versão antiga: cada campo inválido volta ao padrão, o resto fica.
 * Campos da 1ª versão (XP, conquistas) e temas removidos (Game Boy, NES, CRT) são descartados.
 */
export function normalizeProfile(raw: unknown): Profile {
  const p = defaultProfile()
  if (!isRecord(raw)) return p
  if (THEME_IDS.includes(raw.theme as ThemeId)) p.theme = raw.theme as ThemeId
  if (typeof raw.sound === 'boolean') p.sound = raw.sound
  return p
}
