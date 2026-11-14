import { describe, expect, test } from 'vitest'
import { ACHIEVEMENTS, applyEvent, createTabStats, type FunEvent, type TabStats } from '@/lib/achievements'
import { defaultProfile, type Profile } from '@/lib/profile'
import type { ScreenCategory } from '@/lib/types'

const NOW = '2026-11-14T12:00:00.000Z'

function run(events: FunEvent[], start: Profile = defaultProfile(), tab: TabStats = createTabStats()) {
  let p = start
  let t = tab
  const unlocked: string[] = []
  let xp = 0
  for (const e of events) {
    const r = applyEvent(p, t, e, NOW)
    p = r.profile
    t = r.tab
    xp += r.xp
    unlocked.push(...r.unlocked)
  }
  return { profile: p, tab: t, unlocked, xp }
}
const annotated = (category: ScreenCategory = 'desktop', at = 0): FunEvent => ({ type: 'annotated', category, at })
const many = (n: number, category: ScreenCategory = 'desktop', step = 61_000) => Array.from({ length: n }, (_, i) => annotated(category, i * step))

describe('conquistas', () => {
  test('CONQ-01 anotação nova dá 10 XP', () => {
    const r = run([annotated(), annotated()])
    expect(r.xp).toBe(20)
    expect(r.profile.xp).toBe(20)
    expect(r.profile.stats.annotations).toBe(2)
  })

  test('CONQ-02 export dá 5×N XP para N anotações ainda não exportadas', () => {
    const r = run([{ type: 'exported', fresh: 3 }])
    expect(r.xp).toBe(15)
    expect(r.profile.stats.zips).toBe(1)
    expect(run([{ type: 'exported', fresh: 0 }]).xp).toBe(0)
  })

  test('CONQ-04 desbloqueia uma vez só e guarda a data', () => {
    const r = run([annotated(), annotated()])
    expect(r.unlocked).toEqual(['primeiro-pixel'])
    expect(r.profile.achievements['primeiro-pixel']).toBe(NOW)
  })

  test('CONQ-04 não altera o perfil recebido', () => {
    const p = defaultProfile()
    applyEvent(p, createTabStats(), annotated(), NOW)
    expect(p).toEqual(defaultProfile())
  })

  test('CONQ-05 catálogo tem as 7 conquistas do MVP; só Código Secreto é secreta', () => {
    expect(ACHIEVEMENTS.map((a) => a.name)).toEqual(['Primeiro Pixel', 'Caçador Mobile', 'Pixel Perfect', 'Speedrun', 'Quest Completa', 'Maratona', 'Código Secreto'])
    expect(ACHIEVEMENTS.filter((a) => a.secret).map((a) => a.id)).toEqual(['codigo-secreto'])
  })

  test('CONQ-05 Caçador Mobile: 10 anotações mobile acumuladas entre sessões', () => {
    const first = run(many(6, 'mobile'))
    expect(first.unlocked).not.toContain('cacador-mobile')
    const second = run([...many(3, 'mobile'), annotated('desktop')], first.profile) // aba nova
    expect(second.unlocked).not.toContain('cacador-mobile')
    expect(run([annotated('mobile')], second.profile).unlocked).toContain('cacador-mobile')
  })

  test('CONQ-05 Pixel Perfect: as 3 categorias de tela na mesma aba', () => {
    const r = run([annotated('mobile', 0), annotated('tablet', 70_000)])
    expect(r.unlocked).not.toContain('pixel-perfect')
    expect(run([annotated('desktop', 140_000)], r.profile, r.tab).unlocked).toContain('pixel-perfect')
    // categorias de outra aba não contam
    expect(run([annotated('desktop', 0)], r.profile).unlocked).not.toContain('pixel-perfect')
  })

  test('CONQ-05 Speedrun: 5 anotações em menos de 60s', () => {
    expect(run(many(5, 'desktop', 15_000)).unlocked).not.toContain('speedrun') // 0..60s: não é "menos de"
    expect(run(many(5, 'desktop', 14_000)).unlocked).toContain('speedrun')
  })

  test('CONQ-05 Quest Completa: primeiro .zip exportado', () => {
    const r = run([{ type: 'exported', fresh: 1 }, { type: 'exported', fresh: 0 }])
    expect(r.unlocked).toEqual(['quest-completa'])
  })

  test('CONQ-05 Maratona: 20 anotações na mesma aba', () => {
    expect(run(many(19)).unlocked).not.toContain('maratona')
    expect(run(many(20)).unlocked).toContain('maratona')
  })

  test('EGG-01 Konami desbloqueia Código Secreto sem XP', () => {
    const r = run([{ type: 'konami' }, { type: 'konami' }])
    expect(r.unlocked).toEqual(['codigo-secreto'])
    expect(r.xp).toBe(0)
  })

  test('CONQ-04 várias conquistas no mesmo evento saem em ordem de catálogo', () => {
    const start = { ...defaultProfile(), stats: { annotations: 0, mobile: 9, zips: 0 } }
    expect(run([annotated('mobile')], start).unlocked).toEqual(['primeiro-pixel', 'cacador-mobile'])
  })
})
