import { describe, expect, test } from 'vitest'
import {
  auditHeadline, buildAuditReport, colorDistance, findingNote, flagTexts, isOnScale, normalizeColor, parsePx, scaleNeighbors,
  type AuditSample, type SpacingProp,
} from '@/lib/design-audit'

const sample = (s: Partial<Omit<AuditSample, 'spacings'>> & { spacings?: Array<[SpacingProp, string]> } = {}): AuditSample => ({
  background: '', colors: [], fontSize: '', fontFamily: '', area: 100, ...s, spacings: (s.spacings ?? []).map(([prop, value]) => ({ prop, value })),
})
const times = (n: number, s: Parameters<typeof sample>[0]) => Array.from({ length: n }, () => sample(s))
const pad = (v: string): Array<[SpacingProp, string]> => [['padding-top', v], ['padding-right', v], ['padding-bottom', v], ['padding-left', v]]

describe('design-audit', () => {
  test('DETE-08 normalizeColor converte formatos modernos e ignora transparente', () => {
    expect(normalizeColor('rgb(122, 122, 122)')).toBe('#7a7a7a')
    expect(normalizeColor('rgba(0, 0, 0, 0.5)')).toBe('#00000080')
    expect(normalizeColor('oklch(0.627955 0.257683 29.2339)')).toBe('#ff0000')
    expect(normalizeColor('color(srgb 0.838902 0.90902 0.858824)')).toBe('#d6e8db')
    expect(normalizeColor('transparent')).toBeNull()
    expect(normalizeColor('rgba(0, 0, 0, 0)')).toBeNull()
    expect(normalizeColor('hwb(0 0% 0%)')).toBeNull()
  })

  test('DETE-03 colorDistance em Lab', () => {
    expect(colorDistance('#7a7a7a', '#7a7a7a')).toBe(0)
    expect(colorDistance('#7a7a7a', '#777777')).toBeLessThanOrEqual(5)
    expect(colorDistance('#000000', '#ffffff')).toBeGreaterThan(50)
  })

  test('DETE-03 escala de 4px aceita os meios passos do Tailwind abaixo de 16px e 0,5px de folga', () => {
    for (const px of [1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 2.1, 11.6, 40.4]) expect(isOnScale(px, 4), `${px}`).toBe(true)
    for (const px of [3, 5, 7, 9, 13, 15, 18, 22, 12.5, 39.36]) expect(isOnScale(px, 4), `${px}`).toBe(false)
  })

  test('DETE-03 escala de 8px aceita 1, 2 e 4px', () => {
    for (const px of [1, 2, 4, 8, 16, 24]) expect(isOnScale(px, 8), `${px}`).toBe(true)
    for (const px of [6, 10, 12, 14, 20]) expect(isOnScale(px, 8), `${px}`).toBe(false)
  })

  test('DETE-05 scaleNeighbors sugere o valor permitido abaixo e acima', () => {
    expect(scaleNeighbors(13, 4)).toEqual([12, 14])
    expect(scaleNeighbors(7, 4)).toEqual([6, 8])
    expect(scaleNeighbors(18, 4)).toEqual([16, 20])
    expect(scaleNeighbors(12, 8)).toEqual([8, 16])
    expect(scaleNeighbors(3, 8)).toEqual([2, 4])
  })

  test('DETE-02 parsePx: auto/normal/percentual fora, negativo vira absoluto', () => {
    expect(parsePx('auto')).toBeNull()
    expect(parsePx('50%')).toBeNull()
    expect(parsePx('-12px')).toBe(12)
    expect(parsePx('13.333px')).toBe(13.33)
  })

  test('DETE-02 quatro seções; zeros fora; conta elementos distintos; propriedades agregadas', () => {
    const r = buildAuditReport([
      sample({ colors: ['rgb(0, 0, 0)', 'rgb(0, 0, 0)'], fontSize: '16px', fontFamily: '"Inter", sans-serif', spacings: [...pad('8px'), ['margin-top', '0px']] }),
      sample({ colors: ['rgb(0, 0, 0)'], fontSize: '14px', fontFamily: 'Inter', spacings: [['row-gap', '8px'], ['column-gap', '8px']] }),
    ], 4)
    expect(r.colors).toMatchObject([{ value: '#000000', count: 2, elements: [0, 1] }])
    expect(r.fontSizes.map((e) => e.value).sort()).toEqual(['14px', '16px'])
    expect(r.families).toMatchObject([{ value: 'Inter', count: 2 }])
    expect(r.spacings).toHaveLength(1) // 0px não entra
    expect(r.spacings[0]).toMatchObject({ value: '8px', count: 2, props: ['padding', 'gap'] })
  })

  test('DETE-03 cor parecida só quando rara perto da mais usada; duas bem usadas são tokens', () => {
    const r = buildAuditReport([
      ...times(30, { colors: ['rgb(119, 119, 119)'] }),
      sample({ colors: ['rgb(122, 122, 122)'] }), // rara e perto → Achado
      ...times(10, { colors: ['rgb(116, 116, 116)'] }), // perto, mas 10 usos (> 10% de 30) → token
      sample({ colors: ['rgba(122, 122, 122, 0.5)'] }), // translúcida não compara com opaca
    ], 4)
    const by = (v: string) => r.colors.find((e) => e.value === v)!
    expect(by('#7a7a7a')).toMatchObject({ flags: ['similar'], similarTo: '#777777', suggestion: 'usar #777777' })
    expect(by('#747474').flags).toEqual([])
    expect(by('#777777').flags).toEqual([])
    expect(by('#7a7a7a80').flags).toEqual([])
  })

  test('DETE-03 dois valores raros parecidos entre si não são Achado: falta uma referência clara (3× mais usada)', () => {
    const r = buildAuditReport([sample({ background: 'rgb(220, 252, 231)' }), sample({ background: 'rgb(208, 250, 229)' }), ...times(2, { fontSize: '12px' }), sample({ fontSize: '13px' })], 4)
    expect(r.colors.every((e) => e.flags.length === 0)).toBe(true)
    expect(r.fontSizes.every((e) => e.flags.length === 0)).toBe(true)
  })

  test('DETE-03 valor parecido usado mais de 5 vezes é token, mesmo perto de um muito usado', () => {
    const r = buildAuditReport([...times(400, { fontSize: '13px' }), ...times(33, { fontSize: '12px' }), ...times(5, { fontSize: '14px' })], 4)
    expect(r.fontSizes.find((e) => e.value === '12px')!.flags).toEqual([])
    expect(r.fontSizes.find((e) => e.value === '14px')!.flags).toEqual(['similar'])
  })

  test('DETE-03 cor de fundo que cobre boa parte da página é superfície, não cor perdida', () => {
    const r = buildAuditReport([
      sample({ background: 'rgb(255, 255, 255)', area: 1000 }), // página
      ...times(9, { background: 'rgb(255, 255, 255)', area: 10 }),
      sample({ background: 'rgb(246, 246, 239)', area: 800 }), // superfície grande, 1 elemento
      sample({ background: 'rgb(250, 250, 250)', area: 20 }), // cartão pequeno quase branco
    ], 4)
    expect(r.colors.find((e) => e.value === '#f6f6ef')!.flags).toEqual([])
    expect(r.colors.find((e) => e.value === '#fafafa')!.flags).toEqual(['similar'])
  })

  test('DETE-03 aviso quando a página não segue a escala: menos da metade dos usos na escala', () => {
    expect(buildAuditReport([...times(3, { spacings: [['margin-top', '4.8px']] }), sample({ spacings: [['margin-top', '8px']] })], 4).scaleFit).toBe(0.25)
    expect(buildAuditReport([], 4).scaleFit).toBe(1)
  })

  test('DETE-03 tamanho de fonte a até 1px de um popular e raro vira Achado', () => {
    const r = buildAuditReport([...times(20, { fontSize: '14px', fontFamily: 'Inter' }), sample({ fontSize: '13px', fontFamily: 'Inter' }), sample({ fontSize: '96px', fontFamily: 'Inter' })], 4)
    expect(r.fontSizes.find((e) => e.value === '13px')).toMatchObject({ flags: ['similar'], similarTo: '14px', suggestion: 'usar 14px' })
    expect(r.fontSizes.find((e) => e.value === '96px')!.flags).toEqual([]) // raro, mas longe: é intencional
  })

  test('DETE-03 família padrão do navegador em poucos elementos quando a página usa outra', () => {
    const r = buildAuditReport([...times(30, { fontSize: '14px', fontFamily: '"Inter", sans-serif' }), sample({ fontSize: '13.33px', fontFamily: 'system-ui' }), sample({ fontSize: '14px', fontFamily: '"JetBrains Mono", monospace' })], 4)
    expect(r.families.find((e) => e.value === 'system-ui')).toMatchObject({ flags: ['default-font'], similarTo: 'Inter', suggestion: 'usar font-family: inherit' })
    expect(r.families.find((e) => e.value === 'JetBrains Mono')!.flags).toEqual([])
    const plain = buildAuditReport([...times(5, { fontSize: '16px', fontFamily: 'Arial' }), sample({ fontSize: '16px', fontFamily: 'Times New Roman' })], 4)
    expect(plain.families.find((e) => e.value === 'Times New Roman')!.flags).toEqual([]) // a página toda já é fonte padrão
  })

  test('DETE-03 espaçamento fora da escala com sugestão; marcados primeiro', () => {
    const r = buildAuditReport([...times(5, { spacings: pad('16px') }), sample({ spacings: [['padding-left', '13px'], ['padding-right', '13px']] })], 4)
    expect(r.spacings[0]).toMatchObject({ value: '13px', flags: ['off-scale'], props: ['padding-right', 'padding-left'], suggestion: 'usar 12px ou 14px' })
    expect(r.offScale).toBe(1)
  })

  test('DETE-02 cabeçalho com cores, tamanhos, famílias e espaçamentos fora da escala', () => {
    const r = buildAuditReport([sample({ colors: ['rgb(1, 2, 3)', 'rgb(200, 0, 0)'], fontSize: '12px', fontFamily: 'Inter', spacings: [['margin-top', '13px'], ['margin-left', '7px']] })], 4)
    expect(auditHeadline(r)).toBe('2 cores · 1 tamanho de fonte · 1 família · 2 espaçamentos fora da escala de 4px')
    const none = buildAuditReport([], 8)
    expect(auditHeadline(none)).toBe('0 cores · 0 tamanhos de fonte · 0 famílias · 0 espaçamentos fora da escala de 8px')
  })

  test('DETE-05 notas dizem a propriedade e o que usar', () => {
    const r = buildAuditReport([
      ...times(3, { spacings: [['padding-top', '13px'], ['padding-bottom', '13px']] }),
      ...times(30, { colors: ['rgb(119, 119, 119)'], fontSize: '14px', fontFamily: 'Inter' }),
      sample({ colors: ['rgb(122, 122, 122)'], fontSize: '13px', fontFamily: 'Times New Roman' }),
    ], 4)
    const one = (list: typeof r.colors, v: string) => list.find((e) => e.value === v)!
    expect(findingNote('spacing', one(r.spacings, '13px'), 4)).toBe('[Raio-X] espaçamento 13px (padding-top, padding-bottom) fora da escala de 4px: usar 12px ou 14px (3 elementos)')
    expect(findingNote('color', one(r.colors, '#7a7a7a'), 4)).toBe('[Raio-X] cor #7a7a7a parecida com #777777: usar #777777 (1 elemento)')
    expect(findingNote('font-size', one(r.fontSizes, '13px'), 4)).toBe('[Raio-X] tamanho de fonte 13px parecido com 14px: usar 14px (1 elemento)')
    expect(findingNote('font-family', one(r.families, 'Times New Roman'), 4)).toBe('[Raio-X] família Times New Roman é a fonte padrão do navegador (a página usa Inter): usar font-family: inherit (1 elemento)')
    expect(flagTexts('font-family', one(r.families, 'Times New Roman'), 4)).toEqual(['fonte padrão do navegador'])
    expect(flagTexts('spacing', one(r.spacings, '13px'), 4)).toEqual(['fora da escala de 4px'])
  })
})
