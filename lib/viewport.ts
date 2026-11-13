import type { Breakpoint, Orientation, ScreenCategory, ViewportInfo } from './types'

const MIN_WIDTH: Array<[Breakpoint, number]> = [['2xl', 1536], ['xl', 1280], ['lg', 1024], ['md', 768], ['sm', 640]]

/** Breakpoint Tailwind (padrão) da largura do viewport. */
export function breakpointOf(width: number): Breakpoint {
  for (const [bp, min] of MIN_WIDTH) if (width >= min) return bp
  return 'base'
}

export function categoryOf(width: number): ScreenCategory {
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export function orientationOf(width: number, height: number): Orientation {
  return height >= width ? 'retrato' : 'paisagem'
}

export const CATEGORY_ICON: Record<ScreenCategory, string> = { mobile: '📱', tablet: '📟', desktop: '🖥️' }
export const CATEGORY_COLOR: Record<ScreenCategory, string> = { mobile: '#3fbf5f', tablet: '#f2c94c', desktop: '#4a8cff' }

export function readViewport(win: Pick<Window, 'innerWidth' | 'innerHeight' | 'devicePixelRatio'>): ViewportInfo {
  const width = win.innerWidth
  const height = win.innerHeight
  return {
    width,
    height,
    breakpoint: breakpointOf(width),
    category: categoryOf(width),
    dpr: win.devicePixelRatio,
    orientation: orientationOf(width, height),
  }
}
