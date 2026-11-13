export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type ScreenCategory = 'mobile' | 'tablet' | 'desktop'
export type Orientation = 'retrato' | 'paisagem'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface ViewportInfo {
  width: number // innerWidth
  height: number // innerHeight
  breakpoint: Breakpoint
  category: ScreenCategory
  dpr: number
  orientation: Orientation
}

export interface ComponentInfo {
  framework: 'react' | 'vue2' | 'vue3'
  name: string
  chain: string[] // até 5 ancestrais, do mais próximo ao mais distante
  file?: string
  line?: number
}

export interface Annotation {
  id: string
  number: number // sequencial, nunca reutilizado
  note: string
  createdAt: string // ISO
  updatedAt: string // ISO
  url: string // location.href
  path: string // pathname + search + hash
  pathname: string // usado na comparação de rota (PAIN-06)
  selector: string
  viewport: ViewportInfo
  rect: Rect
  scroll: { x: number; y: number }
  outerHtml: string
  outerHtmlTruncated: boolean
  css: Array<[property: string, value: string]>
  component: ComponentInfo | null
  shot: Blob | null // PNG; null se o print falhou
  shotPartial: boolean
}
