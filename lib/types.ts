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
  errors?: PageError[] // só com ≥1 erro (ERRO-03)
  drawing?: Drawing // DESE-03; `shot` continua sendo o original
  importedFrom?: ImportedFrom // IMPO-03
}

export type PageErrorKind = 'console' | 'exception' | 'rejection' | 'network'

/** Entrada do Registro de erros (ERRO-02). Repetições idênticas somam em `count`. */
export interface PageError {
  kind: PageErrorKind
  message: string // até 500 caracteres
  at: string // ISO da última ocorrência
  count: number
  source?: string // arquivo:linha, sem query/fragmento
  method?: string // rede
  url?: string // rede, sem query/fragmento
  status?: number // rede; 0 = falha de rede (sem resposta)
}

export type DrawTool = 'brush' | 'arrow' | 'circle' | 'cross'

/** Traço do Desenho em coordenadas de pixel do print. */
export interface Stroke {
  tool: DrawTool
  color: string
  points: Array<[number, number]>
}

/** Desenho: camada de traços sobre o print; `composite` é o PNG do print com a camada (cache). */
export interface Drawing {
  strokes: Stroke[]
  block: number
  composite: Blob
}

/** Origem de uma Anotação vinda de um .zip de outro PxA (IMPO-03). */
export interface ImportedFrom {
  origin: string
  number: number
}
