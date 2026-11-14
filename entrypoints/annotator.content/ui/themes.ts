import type { ThemeId } from '@/lib/profile'

/** Custom properties da UI do PxA (`--pxa-<nome>`), lidas por `ui/styles.ts` (TEMA-03). */
export const THEME_VARS = ['ink', 'paper', 'surface', 'hover', 'danger-hover', 'accent', 'on-accent', 'tint', 'muted', 'rule', 'head-bg', 'head-fg', 'scanlines', 'silhouette'] as const
export type ThemeVar = (typeof THEME_VARS)[number]

export interface Theme {
  id: ThemeId
  label: string
  vars: Record<ThemeVar, string>
}

const BASE = { scanlines: 'none', silhouette: 'brightness(0) opacity(.35)' }
const DARK_SILHOUETTE = 'brightness(0) invert(1) opacity(.35)'

/** Paletas (TEMA-01). Contraste texto/fundo ≥ 4.5 verificado em teste (TEMA-05). Marcadores ficam fora (TEMA-04). */
export const THEMES: readonly Theme[] = [
  {
    id: 'padrao', label: 'Padrão',
    vars: {
      ...BASE,
      ink: '#1a1226', paper: '#fffaf0', surface: '#ffffff', hover: '#ffe1ec', 'danger-hover': '#ffd0d8',
      accent: '#ff3e7f', 'on-accent': '#1a1226', tint: 'rgba(255, 62, 127, .08)', muted: '#5b5266', rule: '#d8cfc0',
      'head-bg': '#1a1226', 'head-fg': '#ffffff',
    },
  },
  {
    id: 'gameboy', label: 'Game Boy',
    vars: {
      ...BASE,
      ink: '#0f380f', paper: '#9bbc0f', surface: '#8bac0f', hover: '#b4cf3a', 'danger-hover': '#c6d96a',
      accent: '#306230', 'on-accent': '#e0f0a0', tint: 'rgba(48, 98, 48, .15)', muted: '#0f380f', rule: '#306230',
      'head-bg': '#0f380f', 'head-fg': '#9bbc0f',
    },
  },
  {
    id: 'nes', label: 'NES',
    vars: {
      ...BASE,
      ink: '#000000', paper: '#fcfcfc', surface: '#ffffff', hover: '#fce0a8', 'danger-hover': '#f8b8b8',
      accent: '#d82800', 'on-accent': '#ffffff', tint: 'rgba(216, 40, 0, .08)', muted: '#404040', rule: '#bcbcbc',
      'head-bg': '#0058f8', 'head-fg': '#ffffff',
    },
  },
  {
    id: 'crt', label: 'CRT',
    vars: {
      ...BASE,
      ink: '#33ff66', paper: '#0a140c', surface: '#0f1f12', hover: '#163a1e', 'danger-hover': '#3a1616',
      accent: '#33ff66', 'on-accent': '#0a140c', tint: 'rgba(51, 255, 102, .1)', muted: '#7fd99a', rule: '#1f5a2c',
      'head-bg': '#33ff66', 'head-fg': '#0a140c',
      scanlines: 'repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0) 0 2px, rgba(0, 0, 0, .35) 2px 3px)', silhouette: DARK_SILHOUETTE,
    },
  },
  {
    id: 'noite', label: 'Noite',
    vars: {
      ...BASE,
      ink: '#e6e1f0', paper: '#1b1726', surface: '#262036', hover: '#3a2f52', 'danger-hover': '#4a2633',
      accent: '#ff7aa8', 'on-accent': '#1b1726', tint: 'rgba(255, 122, 168, .1)', muted: '#b3abc4', rule: '#3a3350',
      'head-bg': '#0e0b16', 'head-fg': '#e6e1f0', silhouette: DARK_SILHOUETTE,
    },
  },
]

/** Declarações `--pxa-*: valor;` de um tema; o CSS usa a do Padrão como base (TEMA-03). */
export const themeVarsCss = (theme: Theme) => THEME_VARS.map((v) => `--pxa-${v}: ${theme.vars[v]};`).join(' ')

/** Aplica o tema na hora, sem recarregar (TEMA-02): as variáveis no layer sobrepõem o Padrão do CSS. */
export function applyTheme(layer: HTMLElement, id: ThemeId): void {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0]!
  for (const v of THEME_VARS) layer.style.setProperty(`--pxa-${v}`, theme.vars[v])
  layer.dataset.pxaTheme = theme.id
}
