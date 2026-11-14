/** Zero à esquerda para datas e números de print. */
export const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

/** Host para exibir uma origem (`https://staging.app.com` → `staging.app.com`). */
export function hostOf(origin: string): string {
  try {
    return new URL(origin).host || origin
  } catch {
    return origin
  }
}

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
