import type { Annotation } from './types'

export type AnnotationDraft = Omit<Annotation, 'id' | 'number' | 'createdAt' | 'updatedAt'>
type Listener = () => void

/**
 * Estado das anotações da aba, só em memória (decisão do MVP).
 * Numeração monotônica (PAIN-04). `dirty` = criação/edição após o último export .zip (AVIS-01).
 */
export function createStore(now: () => Date = () => new Date(), uuid: () => string = () => crypto.randomUUID()) {
  let items: Annotation[] = []
  let nextNumber = 1
  let dirty = false
  const refs = new Map<string, WeakRef<Element>>()
  const listeners = new Set<Listener>()
  const emit = () => listeners.forEach((l) => l())

  return {
    add(draft: AnnotationDraft, element?: Element): Annotation {
      const ts = now().toISOString()
      const a: Annotation = { ...draft, id: uuid(), number: nextNumber++, createdAt: ts, updatedAt: ts }
      items = [...items, a]
      if (element) refs.set(a.id, new WeakRef(element))
      dirty = true
      emit()
      return a
    },
    updateNote(id: string, note: string): void {
      items = items.map((a) => (a.id === id ? { ...a, note, updatedAt: now().toISOString() } : a))
      dirty = true
      emit()
    },
    /** Não marca dirty: apagar não cria trabalho a perder. */
    remove(id: string): void {
      items = items.filter((a) => a.id !== id)
      refs.delete(id)
      emit()
    },
    clear(): void {
      items = []
      refs.clear()
      dirty = false
      emit()
    },
    list: (): readonly Annotation[] => items,
    get: (id: string): Annotation | undefined => items.find((a) => a.id === id),
    refOf: (id: string): WeakRef<Element> | undefined => refs.get(id),
    /** Só o export .zip chama isto; copiar markdown não leva os prints. */
    markExported(): void {
      dirty = false
    },
    isDirty: (): boolean => dirty,
    subscribe(l: Listener): () => void {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

export type AnnotationStore = ReturnType<typeof createStore>
