import { describe, expect, test, vi } from 'vitest'
import { createSound, SOUNDS, soundDuration, VOLUME } from '@/entrypoints/annotator.content/ui/sound'

function fakeAudio() {
  const oscs: Array<{ type: string; freq: number[] }> = []
  const gains: number[] = []
  const ctx = {
    currentTime: 0,
    state: 'running',
    resume: vi.fn(async () => {}),
    destination: {},
    createOscillator() {
      const o = { type: '', freq: [] as number[], frequency: { setValueAtTime: (v: number) => o.freq.push(v) }, connect: () => {}, start: () => {}, stop: () => {} }
      oscs.push(o)
      return o
    },
    createGain() {
      return { gain: { setValueAtTime: (v: number) => gains.push(v), linearRampToValueAtTime: () => {} }, connect: () => {} }
    },
  }
  return { ctx, oscs, gains }
}

describe('som', () => {
  test('SOM-03 toda sequência dura ≤ 800ms e usa onda quadrada ou triangular', () => {
    for (const name of Object.keys(SOUNDS) as Array<keyof typeof SOUNDS>) {
      expect(soundDuration(name)).toBeLessThanOrEqual(800)
      expect(soundDuration(name)).toBeGreaterThan(0)
      for (const n of SOUNDS[name]) expect(['square', 'triangle']).toContain(n.wave)
    }
  })

  test('SOM-02 blip, fanfarra e jingle tocam suas notas com volume baixo fixo', () => {
    const { ctx, oscs, gains } = fakeAudio()
    const factory = vi.fn(() => ctx as never)
    const s = createSound(factory)
    s.play('blip')
    s.play('jingle')
    expect(factory).toHaveBeenCalledTimes(1) // contexto reaproveitado
    expect(oscs).toHaveLength(SOUNDS.blip.length + SOUNDS.jingle.length)
    expect(oscs[0]!.freq[0]).toBe(SOUNDS.blip[0]!.freq)
    expect(Math.max(...gains)).toBe(VOLUME)
    expect(VOLUME).toBeLessThanOrEqual(0.05)
  })

  test('SOM-04 Web Audio bloqueado ou ausente é silencioso', () => {
    expect(() => createSound(() => { throw new Error('CSP') }).play('fanfare')).not.toThrow()
    expect(() => createSound(() => undefined).play('blip')).not.toThrow()
    const { ctx } = fakeAudio()
    ctx.createOscillator = () => { throw new Error('quebrado') }
    expect(() => createSound(() => ctx as never).play('blip')).not.toThrow()
  })
})
