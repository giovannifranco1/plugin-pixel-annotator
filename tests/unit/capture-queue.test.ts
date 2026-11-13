import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createCaptureQueue } from '@/lib/capture-queue'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

test('fila executa em ordem FIFO', async () => {
  let n = 0
  const q = createCaptureQueue(async () => ++n)
  const all = Promise.all([q.enqueue(), q.enqueue(), q.enqueue()])
  await vi.runAllTimersAsync()
  expect(await all).toEqual([1, 2, 3])
})

test('respeita intervalo mínimo de 550ms entre capturas', async () => {
  const stamps: number[] = []
  const q = createCaptureQueue(async () => { stamps.push(Date.now()); return 1 })
  const all = Promise.all([q.enqueue(), q.enqueue(), q.enqueue()])
  await vi.runAllTimersAsync()
  await all
  expect(stamps[1]! - stamps[0]!).toBeGreaterThanOrEqual(550)
  expect(stamps[2]! - stamps[1]!).toBeGreaterThanOrEqual(550)
})

test('erro em um pedido não trava os próximos', async () => {
  let n = 0
  const q = createCaptureQueue(async () => { n++; if (n === 1) throw new Error('falhou'); return n })
  const first = q.enqueue()
  const second = q.enqueue()
  const firstResult = first.then(() => 'ok', () => 'erro')
  await vi.runAllTimersAsync()
  expect(await firstResult).toBe('erro')
  expect(await second).toBe(2)
})
