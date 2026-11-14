import { describe, expect, test, vi } from 'vitest'
import { createStore } from '@/lib/store'
import { settle, syncStore, type PersistBatch } from '@/lib/persist'
import { annotation, draft } from './fixtures/annotations'

let n = 0
const uuid = () => `id-${++n}`

function setup(initial?: Parameters<typeof createStore>[2]) {
  const batches: PersistBatch[] = []
  const store = createStore(undefined, uuid, initial)
  const backend = { write: vi.fn(async (b: PersistBatch) => { batches.push(b) }) }
  syncStore(store, backend)
  return { store, batches, backend }
}

describe('persistência (PERS-01)', () => {
  test('nova anotação vira um put com o meta atualizado', async () => {
    const { store, batches } = setup()
    const a = store.add(draft({ note: 'x' }))
    await settle()
    expect(batches).toHaveLength(1)
    expect(batches[0]!.put.map((x) => x.id)).toEqual([a.id])
    expect(batches[0]!.del).toEqual([])
    expect(batches[0]!.meta).toEqual({ nextNumber: 2, dirty: true })
  })

  test('mudanças do mesmo tick saem num lote só; editar grava só a editada', async () => {
    const { store, batches } = setup()
    const a = store.add(draft())
    const b = store.add(draft())
    await settle()
    expect(batches).toHaveLength(1)
    expect(batches[0]!.put).toHaveLength(2)
    store.updateNote(b.id, 'nova nota')
    await settle()
    expect(batches[1]!.put.map((x) => x.id)).toEqual([b.id])
    expect(batches[1]!.put[0]!.note).toBe('nova nota')
    expect(a.id).not.toBe(b.id)
  })

  test('excluir e limpar viram del; exportar grava só o meta', async () => {
    const { store, batches } = setup()
    const a = store.add(draft())
    const b = store.add(draft())
    await settle()
    store.remove(a.id)
    await settle()
    expect(batches.at(-1)).toMatchObject({ put: [], del: [a.id] })
    store.markExported()
    await settle()
    expect(batches.at(-1)).toMatchObject({ put: [], del: [], meta: { dirty: false } })
    store.clear()
    await settle()
    expect(batches.at(-1)).toMatchObject({ put: [], del: [b.id], meta: { nextNumber: 3, dirty: false } })
  })

  test('store que nasce do que foi salvo: ordem por número, contador continua e nada é regravado', async () => {
    const saved = [annotation(5), annotation(2)]
    const { store, backend } = setup({ items: saved, meta: { nextNumber: 7, dirty: true } })
    expect(store.list().map((a) => a.number)).toEqual([2, 5])
    expect(store.isDirty()).toBe(true)
    await settle()
    expect(backend.write).not.toHaveBeenCalled()
    expect(store.add(draft()).number).toBe(7) // numeração nunca reaproveitada (PAIN-04)
  })

  test('contador salvo menor que o maior número não reaproveita número', () => {
    const store = createStore(undefined, uuid, { items: [annotation(9)], meta: { nextNumber: 3, dirty: false } })
    expect(store.add(draft()).number).toBe(10)
  })

  test('falha ao gravar chama onError e não trava as próximas escritas', async () => {
    const store = createStore(undefined, uuid)
    const onError = vi.fn()
    const write = vi.fn().mockRejectedValueOnce(new Error('cota')).mockResolvedValue(undefined)
    syncStore(store, { write }, onError)
    store.add(draft())
    await settle()
    store.add(draft())
    await settle()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledTimes(2)
  })
})

