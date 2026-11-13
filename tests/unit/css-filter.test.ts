import { describe, expect, test } from 'vitest'
import { compactCss, CSS_PROPERTIES, filterCss } from '@/lib/css-filter'

const base = (over: Record<string, string> = {}) => {
  const out: Record<string, string> = {}
  for (const p of CSS_PROPERTIES) out[p] = 'x'
  return { ...out, ...over }
}

describe('css-filter', () => {
  test('CAPT-06 remove valores iguais ao default', () => {
    const r = Object.fromEntries(filterCss(base({ 'font-size': '16px' }), base({ 'font-size': '14px' })))
    expect(r['font-size']).toBe('16px')
    expect(r.color).toBeUndefined()
  })

  test('CAPT-06 sempre mantém display, width e height', () => {
    const r = Object.fromEntries(filterCss(base(), base()))
    expect(Object.keys(r).sort()).toEqual(['display', 'height', 'width'])
  })

  test('CAPT-06 respeita ordem da lista fixa', () => {
    const r = filterCss(base({ color: 'red', display: 'flex', 'margin-top': '4px' }), base())
    const props = r.map(([p]) => p)
    const idx = props.map((p) => CSS_PROPERTIES.indexOf(p))
    expect(idx).toEqual([...idx].sort((a, b) => a - b))
  })

  test('CAPT-06 ignora propriedades fora da lista', () => {
    const r = Object.fromEntries(filterCss({ ...base(), cursor: 'pointer' }, base()))
    expect(r.cursor).toBeUndefined()
  })

  test('EXPO-02 compacta 4 lados iguais', () => {
    const r = compactCss([['display', 'block'], ['margin-top', '8px'], ['margin-right', '8px'], ['margin-bottom', '8px'], ['margin-left', '8px'], ['color', 'red']])
    expect(r).toEqual([['display', 'block'], ['margin', '8px'], ['color', 'red']])
  })

  test('EXPO-02 não compacta lados diferentes ou ausentes', () => {
    const diff: Array<[string, string]> = [['padding-top', '1px'], ['padding-right', '2px'], ['padding-bottom', '1px'], ['padding-left', '2px']]
    expect(compactCss(diff)).toEqual(diff)
    const missing: Array<[string, string]> = [['margin-top', '8px'], ['margin-right', '8px']]
    expect(compactCss(missing)).toEqual(missing)
  })
})
