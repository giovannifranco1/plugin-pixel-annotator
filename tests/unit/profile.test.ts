import { describe, expect, test } from 'vitest'
import { defaultProfile, levelOf, normalizeProfile } from '@/lib/profile'

describe('perfil', () => {
  test('SOM-01 perfil padrão: som desligado, tema Padrão, zero XP', () => {
    expect(defaultProfile()).toEqual({
      version: 1, xp: 0, achievements: {}, stats: { annotations: 0, mobile: 0, zips: 0 }, theme: 'padrao', sound: false,
    })
  })

  test('CONQ-07 perfil válido passa intacto', () => {
    const p = { ...defaultProfile(), xp: 120, theme: 'crt', sound: true, achievements: { 'primeiro-pixel': '2026-11-14T10:00:00.000Z' }, stats: { annotations: 12, mobile: 3, zips: 1 } }
    expect(normalizeProfile(p)).toEqual(p)
  })

  test('CONQ-07 perfil corrompido descarta só o campo inválido', () => {
    const p = normalizeProfile({ xp: 'muito', theme: 'arco-íris', sound: 1, achievements: { 'primeiro-pixel': '2026-11-14T10:00:00.000Z', inventada: 'x', maratona: 5 }, stats: { annotations: 7, mobile: -2, zips: 'a' } })
    expect(p).toEqual({
      version: 1, xp: 0, theme: 'padrao', sound: false,
      achievements: { 'primeiro-pixel': '2026-11-14T10:00:00.000Z' },
      stats: { annotations: 7, mobile: 0, zips: 0 },
    })
  })

  test('CONQ-07 lixo total vira o padrão', () => {
    for (const raw of [undefined, null, 42, 'x', [1, 2]]) expect(normalizeProfile(raw)).toEqual(defaultProfile())
  })

  test('CONQ-03 curva de nível: Nv n+1 exige 25·n·(n+1) XP', () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, span: 50 })
    expect(levelOf(49)).toEqual({ level: 1, into: 49, span: 50 })
    expect(levelOf(50)).toEqual({ level: 2, into: 0, span: 100 })
    expect(levelOf(149)).toEqual({ level: 2, into: 99, span: 100 })
    expect(levelOf(150)).toEqual({ level: 3, into: 0, span: 150 })
    expect(levelOf(500).level).toBe(5)
  })
})
