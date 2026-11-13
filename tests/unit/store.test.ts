import { describe, expect, test, vi } from 'vitest'
import { createStore } from '@/lib/store'
import { draft } from './fixtures/annotations'

const mk = () => { let i = 0; return createStore(() => new Date('2026-11-13T12:00:00Z'), () => `id-${++i}`) }

describe('store', () => {
  test('PAIN-01 lista em ordem de criação', () => {
    const s = mk()
    s.add(draft({ note: 'a' })); s.add(draft({ note: 'b' }))
    expect(s.list().map((a) => a.note)).toEqual(['a', 'b'])
  })

  test('PAIN-04 excluir não renumera e o próximo número continua', () => {
    const s = mk()
    const first = s.add(draft()); s.add(draft()); s.add(draft())
    s.remove(first.id)
    s.add(draft())
    expect(s.list().map((a) => a.number)).toEqual([2, 3, 4])
  })

  test('PAIN-03 updateNote altera a nota e updatedAt sem mudar o resto', () => {
    let t = new Date('2026-11-13T12:00:00Z')
    const s = createStore(() => t, () => 'x')
    const a = s.add(draft({ note: 'velha' }))
    t = new Date('2026-11-13T13:00:00Z')
    s.updateNote(a.id, 'nova')
    const b = s.list()[0]!
    expect(b.note).toBe('nova')
    expect(b.updatedAt).toBe('2026-11-13T13:00:00.000Z')
    expect({ ...b, note: a.note, updatedAt: a.updatedAt }).toEqual(a)
  })

  test('EXPO-05 clear apaga tudo', () => {
    const s = mk()
    s.add(draft()); s.add(draft())
    s.clear()
    expect(s.list()).toEqual([])
  })

  test('AVIS-01 dirty após add/update e limpo após markExported', () => {
    const s = mk()
    expect(s.isDirty()).toBe(false)
    const a = s.add(draft())
    expect(s.isDirty()).toBe(true)
    s.markExported()
    expect(s.isDirty()).toBe(false)
    s.updateNote(a.id, 'x')
    expect(s.isDirty()).toBe(true)
  })

  test('AVIS-01 copiar markdown não limpa dirty', () => {
    const s = mk()
    s.add(draft())
    // copiar markdown não chama markExported
    expect(s.isDirty()).toBe(true)
  })

  test('PAIN-01 subscribe notifica e unsubscribe para de notificar', () => {
    const s = mk()
    const l = vi.fn()
    const off = s.subscribe(l)
    s.add(draft())
    expect(l).toHaveBeenCalledTimes(1)
    off()
    s.add(draft())
    expect(l).toHaveBeenCalledTimes(1)
  })
})
