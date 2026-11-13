import type { AnnotationStore } from '@/lib/store'

/**
 * Aviso nativo de saída com anotações não exportadas em .zip (AVIS-01).
 * O listener só existe enquanto há algo a perder: sem ele a página continua elegível ao bfcache.
 * Plano B (se o teste manual no Firefox falhar): mover este listener para o probe (main world),
 * ligado/desligado por CustomEvent `pxa:dirty`. Ver design.md.
 */
export function installUnloadGuard(store: AnnotationStore): () => void {
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue = ''
  }
  let installed = false
  const sync = () => {
    if (store.isDirty() === installed) return
    installed = !installed
    if (installed) window.addEventListener('beforeunload', handler)
    else window.removeEventListener('beforeunload', handler)
  }
  const unsubscribe = store.subscribe(sync)
  sync()
  return () => {
    unsubscribe()
    window.removeEventListener('beforeunload', handler)
  }
}
