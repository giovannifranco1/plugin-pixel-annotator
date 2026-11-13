import { expect, test } from 'vitest'
import { isFullyVisible, planCrop } from '@/lib/crop'

test('CAPT-07 aplica margem de 16px e escala 2x', () => {
  const p = planCrop({ x: 100, y: 100, width: 50, height: 20 }, 400, 300, 800, 600)
  expect(p.crop).toEqual({ x: 168, y: 168, width: 164, height: 104 })
  expect(p.outline).toEqual({ x: 32, y: 32, width: 100, height: 40 })
  expect(p.partial).toBe(false)
  expect(p.scale).toBe(2)
})

test('CAPT-07 margem limitada às bordas', () => {
  const p = planCrop({ x: 4, y: 4, width: 10, height: 10 }, 400, 300, 800, 600)
  expect(p.crop.x).toBe(0)
  expect(p.outline.x).toBe(8)
})

test('CAPT-08 elemento maior que o viewport é parcial', () => {
  const p = planCrop({ x: 0, y: -50, width: 400, height: 900 }, 400, 300, 800, 600)
  expect(p.partial).toBe(true)
  expect(p.crop.x).toBeGreaterThanOrEqual(0)
  expect(p.crop.y).toBeGreaterThanOrEqual(0)
  expect(p.crop.x + p.crop.width).toBeLessThanOrEqual(800)
  expect(p.crop.y + p.crop.height).toBeLessThanOrEqual(600)
})

test('CAPT-08 isFullyVisible', () => {
  expect(isFullyVisible({ x: 10, y: 10, width: 10, height: 10 }, 400, 300)).toBe(true)
  expect(isFullyVisible({ x: 395, y: 10, width: 10, height: 10 }, 400, 300)).toBe(false)
})
