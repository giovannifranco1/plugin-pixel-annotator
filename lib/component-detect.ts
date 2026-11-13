import type { ComponentInfo } from './types'

// Lê internals NÃO públicos de React/Vue (best-effort, COMP-04). Roda no main world via component-probe.

const MAX_ANCESTORS = 5
const REACT_COMPONENT_TAGS = new Set([0, 1, 11, 14, 15]) // Function, Class, ForwardRef, Memo, SimpleMemo
type AnyRec = Record<string, any>
type Named = { name: string | null; file?: string; line?: number }

/**
 * Sobe a árvore de componentes a partir de `start` coletando o componente mais próximo e até 5
 * ancestrais com nome. O arquivo/linha vêm do primeiro componente com nome.
 */
function collect(framework: ComponentInfo['framework'], start: AnyRec | null, next: (n: AnyRec) => AnyRec | null, describe: (n: AnyRec) => Named): ComponentInfo | null {
  const names: string[] = []
  let source: Named | undefined
  for (let n = start; n && names.length <= MAX_ANCESTORS; n = next(n)) {
    const d = describe(n)
    if (!d.name) continue
    source ??= d
    names.push(d.name)
  }
  const [name, ...chain] = names
  if (!name) return null
  const info: ComponentInfo = { framework, name, chain }
  if (source?.file) {
    info.file = source.file
    if (source.line) info.line = source.line
  }
  return info
}

function reactName(t: any): string | null {
  if (!t) return null
  if (typeof t === 'function') return t.displayName || t.name || null
  if (typeof t === 'object') return t.displayName || t.render?.displayName || t.render?.name || t.type?.displayName || t.type?.name || null
  return null
}

function basename(file?: string): string | null {
  const base = file?.split(/[\\/]/).pop()?.replace(/\.vue$/, '')
  return base || null
}

/** Primeiro elemento (ele mesmo ou ancestral) que tem a propriedade `key`. */
function closestWith(el: Element, key: string): AnyRec | null {
  let node: AnyRec | null = el
  while (node && !node[key]) node = node.parentElement
  return node ? node[key] : null
}

export function detectReact(el: Element): ComponentInfo | null {
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'))
  if (!key) return null
  return collect('react', (el as AnyRec)[key], (f) => f.return, (f) => {
    if (!REACT_COMPONENT_TAGS.has(f.tag)) return { name: null }
    const src = f._debugSource // React ≤ 18 em dev; removido no React 19
    return { name: reactName(f.type), file: src?.fileName, line: src?.lineNumber }
  })
}

export function detectVue3(el: Element): ComponentInfo | null {
  return collect('vue3', closestWith(el, '__vueParentComponent'), (i) => i.parent, (i) => {
    const t = i.type ?? {}
    return { name: t.name || t.__name || basename(t.__file), file: t.__file }
  })
}

export function detectVue2(el: Element): ComponentInfo | null {
  return collect('vue2', closestWith(el, '__vue__'), (vm) => vm.$parent, (vm) => {
    const o = vm.$options ?? {}
    return { name: o.name || o._componentTag || basename(o.__file), file: o.__file }
  })
}

export function detectComponent(el: Element): ComponentInfo | null {
  for (const detect of [detectReact, detectVue3, detectVue2]) {
    try {
      const r = detect(el)
      if (r) return r
    } catch {
      // COMP-04: falha silenciosa
    }
  }
  return null
}
