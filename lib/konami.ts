export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'] as const

/** Matcher do Konami code (EGG-01): devolve true na tecla que completa a sequência. */
export function createKonami(): (key: string) => boolean {
  let last: string[] = []
  return (key) => {
    last = [...last, key.length === 1 ? key.toLowerCase() : key].slice(-KONAMI.length)
    if (!KONAMI.every((k, i) => last[i] === k)) return false
    last = []
    return true
  }
}
