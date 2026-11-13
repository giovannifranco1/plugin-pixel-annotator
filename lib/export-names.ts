import { pad } from './format'

export function zipName(d: Date): string {
  return `pxa-feedback-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.zip`
}

export function shotName(n: number): string {
  return `shots/${pad(n, n >= 100 ? 3 : 2)}.png`
}
