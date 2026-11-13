import { describe, expect, test } from 'vitest'
import { breakpointOf, categoryOf, orientationOf, readViewport } from '@/lib/viewport'

describe('viewport', () => {
  test('CAPT-03 breakpoint nas fronteiras', () => {
    const cases: Array<[number, string]> = [[639, 'base'], [640, 'sm'], [767, 'sm'], [768, 'md'], [1023, 'md'], [1024, 'lg'], [1279, 'lg'], [1280, 'xl'], [1535, 'xl'], [1536, '2xl']]
    for (const [w, bp] of cases) expect(breakpointOf(w), `${w}px`).toBe(bp)
  })

  test('CAPT-03 categoria', () => {
    const cases: Array<[number, string]> = [[390, 'mobile'], [767, 'mobile'], [768, 'tablet'], [1023, 'tablet'], [1024, 'desktop'], [1440, 'desktop']]
    for (const [w, c] of cases) expect(categoryOf(w), `${w}px`).toBe(c)
  })

  test('CAPT-03 orientação', () => {
    expect(orientationOf(390, 844)).toBe('retrato')
    expect(orientationOf(844, 390)).toBe('paisagem')
    expect(orientationOf(500, 500)).toBe('retrato')
  })

  test('CAPT-03 readViewport monta tudo', () => {
    expect(readViewport({ innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 })).toEqual({
      width: 390, height: 844, breakpoint: 'base', category: 'mobile', dpr: 3, orientation: 'retrato',
    })
  })
})
