import { describe, expect, test } from 'vitest'
import { createKonami, KONAMI } from '@/lib/konami'

const feed = (keys: readonly string[]) => {
  const match = createKonami()
  return keys.map(match)
}

describe('konami', () => {
  test('EGG-01 sequência completa casa só no último passo', () => {
    const r = feed(KONAMI)
    expect(r.slice(0, -1).every((x) => !x)).toBe(true)
    expect(r.at(-1)).toBe(true)
  })

  test('EGG-01 B e A maiúsculas também valem', () => {
    expect(feed([...KONAMI.slice(0, 8), 'B', 'A']).at(-1)).toBe(true)
  })

  test('EGG-01 tecla errada reinicia', () => {
    expect(feed([...KONAMI.slice(0, 5), 'x', ...KONAMI.slice(5)]).at(-1)).toBe(false)
  })

  test('EGG-01 tecla errada que é o início conta como 1º passo (↑↑↑↓↓…)', () => {
    expect(feed(['ArrowUp', ...KONAMI]).at(-1)).toBe(true)
  })

  test('EGG-01 casa de novo depois de completar', () => {
    expect(feed([...KONAMI, ...KONAMI]).filter(Boolean)).toHaveLength(2)
  })
})

test('EGG-01 ↑ no meio da sequência recomeça do ↑', () => {
  expect(feed(['ArrowUp', 'ArrowUp', 'ArrowDown', ...KONAMI]).at(-1)).toBe(true)
})
