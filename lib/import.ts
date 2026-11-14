import { strFromU8, unzipSync } from 'fflate'
import type { Annotation } from './types'
import { MANIFEST_FILE, parseManifest } from './manifest'

/** Limites contra .zip grande ou malicioso (zip bomb). */
export const IMPORT_LIMITS = {
  maxInputBytes: 50 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024, // soma descompactada, pelo tamanho declarado antes de descompactar
  maxFiles: 1000,
}

export type ImportResult = { ok: true; origin: string; annotations: Annotation[] } | { ok: false; error: string }

const TOO_BIG = '.zip grande demais para importar.'
const UNREADABLE = 'Não consegui ler este .zip.'
const WANTED = /^(pxa\.json|shots\/[\w-]+\.png)$/

class TooBig extends Error {}

/**
 * Lê um .zip exportado por outro PxA (IMPO-02/03): valida o `pxa.json` e reconstrói as Anotações
 * com os prints de `shots/`. Só `pxa.json` e `shots/*.png` são descompactados.
 */
export function readImportZip(bytes: Uint8Array, limits = IMPORT_LIMITS): ImportResult {
  if (bytes.byteLength > limits.maxInputBytes) return { ok: false, error: TOO_BIG }
  let files: Record<string, Uint8Array>
  try {
    let count = 0
    let total = 0
    files = unzipSync(bytes, {
      filter(f) {
        if (!WANTED.test(f.name)) return false
        total += f.originalSize
        if (++count > limits.maxFiles || total > limits.maxTotalBytes) throw new TooBig()
        return true
      },
    })
  } catch (e) {
    return { ok: false, error: e instanceof TooBig ? TOO_BIG : UNREADABLE }
  }

  const json = files[MANIFEST_FILE]
  if (!json) return { ok: false, error: 'Este .zip não tem pxa.json. Só exports feitos a partir desta versão do PxA podem ser importados.' }
  const parsed = parseManifest(strFromU8(json))
  if (!parsed.ok) return parsed

  const png = (name: string | null | undefined): Blob | null => {
    const data = name ? files[name] : undefined
    return data ? new Blob([data as BlobPart], { type: 'image/png' }) : null
  }
  const annotations = parsed.manifest.annotations.map(({ shot, drawing, ...rest }): Annotation => {
    const composite = png(drawing?.file)
    return {
      ...rest,
      shot: png(shot),
      ...(drawing && composite ? { drawing: { strokes: drawing.strokes, block: drawing.block, composite } } : {}),
    }
  })
  return { ok: true, origin: parsed.manifest.origin, annotations }
}

/** Lê o arquivo escolhido no Painel; o tamanho é checado antes de carregar tudo na memória. */
export async function readImportFile(file: Blob, limits = IMPORT_LIMITS): Promise<ImportResult> {
  if (file.size > limits.maxInputBytes) return { ok: false, error: TOO_BIG }
  try {
    return readImportZip(new Uint8Array(await file.arrayBuffer()), limits)
  } catch {
    return { ok: false, error: UNREADABLE }
  }
}
