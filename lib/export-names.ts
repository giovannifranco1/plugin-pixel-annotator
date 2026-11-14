import { pad } from './format'

export function zipName(d: Date): string {
  return `pxa-feedback-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.zip`
}

export function shotName(n: number): string {
  return `shots/${pad(n, n >= 100 ? 3 : 2)}.png`
}

/** Print original de uma Anotação com Desenho; `shotName` fica com o print composto (DESE-03). */
export function originalShotName(n: number): string {
  return shotName(n).replace(/\.png$/, '-original.png')
}
