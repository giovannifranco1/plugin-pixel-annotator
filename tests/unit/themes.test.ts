import { describe, expect, test } from 'vitest'
import { contrastRatio } from '@/lib/contrast'
import { THEME_IDS } from '@/lib/profile'
import { STYLES } from '@/entrypoints/annotator.content/ui/styles'
import { applyTheme, THEME_VARS, THEMES } from '@/entrypoints/annotator.content/ui/themes'

describe('contraste', () => {
  test('TEMA-05 razão WCAG: preto/branco = 21, cor igual = 1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ff3e7f', '#ff3e7f')).toBe(1)
  })
})

describe('temas', () => {
  test('TEMA-01 só Padrão e Noite', () => {
    expect(THEMES.map((t) => t.label)).toEqual(['Padrão', 'Noite'])
    expect(THEMES.map((t) => t.id)).toEqual([...THEME_IDS])
  })

  test('TEMA-03 todo tema define todas as variáveis', () => {
    for (const t of THEMES) expect(Object.keys(t.vars).sort()).toEqual([...THEME_VARS].sort())
  })

  test('TEMA-03 o CSS usa as variáveis; o Padrão é o valor de .pxa-layer', () => {
    const padrao = THEMES[0]!
    for (const v of THEME_VARS) {
      expect(STYLES).toContain(`--pxa-${v}: ${padrao.vars[v]};`)
      expect(STYLES).toContain(`var(--pxa-${v})`)
    }
  })

  test('TEMA-03 nenhuma cor fixa fora de .pxa-layer e do marcador', () => {
    const rules = STYLES.split('}').filter((r) => !r.includes('.pxa-layer {') && !r.includes('.pxa-marker {') && !r.includes('.pxa-mascot'))
    for (const r of rules) expect(r).not.toMatch(/#[0-9a-f]{3,6}\b|rgba?\(/i)
  })

  test('TEMA-04 marcador não usa variáveis de tema', () => {
    const marker = STYLES.slice(STYLES.indexOf('.pxa-marker {'), STYLES.indexOf('}', STYLES.indexOf('.pxa-marker {')))
    expect(marker).not.toContain('var(--pxa-')
  })

  test('TEMA-05 contraste ≥ 4.5 entre texto e fundo no painel e no editor', () => {
    const pairs: Array<[string, string]> = [
      ['ink', 'paper'], ['ink', 'surface'], ['ink', 'hover'], ['ink', 'danger-hover'],
      ['on-accent', 'primary'], ['muted', 'paper'], ['head-fg', 'head-bg'],
    ]
    for (const t of THEMES) {
      for (const [fg, bg] of pairs) {
        const ratio = contrastRatio(t.vars[fg as keyof typeof t.vars]!, t.vars[bg as keyof typeof t.vars]!)
        expect.soft(ratio, `${t.id}: ${fg}/${bg}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  test('TEMA-05 Padrão: botão principal com texto branco sobre rosa escuro (pedido do dev)', () => {
    expect(THEMES[0]!.vars['on-accent']).toBe('#ffffff')
    expect(THEMES[0]!.vars.primary).toBe('#e0266b')
    expect(THEMES[0]!.vars.accent).toBe('#ff3e7f') // destaque e contornos continuam no rosa da marca
  })

  test('TEMA-02 applyTheme troca as variáveis no layer, na hora', () => {
    const layer = document.createElement('div')
    applyTheme(layer, 'noite')
    expect(layer.style.getPropertyValue('--pxa-paper')).toBe(THEMES[1]!.vars.paper)
    expect(layer.dataset.pxaTheme).toBe('noite')
    applyTheme(layer, 'padrao')
    expect(layer.style.getPropertyValue('--pxa-paper')).toBe(THEMES[0]!.vars.paper)
  })
})
