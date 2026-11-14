import { describe, expect, test } from 'vitest'
import { parseCssColor, toHex } from '@/lib/color'

const hex = (css: string) => {
  const c = parseCssColor(css)
  return c && toHex(c.r, c.g, c.b)
}

describe('color', () => {
  test('DETE-08 hex e rgb() legados', () => {
    expect(parseCssColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 })
    expect(parseCssColor('#11223380')).toEqual({ r: 17, g: 34, b: 51, a: 128 / 255 })
    expect(parseCssColor('rgba(0, 0, 0, 0.5)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 })
    expect(parseCssColor('rgb(0 0 0 / 50%)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 })
  })

  test('DETE-08 formatos modernos do vermelho sRGB viram #ff0000', () => {
    for (const css of [
      'lab(54.2917 80.8125 69.8851)',
      'lch(54.2917 106.839 40.8526)',
      'oklab(0.627955 0.224863 0.125846)',
      'oklch(0.627955 0.257683 29.2339)',
      'color(srgb 1 0 0)',
      'color(srgb-linear 1 0 0)',
    ]) expect(hex(css), css).toBe('#ff0000')
  })

  test('DETE-08 cinza do GitHub em color(srgb …) e branco/preto em lab', () => {
    expect(hex('color(srgb 0.838902 0.90902 0.858824)')).toBe('#d6e8db')
    expect(hex('lab(100 0 0)')).toBe('#ffffff')
    expect(hex('oklch(0 0 0)')).toBe('#000000')
  })

  test('DETE-08 fora do gamut é cortado; none conta como 0; alfa depois da barra', () => {
    expect(hex('color(display-p3 1 0 0)')).toBe('#ff0000')
    expect(hex('color(display-p3 0 1 0)')).toBe('#00ff00')
    expect(hex('oklch(0.627955 0.257683 none)')).toBe(hex('oklch(0.627955 0.257683 0)'))
    expect(parseCssColor('oklab(0.129999 -0.00404751 -0.027702 / 0.75)')!.a).toBe(0.75)
    expect(parseCssColor('lab(50% 0 0 / 40%)')!.a).toBe(0.4)
  })

  test('DETE-08 desconhecido ou transparente → null', () => {
    expect(parseCssColor('transparent')).toBeNull()
    expect(parseCssColor('currentcolor')).toBeNull()
    expect(parseCssColor('hwb(0 0% 0%)')).toBeNull()
    expect(parseCssColor('color(rec2020 1 0 0)')).toBeNull()
  })
})
