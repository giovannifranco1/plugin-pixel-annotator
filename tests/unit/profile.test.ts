import { describe, expect, test } from 'vitest'
import { defaultProfile, normalizeProfile } from '@/lib/profile'

describe('perfil', () => {
  test('SOM-01 perfil padrão: som desligado, tema Padrão', () => {
    expect(defaultProfile()).toEqual({ version: 1, theme: 'padrao', sound: false })
  })

  test('TEMA-02 perfil válido passa intacto', () => {
    expect(normalizeProfile({ version: 1, theme: 'noite', sound: true })).toEqual({ version: 1, theme: 'noite', sound: true })
  })

  test('TEMA-02 perfil corrompido descarta só o campo inválido', () => {
    expect(normalizeProfile({ theme: 'arco-íris', sound: true })).toEqual({ version: 1, theme: 'padrao', sound: true })
    expect(normalizeProfile({ theme: 'noite', sound: 1 })).toEqual({ version: 1, theme: 'noite', sound: false })
  })

  test('TEMA-01 perfil da 1ª versão (XP, conquistas, tema CRT) vira tema Padrão e perde o resto', () => {
    const old = { version: 1, xp: 120, achievements: { 'primeiro-pixel': 'x' }, stats: { annotations: 3 }, theme: 'crt', sound: true }
    expect(normalizeProfile(old)).toEqual({ version: 1, theme: 'padrao', sound: true })
  })

  test('lixo total vira o padrão', () => {
    for (const raw of [undefined, null, 42, 'x', [1, 2]]) expect(normalizeProfile(raw)).toEqual(defaultProfile())
  })
})

describe('perfil: última versão vista do Changelog', () => {
  test('NOVI-08 perfil padrão não tem versão vista', () => {
    expect(defaultProfile().lastSeenVersion).toBeUndefined()
  })

  test('NOVI-10 versão vista válida passa intacta', () => {
    expect(normalizeProfile({ theme: 'noite', sound: true, lastSeenVersion: '1.2.0' })).toEqual({ version: 1, theme: 'noite', sound: true, lastSeenVersion: '1.2.0' })
  })

  test('NOVI-13 versão vista inválida é tratada como ausente', () => {
    for (const lastSeenVersion of [12, '', 'abc', '1.x.0', null]) {
      expect(normalizeProfile({ theme: 'padrao', sound: false, lastSeenVersion }).lastSeenVersion).toBeUndefined()
    }
  })
})
