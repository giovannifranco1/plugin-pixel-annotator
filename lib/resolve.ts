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
