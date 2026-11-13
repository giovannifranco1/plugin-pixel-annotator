# Modo Anotação — Tasks

**Spec**: `.specs/features/2026-11-13-modo-anotacao/spec.md`
**Design**: `.specs/features/2026-11-13-modo-anotacao/design.md`
**Status**: Done — 2026-11-13. Gate full: compile ok · 120 unit · builds Chrome/Firefox MV3 · check:manifest ok · 27 E2E. Checklist manual do dev em `manual-check.md`.
**Aprovação**: 2026-11-13 (Sentinel, dev ausente). plan-document-reviewer: 5 issues + 9 recomendações aplicadas (Firefox MV3, `matches` fora do content runtime, pasta do build E2E, `sendResponse` no Chrome, regex do seletor)

> **Modo de breakdown:** horizontal. Lógica pura em `lib/` primeiro (paralelizável, unit), depois os módulos de runtime, depois o E2E que integra tudo.
> **Política de commits (Sentinel):** 1 commit por **fase do nano-spec**, não por task. A linha "Commit" das tasks abaixo é só a mensagem sugerida para o histórico do commit de fase.
> **Testes:** o agente roda as suítes; o dev só testa manualmente no final (checklist Firefox na T25).
> **Código de referência:** os blocos de código são referência do design, NÃO copy-paste obrigatório. Os testes listados são o contrato.

---

## Gate Check Commands

| Gate | Comando | Quando |
|---|---|---|
| quick | `npm test` (Vitest, unit) | tasks de `lib/` e módulos com unit |
| build | `npm run compile && npm run build && npm run build:firefox` | scaffold, background, entrypoints |
| full | `npm test && npm run build && npm run test:e2e` | integração e fechamento |

## Matriz de Cobertura (de `.specs/codebase/TESTING.md`)

| Camada | Teste exigido | Parallel-safe |
|---|---|---|
| `lib/*` (lógica pura) | unit (Vitest + happy-dom) | Sim |
| `entrypoints/annotator.content/*` (UI/DOM) | unit (happy-dom) + E2E | unit: Sim · E2E: Não |
| `entrypoints/background.ts` | unit (`wxt/testing` fakeBrowser) + E2E | unit: Sim |
| `entrypoints/component-probe.ts` | unit + E2E | unit: Sim |
| build/config | build gate | — |

---

## Execution Plan

### Phase 1 — Foundation (sequencial)

```
T1
```

### Phase 2 — Lógica pura em `lib/` (paralelo)

```
      ┌→ T2 [P]  viewport
      ├→ T3 [P]  selector
      ├→ T4 [P]  css-filter
      ├→ T5 [P]  outer-html
T1 ───┼→ T6 [P]  crop
      ├→ T7 [P]  resolve
      ├→ T8 [P]  store
      ├→ T10 [P] export-names
      ├→ T11 [P] capture-queue
      └→ T12 [P] component-detect
T2 + T4 + T5 + T10 ──→ T9 markdown
```

### Phase 3 — Runtime (sequencial onde indicado)

```
T11 ──→ T13 background
T12 ──→ T14 probe + probe-client
T1  ──→ T15 shadow host/UI shell
T15 ──→ T16 interceptor + overlay
T15 ──→ T17 note-editor
T7 + T2 + T15 ──→ T18 markers + tick
T8 + T2 + T15 ──→ T19 panel
T3 + T2 + T4 + T5 + T6 + T14 + T15 ──→ T20 capture + screenshot
T9 + T10 + T8 + T15 ──→ T21 exporter + unload-guard
T13 + T16 + T17 + T18 + T19 + T20 + T21 ──→ T22 annotator (state machine)
```

### Phase 4 — Integração E2E (sequencial)

```
T22 ──→ T23 fixtures + harness ──→ T24 E2E specs ──→ T25 verificação final + checklist manual
```

---

## Task Breakdown

### T1: Scaffold WXT + TypeScript + Vitest + Playwright

**What**: Projeto WXT com scripts, manifest com permissões mínimas, tipos do modelo e harness de testes vazio rodando.
**Where**: `package.json`, `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `lib/types.ts`, `public/icon/{16,32,48,128}.png`, `.gitignore`, `scripts/check-manifest.mjs`
**Depends on**: None
**Reuses**: template WXT `vanilla`
**Refs**: PLAT-01
**Tests**: build (+ 1 unit de sanidade)
**Gate**: build

**Steps**:

- [ ] `npm init -y` e instalar: `npm i fflate` · `npm i -D wxt typescript vitest happy-dom @playwright/test vite react react-dom vue @types/react @types/react-dom`. Se o `wxt prepare` falhar com a versão mais nova do TypeScript, fixar `typescript@~5.9` e registrar em STACK.md.
- [ ] `package.json` scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "dev:firefox": "wxt -b firefox",
    "build": "wxt build",
    "build:firefox": "wxt build -b firefox",
    "build:e2e": "wxt build --mode e2e",
    "compile": "tsc --noEmit",
    "postinstall": "wxt prepare",
    "test": "vitest run",
    "test:e2e": "npm run build:e2e && playwright test",
    "check:manifest": "node scripts/check-manifest.mjs"
  }
}
```

- [ ] `wxt.config.ts`:

```ts
import { defineConfig } from 'wxt'

export default defineConfig({
  // WXT 0.21 gera MV2 para Firefox por padrão; a spec exige MV3 nos dois.
  manifestVersion: 3,
  manifest: ({ browser, mode }) => ({
    name: 'PixelAnnotator',
    short_name: 'PxA',
    description: 'Anote elementos da página e exporte feedback para o Claude Code.',
    permissions: ['activeTab', 'scripting'],
    // Só o build de E2E ganha host permission (Playwright não clica no ícone, então não há activeTab).
    ...(mode === 'e2e' ? { host_permissions: ['<all_urls>'] } : {}),
    action: { default_title: 'PixelAnnotator' },
    ...(browser === 'firefox'
      ? { browser_specific_settings: { gecko: { id: 'pxa@nanoincub.dev', strict_min_version: '128.0' } } }
      : { minimum_chrome_version: '95' }),
  }),
})
```

- [ ] `lib/types.ts` com os modelos do design (seção "Modelos de Dados"): `Breakpoint`, `ScreenCategory`, `Orientation`, `ViewportInfo`, `ComponentInfo`, `Rect`, `Annotation`.
- [ ] `vitest.config.ts`: `environment: 'happy-dom'`, `include: ['tests/unit/**/*.test.ts']`, plugin `WxtVitest()` de `wxt/testing/vitest-plugin` (no WXT 0.21 o `fakeBrowser` vem de `wxt/testing/fake-browser`).
- [ ] `playwright.config.ts`: `testDir: 'tests/e2e'`, `workers: 1`, `webServer: { command: 'npx vite tests/e2e/fixtures --port 5174 --strictPort', port: 5174, reuseExistingServer: true }`.
- [ ] `scripts/check-manifest.mjs`: lê `.output/chrome-mv3/manifest.json` e `.output/firefox-mv3/manifest.json` (build de produção; o de E2E sai em `.output/chrome-mv3-e2e` e não é checado), falha (exit 1) se algum não existir, se `manifest_version` ≠ 3, se `permissions` ≠ `["activeTab","scripting"]` ou se existir `host_permissions` ou `content_scripts`.
- [ ] `tsconfig.json`: `{ "extends": "./.wxt/tsconfig.json" }` (dá o alias `@/` e os auto-imports `defineBackground`, `browser`, etc.).
- [ ] Ícones placeholder pixel 16/32/48/128 (PNG gerado por script ou desenhado).
- [ ] `tests/unit/sanity.test.ts`: `expect(1).toBe(1)`.
- [ ] `.gitignore`: `node_modules`, `.output`, `.wxt`, `test-results`, `playwright-report`.

**Done when**:

- [ ] `npm run compile` sem erros
- [ ] `npm run build && npm run build:firefox` geram `.output/chrome-mv3` e `.output/firefox-mv3` (MV3 nos dois)
- [ ] `npm run check:manifest` → exit 0
- [ ] `npm test` → 1 teste passando

**Commit sugerido**: `build(build): scaffold wxt com permissões mínimas e harness de testes`

---

### T2: `lib/viewport.ts` — breakpoint, categoria e orientação [P]

**What**: Classificar a largura do viewport e montar `ViewportInfo`.
**Where**: `lib/viewport.ts`, `tests/unit/viewport.test.ts`
**Depends on**: T1
**Refs**: CAPT-03, MARC-01, MARC-02
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
import type { Breakpoint, ScreenCategory, Orientation, ViewportInfo } from './types'

const MIN_WIDTH: Array<[Breakpoint, number]> = [['2xl', 1536], ['xl', 1280], ['lg', 1024], ['md', 768], ['sm', 640]]

export function breakpointOf(width: number): Breakpoint {
  for (const [bp, min] of MIN_WIDTH) if (width >= min) return bp
  return 'base'
}

export function categoryOf(width: number): ScreenCategory {
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export function orientationOf(width: number, height: number): Orientation {
  return height >= width ? 'retrato' : 'paisagem'
}

export const CATEGORY_ICON: Record<ScreenCategory, string> = { mobile: '📱', tablet: '📟', desktop: '🖥️' }
export const CATEGORY_COLOR: Record<ScreenCategory, string> = { mobile: '#3fbf5f', tablet: '#f2c94c', desktop: '#4a8cff' }

export function readViewport(win: Pick<Window, 'innerWidth' | 'innerHeight' | 'devicePixelRatio'>): ViewportInfo {
  const width = win.innerWidth
  const height = win.innerHeight
  return {
    width, height,
    breakpoint: breakpointOf(width),
    category: categoryOf(width),
    dpr: win.devicePixelRatio,
    orientation: orientationOf(width, height),
  }
}
```

**Testes (contrato)**:

- `CAPT-03 breakpoint nas fronteiras`: 639→`base`, 640→`sm`, 767→`sm`, 768→`md`, 1023→`md`, 1024→`lg`, 1279→`lg`, 1280→`xl`, 1535→`xl`, 1536→`2xl`
- `CAPT-03 categoria`: 390→`mobile`, 767→`mobile`, 768→`tablet`, 1023→`tablet`, 1024→`desktop`, 1440→`desktop`
- `CAPT-03 orientação`: 390×844→`retrato`, 844×390→`paisagem`, 500×500→`retrato`
- `CAPT-03 readViewport monta tudo`: `{innerWidth:390, innerHeight:844, devicePixelRatio:3}` → `{width:390,height:844,breakpoint:'base',category:'mobile',dpr:3,orientation:'retrato'}`

**Done when**: `npx vitest run tests/unit/viewport.test.ts` → 4 testes passando.

**Commit sugerido**: `feat(capture): classifica viewport em breakpoint e categoria de tela`

---

### T3: `lib/selector.ts` — seletor CSS único [P]

**What**: `buildSelector(el)` retorna seletor que casa exatamente com `el`.
**Where**: `lib/selector.ts`, `tests/unit/selector.test.ts`
**Depends on**: T1
**Refs**: CAPT-02 (+ caso limite id duplicado / classes geradas)
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
const TEST_ATTRS = ['data-testid', 'data-test', 'data-cy', 'data-qa', 'name'] as const
const GENERATED: RegExp[] = [
  /^css-[a-z0-9]+$/i,          // emotion
  /^sc-[a-z0-9]+$/i,           // styled-components
  /^jsx-\d+$/,                 // styled-jsx
  /__[A-Za-z0-9_-]{5,}$/,      // CSS modules: Button_root__x7Yz2
  /^_[A-Za-z0-9]{5,}$/,        // hashes com underscore
  /\d{3,}/,                    // muitos dígitos
  /^[a-z]{1,3}-(?=[A-Za-z0-9]*[A-Z0-9])(?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]{5,}$/, // prefixo curto + hash com maiúscula/dígito misturado
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
    if (v) { s += `[${attr}="${v.replace(/"/g, '\\"')}"]`; break }
  }
  const classes = Array.from(el.classList).filter((c) => !isGeneratedToken(c)).slice(0, 2)
  for (const c of classes) s += `.${cssEscape(c)}`
  if (withNth) s += `:nth-of-type(${nthOfType(el)})`
  return s
}

