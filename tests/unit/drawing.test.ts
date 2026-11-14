import { describe, expect, test } from 'vitest'
import { blockFor, DRAW_COLORS, rasterLine, rasterStroke, snap } from '@/lib/drawing'
import type { Stroke } from '@/lib/types'

const B = 2
const has = (blocks: Array<[number, number]>, x: number, y: number) => blocks.some(([bx, by]) => bx === x && by === y)
/** Blocos consecutivos de uma linha encostam (diferença de no máximo 1 bloco por eixo). */
const continuous = (blocks: Array<[number, number]>, block: number) =>
  blocks.every((b, i) => i === 0 || (Math.abs(b[0] - blocks[i - 1]![0]) <= block && Math.abs(b[1] - blocks[i - 1]![1]) <= block))

describe('drawing', () => {
  test('DESE-02 snap alinha à grade de blocos', () => {
    expect(snap([5.7, 3.1], 2)).toEqual([4, 2])
    expect(snap([7, 9], 4)).toEqual([4, 8])
  })

  test('DESE-02 blocos sempre alinhados à grade de 2px (sem antialias)', () => {
    const blocks = rasterStroke({ tool: 'brush', color: '#ff3e7f', points: [[1, 1], [33, 17], [10, 40]] }, B)
    expect(blocks.length).toBeGreaterThan(10)
    expect(blocks.every(([x, y]) => x % B === 0 && y % B === 0)).toBe(true)
  })

  test('DESE-02 linha contínua, sem buracos, dos dois extremos', () => {
    const line = rasterLine([0, 0], [41, 13], B)
    expect(line[0]).toEqual([0, 0])
    expect(line.at(-1)).toEqual([40, 12])
    expect(continuous(line, B)).toBe(true)
    expect(rasterLine([10, 10], [10, 10], B)).toEqual([[10, 10]])
  })

  test('DESE-02 pincel sem blocos repetidos', () => {
    const blocks = rasterStroke({ tool: 'brush', color: '#fff', points: [[0, 0], [10, 0], [0, 0]] }, B)
    expect(new Set(blocks.map(String)).size).toBe(blocks.length)
    expect(blocks).toHaveLength(6)
  })

  test('DESE-02 seta tem a haste e duas pontas voltando da ponta', () => {
    const arrow = rasterStroke({ tool: 'arrow', color: '#fff', points: [[0, 50], [100, 50]] }, B)
    expect(has(arrow, 0, 50) && has(arrow, 100, 50)).toBe(true)
    // pontas a 30° voltando da ponta (100, 50): uma acima e uma abaixo da haste, atrás da ponta
    expect(arrow.some(([x, y]) => x < 100 && x > 70 && y < 44)).toBe(true)
    expect(arrow.some(([x, y]) => x < 100 && x > 70 && y > 56)).toBe(true)
  })

  test('DESE-02 círculo inscrito no retângulo arrastado (encosta nas 4 bordas, centro vazio)', () => {
    const circle = rasterStroke({ tool: 'circle', color: '#fff', points: [[60, 40], [20, 0]] }, B)
    const xs = circle.map(([x]) => x)
    const ys = circle.map(([, y]) => y)
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([20, 60, 0, 40])
    expect(has(circle, 40, 20)).toBe(false)
    expect(continuous(circle, B)).toBe(true)
  })

  test('DESE-02 X cruza as duas diagonais do retângulo', () => {
    const x = rasterStroke({ tool: 'cross', color: '#fff', points: [[0, 0], [20, 20]] }, B)
    for (const p of [[0, 0], [20, 20], [20, 0], [0, 20], [10, 10]] as const) expect(has(x, p[0], p[1])).toBe(true)
  })

  test('DESE-02 forma com um ponto só vira um bloco', () => {
    const one: Stroke = { tool: 'circle', color: '#fff', points: [[5, 5]] }
    expect(rasterStroke(one, B)).toEqual([[4, 4]])
    expect(rasterStroke({ ...one, points: [] }, B)).toEqual([])
  })

  test('DESE-02 blockFor: 2px CSS na escala do print (DPR)', () => {
    expect(blockFor(1)).toBe(2)
    expect(blockFor(2)).toBe(4)
    expect(blockFor(3)).toBe(6)
    expect(blockFor(1.25)).toBe(2)
  })

  test('DESE-02 três cores: rosa do PxA, amarelo e ciano', () => {
    expect(Object.keys(DRAW_COLORS)).toEqual(['rosa', 'amarelo', 'ciano'])
    expect(DRAW_COLORS.rosa).toBe('#ff3e7f')
  })
})
