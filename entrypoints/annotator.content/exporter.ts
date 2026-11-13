import { strToU8, zipSync } from 'fflate'
import type { AnnotationStore } from '@/lib/store'
import { renderMarkdown } from '@/lib/markdown'
import { shotName, zipName } from '@/lib/export-names'
import type { UiHost } from './ui/host'
import { showToast } from './ui/toast'

const origin = () => location.host || location.origin

export async function buildZip(store: AnnotationStore, now: Date, originLabel: string): Promise<Uint8Array> {
  const list = store.list()
  const files: Record<string, Uint8Array> = {
    'feedback.md': strToU8(renderMarkdown(list, { origin: originLabel, generatedAt: now }, { imageLinks: true })),
  }
  for (const a of list) if (a.shot) files[shotName(a.number)] = new Uint8Array(await a.shot.arrayBuffer())
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

/** Copia o feedback.md sem os links de imagem (EXPO-03). Não conta como exportado. */
export async function copyMarkdown(ui: UiHost, store: AnnotationStore, now = new Date()): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard indisponível')
    await navigator.clipboard.writeText(renderMarkdown(store.list(), { origin: origin(), generatedAt: now }, { imageLinks: false }))
    showToast(ui, 'Markdown copiado')
  } catch {
    showToast(ui, 'Não consegui copiar. Use Exportar .zip.')
  }
}
