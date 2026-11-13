import type { AnnotationStore } from '@/lib/store'

/**
 * Aviso nativo de saída com anotações não exportadas em .zip (AVIS-01).
 * Plano B (se o teste manual no Firefox falhar): mover este listener para o probe (main world),
 * ligado/desligado por CustomEvent `pxa:dirty`. Ver design.md.
 */
export function installUnloadGuard(store: AnnotationStore, win: Window = window): () => void {
  const handler = (e: BeforeUnloadEvent) => {
    if (!store.isDirty()) return
    e.preventDefault()
    e.returnValue = ''
  }
  win.addEventListener('beforeunload', handler)
  return () => win.removeEventListener('beforeunload', handler)
}
