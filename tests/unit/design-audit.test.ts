import { describe, expect, test } from 'vitest'
import {
  auditHeadline, buildAuditReport, colorDistance, findingNote, isOnScale, normalizeColor, parsePx, type AuditSample,
} from '@/lib/design-audit'

const sample = (s: Partial<AuditSample> = {}): AuditSample => ({
  colors: [], fontSize: '16px', fontFamily: 'Arial', fontWeight: '400', spacings: [], ...s,
})

describe('design-audit', () => {
  test('DETE-07 normalizeColor converte rgb/rgba/hex e ignora transparente', () => {
    expect(normalizeColor('rgb(122, 122, 122)')).toBe('#7a7a7a')
    expect(normalizeColor('rgba(0, 0, 0, 0.5)')).toBe('#00000080')
    expect(normalizeColor('rgb(0 0 0 / 50%)')).toBe('#00000080')
    expect(normalizeColor('rgba(255, 255, 255, 1)')).toBe('#ffffff')
    expect(normalizeColor('#abc')).toBe('#aabbcc')
    expect(normalizeColor('#AABBCC')).toBe('#aabbcc')
    expect(normalizeColor('transparent')).toBeNull()
    expect(normalizeColor('rgba(0, 0, 0, 0)')).toBeNull()
    expect(normalizeColor('currentcolor')).toBeNull()
  })

  test('DETE-03 colorDistance em Lab: idênticas 0, cinzas vizinhos perto, preto e branco longe', () => {
    expect(colorDistance('#7a7a7a', '#7a7a7a')).toBe(0)
    expect(colorDistance('#7a7a7a', '#777777')).toBeLessThanOrEqual(5)
    expect(colorDistance('#000000', '#ffffff')).toBeGreaterThan(50)
    expect(colorDistance('#ff0000', '#ee0000')).toBeGreaterThan(5)
  })

  test('DETE-03 parsePx ignora auto/normal, usa valor absoluto; isOnScale com tolerância', () => {
    expect(parsePx('auto')).toBeNull()
    expect(parsePx('normal')).toBeNull()
    expect(parsePx('-12px')).toBe(12)
    expect(parsePx('13.5px')).toBe(13.5)
    expect(parsePx('0px')).toBe(0)
    expect(isOnScale(13, 4)).toBe(false)
    expect(isOnScale(12.004, 4)).toBe(true)
    expect(isOnScale(11.996, 4)).toBe(true)
    expect(isOnScale(12, 8)).toBe(false)
    expect(isOnScale(0, 4)).toBe(true)
  })

  test('DETE-02 relatório conta elementos distintos por valor nas três seções', () => {
    const r = buildAuditReport([
      sample({ colors: ['rgb(0, 0, 0)', 'rgb(0, 0, 0)', 'rgba(0, 0, 0, 0)'], spacings: ['8px', '8px', 'auto'] }),
      sample({ colors: ['rgb(0, 0, 0)'], fontSize: '13px', spacings: ['13px'] }),
      sample({ colors: ['rgb(0, 0, 0)', 'rgb(255, 255, 255)'], fontFamily: '"Inter", sans-serif', fontWeight: '700', spacings: ['-8px'] }),
    ], 4)
    expect(r.colors.find((e) => e.value === '#000000')).toMatchObject({ count: 3, elements: [0, 1, 2] })
    expect(r.colors.map((e) => e.value).sort()).toEqual(['#000000', '#ffffff'])
    expect(r.spacings.find((e) => e.value === '8px')).toMatchObject({ count: 2, elements: [0, 2] })
    expect(r.fonts.map((e) => e.value).sort()).toEqual(['13px Arial 400', '16px Arial 400', '16px Inter 700'])
    expect(r.fontSizes).toBe(2)
    expect(r.offScale).toBe(1)
  })

  test('DETE-03 marca fora da escala, órfãos (≤ 2 elementos) e cores parecidas com a semente mais usada', () => {
    const many = Array.from({ length: 4 }, () => sample({ colors: ['rgb(119, 119, 119)'], spacings: ['16px'] }))
    const r = buildAuditReport([
      ...many,
      sample({ colors: ['rgb(122, 122, 122)'], spacings: ['13px'] }),
      sample({ colors: ['rgba(122, 122, 122, 0.5)'] }),
    ], 4)
    const near = r.colors.find((e) => e.value === '#7a7a7a')!
    expect(near.flags).toEqual(expect.arrayContaining(['similar', 'orphan']))
    expect(near.similarTo).toBe('#777777')
    expect(r.colors.find((e) => e.value === '#777777')!.flags).toEqual([])
    // translúcida não é "parecida" com opaca
    expect(r.colors.find((e) => e.value === '#7a7a7a80')!.flags).not.toContain('similar')
    expect(r.spacings.find((e) => e.value === '13px')!.flags).toEqual(['off-scale', 'orphan'])
    expect(r.spacings.find((e) => e.value === '16px')!.flags).toEqual([])
    // marcados primeiro
    expect(r.spacings[0]!.value).toBe('13px')
  })

  test('DETE-03 escala de 8px marca 12px como fora', () => {
    const r = buildAuditReport(Array.from({ length: 3 }, () => sample({ spacings: ['12px'] })), 8)
    expect(r.spacings[0]).toMatchObject({ value: '12px', flags: ['off-scale'] })
    expect(r.offScale).toBe(1)
  })

  test('DETE-02 auditHeadline com plural e singular', () => {
    const r = buildAuditReport([
      sample({ colors: ['rgb(1, 2, 3)', 'rgb(200, 0, 0)'], spacings: ['13px', '7px'] }),
      sample({ fontSize: '12px' }),
    ], 4)
    expect(auditHeadline(r)).toBe('2 cores · 2 tamanhos de fonte · 2 espaçamentos fora da escala de 4px')
    const one = buildAuditReport([sample({ colors: ['rgb(1, 2, 3)'], spacings: ['13px'] })], 8)
    expect(auditHeadline(one)).toBe('1 cor · 1 tamanho de fonte · 1 espaçamento fora da escala de 8px')
  })

  test('DETE-05 findingNote descreve o motivo e a contagem', () => {
    const r = buildAuditReport([
      ...Array.from({ length: 3 }, () => sample({ spacings: ['13px'] })),
      ...Array.from({ length: 3 }, () => sample({ colors: ['rgb(119, 119, 119)'] })),
      sample({ colors: ['rgb(122, 122, 122)'], fontSize: '13px' }),
    ], 4)
    expect(findingNote('spacing', r.spacings.find((e) => e.value === '13px')!, 4)).toBe('[Raio-X] espaçamento 13px fora da escala de 4px (3 elementos)')
    expect(findingNote('color', r.colors.find((e) => e.value === '#7a7a7a')!, 4)).toBe('[Raio-X] cor #7a7a7a parecida com #777777; usada só 1× (1 elemento)')
    expect(findingNote('font', r.fonts.find((e) => e.value === '13px Arial 400')!, 4)).toBe('[Raio-X] fonte 13px Arial 400 usada só 1× (1 elemento)')
  })
})
