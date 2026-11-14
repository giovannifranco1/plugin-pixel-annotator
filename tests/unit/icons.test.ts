import { describe, expect, test } from 'vitest'
import { CATEGORY_PIXEL_ICON, CHEVRON_DOWN, MENU, pixelIcon, SPEAKER_OFF, SPEAKER_ON } from '@/entrypoints/annotator.content/ui/icons'

describe('ícones pixel art', () => {
  test('desenha a grade como SVG nítido, juntando pixels vizinhos da mesma cor', () => {
    const svg = pixelIcon(['KK.', '.PK'])
    expect(svg.getAttribute('width')).toBe('3') // 1 pixel da arte = 1px
    expect(svg.getAttribute('viewBox')).toBe('0 0 3 2')
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    const rects = Array.from(svg.querySelectorAll('rect')).map((r) => ['x', 'y', 'width', 'fill'].map((a) => r.getAttribute(a)).join(' '))
    // Contorno em currentColor: segue a cor do texto do botão, que muda com o tema (escuro no Padrão, claro no Noite).
    expect(rects).toEqual(['0 0 2 currentColor', '1 1 1 #ff3e7f', '2 1 1 currentColor'])
  })

  test('ícones são grades quadradas só com cores da paleta', () => {
    for (const icon of [MENU, CHEVRON_DOWN, SPEAKER_ON, SPEAKER_OFF, ...Object.values(CATEGORY_PIXEL_ICON)]) {
      expect(icon.every((row) => row.length === icon.length)).toBe(true)
      expect(icon.join('')).toMatch(/^[.KPGLMBD]+$/)
    }
  })
})
