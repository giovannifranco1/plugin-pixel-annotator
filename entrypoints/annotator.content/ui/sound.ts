export interface Note {
  freq: number
  ms: number
  wave: 'square' | 'triangle'
}

/** Volume baixo e fixo (SOM-03). */
export const VOLUME = 0.04

const N = (freq: number, ms: number, wave: Note['wave'] = 'square'): Note => ({ freq, ms, wave })

/** Sons 8-bit como dados (SOM-02/03): nenhuma sequência passa de 800ms. */
export const SOUNDS = {
  blip: [N(988, 45), N(1319, 45)],
  fanfare: [N(523, 90), N(659, 90), N(784, 90), N(1047, 330, 'triangle')],
  jingle: [N(784, 80), N(988, 80), N(1175, 80), N(1568, 80), N(1175, 80), N(1568, 300, 'triangle')],
} satisfies Record<string, Note[]>
export type SoundName = keyof typeof SOUNDS

export const soundDuration = (name: SoundName) => SOUNDS[name].reduce((ms, n) => ms + n.ms, 0)

type AudioFactory = () => AudioContext | undefined
const defaultFactory: AudioFactory = () => {
  const Ctor = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return Ctor ? new Ctor() : undefined
}

/**
 * Sintetiza com Web Audio, sem arquivos (SOM-03). O contexto nasce no primeiro som, que sempre vem de um
 * gesto do dev. Navegador ou CSP bloqueando: silêncio, nunca erro (SOM-04).
 */
export function createSound(factory: AudioFactory = defaultFactory) {
  let ctx: AudioContext | undefined
  let failed = false
  let busyUntil = 0 // um som depois do outro, sem sobrepor
  return {
    play(name: SoundName): void {
      if (failed) return
      try {
        ctx ??= factory()
        if (!ctx) {
          failed = true
          return
        }
        if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
        let t = Math.max(ctx.currentTime, busyUntil)
        for (const note of SOUNDS[name]) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          const end = t + note.ms / 1000
          osc.type = note.wave
          osc.frequency.setValueAtTime(note.freq, t)
          gain.gain.setValueAtTime(VOLUME, t)
          gain.gain.linearRampToValueAtTime(0, end) // sem estalo no fim da nota
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(t)
          osc.stop(end)
          t = end
        }
        busyUntil = t
      } catch {
        // SOM-04: silencioso
      }
    },
  }
}
