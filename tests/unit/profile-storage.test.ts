import { beforeEach, describe, expect, test } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { createProfileStorage } from '@/entrypoints/annotator.content/profile-storage'
import { defaultProfile, PROFILE_KEY } from '@/lib/profile'

beforeEach(() => fakeBrowser.reset())

describe('profile-storage', () => {
  test('TEMA-02 começa com o perfil padrão e grava em storage.local', async () => {
    const s = createProfileStorage(fakeBrowser.storage.local as never)
    expect(await s.load()).toEqual(defaultProfile())
    await s.update((p) => ({ ...p, theme: 'noite' }))
    const raw = await fakeBrowser.storage.local.get(PROFILE_KEY)
    expect((raw[PROFILE_KEY] as { theme: string }).theme).toBe('noite')
  })

  test('SOM-01 updates concorrentes na mesma aba rodam em fila (cada um vê o anterior)', async () => {
    const s = createProfileStorage(fakeBrowser.storage.local as never)
    await Promise.all(Array.from({ length: 21 }, () => s.update((p) => ({ ...p, sound: !p.sound }))))
    expect((await s.load()).sound).toBe(true)
  })

  test('TEMA-02 lê o que outra aba gravou e avisa a mudança', async () => {
    const s = createProfileStorage(fakeBrowser.storage.local as never)
    const seen: string[] = []
    s.onChange((p) => seen.push(p.theme))
    await fakeBrowser.storage.local.set({ [PROFILE_KEY]: { ...defaultProfile(), theme: 'noite' } })
    await expect.poll(() => seen).toEqual(['noite'])
    expect((await s.update((p) => ({ ...p, sound: true })))).toEqual({ version: 1, theme: 'noite', sound: true })
  })

  test('TEMA-02 perfil corrompido no storage é normalizado', async () => {
    await fakeBrowser.storage.local.set({ [PROFILE_KEY]: { theme: 42, sound: true } })
    const s = createProfileStorage(fakeBrowser.storage.local as never)
    expect(await s.load()).toEqual({ ...defaultProfile(), sound: true })
  })

  test('Q-01 sem storage (permissão negada) o perfil vale só para a aba', async () => {
    for (const area of [undefined, { get: () => Promise.reject(new Error('negado')), set: () => Promise.reject(new Error('negado')) }]) {
      const s = createProfileStorage(area as never)
      await s.update((p) => ({ ...p, theme: 'noite' }))
      expect((await s.load()).theme).toBe('noite')
    }
  })
})