export function buildSelector(el: Element, root: ParentNode = el.ownerDocument): string {
  if (el.id && !isGeneratedToken(el.id)) {
    const byId = `#${cssEscape(el.id)}`
    if (isUnique(byId, root, el)) return byId
  }
  const chain: Element[] = []
  for (let n: Element | null = el; n; n = n.parentElement) chain.push(n)

  for (let depth = 1; depth <= chain.length; depth++) {
    const sel = chain.slice(0, depth).reverse().map((n) => segment(n, false)).join(' > ')
    if (isUnique(sel, root, el)) return sel
  }
  for (let depth = 1; depth <= chain.length; depth++) {
    const sel = chain.slice(0, depth).reverse().map((n) => segment(n, true)).join(' > ')
    if (isUnique(sel, root, el)) return sel
  }
  // Inalcançável na prática: o caminho completo com nth-of-type desde <html> é único.
  return chain.reverse().map((n) => `${cssEscape(n.localName)}:nth-of-type(${nthOfType(n)})`).join(' > ')
}
```

**Testes (contrato)** — cada um monta `document.body.innerHTML` e verifica `document.querySelectorAll(buildSelector(el))` === `[el]`:

- `CAPT-02 usa #id quando único e estável`: `<button id="save">` → `#save`
- `CAPT-02 ignora id duplicado`: dois `<div id="x">`, alvo é o 2º → seletor único e ≠ `#x`
- `CAPT-02 ignora classes geradas`: `<div class="css-1a2b3c card">` → seletor contém `.card` e não contém `css-1a2b3c`
- `CAPT-02 prefere data-testid`: `<li data-testid="row-3">` entre irmãos iguais → contém `[data-testid="row-3"]`
- `CAPT-02 desempata com nth-of-type`: 3 `<li class="item">` idênticos, alvo é o 2º → contém `:nth-of-type(2)`
- `CAPT-02 isGeneratedToken`: `true` para `css-1a2b3c`, `sc-AxjAm`, `jsx-123`, `Button_root__x7Yz2`; `false` para `card`, `btn-primary`, `card-footer`, `nav-links`, `img-fluid`
- `CAPT-02 escapa caracteres especiais`: `<div class="md:flex w-1/2">` → seletor válido e único

**Done when**: `npx vitest run tests/unit/selector.test.ts` → 7 testes passando.

**Commit sugerido**: `feat(capture): gera seletor css único ignorando classes geradas`

---

### T4: `lib/css-filter.ts` — CSS relevante [P]

**What**: Lista fixa de propriedades, filtro contra o default da tag e compactação em shorthand.
**Where**: `lib/css-filter.ts`, `tests/unit/css-filter.test.ts`
**Depends on**: T1
**Refs**: CAPT-06, EXPO-02
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
const SIDES = ['top', 'right', 'bottom', 'left'] as const

export const CSS_PROPERTIES: readonly string[] = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'overflow-x', 'overflow-y',
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self', 'align-content',
  'gap', 'row-gap', 'column-gap', 'flex-grow', 'flex-shrink', 'flex-basis', 'order',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'box-sizing', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  ...SIDES.map((s) => `margin-${s}`), ...SIDES.map((s) => `padding-${s}`),
  ...SIDES.map((s) => `border-${s}-width`), ...SIDES.map((s) => `border-${s}-style`), ...SIDES.map((s) => `border-${s}-color`),
  'border-radius',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'white-space',
  'color', 'background-color', 'background-image', 'opacity', 'box-shadow', 'transform', 'visibility',
]

const ALWAYS_KEEP = new Set(['display', 'width', 'height'])

export type CssEntries = Array<[property: string, value: string]>

export function filterCss(computed: Record<string, string>, defaults: Record<string, string>): CssEntries {
  const out: CssEntries = []
  for (const prop of CSS_PROPERTIES) {
    const value = computed[prop]
    if (value === undefined || value === '') continue
    if (ALWAYS_KEEP.has(prop) || value !== defaults[prop]) out.push([prop, value])
  }
  return out
}

export function readStyle(style: CSSStyleDeclaration): Record<string, string> {
  const out: Record<string, string> = {}
  for (const prop of CSS_PROPERTIES) out[prop] = style.getPropertyValue(prop)
  return out
}

const GROUPS: Array<[shorthand: string, longhands: string[]]> = [
  ['margin', SIDES.map((s) => `margin-${s}`)],
  ['padding', SIDES.map((s) => `padding-${s}`)],
  ['border-width', SIDES.map((s) => `border-${s}-width`)],
  ['border-style', SIDES.map((s) => `border-${s}-style`)],
  ['border-color', SIDES.map((s) => `border-${s}-color`)],
]

/** Junta os 4 lados em shorthand quando todos estão presentes e iguais. Mantém a ordem da primeira ocorrência. */
export function compactCss(entries: CssEntries): CssEntries {
  const map = new Map(entries)
  const replaced = new Map<string, [string, string]>()
  for (const [short, longs] of GROUPS) {
    const values = longs.map((l) => map.get(l))
    if (values.every((v) => v !== undefined && v === values[0])) {
      replaced.set(longs[0], [short, values[0] as string])
      for (const l of longs.slice(1)) replaced.set(l, ['', ''])
    }
  }
  const out: CssEntries = []
  for (const [p, v] of entries) {
    const r = replaced.get(p)
    if (!r) out.push([p, v])
    else if (r[0]) out.push(r)
  }
  return out
}
```

**Testes (contrato)**:

- `CAPT-06 remove valores iguais ao default`: computed `{display:'block', color:'rgb(0,0,0)', 'font-size':'16px'}` vs defaults iguais exceto `font-size:'14px'` → contém `font-size`, não contém `color`
- `CAPT-06 sempre mantém display, width e height`: iguais ao default → presentes
- `CAPT-06 respeita ordem da lista fixa`: saída na ordem de `CSS_PROPERTIES`
- `CAPT-06 ignora propriedades fora da lista`: `cursor` não aparece
- `EXPO-02 compacta 4 lados iguais`: `margin-top..left = 8px` → `['margin','8px']` uma vez, na posição de `margin-top`
- `EXPO-02 não compacta lados diferentes ou ausentes`

**Done when**: `npx vitest run tests/unit/css-filter.test.ts` → 6 testes passando.

**Commit sugerido**: `feat(capture): filtra css computado relevante por tag`

---

### T5: `lib/outer-html.ts` — HTML truncado [P]

**What**: `truncateHtml(html, max = 2000)`.
**Where**: `lib/outer-html.ts`, `tests/unit/outer-html.test.ts`
**Depends on**: T1
**Refs**: CAPT-05
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
export const OUTER_HTML_LIMIT = 2000

export function truncateHtml(html: string, max = OUTER_HTML_LIMIT): { html: string; truncated: boolean } {
  if (html.length <= max) return { html, truncated: false }
  return { html: html.slice(0, max), truncated: true }
}
```

**Testes**: `CAPT-05 mantém html curto` (1999 e 2000 chars → `truncated:false`) · `CAPT-05 corta em 2000 e sinaliza` (2001 → length 2000, `truncated:true`).

**Done when**: `npx vitest run tests/unit/outer-html.test.ts` → 2 testes passando.

**Commit sugerido**: `feat(capture): trunca html externo em 2000 caracteres`

---

### T6: `lib/crop.ts` — geometria do print [P]

**What**: Calcular recorte em px da imagem, contorno relativo e flag de parcial.
**Where**: `lib/crop.ts`, `tests/unit/crop.test.ts`
**Depends on**: T1
**Refs**: CAPT-07, CAPT-08
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
import type { Rect } from './types'

export const SHOT_MARGIN = 16

export function isFullyVisible(rect: Rect, vw: number, vh: number): boolean {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= vw && rect.y + rect.height <= vh
}

export interface CropPlan {
  crop: Rect      // em px da imagem
  outline: Rect   // em px da imagem, relativo ao crop
  partial: boolean
  scale: number
}

