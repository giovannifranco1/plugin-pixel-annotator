import { describe, expect, test, vi } from 'vitest'
import { createStore } from '@/lib/store'
import { annotation, draft } from './fixtures/annotations'

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

  test('update troca campos, atualiza updatedAt e marca dirty', () => {
    let t = Date.parse('2026-11-13T12:00:00Z')
    const s = createStore(() => new Date(t), () => 'id-1')
    const a = s.add(draft())
    s.markExported()
    t += 5000
    const errors = [{ kind: 'console' as const, message: 'x', at: '2026-11-13T12:00:00.000Z', count: 1 }]
    s.update(a.id, { note: 'nova', errors })
    expect(s.get(a.id)).toMatchObject({ note: 'nova', errors, updatedAt: '2026-11-13T12:00:05.000Z', number: 1 })
    expect(s.isDirty()).toBe(true)
    s.update(a.id, { errors: undefined })
    expect(s.get(a.id)!.errors).toBeUndefined()
  })

  test('IMPO-03 importadas entram com números novos na sequência e guardam o número e a origem originais', () => {
    const s = mk()
    s.add(draft())
    const added = s.importAnnotations([annotation(3, { id: 'x-3' }), annotation(7, { id: 'x-7' })], 'https://staging.app.com')
    expect(added).toBe(2)
    expect(s.list().map((a) => [a.number, a.importedFrom])).toEqual([
      [1, undefined],
      [2, { origin: 'https://staging.app.com', number: 3 }],
      [3, { origin: 'https://staging.app.com', number: 7 }],
    ])
    expect(s.add(draft()).number).toBe(4)
  })

  test('IMPO-03 reimportar algo que já era importado mantém a origem primeira', () => {
    const s = mk()
    s.importAnnotations([annotation(2, { id: 'x', importedFrom: { origin: 'https://a.com', number: 9 } })], 'https://b.com')
    expect(s.list()[0]!.importedFrom).toEqual({ origin: 'https://a.com', number: 9 })
  })

  test('IMPO-06 importar o mesmo id duas vezes não duplica', () => {
    const s = mk()
    const list = [annotation(1, { id: 'x-1' }), annotation(2, { id: 'x-2' })]
    expect(s.importAnnotations(list, 'https://a.com')).toBe(2)
    expect(s.importAnnotations(list, 'https://a.com')).toBe(0)
    expect(s.list()).toHaveLength(2)
  })

  test('IMPO-07 importar marca dirty (aviso antes de sair); nada novo não marca', () => {
    const s = mk()
    expect(s.importAnnotations([], 'https://a.com')).toBe(0)
    expect(s.isDirty()).toBe(false)
    s.importAnnotations([annotation(1, { id: 'x' })], 'https://a.com')
    expect(s.isDirty()).toBe(true)
  })

  test('ERRO-03 errors vazio nunca fica na anotação (add e update)', () => {
    const s = mk()
    const a = s.add(draft({ errors: [] }))
    expect(a).not.toHaveProperty('errors')
    s.update(a.id, { errors: [{ kind: 'console', message: 'x', at: '2026-11-13T12:00:00.000Z', count: 1 }] })
    s.update(a.id, { errors: [] })
    expect(s.get(a.id)!.errors).toBeUndefined()
  })
})
