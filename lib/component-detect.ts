import type { ComponentInfo } from './types'

// Lê internals NÃO públicos de React/Vue (best-effort, COMP-04). Roda no main world via component-probe.

const MAX_ANCESTORS = 5
const REACT_COMPONENT_TAGS = new Set([0, 1, 11, 14, 15]) // Function, Class, ForwardRef, Memo, SimpleMemo
type AnyRec = Record<string, any>

function reactName(fiber: AnyRec): string | null {
  const t = fiber.type
  if (!t) return null
  if (typeof t === 'function') return t.displayName || t.name || null
  if (typeof t === 'object') {
    return t.displayName || t.render?.displayName || t.render?.name || t.type?.displayName || t.type?.name || null
  }
  return null
}

export function detectReact(el: Element): ComponentInfo | null {
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'))
  if (!key) return null
  const names: string[] = []
  let source: AnyRec | undefined
  for (let f: AnyRec | null = (el as AnyRec)[key]; f && names.length <= MAX_ANCESTORS; f = f.return) {
    if (!REACT_COMPONENT_TAGS.has(f.tag)) continue
    const name = reactName(f)
    if (!name) continue
    if (names.length === 0) source = f._debugSource // React ≤ 18 em dev; removido no React 19
    names.push(name)
  }
  const [name, ...chain] = names
  if (!name) return null
  const info: ComponentInfo = { framework: 'react', name, chain }
  if (source?.fileName) {
    info.file = source.fileName
    if (source.lineNumber) info.line = source.lineNumber
  }
  return info
}

function basename(file?: string): string | null {
  if (!file) return null
  const base = file.split(/[\\/]/).pop() ?? ''
  return base.replace(/\.vue$/, '') || null
}

export function detectVue3(el: Element): ComponentInfo | null {
  let node: AnyRec | null = el
  while (node && !node.__vueParentComponent) node = node.parentElement
  if (!node) return null
  const names: string[] = []
  let file: string | undefined
  for (let inst: AnyRec | null = node.__vueParentComponent; inst && names.length <= MAX_ANCESTORS; inst = inst.parent) {
    const t = inst.type ?? {}
    const name = t.name || t.__name || basename(t.__file)
    if (!name) continue
    if (names.length === 0) file = t.__file
    names.push(name)
  }
  const [name, ...chain] = names
  if (!name) return null
  return { framework: 'vue3', name, chain, ...(file ? { file } : {}) }
}

export function detectVue2(el: Element): ComponentInfo | null {
  let node: AnyRec | null = el
  while (node && !node.__vue__) node = node.parentElement
  if (!node) return null
  const names: string[] = []
  let file: string | undefined
  for (let vm: AnyRec | null = node.__vue__; vm && names.length <= MAX_ANCESTORS; vm = vm.$parent) {
    const o = vm.$options ?? {}
    const name = o.name || o._componentTag || basename(o.__file)
    if (!name) continue
    if (names.length === 0) file = o.__file
    names.push(name)
  }
  const [name, ...chain] = names
  if (!name) return null
  return { framework: 'vue2', name, chain, ...(file ? { file } : {}) }
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
