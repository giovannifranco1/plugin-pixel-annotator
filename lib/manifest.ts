import type { Annotation, Stroke } from './types'
import { originalShotName, shotName } from './export-names'

export const SCHEMA_VERSION = 1
export const MANIFEST_FILE = 'pxa.json'

/** Anotação sem Blobs: prints viram nomes de arquivo em `shots/` (IMPO-01). */
export type ManifestAnnotation = Omit<Annotation, 'shot' | 'drawing'> & {
  shot: string | null
  drawing?: { strokes: Stroke[]; block: number; file: string }
}

/** Manifesto do export: dados das Anotações legíveis por máquina, com versão de esquema. */
export interface PxaManifest {
  schemaVersion: typeof SCHEMA_VERSION
  generator: 'PixelAnnotator'
  origin: string // location.origin da página exportada
  exportedAt: string
  annotations: ManifestAnnotation[]
}

export type ParsedManifest = { ok: true; manifest: PxaManifest } | { ok: false; error: string }

export function buildManifest(list: readonly Annotation[], meta: { origin: string; exportedAt: Date }): PxaManifest {
  return {
    schemaVersion: SCHEMA_VERSION,
    generator: 'PixelAnnotator',
    origin: meta.origin,
    exportedAt: meta.exportedAt.toISOString(),
    annotations: list.map(({ shot, drawing, ...rest }) => ({
      ...rest,
      shot: shot ? (drawing ? originalShotName(rest.number) : shotName(rest.number)) : null,
      ...(drawing ? { drawing: { strokes: drawing.strokes, block: drawing.block, file: shotName(rest.number) } } : {}),
    })),
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Só o que o PxA precisa para mostrar, resolver e exportar de novo; o resto é confiado ao gerador. */
function isManifestAnnotation(v: unknown): v is ManifestAnnotation {
  if (!isObj(v)) return false
  const strings = ['id', 'note', 'createdAt', 'updatedAt', 'url', 'path', 'pathname', 'selector', 'outerHtml'] as const
  return (
    strings.every((k) => isStr(v[k])) &&
    isNum(v.number) &&
    isObj(v.viewport) && isNum(v.viewport.width) && isStr(v.viewport.category) &&
    isObj(v.rect) && isObj(v.scroll) &&
    Array.isArray(v.css) &&
    (v.shot === null || isStr(v.shot)) &&
    (v.errors === undefined || Array.isArray(v.errors)) &&
    (v.drawing === undefined || (isObj(v.drawing) && Array.isArray(v.drawing.strokes) && isNum(v.drawing.block) && isStr(v.drawing.file)))
  )
}

/** Valida o `pxa.json` (IMPO-02) com mensagens que o dev entende. */
export function parseManifest(text: string): ParsedManifest {
  const invalid: ParsedManifest = { ok: false, error: 'pxa.json inválido.' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return invalid
  }
  if (!isObj(data)) return invalid
  if (data.schemaVersion !== SCHEMA_VERSION) {
    return isNum(data.schemaVersion) ? { ok: false, error: `pxa.json com versão ${data.schemaVersion} desconhecida.` } : invalid
  }
  if (!isStr(data.origin) || !Array.isArray(data.annotations) || !data.annotations.every(isManifestAnnotation)) return invalid
  return { ok: true, manifest: data as unknown as PxaManifest }
}
