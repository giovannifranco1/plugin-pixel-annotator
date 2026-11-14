import { pad } from './format'
import type { Annotation } from './types'

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

export type ShotFile = { name: string; blob: Blob; role: 'shot' | 'composite' }

/**
 * Prints de uma Anotação em `shots/` (DESE-03): sem Desenho, NN.png é o print; com Desenho, NN.png é
 * o composto e o original vai para NN-original.png. Regra única para o export, o pxa.json e o import.
 */
export function shotFiles(a: Pick<Annotation, 'number' | 'shot' | 'drawing'>): ShotFile[] {
  if (!a.shot) return []
  if (!a.drawing) return [{ name: shotName(a.number), blob: a.shot, role: 'shot' }]
  return [
    { name: shotName(a.number), blob: a.drawing.composite, role: 'composite' },
    { name: originalShotName(a.number), blob: a.shot, role: 'shot' },
  ]
}

/** Print exibido (Painel, Apresentação): o composto quando há Desenho (DESE-04). */
export const displayShot = (a: Pick<Annotation, 'shot' | 'drawing'>): Blob | null => a.drawing?.composite ?? a.shot
