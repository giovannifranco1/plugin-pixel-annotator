import type { AnnotationStore } from './store'

export interface Resolvable {
  selector: string
  pathname: string
}

/**
 * Regra de resolução do elemento (spec): nó original se ainda conectado; senão, na mesma rota,
 * busca pelo seletor e aceita somente exatamente 1 correspondência; caso contrário, não encontrado.
 */
export function resolveElement(target: Resolvable, ref: WeakRef<Element> | undefined, currentPathname: string, root: ParentNode): Element | null {
  const original = ref?.deref()
  if (original?.isConnected) return original
  if (target.pathname !== currentPathname) return null
  try {
    const found = root.querySelectorAll(target.selector)
    return found.length === 1 ? (found[0] ?? null) : null
  } catch {
    return null
  }
}

/** Resolve a anotação `id` na rota atual e memoriza o nó achado pelo seletor. */
export function resolveAnnotation(store: AnnotationStore, id: string, pathname: string = location.pathname, root: ParentNode = document): Element | null {
  const a = store.get(id)
  if (!a) return null
  const ref = store.refOf(id)
  const el = resolveElement(a, ref, pathname, root)
  if (el && el !== ref?.deref()) store.rememberRef(id, el)
  return el
}
