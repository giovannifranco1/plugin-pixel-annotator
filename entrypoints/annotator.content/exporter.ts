import { strToU8, zipSync, type Zippable } from 'fflate'
import type { AnnotationStore } from '@/lib/store'
import { renderCompactMarkdown, renderMarkdown } from '@/lib/markdown'
import { originalShotName, shotName, zipName } from '@/lib/export-names'
import { buildManifest, MANIFEST_FILE } from '@/lib/manifest'
import type { UiHost } from './ui/host'
import { showToast } from './ui/toast'

const origin = () => location.host || location.origin

const bytesOf = async (name: string, blob: Blob) => [name, new Uint8Array(await blob.arrayBuffer())] as const

export async function buildZip(store: AnnotationStore, now: Date, originLabel: string, pageOrigin = location.origin): Promise<Uint8Array> {
  const list = store.list()
  // Com Desenho, NN.png é o print composto e o original vai para NN-original.png (DESE-03).
  const shots = await Promise.all(
    list.flatMap((a) => {
      if (!a.shot) return []
      if (!a.drawing) return [bytesOf(shotName(a.number), a.shot)]
      return [bytesOf(shotName(a.number), a.drawing.composite), bytesOf(originalShotName(a.number), a.shot)]
    }),
  )
  const files: Zippable = {
    'feedback.md': strToU8(renderMarkdown(list, { origin: originLabel, generatedAt: now })),
    [MANIFEST_FILE]: strToU8(JSON.stringify(buildManifest(list, { origin: pageOrigin, exportedAt: now }), null, 2)),
  }
  // PNG já é comprimido: guardar sem deflate evita travar a página à toa.
  for (const [name, bytes] of shots) files[name] = [bytes, { level: 0 }]
  return zipSync(files)
}

/** Baixa o .zip via <a download> (sem permissão downloads) e marca como exportado (EXPO-01/04, AVIS-01). */
export async function exportZip(ui: UiHost, store: AnnotationStore, now = new Date()): Promise<void> {
  try {
    const bytes = await buildZip(store, now, origin())
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = zipName(now)
    ui.root.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    store.markExported()
    showToast(ui, 'Zip exportado')
  } catch {
    showToast(ui, 'Falha ao exportar')
  }
}

/** Copia a versão compacta do feedback (EXPO-03). Não conta como exportado. */
export async function copyMarkdown(ui: UiHost, store: AnnotationStore): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard indisponível')
    await navigator.clipboard.writeText(renderCompactMarkdown(store.list(), { origin: origin() }))
    showToast(ui, 'Markdown copiado')
  } catch {
    showToast(ui, 'Não consegui copiar. Use Exportar .zip.')
  }
}