export function planCrop(el: Rect, vw: number, vh: number, imageWidth: number, imageHeight: number, margin = SHOT_MARGIN): CropPlan {
  const scale = imageWidth / vw
  const x0 = Math.max(0, el.x - margin)
  const y0 = Math.max(0, el.y - margin)
  const x1 = Math.min(vw, el.x + el.width + margin)
  const y1 = Math.min(vh, el.y + el.height + margin)
  const crop: Rect = {
    x: Math.round(x0 * scale),
    y: Math.round(y0 * scale),
    width: Math.min(imageWidth, Math.round(x1 * scale)) - Math.round(x0 * scale),
    height: Math.min(imageHeight, Math.round(y1 * scale)) - Math.round(y0 * scale),
  }
  const outline: Rect = {
    x: Math.round((el.x - x0) * scale),
    y: Math.round((el.y - y0) * scale),
    width: Math.round(el.width * scale),
    height: Math.round(el.height * scale),
  }
  return { crop, outline, partial: !isFullyVisible(el, vw, vh), scale }
}
```

**Testes**:

- `CAPT-07 aplica margem de 16px e escala 2x`: el `{x:100,y:100,w:50,h:20}`, vw 400×300, imagem 800×600 → crop `{x:168,y:168,width:164,height:104}`, outline `{x:32,y:32,width:100,height:40}`, partial `false`
- `CAPT-07 margem limitada às bordas`: el em `{x:4,y:4}` → crop.x === 0, outline.x === 8 (scale 2)
- `CAPT-08 elemento maior que o viewport é parcial`: el `{x:0,y:-50,w:400,h:900}` vw 400×300 → partial `true`, crop dentro da imagem
- `CAPT-08 isFullyVisible`: dentro → true; saindo à direita → false

**Done when**: `npx vitest run tests/unit/crop.test.ts` → 4 testes passando.

**Commit sugerido**: `feat(capture): calcula recorte do print com margem e escala`

---

### T7: `lib/resolve.ts` — regra de resolução do elemento [P]

**What**: Implementar a "Regra de resolução do elemento" da spec.
**Where**: `lib/resolve.ts`, `tests/unit/resolve.test.ts`
**Depends on**: T1
**Refs**: ANOT-08, PAIN-02, PAIN-06 (+ caso limite elemento removido)
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
export interface Resolvable { selector: string; pathname: string }

export function resolveElement(
  target: Resolvable,
  ref: WeakRef<Element> | undefined,
  currentPathname: string,
  root: ParentNode,
): Element | null {
  const original = ref?.deref()
  if (original?.isConnected) return original
  if (target.pathname !== currentPathname) return null
  try {
    const found = root.querySelectorAll(target.selector)
    return found.length === 1 ? found[0] : null
  } catch {
    return null
  }
}
```

> Nota: com o nó original conectado, ele vence mesmo se a rota mudou? **Não** — PAIN-06 exige exibir marcadores só da rota atual. A filtragem por rota acontece no MarkerLayer (T18) antes de chamar `resolveElement`. `resolveElement` responde só "qual é o elemento".

**Testes**:

- `ANOT-08 usa o nó original conectado`
- `PAIN-02 nó removido + mesma rota + 1 correspondência → elemento novo`
- `PAIN-02 nó removido + mesma rota + 2 correspondências → null`
- `PAIN-06 nó removido + rota diferente → null`
- `PAIN-02 seletor inválido → null`

**Done when**: `npx vitest run tests/unit/resolve.test.ts` → 5 testes passando.

**Commit sugerido**: `feat(content): resolve elemento anotado por nó original ou seletor`

---

### T8: `lib/store.ts` — AnnotationStore [P]

**What**: Estado em memória com numeração monotônica, dirty flag e assinatura.
**Where**: `lib/store.ts`, `tests/unit/store.test.ts`
**Depends on**: T1
**Refs**: PAIN-01, PAIN-03, PAIN-04, EXPO-04, EXPO-05, AVIS-01
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
import type { Annotation } from './types'

export type AnnotationDraft = Omit<Annotation, 'id' | 'number' | 'createdAt' | 'updatedAt'>
type Listener = () => void

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
    refOf: (id: string) => refs.get(id),
    markExported(): void { dirty = false },
    isDirty: () => dirty,
    subscribe(l: Listener): () => void { listeners.add(l); return () => listeners.delete(l) },
  }
}

export type AnnotationStore = ReturnType<typeof createStore>
```

> Decisão: `remove` não marca dirty (apagar não cria trabalho a perder); `clear` zera dirty (não há mais nada a perder). `markExported` só é chamado pelo `.zip`.

**Testes**:

- `PAIN-01 lista em ordem de criação`
- `PAIN-04 excluir não renumera e o próximo número continua`: add 3, remove #1, add → números `[2,3,4]`
- `PAIN-03 updateNote altera a nota e updatedAt sem mudar o resto`
- `EXPO-05 clear apaga tudo`
- `AVIS-01 dirty após add/update e limpo após markExported`
- `AVIS-01 copiar markdown não limpa dirty` (não chamar markExported → continua dirty)
- `PAIN-01 subscribe notifica e unsubscribe para de notificar`

**Done when**: `npx vitest run tests/unit/store.test.ts` → 7 testes passando.

**Commit sugerido**: `feat(content): adiciona store de anotações em memória`

---

### T9: `lib/markdown.ts` — gerador do `feedback.md`

**What**: `renderMarkdown(annotations, meta, { imageLinks })` no formato do design.
**Where**: `lib/markdown.ts`, `tests/unit/markdown.test.ts`
**Depends on**: T2, T4, T5, T10
**Refs**: EXPO-02, EXPO-03 (+ caso limite crases)
**Tests**: unit (snapshot) · **Gate**: quick

**Código de referência**:

```ts
import type { Annotation } from './types'
import { CATEGORY_ICON } from './viewport'
import { compactCss } from './css-filter'
import { shotName } from './export-names'
import { OUTER_HTML_LIMIT } from './outer-html'

export interface MarkdownMeta { origin: string; generatedAt: Date }

const pad2 = (n: number) => String(n).padStart(2, '0')

