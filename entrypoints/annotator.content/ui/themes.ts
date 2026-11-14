import type { ThemeId } from '@/lib/profile'

/** Custom properties da UI do PxA (`--pxa-<nome>`), lidas por `ui/styles.ts` (TEMA-03). */
export const THEME_VARS = ['ink', 'paper', 'surface', 'hover', 'danger-hover', 'accent', 'primary', 'on-accent', 'tint', 'muted', 'rule', 'head-bg', 'head-fg'] as const
export type ThemeVar = (typeof THEME_VARS)[number]

export interface Theme {
  id: ThemeId
  label: string
  vars: Record<ThemeVar, string>
}

/** Paletas (TEMA-01). Contraste texto/fundo ≥ 4.5 verificado em teste (TEMA-05). Marcadores ficam fora (TEMA-04). */
export const THEMES: readonly Theme[] = [
  {
    id: 'padrao', label: 'Padrão',
    vars: {
      ink: '#1a1226', paper: '#fffaf0', surface: '#ffffff', hover: '#ffe1ec', 'danger-hover': '#ffd0d8',
      accent: '#ff3e7f', primary: '#e0266b', 'on-accent': '#ffffff', tint: 'rgba(255, 62, 127, .08)', muted: '#5b5266', rule: '#d8cfc0',
      'head-bg': '#1a1226', 'head-fg': '#ffffff',
    },
  },
  {
    id: 'noite', label: 'Noite',
    vars: {
      ink: '#e6e1f0', paper: '#1b1726', surface: '#262036', hover: '#3a2f52', 'danger-hover': '#4a2633',
      accent: '#ff7aa8', primary: '#ff7aa8', 'on-accent': '#1b1726', tint: 'rgba(255, 122, 168, .1)', muted: '#b3abc4', rule: '#3a3350',
      'head-bg': '#0e0b16', 'head-fg': '#e6e1f0',
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
