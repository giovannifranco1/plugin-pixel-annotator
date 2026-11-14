import type { Annotation } from './types'
import type { AnnotationStore } from './store'

/** Estado salvo do store: anotações + contador e "não exportado". */
export interface StoreMeta {
  nextNumber: number
  dirty: boolean
}
export interface StoreSnapshot {
  items: Annotation[]
  meta: StoreMeta
}

/** Uma escrita em lote: grava/troca anotações, apaga por id e atualiza o meta. */
export interface PersistBatch {
  put: Annotation[]
  del: string[]
  meta: StoreMeta
}

export interface PersistBackend {
  write(batch: PersistBatch): Promise<void>
}

/**
 * Espelha o store no backend a cada mudança, só com a diferença (PERS-01).
 * O store troca o objeto da anotação a cada edição, então comparar referência basta.
 * Mudanças do mesmo tick viram um lote; lotes saem em fila, um por vez.
 */
export function syncStore(store: AnnotationStore, backend: PersistBackend, onError: (e: unknown) => void = () => {}): () => void {
  let saved = new Map(store.list().map((a) => [a.id, a]))
  let savedMeta = JSON.stringify(store.meta())
  let scheduled = false
  let queue = Promise.resolve()

  function flush() {
    scheduled = false
    const current = new Map(store.list().map((a) => [a.id, a]))
    const put = [...current.values()].filter((a) => saved.get(a.id) !== a)
    const del = [...saved.keys()].filter((id) => !current.has(id))
    const meta = store.meta()
    const metaKey = JSON.stringify(meta)
    if (!put.length && !del.length && metaKey === savedMeta) return
    saved = current
    savedMeta = metaKey
    queue = queue.then(() => backend.write({ put, del, meta })).catch(onError)
  }

  const unsubscribe = store.subscribe(() => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(flush)
  })
  return () => {
    unsubscribe()
    if (scheduled) flush()
  }
}

/** Espera as escritas pendentes (testes). */
export const settle = () => new Promise<void>((r) => setTimeout(r, 0))
