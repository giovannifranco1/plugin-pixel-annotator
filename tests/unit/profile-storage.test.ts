import { beforeEach, describe, expect, test } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createProfileStorage } from '@/entrypoints/annotator.content/profile-storage'
import { defaultProfile, PROFILE_KEY } from '@/lib/profile'

beforeEach(() => fakeBrowser.reset())

describe('profile-storage', () => {
  test('CONQ-07 começa com o perfil padrão e grava em storage.local', async () => {
    const s = createProfileStorage(fakeBrowser.storage.local as never)
    expect(await s.load()).toEqual(defaultProfile())
    await s.update((p) => ({ ...p, xp: 10 }))
    const raw = await fakeBrowser.storage.local.get(PROFILE_KEY)
    expect((raw[PROFILE_KEY] as { xp: number }).xp).toBe(10)
  })

  test('CONQ-07 updates concorrentes na mesma aba não perdem pontos', async () => {
    const s = createProfileStorage(fakeBrowser.storage.local as never)
    await Promise.all(Array.from({ length: 20 }, () => s.update((p) => ({ ...p, xp: p.xp + 1 }))))
    expect((await s.load()).xp).toBe(20)
  })

  test('CONQ-07 lê o que outra aba gravou e avisa a mudança', async () => {
    const s = createProfileStorage(fakeBrowser.storage.local as never)
    const seen: number[] = []
    s.onChange((p) => seen.push(p.xp))
    await fakeBrowser.storage.local.set({ [PROFILE_KEY]: { ...defaultProfile(), xp: 70 } })
    await expect.poll(() => seen).toEqual([70])
    expect((await s.update((p) => ({ ...p, xp: p.xp + 10 }))).xp).toBe(80)
  })

  test('CONQ-07 perfil corrompido no storage é normalizado', async () => {
    await fakeBrowser.storage.local.set({ [PROFILE_KEY]: { xp: 'x', sound: true } })
    const s = createProfileStorage(fakeBrowser.storage.local as never)
    expect(await s.load()).toEqual({ ...defaultProfile(), sound: true })
  })

  test('CONQ-07 sem storage (Q-01 negada) o perfil vale só para a aba', async () => {
    for (const area of [undefined, { get: () => Promise.reject(new Error('negado')), set: () => Promise.reject(new Error('negado')) }]) {
      const s = createProfileStorage(area as never)
      await s.update((p) => ({ ...p, xp: 30 }))
      expect((await s.load()).xp).toBe(30)
    }
  })
})