export function formatDateTime(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function longestRun(text: string, ch: string): number {
  let max = 0, cur = 0
  for (const c of text) { cur = c === ch ? cur + 1 : 0; max = Math.max(max, cur) }
  return max
}

export function fenced(content: string, lang: string): string {
  const fence = '`'.repeat(Math.max(3, longestRun(content, '`') + 1))
  return `${fence}${lang}\n${content}\n${fence}`
}

export function inlineCode(text: string): string {
  const ticks = '`'.repeat(longestRun(text, '`') + 1)
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : ''
  return `${ticks}${pad}${text}${pad}${ticks}`
}

function componentLines(a: Annotation): string[] {
  if (!a.component) return []
  const c = a.component
  const fw = c.framework === 'react' ? 'React' : 'Vue'
  const chain = [c.name, ...c.chain].map(inlineCode).join(' ← ')
  const lines = [`- **Componente:** ${chain} (${fw})`]
  if (c.file) lines.push(`- **Arquivo:** ${inlineCode(c.line ? `${c.file}:${c.line}` : c.file)}`)
  return lines
}

function printLine(a: Annotation, imageLinks: boolean): string {
  if (!a.shot) return '- **Print:** indisponível'
  const suffix = a.shotPartial ? ' (print parcial)' : ''
  if (!imageLinks) return `- **Print:** (print disponível no .zip)${suffix}`
  return `- **Print:** ![#${a.number}](${shotName(a.number)})${suffix}`
}

function section(a: Annotation, imageLinks: boolean): string {
  const v = a.viewport
  const css = compactCss(a.css).map(([p, val]) => `${p}: ${val};`).join('\n')
  const htmlTitle = a.outerHtmlTruncated ? `**HTML** (truncado em ${OUTER_HTML_LIMIT.toLocaleString('pt-BR')} caracteres):` : '**HTML:**'
  return [
    `## #${a.number} · ${CATEGORY_ICON[v.category]} ${v.category} · ${v.width}px (${inlineCode(v.breakpoint)}) · ${inlineCode(a.path)}`,
    '',
    ...componentLines(a),
    `- **Seletor:** ${inlineCode(a.selector)}`,
    `- **Viewport:** ${v.width}×${v.height} · DPR ${v.dpr} · ${v.orientation}`,
    printLine(a, imageLinks),
    '',
    '**Nota:**',
    '',
    fenced(a.note, 'text'),
    '',
    '**CSS relevante:**',
    '',
    fenced(css, 'css'),
    '',
    htmlTitle,
    '',
    fenced(a.outerHtml, 'html'),
    '',
    '---',
  ].join('\n')
}

export function renderMarkdown(annotations: readonly Annotation[], meta: MarkdownMeta, opts: { imageLinks: boolean }): string {
  const header = [
    `# Feedback PxA — ${meta.origin}`,
    '',
    `- **Gerado em:** ${formatDateTime(meta.generatedAt)}`,
    `- **Anotações:** ${annotations.length}`,
    '- **Para o Claude Code:** cada seção abaixo é um ajuste visual. Use o componente/arquivo e o seletor para localizar o código, a tela (categoria + largura) para saber em qual breakpoint corrigir e o print para conferir. Resolva todos.',
    '',
    '---',
    '',
  ].join('\n')
  return header + annotations.map((a) => section(a, opts.imageLinks)).join('\n\n') + '\n'
}
```

**Testes** (fixture `tests/unit/fixtures/annotations.ts` com 2 anotações: uma React com arquivo/linha e print parcial, uma sem componente e sem print):

- `EXPO-02 snapshot com links de imagem` (`toMatchSnapshot()`)
- `EXPO-02 cabeçalho tem origem, data dd/MM/yyyy HH:mm, total e instrução`
- `EXPO-02 omite componente quando null`
- `EXPO-03 sem links troca por "(print disponível no .zip)"` e não contém `](shots/`
- `caso limite: nota com crases continua cercada` — nota "use ```js``` aqui" → cerca de 4 crases e o markdown tem cercas balanceadas
- `EXPO-02 mostra "(truncado em 2.000 caracteres)" só quando truncado`

**Done when**: `npx vitest run tests/unit/markdown.test.ts` → 6 testes passando; snapshot gravado em `tests/unit/__snapshots__/markdown.test.ts.snap`.

**Commit sugerido**: `feat(export): gera feedback.md com escape de crases`

---

### T10: `lib/export-names.ts` — nomes do zip e prints [P]

**Where**: `lib/export-names.ts`, `tests/unit/export-names.test.ts`
**Depends on**: T1
**Refs**: EXPO-01
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
const pad = (n: number, w = 2) => String(n).padStart(w, '0')

export function zipName(d: Date): string {
  return `pxa-feedback-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.zip`
}

export function shotName(n: number): string {
  return `shots/${pad(n, n >= 100 ? 3 : 2)}.png`
}
```

**Testes**: `EXPO-01 zipName usa hora local` (`new Date(2026,10,13,9,5)` → `pxa-feedback-2026-11-13-0905.zip`) · `EXPO-01 shotName com 2 dígitos` (1→`shots/01.png`, 12→`shots/12.png`) · `EXPO-01 shotName com 3 dígitos a partir de 100`.

**Done when**: `npx vitest run tests/unit/export-names.test.ts` → 3 testes passando.

**Commit sugerido**: `feat(export): define nomes do zip e dos prints`

---

### T11: `lib/capture-queue.ts` — fila de prints [P]

**Where**: `lib/capture-queue.ts`, `tests/unit/capture-queue.test.ts`
**Depends on**: T1
**Refs**: caso limite "prints em sequência rápida", CAPT-07
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
export function createCaptureQueue<T>(
  capture: () => Promise<T>,
  minIntervalMs = 550,
  now: () => number = () => Date.now(),
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  let tail: Promise<unknown> = Promise.resolve()
  let last = -Infinity
  return {
    enqueue(): Promise<T> {
      const run = async () => {
        const wait = last + minIntervalMs - now()
        if (wait > 0) await sleep(wait)
        last = now()
        return capture()
      }
      const result = tail.then(run, run)
      tail = result.catch(() => undefined)
      return result
    },
  }
}
```

**Testes** (com `vi.useFakeTimers()`):

- `fila executa em ordem FIFO`
- `respeita intervalo mínimo de 550ms entre capturas` (3 pedidos → timestamps com diferença ≥ 550)
- `erro em um pedido não trava os próximos`

**Done when**: `npx vitest run tests/unit/capture-queue.test.ts` → 3 testes passando.

**Commit sugerido**: `feat(background): enfileira capturas respeitando limite do navegador`

---

### T12: `lib/component-detect.ts` — detecção React/Vue [P]

**What**: Funções puras que leem as propriedades expando de um elemento (executadas no main world pelo probe).
**Where**: `lib/component-detect.ts`, `tests/unit/component-detect.test.ts`
**Depends on**: T1
**Refs**: COMP-01, COMP-02, COMP-03, COMP-04
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
import type { ComponentInfo } from './types'

const MAX_ANCESTORS = 5
const REACT_COMPONENT_TAGS = new Set([0, 1, 11, 14, 15])
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
    if (names.length === 0) source = f._debugSource
    names.push(name)
  }
  if (names.length === 0) return null
  const info: ComponentInfo = { framework: 'react', name: names[0], chain: names.slice(1) }
  if (source?.fileName) { info.file = source.fileName; if (source.lineNumber) info.line = source.lineNumber }
  return info
}

function basename(file?: string): string | null {
  if (!file) return null
  const base = file.split(/[\\/]/).pop() ?? ''
  return base.replace(/\.vue$/, '') || null
}

function vue3Name(inst: AnyRec): string | null {
  const t = inst.type ?? {}
  return t.name || t.__name || basename(t.__file)
}

export function detectVue3(el: Element): ComponentInfo | null {
  let node: AnyRec | null = el
  while (node && !node.__vueParentComponent) node = node.parentElement
  if (!node) return null
  const names: string[] = []
  let file: string | undefined
  for (let inst: AnyRec | null = node.__vueParentComponent; inst && names.length <= MAX_ANCESTORS; inst = inst.parent) {
    const name = vue3Name(inst)
    if (!name) continue
    if (names.length === 0) file = inst.type?.__file
    names.push(name)
  }
  if (names.length === 0) return null
  return { framework: 'vue3', name: names[0], chain: names.slice(1), ...(file ? { file } : {}) }
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
  if (names.length === 0) return null
  return { framework: 'vue2', name: names[0], chain: names.slice(1), ...(file ? { file } : {}) }
}

export function detectComponent(el: Element): ComponentInfo | null {
  for (const detect of [detectReact, detectVue3, detectVue2]) {
    try {
      const r = detect(el)
      if (r) return r
    } catch {
      /* COMP-04: falha silenciosa */
    }
  }
  return null
}
```

> `names.length <= MAX_ANCESTORS` coleta o componente + até 5 ancestrais (6 nomes); `chain` fica com no máximo 5.

**Testes** (fibers/instâncias falsas presas em elementos happy-dom):

- `COMP-01 React: nome do componente mais próximo + cadeia de até 5`: fiber host (tag 5) → `Card` (0) → `List` (0) → … 7 níveis → `name:'Card'`, `chain.length === 5`
- `COMP-01 React: ignora anônimos e resolve forwardRef/memo`: tag 11 com `type.render.name='Input'`; tag 14 com `type.type.name='Row'`
- `COMP-03 React ≤18: arquivo e linha de _debugSource`
- `COMP-03 React 19: sem _debugSource → sem file`
- `COMP-02 Vue 3: sobe o DOM até __vueParentComponent; nome por name/__name/__file; arquivo de __file`
- `COMP-02 Vue 2: __vue__ + $options.name/_componentTag + $parent`
- `COMP-04 sem framework → null`
- `COMP-04 getter que lança → null, sem exceção`

**Done when**: `npx vitest run tests/unit/component-detect.test.ts` → 8 testes passando.

**Commit sugerido**: `feat(content): detecta componente react e vue a partir do elemento`

---

### T13: `entrypoints/background.ts` — toggle, injeção, badge e captura

**What**: Handler do ícone com injeção sob demanda, badge de erro e mensagem `pxa:capture`.
**Where**: `entrypoints/background.ts`, `lib/messages.ts`, `tests/unit/background.test.ts`
**Depends on**: T11
**Refs**: ANOT-01, ANOT-02, PLAT-01, PLAT-02 (+ caso limite "já injetado")
**Tests**: unit (`fakeBrowser`) · **Gate**: build + quick

**Código de referência**:

```ts
// lib/messages.ts
export type PxaMessage = { type: 'pxa:toggle' } | { type: 'pxa:capture' }
export const ANNOTATOR_FILE = '/content-scripts/annotator.js'
export const PROBE_FILE = '/component-probe.js'
export const BLOCKED_TITLE = 'PxA não pode anotar esta página'
```

```ts
// entrypoints/background.ts
import { createCaptureQueue } from '@/lib/capture-queue'
import { ANNOTATOR_FILE, PROBE_FILE, BLOCKED_TITLE, type PxaMessage } from '@/lib/messages'

const NO_RECEIVER = /Receiving end does not exist|Could not establish connection/i

export async function toggle(tabId: number): Promise<void> {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'pxa:toggle' } satisfies PxaMessage)
  } catch (err) {
    // Só reinjeta quando não há content script; qualquer outro erro não pode virar um segundo toggle.
    if (!NO_RECEIVER.test(String((err as Error)?.message ?? err))) return
    try {
      await browser.scripting.executeScript({ target: { tabId }, files: [ANNOTATOR_FILE] })
      await browser.scripting.executeScript({ target: { tabId }, files: [PROBE_FILE], world: 'MAIN' }).catch(() => undefined) // COMP-04
      await browser.tabs.sendMessage(tabId, { type: 'pxa:toggle' } satisfies PxaMessage)
    } catch {
      await browser.action.setBadgeText({ tabId, text: '!' })
      await browser.action.setTitle({ tabId, title: BLOCKED_TITLE })
      return
    }
  }
  await browser.action.setBadgeText({ tabId, text: '' })
  await browser.action.setTitle({ tabId, title: 'PixelAnnotator' })
}

export default defineBackground(() => {
  const queue = createCaptureQueue(() => browser.tabs.captureVisibleTab({ format: 'png' }))
  browser.action.onClicked.addListener((tab) => { if (tab.id !== undefined) void toggle(tab.id) })
  // Chrome (sem polyfill) não aceita Promise como retorno do listener: usar sendResponse + `return true`.
  browser.runtime.onMessage.addListener((msg: PxaMessage, _sender, sendResponse) => {
    if (msg?.type !== 'pxa:capture') return undefined
    queue.enqueue().then(
      (dataUrl) => sendResponse({ dataUrl }),
      (err) => sendResponse({ error: String(err) }),
    )
    return true
  })
  if (import.meta.env.MODE === 'e2e') (globalThis as any).__pxaToggle = toggle // gancho só no build de E2E
})
```

> `captureVisibleTab()` sem `windowId` captura a janela atual, que é a da aba que pediu (ela está ativa porque o dev acabou de clicar nela).

**Testes** (`fakeBrowser` + `vi.spyOn`):

- `ANOT-01 primeira vez: injeta annotator e probe (MAIN) e envia toggle`
- `ANOT-02 já injetado: só envia toggle, não reinjeta`
- `ANOT-02 erro que não é "Receiving end does not exist": não reinjeta nem reenvia toggle`
- `CAPT-07 pxa:capture responde via sendResponse e o listener retorna true`
- `PLAT-02 injeção falha: badge "!" e título "PxA não pode anotar esta página" na aba`
- `PLAT-02 sucesso limpa badge e título`
- `COMP-04 probe falha mas annotator injeta: toggle segue`

**Done when**: `npx vitest run tests/unit/background.test.ts` → 7 passando · `npm run build && npm run build:firefox && npm run check:manifest` → ok.

**Commit sugerido**: `feat(background): alterna modo com injeção sob demanda e badge de erro`

---

### T14: Probe (main world) + ProbeClient (isolated)

**Where**: `entrypoints/component-probe.ts`, `entrypoints/annotator.content/probe-client.ts`, `tests/unit/probe-client.test.ts`
**Depends on**: T12
**Refs**: COMP-01, COMP-02, COMP-03, COMP-04
**Tests**: unit · **Gate**: quick + build

**Código de referência**:

```ts
// entrypoints/component-probe.ts
import { detectComponent } from '@/lib/component-detect'

export default defineUnlistedScript(() => {
  const w = window as any
  if (w.__pxaProbe) return
  w.__pxaProbe = true
  window.addEventListener('pxa:probe-request', (ev) => {
    let reqId = ''
    try {
      reqId = JSON.parse(String((ev as CustomEvent).detail)).reqId
      const el = document.querySelector(`[data-pxa-probe="${reqId}"]`)
      const result = el ? detectComponent(el) : null
      window.dispatchEvent(new CustomEvent('pxa:probe-response', { detail: JSON.stringify({ reqId, result }) }))
    } catch {
      if (reqId) window.dispatchEvent(new CustomEvent('pxa:probe-response', { detail: JSON.stringify({ reqId, result: null }) }))
    }
  })
})
```

```ts
// entrypoints/annotator.content/probe-client.ts
import type { ComponentInfo } from '@/lib/types'

export const PROBE_TIMEOUT_MS = 300

export function probeComponent(el: Element, win: Window = window, timeoutMs = PROBE_TIMEOUT_MS): Promise<ComponentInfo | null> {
  const reqId = Math.random().toString(36).slice(2)
  return new Promise((resolve) => {
    const done = (value: ComponentInfo | null) => {
      win.removeEventListener('pxa:probe-response', onResponse)
      clearTimeout(timer)
      el.removeAttribute('data-pxa-probe')
      resolve(value)
    }
    const onResponse = (ev: Event) => {
      try {
        const data = JSON.parse(String((ev as CustomEvent).detail))
        if (data.reqId === reqId) done(data.result ?? null)
      } catch { /* ignora respostas malformadas */ }
    }
    const timer = setTimeout(() => done(null), timeoutMs)
    win.addEventListener('pxa:probe-response', onResponse)
    el.setAttribute('data-pxa-probe', reqId)
    win.dispatchEvent(new CustomEvent('pxa:probe-request', { detail: JSON.stringify({ reqId }) }))
  })
}
```

**Testes** (happy-dom; um listener falso faz o papel do probe):

- `COMP-01 recebe o resultado do probe para o reqId certo`
- `COMP-04 timeout de 300ms → null` (fake timers)
- `COMP-04 ignora resposta de outro reqId`
- `COMP-04 remove data-pxa-probe sempre (sucesso e timeout)`

**Done when**: `npx vitest run tests/unit/probe-client.test.ts` → 4 passando · `npm run build` gera `.output/chrome-mv3/component-probe.js`.

**Commit sugerido**: `feat(content): conecta probe do main world para detectar componentes`

---

### T15: Shadow host + UI shell (estilos, toast)

**What**: Host `<pxa-root data-pxa-ignore>` com Shadow DOM, CSS base pixel art e toast.
**Where**: `entrypoints/annotator.content/ui/host.ts`, `entrypoints/annotator.content/ui/styles.ts`, `entrypoints/annotator.content/ui/toast.ts`, `tests/unit/ui-host.test.ts`
**Depends on**: T1
**Refs**: ANOT-07 (+ casos limite CSS genérico e z-index)
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
// ui/host.ts
import { STYLES } from './styles'

export interface UiHost { host: HTMLElement; root: ShadowRoot; layer: HTMLElement; setHidden(hidden: boolean): void; isPxa(target: EventTarget | null, path?: EventTarget[]): boolean }

export function createHost(doc: Document = document): UiHost {
  const host = doc.createElement('pxa-root')
  host.setAttribute('data-pxa-ignore', '')
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;'
  const root = host.attachShadow({ mode: 'open' })
  const style = doc.createElement('style')
  style.textContent = STYLES
  const layer = doc.createElement('div')
  layer.className = 'pxa-layer'
  root.append(style, layer)
  doc.documentElement.append(host)
  return {
    host, root, layer,
    setHidden(hidden) { host.style.visibility = hidden ? 'hidden' : 'visible' },
    isPxa(target, path) {
      if (path) return path.includes(host)
      return target instanceof Node && (target === host || host.contains(target))
    },
  }
}
```

- `ui/styles.ts`: exporta `STYLES` (string CSS) com `:host { all: initial }`, fonte pixel (`font-family: 'PxA Pixel', monospace`), `.pxa-layer { position: fixed; inset: 0; pointer-events: none }`, classes `.pxa-panel`, `.pxa-marker`, `.pxa-outline`, `.pxa-label`, `.pxa-editor`, `.pxa-toast` com `pointer-events: auto` nos elementos interativos, bordas de 2px sólidas e `box-shadow` em degraus (estética pixel), `image-rendering: pixelated`.
- `ui/toast.ts`: `showToast(ui: UiHost, text: string, ms = 2500): void` — cria `.pxa-toast` com `role="status"` e remove após `ms`.

**Testes**:

- `ANOT-07 host tem data-pxa-ignore e shadow root aberto`
- `caso limite: CSS da página (* { color: red }) não muda cor dentro do shadow` (comparar `getComputedStyle` de um nó interno — se o happy-dom não aplicar cascata de shadow, testar que o estilo da página não está no `root.styleSheets`/`<style>` do shadow e cobrir o comportamento visual no E2E T24)
- `ANOT-07 isPxa reconhece nós internos via composedPath`
- `setHidden alterna visibility`
- `showToast aparece e some após o tempo` (fake timers)

**Done when**: `npx vitest run tests/unit/ui-host.test.ts` → 5 passando.

**Commit sugerido**: `feat(ui): cria host em shadow dom com estilos pixel art`

---

### T16: Interceptor + Overlay de hover

**Where**: `entrypoints/annotator.content/interceptor.ts`, `entrypoints/annotator.content/ui/overlay.ts`, `tests/unit/interceptor.test.ts`
**Depends on**: T15
**Refs**: ANOT-03, ANOT-04, ANOT-07
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
// interceptor.ts
import type { UiHost } from './ui/host'

const BLOCKED = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'touchstart', 'submit'] as const

export interface InterceptorHandlers { onHover(el: Element | null): void; onPick(el: Element): void }

export function installInterceptor(ui: UiHost, h: InterceptorHandlers, win: Window = window): () => void {
  const fromPxa = (ev: Event) => ui.isPxa(ev.target, ev.composedPath())
  const pick = (ev: Event): Element | null => {
    const t = ev.target
    return t instanceof Element && !t.closest('[data-pxa-ignore]') ? t : null
  }
  const block = (ev: Event) => {
    if (fromPxa(ev)) return
    ev.preventDefault()
    ev.stopImmediatePropagation()
    if (ev.type === 'click') { const el = pick(ev); if (el) h.onPick(el) }
  }
  const hover = (ev: Event) => { if (fromPxa(ev)) h.onHover(null); else h.onHover(pick(ev)) }
  for (const type of BLOCKED) win.addEventListener(type, block, { capture: true })
  win.addEventListener('pointermove', hover, { capture: true, passive: true })
  return () => {
    for (const type of BLOCKED) win.removeEventListener(type, block, { capture: true })
    win.removeEventListener('pointermove', hover, { capture: true })
  }
}
```

```ts
// ui/overlay.ts
import type { UiHost } from './host'

export function createOverlay(ui: UiHost) {
  const box = document.createElement('div'); box.className = 'pxa-outline'
  const label = document.createElement('div'); label.className = 'pxa-label'
  ui.layer.append(box, label)
  let target: Element | null = null
  const hide = () => { box.style.display = 'none'; label.style.display = 'none' }
  hide()
  return {
    highlight(el: Element | null) { target = el; this.update() },
    update() {
      if (!target || !target.isConnected) return hide()
      const r = target.getBoundingClientRect()
      Object.assign(box.style, { display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
      label.textContent = `${target.localName} ${Math.round(r.width)}×${Math.round(r.height)}`
      Object.assign(label.style, { display: 'block', left: `${r.left}px`, top: `${Math.max(0, r.top - 20)}px` })
    },
    current: () => target,
    hide,
  }
}
```

**Testes**:

- `ANOT-04 clique na página: preventDefault + handler da página não roda + onPick(el)` (listener da página em `button` com `click` → não chamado; `<a href>` → `defaultPrevented`)
- `ANOT-04 pointerdown/mousedown também bloqueados`
- `ANOT-07 clique dentro do host não é bloqueado nem vira pick`
- `ANOT-03 hover chama onHover(el); rótulo "button 120×40"` (mock de `getBoundingClientRect`)
- `ANOT-03 uninstall remove todos os listeners`

**Done when**: `npx vitest run tests/unit/interceptor.test.ts` → 5 passando.

**Commit sugerido**: `feat(content): intercepta cliques e destaca elemento em hover`

---

### T17: NoteEditor

**Where**: `entrypoints/annotator.content/ui/note-editor.ts`, `tests/unit/note-editor.test.ts`
**Depends on**: T15
**Refs**: ANOT-04, ANOT-05, ANOT-06, PAIN-03
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
import type { UiHost } from './host'

export interface EditorOptions { anchor: DOMRect; initial?: string; onSave(note: string): void; onCancel(): void }

export function openNoteEditor(ui: UiHost, opts: EditorOptions): { close(): void } {
  const wrap = document.createElement('form'); wrap.className = 'pxa-editor'
  const ta = document.createElement('textarea'); ta.value = opts.initial ?? ''; ta.rows = 3; ta.placeholder = 'O que ajustar aqui?'
  const save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Salvar'
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancelar'
  wrap.append(ta, save, cancel)
  const below = opts.anchor.bottom + 8
  const top = below + 120 > window.innerHeight ? Math.max(8, opts.anchor.top - 128) : below
  Object.assign(wrap.style, { left: `${Math.max(8, Math.min(opts.anchor.left, window.innerWidth - 328))}px`, top: `${top}px` })
  ui.layer.append(wrap)
  const close = () => wrap.remove()
  const submit = () => {
    const note = ta.value.trim()
    if (!note) return // ANOT-06: vazio não salva
    close(); opts.onSave(note)
  }
  wrap.addEventListener('submit', (e) => { e.preventDefault(); submit() })
  cancel.addEventListener('click', () => { close(); opts.onCancel() })
  ta.addEventListener('keydown', (e) => {
    e.stopPropagation() // não deixa a página reagir a atalhos
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
    if (e.key === 'Escape') { e.preventDefault(); close(); opts.onCancel() }
  })
  queueMicrotask(() => ta.focus())
  return { close }
}
```

**Testes**:

- `ANOT-05 Enter salva nota aparada`
- `ANOT-05 Shift+Enter não salva`
- `ANOT-06 Esc cancela e não chama onSave`
- `ANOT-06 nota vazia ou só espaços não salva`
- `PAIN-03 abre com valor inicial para edição`

**Done when**: `npx vitest run tests/unit/note-editor.test.ts` → 5 passando.

**Commit sugerido**: `feat(ui): adiciona editor de nota com enter e esc`

---

### T18: MarkerLayer + tick (rAF)

**Where**: `entrypoints/annotator.content/ui/markers.ts`, `entrypoints/annotator.content/tick.ts`, `tests/unit/markers.test.ts`
**Depends on**: T2, T7, T8, T15
**Refs**: ANOT-05, ANOT-08, PAIN-06, MARC-01, MARC-02 (+ caso limite elemento removido)
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
// ui/markers.ts
import type { UiHost } from './host'
import type { AnnotationStore } from '@/lib/store'
import { resolveElement } from '@/lib/resolve'
import { categoryOf, CATEGORY_COLOR } from '@/lib/viewport'

export function createMarkers(ui: UiHost, store: AnnotationStore, win: Window = window) {
  const nodes = new Map<string, HTMLElement>()
  return {
    update() {
      const current = categoryOf(win.innerWidth)
      const seen = new Set<string>()
      for (const a of store.list()) {
        seen.add(a.id)
        let m = nodes.get(a.id)
        if (!m) {
          m = document.createElement('div'); m.className = 'pxa-marker'; m.textContent = String(a.number)
          ui.layer.append(m); nodes.set(a.id, m)
        }
        const el = a.pathname === win.location.pathname ? resolveElement(a, store.refOf(a.id), win.location.pathname, win.document) : null
        if (!el) { m.style.display = 'none'; continue }
        const r = el.getBoundingClientRect()
        m.style.display = 'block'
        m.style.left = `${r.left}px`
        m.style.top = `${r.top}px`
        m.style.background = CATEGORY_COLOR[a.viewport.category]            // MARC-01
        m.style.opacity = a.viewport.category === current ? '1' : '0.35'     // MARC-02
      }
      for (const [id, m] of nodes) if (!seen.has(id)) { m.remove(); nodes.delete(id) }
    },
    hideAll() { for (const m of nodes.values()) m.style.display = 'none' },
  }
}
```

```ts
// tick.ts
export function startTick(fn: () => void, raf = requestAnimationFrame, caf = cancelAnimationFrame): () => void {
  let id = 0
  const loop = () => { fn(); id = raf(loop) }
  id = raf(loop)
  return () => caf(id)
}
```

**Testes**:

- `ANOT-05 cria marcador numerado para cada anotação`
- `ANOT-08 reposiciona conforme getBoundingClientRect muda`
- `PAIN-06 oculta marcadores de outra rota e mantém os da rota atual` (`history.pushState`)
- `caso limite: elemento removido e seletor sem match → marcador oculto`
- `PAIN-04 remove marcador da anotação excluída`
- `MARC-01 cor por categoria` · `MARC-02 opacidade 0.35 quando a categoria atual difere`

**Done when**: `npx vitest run tests/unit/markers.test.ts` → 7 passando.

**Commit sugerido**: `feat(ui): posiciona marcadores numerados por rota e categoria`

---

### T19: Panel (quest log)

**Where**: `entrypoints/annotator.content/ui/panel.ts`, `tests/unit/panel.test.ts`
**Depends on**: T2, T8, T15
**Refs**: PAIN-01, PAIN-02, PAIN-03, PAIN-04, PAIN-05, EXPO-05
**Tests**: unit · **Gate**: quick

**Interface**:

```ts
export interface PanelActions {
  onFocus(id: string): void        // PAIN-02 (o annotator resolve, rola e destaca, ou mostra "elemento não encontrado nesta tela")
  onEdit(id: string): void         // PAIN-03 (abre NoteEditor com valor inicial)
  onDelete(id: string): void       // PAIN-04
  onExportZip(): void              // EXPO-01
  onCopyMarkdown(): void           // EXPO-03
  onClearAll(): void               // EXPO-05 (chamado só após confirmação interna)
}
export function createPanel(ui: UiHost, store: AnnotationStore, actions: PanelActions): { show(): void; hide(): void; render(): void }
```

**Comportamento (contrato)**:

- `aside.pxa-panel` fixo à direita, 320px, `pointer-events: auto`; título "PxA · Anotações (N)".
- Item `li[data-id]`: `#N`, `CATEGORY_ICON`, `${width}px`, `path`, primeiros 60 caracteres da nota (`…` se cortar). Botões ✏️ "Editar" e 🗑️ "Excluir" com `aria-label`.
- Clique no texto do item → `onFocus(id)`.
- Vazio: `p.pxa-empty` com "Clique em um elemento da página para anotar. Clique no ícone do PxA para sair."; botões Exportar/Copiar/Limpar `disabled` (PAIN-05).
- "Limpar tudo" → troca o rodapé por "Apagar N anotações? [Sim] [Não]"; só "Sim" chama `onClearAll` (EXPO-05).
- `store.subscribe(render)`.

**Testes**:

- `PAIN-01 lista itens em ordem com número, ícone, largura, caminho e início da nota`
- `PAIN-01 nota longa cortada em 60 caracteres com reticências`
- `PAIN-02 clique no item chama onFocus com o id`
- `PAIN-03 botão editar chama onEdit` · `PAIN-04 botão excluir chama onDelete`
- `PAIN-05 vazio mostra instrução e desabilita exportar/copiar/limpar`
- `EXPO-05 limpar tudo pede confirmação; "Não" não apaga; "Sim" chama onClearAll`

**Done when**: `npx vitest run tests/unit/panel.test.ts` → 7 passando.

**Commit sugerido**: `feat(ui): adiciona painel quest log com editar, excluir e export`

---

### T20: ContextCapture + DefaultStyle + ScreenshotService

**Where**: `entrypoints/annotator.content/capture.ts`, `entrypoints/annotator.content/default-style.ts`, `entrypoints/annotator.content/screenshot.ts`, `tests/unit/capture.test.ts`
**Depends on**: T2, T3, T4, T5, T6, T14, T15
**Refs**: CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06, CAPT-07, CAPT-08, COMP-04
**Tests**: unit (com print mockado) + E2E na T24 · **Gate**: quick

**Código de referência**:

```ts
// default-style.ts
import { readStyle } from '@/lib/css-filter'
import type { UiHost } from './ui/host'

export function createDefaultStyle(ui: UiHost) {
  let frame: HTMLIFrameElement | null = null
  const cache = new Map<string, Record<string, string>>()
  return (tag: string): Record<string, string> => {
    const hit = cache.get(tag); if (hit) return hit
    if (!frame) {
      frame = document.createElement('iframe')
      frame.setAttribute('aria-hidden', 'true')
      frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden'
      ui.root.append(frame)
    }
    const doc = frame.contentDocument!
    const el = doc.createElement(tag); doc.body.append(el)
    const style = readStyle(frame.contentWindow!.getComputedStyle(el))
    el.remove(); cache.set(tag, style)
    return style
  }
}
```

```ts
// screenshot.ts
import { isFullyVisible, planCrop } from '@/lib/crop'
import type { UiHost } from './ui/host'

const twoFrames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
export type CaptureTab = () => Promise<string>
export const captureTab: CaptureTab = async () => {
  const res = await browser.runtime.sendMessage({ type: 'pxa:capture' })
  if (!res?.dataUrl) throw new Error(res?.error ?? 'captura sem resposta')
  return res.dataUrl
}

export async function shootElement(el: Element, ui: UiHost, capture: CaptureTab = captureTab): Promise<{ shot: Blob | null; partial: boolean }> {
  let rect = el.getBoundingClientRect()
  if (!isFullyVisible(rect, innerWidth, innerHeight)) { el.scrollIntoView({ block: 'center', inline: 'center' }); await twoFrames(); rect = el.getBoundingClientRect() }
  ui.setHidden(true)
  let dataUrl: string
  try { await twoFrames(); dataUrl = await capture() } catch { return { shot: null, partial: !isFullyVisible(rect, innerWidth, innerHeight) } }
  finally { ui.setHidden(false) }
  // createImageBitmap a partir do Blob: não depende do img-src da CSP da página.
  const img = await createImageBitmap(await (await fetch(dataUrl)).blob())
  const plan = planCrop(rect, innerWidth, innerHeight, img.width, img.height)
  const canvas = document.createElement('canvas'); canvas.width = plan.crop.width; canvas.height = plan.crop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, plan.crop.x, plan.crop.y, plan.crop.width, plan.crop.height, 0, 0, plan.crop.width, plan.crop.height)
  ctx.strokeStyle = '#ff3e7f'; ctx.lineWidth = Math.max(2, Math.round(2 * plan.scale))
  ctx.strokeRect(plan.outline.x, plan.outline.y, plan.outline.width, plan.outline.height)
  const shot = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  return { shot, partial: plan.partial }
}
```

```ts
// capture.ts
import type { AnnotationDraft } from '@/lib/store'
import { buildSelector } from '@/lib/selector'
import { readViewport } from '@/lib/viewport'
import { truncateHtml } from '@/lib/outer-html'
import { filterCss, readStyle } from '@/lib/css-filter'
import { probeComponent } from './probe-client'
import { shootElement, type CaptureTab } from './screenshot'
import type { UiHost } from './ui/host'

export interface CaptureDeps {
  ui: UiHost
  defaultStyle(tag: string): Record<string, string>
  probe?: typeof probeComponent
  capture?: CaptureTab
}

export async function captureContext(el: Element, note: string, deps: CaptureDeps): Promise<AnnotationDraft> {
  const { pathname, search, hash, href } = location
  const selector = buildSelector(el)
  const viewport = readViewport(window)
  const r = el.getBoundingClientRect()
  const { html, truncated } = truncateHtml(el.outerHTML)
  const css = filterCss(readStyle(getComputedStyle(el)), deps.defaultStyle(el.localName))
  const componentP = (deps.probe ?? probeComponent)(el)
  const { shot, partial } = await shootElement(el, deps.ui, deps.capture)
  return {
    note, url: href, path: `${pathname}${search}${hash}`, pathname, selector, viewport,
    rect: { x: r.x, y: r.y, width: r.width, height: r.height }, scroll: { x: scrollX, y: scrollY },
    outerHtml: html, outerHtmlTruncated: truncated, css, component: await componentP, shot, shotPartial: partial,
  }
}
```

> Ordem: contexto (rect/scroll/viewport) é lido **antes** de um eventual scroll do print, para refletir o que o dev via ao confirmar (CAPT-04).

**Testes** (happy-dom; `capture` e `probe` injetados; canvas/Image ausentes no happy-dom → `shootElement` testado com `capture` que rejeita e via E2E para o caminho feliz):

- `CAPT-01 guarda url completa e path com search e hash`
- `CAPT-02 seletor do draft é único para o elemento`
- `CAPT-03 viewport do draft vem de innerWidth/innerHeight/devicePixelRatio`
- `CAPT-04 rect e scroll`
- `CAPT-05 outerHtml truncado e flag`
- `CAPT-06 css filtrado contra o default injetado`
- `COMP-04 probe null → component null sem erro`
- `CAPT-07 print falhou → shot null e UI restaurada (setHidden(false) chamado)`

**Done when**: `npx vitest run tests/unit/capture.test.ts` → 8 passando.

**Commit sugerido**: `feat(capture): captura contexto e print recortado da anotação`

---

### T21: Exporter + UnloadGuard

**Where**: `entrypoints/annotator.content/exporter.ts`, `entrypoints/annotator.content/unload-guard.ts`, `tests/unit/exporter.test.ts`
**Depends on**: T8, T9, T10, T15
**Refs**: EXPO-01, EXPO-02, EXPO-03, EXPO-04, AVIS-01 (+ caso limite clipboard)
**Tests**: unit · **Gate**: quick

**Código de referência**:

```ts
// exporter.ts
import { zipSync, strToU8 } from 'fflate'
import type { AnnotationStore } from '@/lib/store'
import { renderMarkdown } from '@/lib/markdown'
import { shotName, zipName } from '@/lib/export-names'
import type { UiHost } from './ui/host'
import { showToast } from './ui/toast'

export async function buildZip(store: AnnotationStore, now: Date, origin: string): Promise<Uint8Array> {
  const list = store.list()
  const files: Record<string, Uint8Array> = { 'feedback.md': strToU8(renderMarkdown(list, { origin, generatedAt: now }, { imageLinks: true })) }
  for (const a of list) if (a.shot) files[shotName(a.number)] = new Uint8Array(await a.shot.arrayBuffer())
  return zipSync(files)
}

export async function exportZip(ui: UiHost, store: AnnotationStore, now = new Date()): Promise<void> {
  try {
    const bytes = await buildZip(store, now, location.host || location.origin)
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
    const a = document.createElement('a'); a.href = url; a.download = zipName(now)
    ui.root.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    store.markExported() // AVIS-01: só o .zip conta
    showToast(ui, 'Zip exportado')
  } catch {
    showToast(ui, 'Falha ao exportar')
  }
}

export async function copyMarkdown(ui: UiHost, store: AnnotationStore, now = new Date()): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard indisponível')
    await navigator.clipboard.writeText(renderMarkdown(store.list(), { origin: location.host || location.origin, generatedAt: now }, { imageLinks: false }))
    showToast(ui, 'Markdown copiado')
  } catch {
    showToast(ui, 'Não consegui copiar. Use Exportar .zip.')
  }
}
```

```ts
// unload-guard.ts
import type { AnnotationStore } from '@/lib/store'

export function installUnloadGuard(store: AnnotationStore, win: Window = window): () => void {
  const handler = (e: BeforeUnloadEvent) => {
    if (!store.isDirty()) return
    e.preventDefault()
    e.returnValue = ''
  }
  win.addEventListener('beforeunload', handler)
  return () => win.removeEventListener('beforeunload', handler)
}
// Plano B (Firefox, se o teste manual falhar): mover este listener para o probe (main world), ligado/desligado por CustomEvent `pxa:dirty`. Ver design.md.
```

**Testes**:

- `EXPO-01 zip contém feedback.md e shots/NN.png só para anotações com print` (descompactar com `unzipSync`; testar via `buildZip`. Em `exportZip`, stubar `URL.createObjectURL`/`revokeObjectURL` com `vi.fn`)
- `EXPO-02 feedback.md do zip tem links shots/NN.png`
- `EXPO-04 exportar não apaga anotações`
- `AVIS-01 exportZip chama markExported; copyMarkdown não`
- `EXPO-03 copyMarkdown escreve markdown sem links e mostra "Markdown copiado"`
- `caso limite: clipboard ausente/negado → toast sugerindo o .zip`
- `AVIS-01 beforeunload com dirty → defaultPrevented; sem dirty → não`

**Done when**: `npx vitest run tests/unit/exporter.test.ts` → 7 passando.

**Commit sugerido**: `feat(export): exporta zip, copia markdown e avisa antes de sair`

---

### T22: Annotator — máquina de estados e montagem

**What**: Entrypoint do content script ligando tudo; responde a `pxa:toggle`.
**Where**: `entrypoints/annotator.content/index.ts`, `entrypoints/annotator.content/controller.ts`, `tests/unit/controller.test.ts`
**Depends on**: T13, T16, T17, T18, T19, T20, T21
**Refs**: ANOT-01, ANOT-02, ANOT-05, ANOT-06, PAIN-01, PAIN-02, EXPO-05 (+ caso limite "já injetado")
**Tests**: unit + E2E (T24) · **Gate**: quick + build

**Código de referência**:

```ts
// index.ts
import { createController } from './controller'

export default defineContentScript({
  // SEM `matches`: com registration 'runtime' o WXT copia `matches` para host_permissions (quebraria PLAT-01).
  registration: 'runtime',
  main() {
    const w = window as any
    if (w.__pxaAnnotator) return
    const controller = createController()
    w.__pxaAnnotator = controller
    // Resposta síncrona via sendResponse (Chrome sem polyfill não aceita Promise como retorno).
    browser.runtime.onMessage.addListener((msg: { type?: string }, _sender, sendResponse) => {
      if (msg?.type !== 'pxa:toggle') return undefined
      controller.toggle()
      sendResponse({ active: controller.isActive() })
      return undefined
    })
  },
})
```

```ts
// controller.ts (estrutura)
export function createController(deps = defaultDeps()) {
  // estados: 'inactive' | 'active' | 'editing' | 'capturing'
  // toggle(): inactive → active (instala interceptor, mostra painel, startTick); outro → inactive (desinstala, esconde overlay/marcadores/painel, para tick; store intacto)
  // onPick(el): active → editing; overlay congelado em el; openNoteEditor(anchor = el.getBoundingClientRect())
  // onSave(note): editing → capturing; captureContext(el, note); store.add(draft, el); → active. Erro inesperado → toast "Falha ao anotar" → active
  // onCancel(): editing → active
  // onFocus(id): resolveElement; null → toast "elemento não encontrado nesta tela"; senão scrollIntoView({block:'center'}) + overlay.highlight(el) por 1,5s
  // onEdit(id): openNoteEditor({ initial: nota }) → store.updateNote
  // onDelete(id): store.remove · onClearAll(): store.clear · onExportZip/onCopyMarkdown → exporter
  // installUnloadGuard(store) na criação, independente do modo (AVIS-01)
  // toggle() durante 'editing': fecha o editor sem salvar. Durante 'capturing': a captura termina e a anotação é criada;
  //   a UI só volta a aparecer se o modo continuar ativo (setHidden(false) sempre roda no finally do print).
  return { toggle, isActive, state: () => state, store }
}
```

**Testes** (deps injetadas: captureContext falso que devolve draft fixo):

- `ANOT-01 toggle ativa: painel visível e interceptor instalado`
- `ANOT-02 toggle desativa: painel e marcadores ocultos, store mantém anotações; reativar mostra de novo`
- `ANOT-02 toggle durante editing fecha o editor sem criar anotação`
- `ANOT-05 pick → save cria anotação #1 e volta para active`
- `ANOT-06 pick → cancel não cria anotação`
- `PAIN-02 onFocus de anotação não encontrada mostra "elemento não encontrado nesta tela"`
- `caso limite: segundo carregamento do script não cria segundo controller`

**Done when**: `npx vitest run tests/unit/controller.test.ts` → 7 passando · `npm run build && npm run build:firefox && npm run check:manifest` → ok (manifest sem `content_scripts`).

**Commit sugerido**: `feat(content): monta o modo anotação com máquina de estados`

---

### T23: Fixtures E2E + harness Playwright

**Where**: `tests/e2e/fixtures/{index.html, react.html, react.js, vue.html, vue.js, spa.html, spa.js}`, `tests/e2e/harness.ts`
**Depends on**: T22
**Refs**: suporte a todos os E2E
**Tests**: e2e (harness smoke) · **Gate**: full

**Código de referência**:

```ts
// tests/e2e/harness.ts
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test'
import path from 'node:path'

// `wxt build --mode e2e` sai com sufixo do modo; o build de produção nunca recebe o host permission de E2E.
const EXT = path.resolve('.output/chrome-mv3-e2e')
export const BASE = 'http://localhost:5174'

export const test = base.extend<{ context: BrowserContext; toggle: (page: Page) => Promise<void> }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
      acceptDownloads: true,
    })
    await use(context)
    await context.close()
  },
  toggle: async ({ context }, use) => {
    let [sw] = context.serviceWorkers()
    if (!sw) sw = await context.waitForEvent('serviceworker')
    await use(async (page) => {
      await page.bringToFront()
      await sw.evaluate(async () => {
        const chrome = (globalThis as any).chrome
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
        await (globalThis as any).__pxaToggle(tab.id)
      })
    })
  },
})
export const expect = test.expect
export const pxa = (page: Page) => page.locator('pxa-root') // Playwright atravessa shadow root aberto
```

- `index.html`: página estática com `header`, `button#save` (listener que incrementa `window.clicks`), `a href="/outra"`, 3 `li.item` iguais, `div.css-1a2b3c.card`, `section` com 2000px de altura (para scroll), `<style>* { color: red !important; font-family: serif !important }</style>` e um `div` com `z-index: 2147483646`.
- `react.html` + `react.js`: `import React from 'react'; import { createRoot } from 'react-dom/client'` com componentes `App > Dashboard > ClienteList > ClienteCard` via `React.createElement` (sem JSX).
- `vue.html` + `vue.js`: `import { createApp, h } from 'vue/dist/vue.esm-bundler.js'` com `App > CardList > ClienteCard`, cada componente com `name` e `__file: 'src/components/<Nome>.vue'`.
- `spa.html` + `spa.js`: dois "routes" trocados com `history.pushState('/a')`/`('/b')` e botões fora do fluxo de anotação, acionados via `page.evaluate`.

- [ ] `npx playwright install chromium`
- [ ] Smoke: `tests/e2e/smoke.spec.ts` abre `index.html`, chama `toggle`, espera `pxa(page).locator('.pxa-panel')` visível.

**Done when**: `npm run test:e2e -- smoke` → 1 passando.

**Commit sugerido**: `test(build): adiciona fixtures e harness e2e com extensão carregada`

---

### T24: Specs E2E por história

**Where**: `tests/e2e/annotate.spec.ts`, `tests/e2e/capture.spec.ts`, `tests/e2e/panel.spec.ts`, `tests/e2e/export.spec.ts`, `tests/e2e/platform.spec.ts`
**Depends on**: T23
**Refs**: ANOT-01..08, CAPT-01, CAPT-03, CAPT-07, CAPT-08, COMP-01, COMP-02, COMP-03, PAIN-01..06, EXPO-01..05, PLAT-02, MARC-01, MARC-02, AVIS-01
**Tests**: e2e · **Gate**: full

**Cenários (cada `test()` nomeado com o ID)**:

`annotate.spec.ts`
- `ANOT-01/ANOT-05 anota 2 elementos → marcadores 1 e 2 e 2 itens no painel` (Teste Independente da spec)
- `ANOT-02 desativar oculta tudo e reativar mostra as mesmas anotações`
- `ANOT-03 hover mostra rótulo "button L×A"`
- `ANOT-04 clique em button#save não incrementa window.clicks; clique no link não navega`
- `ANOT-06 Esc e nota vazia não criam anotação`
- `ANOT-07 hover/clique no painel não destaca nem anota`
- `ANOT-08 marcador acompanha o elemento após scroll e setViewportSize`
- `caso limite: CSS * { color: red } não altera a cor do painel; painel fica acima do z-index alto`

`capture.spec.ts`
- `CAPT-01/CAPT-03 em 390×844 o export diz "📱 mobile · 390px (`base`)"; em 1440×900 "🖥️ desktop · 1440px (`xl`)"` (com as crases do markdown)
- `CAPT-07 shots/01.png existe, PNG válido, largura ≈ (largura do elemento + 32) × DPR`
- `CAPT-08 elemento abaixo da dobra: página rola e print é gerado; elemento maior que o viewport → "(print parcial)"`
- `COMP-01 React: export cita ClienteCard ← ClienteList ← Dashboard`
- `COMP-02/COMP-03 Vue: export cita ClienteCard e src/components/ClienteCard.vue`
- `COMP-04 página sem framework: anotação sem linha "Componente"`

`panel.spec.ts`
- `PAIN-01..04 cria 3, edita a 2ª, exclui a 1ª → painel com #2 e #3 e nota atualizada` (Teste Independente)
- `PAIN-02 clicar no item rola até o elemento; com elemento removido mostra "elemento não encontrado nesta tela"`
- `PAIN-05 vazio desabilita export`
- `PAIN-06 SPA: anotação em /a, pushState('/b') → marcador oculto, item no painel; volta para /a → marcador visível`
- `MARC-01/MARC-02 marcador mobile verde; após setViewportSize 1440 fica com opacidade 0.35`

`export.spec.ts`
- `EXPO-01/EXPO-02 download pxa-feedback-YYYY-MM-DD-HHmm.zip com feedback.md e shots/01.png, 02.png` (`page.waitForEvent('download')` + `unzipSync`)
- `EXPO-03 copiar markdown (context.grantPermissions(['clipboard-read','clipboard-write'])) → clipboard sem "](shots/" e com "(print disponível no .zip)"`
- `EXPO-04 após exportar, painel mantém as anotações`
- `EXPO-05 limpar tudo + confirmar → painel vazio e sem marcadores`
- `AVIS-01 com anotação não exportada, page.close({ runBeforeUnload: true }) dispara o dialog beforeunload (a página já teve ativação do usuário pelos cliques); após exportar .zip, não dispara`

`platform.spec.ts`
- `PLAT-02 toggle em chrome://version → badge "!" e título "PxA não pode anotar esta página"` (ler via `chrome.action.getBadgeText({tabId})` e `getTitle` no service worker)

**Done when**: `npm run test:e2e` → todos os cenários acima passando (≥ 26 testes, incluindo smoke).

**Commit sugerido**: `test(content): cobre fluxo anotar, painel e export em e2e`

---

### T25: Verificação final + checklist manual (dev)

**What**: Rodar o gate full, conferir manifests e gravar o checklist manual que o dev executa no final.
**Where**: `.specs/features/2026-11-13-modo-anotacao/tasks.md` (marcar), `.specs/features/2026-11-13-modo-anotacao/spec.md` (rastreabilidade → Verified), `.specs/features/2026-11-13-modo-anotacao/manual-check.md`
**Depends on**: T24
**Refs**: PLAT-01, PLAT-02, AVIS-01, Critérios de Sucesso
**Tests**: full · **Gate**: full

**Steps**:

- [ ] `npm run compile && npm test && npm run build && npm run build:firefox && npm run check:manifest && npm run test:e2e` → tudo verde
- [ ] Atualizar a tabela de rastreabilidade da spec: cada ID com teste passando → `Verified`; IDs só verificáveis à mão no Firefox → `Implemented (verificação manual pendente)`
- [ ] Criar `manual-check.md` com o checklist do dev:
  - [ ] Chrome: `npm run build`, carregar `.output/chrome-mv3` em `chrome://extensions` (modo dev) → anotar 5 elementos numa app React real em 390px e 1440px → exportar → pedir ao Claude Code "resolve o feedback.md" (Critério de Sucesso)
  - [ ] Firefox ≥ 128: `npm run build:firefox`, carregar `.output/firefox-mv3/manifest.json` em `about:debugging` → mesmo fluxo; conferir que o print funciona só com `activeTab` (PLAT-01)
  - [ ] Firefox: anotar sem exportar e recarregar → aviso de saída aparece (AVIS-01). Se não aparecer → aplicar o plano B do design
  - [ ] Firefox: componente React/Vue aparece no export (`world: MAIN`)
  - [ ] Nenhum aviso de permissão além de `activeTab` + `scripting` na instalação

**Done when**: gate full verde com contagem de testes registrada; `manual-check.md` criado.

---

## Parallel Execution Map

```
Phase 1:  T1
Phase 2:  T1 ──→ T2 [P] T3 [P] T4 [P] T5 [P] T6 [P] T7 [P] T8 [P] T10 [P] T11 [P] T12 [P]
          T2 + T4 + T5 + T10 ──→ T9
Phase 3:  T11 → T13 · T12 → T14 · T1 → T15 → (T16, T17) · (T2,T7,T8,T15) → T18 · (T2,T8,T15) → T19
          (T2,T3,T4,T5,T6,T14,T15) → T20 · (T8,T9,T10,T15) → T21 · (T13,T16..T21) → T22
Phase 4:  T22 → T23 → T24 → T25
```

Execução: **inline e sequencial** neste mesmo contexto (decisão de execução abaixo). As marcas `[P]` indicam independência; não há ganho real em paralelizar tasks de 1 arquivo neste tamanho.

---

## Task Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T1 Scaffold | config do projeto (coeso) | ✅ |
| T2–T12 | 1 módulo puro + teste cada | ✅ |
| T13 Background | 1 entrypoint + constantes de mensagem | ✅ |
| T14 Probe + client | 2 lados do mesmo protocolo (coeso) | ⚠️ OK, coeso |
| T15 Host + estilos + toast | shell da UI (coeso) | ⚠️ OK, coeso |
| T16 Interceptor + overlay | hover/clique (coeso) | ⚠️ OK, coeso |
| T17 NoteEditor | 1 componente | ✅ |
| T18 Markers + tick | marcadores e o laço que os move | ⚠️ OK, coeso |
| T19 Panel | 1 componente | ✅ |
| T20 Capture + default-style + screenshot | captura no momento da confirmação (coeso) | ⚠️ OK, coeso |
| T21 Exporter + unload-guard | export e "não exportado" (coeso via dirty) | ⚠️ OK, coeso |
| T22 Controller | 1 orquestrador | ✅ |
| T23 Fixtures + harness | infra E2E | ✅ |
| T24 Specs E2E | 5 arquivos de teste da mesma camada | ⚠️ OK (só testes) |
| T25 Verificação | gate + docs | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
|---|---|---|---|
| T1 | None | — | ✅ |
| T2–T8, T10–T12 | T1 | T1 → | ✅ |
| T9 | T2, T4, T5, T10 | T2+T4+T5+T10 → T9 | ✅ |
| T13 | T11 | T11 → T13 | ✅ |
| T14 | T12 | T12 → T14 | ✅ |
| T15 | T1 | T1 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T15 | T15 → T17 | ✅ |
| T18 | T2, T7, T8, T15 | (T2,T7,T8,T15) → T18 | ✅ |
| T19 | T2, T8, T15 | (T2,T8,T15) → T19 | ✅ |
| T20 | T2, T3, T4, T5, T6, T14, T15 | idem | ✅ |
| T21 | T8, T9, T10, T15 | idem | ✅ |
| T22 | T13, T16–T21 | idem | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T23 | T23 → T24 | ✅ |
| T25 | T24 | T24 → T25 | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
|---|---|---|---|---|
| T1 | build/config | build | build + unit sanidade | ✅ |
| T2–T12 | `lib/*` | unit | unit | ✅ |
| T13 | background | unit + E2E | unit (+ E2E PLAT-02 na T24) | ✅ |
| T14 | probe | unit + E2E | unit (+ E2E COMP na T24) | ✅ |
| T15–T22 | annotator content | unit + E2E | unit (+ E2E na T24) | ✅ |
| T23–T24 | e2e | e2e | e2e | ✅ |
| T25 | verificação | full | full | ✅ |

> E2E das camadas de runtime fica em T24 por **merge forward**: só fica executável depois que o controller (T22) liga tudo. Cada task de runtime já entrega unit tests próprios, então nenhuma task sai sem verificação.

---

## Cobertura Spec → Tasks

| ID | Tasks |
|---|---|
| ANOT-01 | T13, T22, T24 |
| ANOT-02 | T13, T22, T24 |
| ANOT-03 | T16, T24 |
| ANOT-04 | T16, T17, T24 |
| ANOT-05 | T17, T18, T22, T24 |
| ANOT-06 | T17, T22, T24 |
| ANOT-07 | T15, T16, T24 |
| ANOT-08 | T7, T18, T24 |
| CAPT-01 | T20, T24 |
| CAPT-02 | T3, T20 |
| CAPT-03 | T2, T20, T24 |
| CAPT-04 | T20 |
| CAPT-05 | T5, T20 |
| CAPT-06 | T4, T20 |
| CAPT-07 | T6, T11, T20, T24 |
| CAPT-08 | T6, T20, T24 |
| COMP-01 | T12, T14, T24 |
| COMP-02 | T12, T14, T24 |
| COMP-03 | T12, T14, T24 |
| COMP-04 | T12, T13, T14, T20, T24 |
| PAIN-01 | T8, T19, T22, T24 |
| PAIN-02 | T7, T19, T22, T24 |
| PAIN-03 | T8, T17, T19, T24 |
| PAIN-04 | T8, T18, T19, T24 |
| PAIN-05 | T19, T24 |
| PAIN-06 | T7, T18, T24 |
| EXPO-01 | T10, T21, T24 |
| EXPO-02 | T4, T9, T21, T24 |
| EXPO-03 | T9, T21, T24 |
| EXPO-04 | T8, T21, T24 |
| EXPO-05 | T8, T19, T22, T24 |
| PLAT-01 | T1, T13, T25 (manual Firefox) |
| PLAT-02 | T13, T24 |
| MARC-01 | T2, T18, T24 |
| MARC-02 | T2, T18, T24 |
| AVIS-01 | T8, T21, T24, T25 (manual Firefox) |

**Cobertura:** 36/36 requisitos mapeados.

**Casos limite:** elemento removido (T7, T18, T24) · reload apaga (aceito; AVIS-01) · prints em sequência (T11) · id duplicado/classes hash (T3) · markdown/crases (T9) · CSS genérico (T15, T24) · z-index alto (T15, T24; top layer = limitação aceita) · 0 anotações (T19) · clipboard negado (T21) · já injetado (T13, T22).

---

## Decisão de execução

- **Inline, sequencial**, neste contexto (Sentinel: seguir fase a fase sem esperar o dev). A two-stage review por subagent fica concentrada no fechamento (review pré-commit do Execute), para não multiplicar subagents em tasks de 1 arquivo.
- Tools: NONE de MCP. Skills: `nano-disciplines:tdd` em T2–T22, `nano-disciplines:debug` se algum teste falhar inesperadamente, `nano-disciplines:verification` em T25.

## Condições de parada

- Build ou `check:manifest` exige permissão além de `activeTab` + `scripting` → **parar** e registrar blocker em STATE.md (PLAT-01 volta ao dev).
- Chromium do Playwright não carrega extensão em modo headless/novo headless → tentar `headless: false` com `xvfb`/janela real; se impossível, registrar "E2E manual" no STATE e seguir com unit.
- Qualquer decisão travada em `context.md` precisaria mudar → parar.
