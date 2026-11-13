const TEST_ATTRS = ['data-testid', 'data-test', 'data-cy', 'data-qa', 'name'] as const

/** Padrões de classes/ids gerados por CSS-in-JS e CSS modules, que não são estáveis entre builds. */
const GENERATED: RegExp[] = [
  /^css-[a-z0-9]+$/i, // emotion
  /^sc-[a-z0-9]+$/i, // styled-components
  /^jsx-\d+$/, // styled-jsx
  /__[A-Za-z0-9_-]{5,}$/, // CSS modules: Button_root__x7Yz2
  /^_[A-Za-z0-9]{5,}$/, // hashes com underscore
  /\d{3,}/, // muitos dígitos
  /^[a-z]{1,3}-(?=[A-Za-z0-9]*[A-Z0-9])(?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]{5,}$/, // prefixo curto + hash misto
]

export function isGeneratedToken(token: string): boolean {
  return GENERATED.some((re) => re.test(token))
}

export function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return value.replace(/([^\w-])/g, '\\$1').replace(/^(\d)/, '\\3$1 ')
}

function isUnique(selector: string, root: ParentNode, el: Element): boolean {
  try {
    const found = root.querySelectorAll(selector)
    return found.length === 1 && found[0] === el
  } catch {
    return false
  }
}

function nthOfType(el: Element): number {
  let n = 1
  for (let s = el.previousElementSibling; s; s = s.previousElementSibling) if (s.localName === el.localName) n++
  return n
}

function segment(el: Element, withNth: boolean): string {
  let s = cssEscape(el.localName)
  for (const attr of TEST_ATTRS) {
    const v = el.getAttribute(attr)
    if (v) {
      s += `[${attr}="${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`
      break
    }
  }
  const classes = Array.from(el.classList).filter((c) => !isGeneratedToken(c)).slice(0, 2)
  for (const c of classes) s += `.${cssEscape(c)}`
  if (withNth) s += `:nth-of-type(${nthOfType(el)})`
  return s
}

/** Seletor CSS que, aplicado com querySelectorAll em `root`, retorna exatamente `el` (CAPT-02). */
export function buildSelector(el: Element, root: ParentNode = el.ownerDocument): string {
  if (el.id && !isGeneratedToken(el.id)) {
    const byId = `#${cssEscape(el.id)}`
    if (isUnique(byId, root, el)) return byId
  }
  const chain: Element[] = []
  for (let n: Element | null = el; n; n = n.parentElement) chain.push(n)

  for (const withNth of [false, true]) {
    for (let depth = 1; depth <= chain.length; depth++) {
      const sel = chain.slice(0, depth).reverse().map((n) => segment(n, withNth)).join(' > ')
      if (isUnique(sel, root, el)) return sel
    }
  }
  // Inalcançável na prática: o caminho completo com nth-of-type desde <html> é único.
  return chain.reverse().map((n) => `${cssEscape(n.localName)}:nth-of-type(${nthOfType(n)})`).join(' > ')
}
