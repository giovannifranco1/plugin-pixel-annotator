import { describe, expect, test } from 'vitest'
import { physicalPoint, sampleWindow, toHex, type Pixels } from '@/lib/loupe'

/** Imagem w×h onde o pixel (x, y) tem cor (x, y, 7). */
function gradient(width: number, height: number): Pixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set([x, y, 7, 255], (y * width + x) * 4)
  }
  return { width, height, data }
}

describe('loupe', () => {
  test('LUPA-04 physicalPoint usa a escala print/viewport (DPR)', () => {
    expect(physicalPoint(10.6, 20.2, { width: 200, height: 100 }, 100, 50)).toEqual({ x: 21, y: 40 })
    expect(physicalPoint(10.6, 20.2, { width: 100, height: 50 }, 100, 50)).toEqual({ x: 10, y: 20 })
  })

  test('LUPA-01 sampleWindow: 15×15 hex, centro no ponto, null fora do print', () => {
    const img = gradient(40, 40)
    const win = sampleWindow(img, 20, 30)
    expect(win).toHaveLength(225)
    expect(win[112]).toBe(toHex(20, 30, 7)) // centro
    expect(win[0]).toBe(toHex(13, 23, 7))
    const corner = sampleWindow(img, 0, 0)
    expect(corner[0]).toBeNull()
    expect(corner[112]).toBe('#000007')
  })

  test('LUPA-01 toHex', () => {
    expect(toHex(255, 0, 16)).toBe('#ff0010')
  })
})
