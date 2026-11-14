import type { Annotation } from './types'

export type AnnotationDraft = Omit<Annotation, 'id' | 'number' | 'createdAt' | 'updatedAt'>
export type AnnotationPatch = Partial<Pick<Annotation, 'note' | 'errors' | 'drawing'>>
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

  /**
   * Troca campos editáveis (nota, erros, Desenho); `undefined` remove o campo opcional.
   * `errors` vazio vira ausente: o campo só existe com ≥1 erro (ERRO-03).
   */
  function update(id: string, patch: AnnotationPatch): void {
    if (patch.errors?.length === 0) patch = { ...patch, errors: undefined }
    items = items.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: now().toISOString() } : a))
    dirty = true
    emit()
  }

  return {
    add({ errors, ...rest }: AnnotationDraft, element?: Element): Annotation {
      const ts = now().toISOString()
      const draft = errors?.length ? { ...rest, errors } : rest
      const a: Annotation = { ...draft, id: uuid(), number: nextNumber++, createdAt: ts, updatedAt: ts }
      items = [...items, a]
      if (element) refs.set(a.id, new WeakRef(element))
      dirty = true
      emit()
      return a
    },
    update,
    updateNote: (id: string, note: string): void => update(id, { note }),
    /**
     * Anotações de um .zip de outro PxA (IMPO-03/06/07): `id` já presente é ignorado, o número é
     * novo na sequência da aba e `importedFrom` guarda o original. Devolve quantas entraram.
     */
    importAnnotations(list: readonly Annotation[], origin: string): number {
      const known = new Set(items.map((a) => a.id))
      const fresh: Annotation[] = []
      for (const a of list) {
        if (known.has(a.id)) continue
        known.add(a.id)
        fresh.push({ ...a, number: nextNumber++, importedFrom: a.importedFrom ?? { origin, number: a.number } })
      }
      if (fresh.length === 0) return 0
      items = [...items, ...fresh]
      dirty = true
      emit()
      return fresh.length
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
    /** Guarda o nó reencontrado pelo seletor para não buscar de novo a cada frame. */
    rememberRef(id: string, element: Element): void {
      if (items.some((a) => a.id === id)) refs.set(id, new WeakRef(element))
    },
    /** Só o export .zip chama isto; copiar markdown não leva os prints. */
    markExported(): void {
      dirty = false
      emit()
    },
    isDirty: (): boolean => dirty,
    subscribe(l: Listener): () => void {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

export type AnnotationStore = ReturnType<typeof createStore>
