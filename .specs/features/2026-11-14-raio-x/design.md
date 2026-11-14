# Raio-X — Design

**Spec**: `.specs/features/2026-11-14-raio-x/spec.md` (21 requisitos: DETE-01..07, XRAY-01..06, GRAD-01..03, LUPA-01..04)
**Contexto**: `.specs/features/2026-11-14-raio-x/context.md`
**Status**: Approved — 2026-11-14 (spec aprovada pelo dev; agente do andar segue sem parar para aprovação de design, por instrução do dev)

> **Revisão 2 (2026-11-14):** o dev cortou o X-ray e a Grade e pediu uma passada geral no Detector. As seções abaixo até "Revisão 2" são o desenho da revisão 1, mantido como histórico; X-ray, Grade, `lib/leak.ts` e `page.ts` não existem mais. O que vale hoje está em **Revisão 2**, no fim.

---

## Visão Geral

Tudo roda no **annotator** (isolated world). Nenhuma mudança no background, no probe ou no manifest: a Lupa usa a mesma mensagem `pxa:capture` e a mesma fila (≥ 550ms) do print do M1.

```mermaid
flowchart LR
    subgraph Painel
      BAR[Barra Raio-X<br/>Detector · X-ray · Grade · Lupa]
    end
    BAR --> RX[raio-x.ts<br/>compõe as ferramentas]
    RX --> DET[ui/audit-report.ts]
    RX --> XR[ui/xray.ts]
    RX --> GR[ui/grid.ts]
    RX --> LP[ui/loupe.ts]
    DET --> SCAN[audit-scan.ts<br/>varredura fatiada] --> AUD[lib/design-audit.ts<br/>pura]
    XR --> LEAK[lib/leak.ts<br/>pura]
    LP --> LS[lib/loupe.ts<br/>pura]
    LP --> CAP[screenshot.ts<br/>captureWithoutUi]
    RX -- measure() --> TICK[tick do controller]
    RX -- pick(el) --> CTRL[controller.ts<br/>openEditor / save]
```

| Módulo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/design-audit.ts` | novo | Normalizar cor, distância de cor, escala, órfãos, montar o relatório e o texto da nota (DETE-02/03/05/07) |
| `lib/leak.ts` | novo | Regra de vazamento (filho fora do pai, conteúdo maior que a caixa) e seletor curto (XRAY-02/04) |
| `lib/loupe.ts` | novo | Mapeia cursor CSS → pixel físico e amostra a janela 15×15 do print (LUPA-01/04) |
| `annotator.content/audit-scan.ts` | novo | Varredura dos elementos visíveis em lotes de 500 com `requestIdleCallback`, limite 10.000 (DETE-01/06) |
| `annotator.content/raio-x.ts` | novo | Barra de ferramentas, estado ligado/desligado de cada ferramenta, `measure()` para o tick, `pick()` para o clique |
| `annotator.content/ui/boxes.ts` | novo | Pool de caixas `position: fixed` desenhadas por diferença (usado pelo X-ray e pelo destaque do relatório) |
| `annotator.content/ui/audit-report.ts` | novo | Janela do relatório, hover destaca, botão "Anotar" (DETE-02/04/05) |
| `annotator.content/ui/xray.ts` | novo | Contornos por profundidade + vazamentos em vermelho (XRAY-01..06) |
| `annotator.content/ui/grid.ts` | novo | Grade em `repeating-linear-gradient` (GRAD-01..03) |
| `annotator.content/ui/loupe.ts` | novo | Lupa: print congelado, zoom 8×, hex, copiar, Esc (LUPA-01..04) |
| `annotator.content/screenshot.ts` | alterado (pequeno) | Extrai `captureWithoutUi(ui, capture)` (esconder UI → 2 frames → foto → mostrar) e `withShotBitmap(dataUrl, fn)`, reusados pela Lupa |
| `annotator.content/page.ts`, `lib/color.ts` | novos (/simplify) | Walker da página + visibilidade + pular `display:none` (Detector e X-ray); `toHex` único |
| `annotator.content/controller.ts` | alterado (pequeno) | Cria o Raio-X, inclui `raioX.measure()` no tick, consulta `raioX.pick()` no clique, `annotateElements()` reusa `openEditor` + `save` |
| `annotator.content/ui/panel.ts` | alterado (pequeno) | Parâmetro opcional `toolbar` inserido logo abaixo do `<header>` (ponto único) |
| `annotator.content/ui/styles.ts` | alterado (append) | Bloco CSS `/* Raio-X */` no fim, com as cores atuais |

### Abordagem escolhida e alternativas descartadas

| Tema | Escolhido | Descartado | Por quê |
|---|---|---|---|
| Onde mostrar o relatório | Janela flutuante própria (`.pxa-audit`) à esquerda, com fechar | Dentro do `<ol>` do Painel | Não mexe na lista de anotações (outros andares mexem no Painel). O Painel ganha só a barra. |
| Unidade de "usado N×" | Nº de **elementos** distintos que usam o valor | Nº de propriedades | "Anotar" age sobre elementos; um botão com `color` e `border-color` iguais conta 1. |
| Cores "parecidas" | Agrupamento por semente: cores ordenadas por uso; cada cor entra no grupo da primeira semente a ΔE76 ≤ 5 (Lab) | Union-find (ligação simples) | Ligação simples encadeia degradês inteiros num grupo só. Com semente, a nota fica clara: "parecida com `#777777` (mais usada)". |
| Limiar de cor | ΔE76 ≤ 5 e cores diferentes | Distância RGB euclidiana | Lab segue a percepção; ΔE ≈ 2,3 é o limiar perceptível, 5 pega "quase iguais" sem juntar tons claramente distintos. |
| Transparência | Só compara cores com o **mesmo alfa** (opacas com opacas) | Compor sobre branco | Spec: não comparar translúcidas com opacas. Mesmo alfa é o caso conservador. |
| Achado | Cada linha do relatório com pelo menos uma marca (fora da escala, parecida, órfã) é um Achado com botão "Anotar"; a nota junta os motivos | Um achado por motivo | Uma linha = um valor = um conjunto de elementos; evita anotações duplicadas do mesmo elemento. |
| Atualizar X-ray | Recalcula só com flag "sujo" (scroll em captura, resize, ou a cada 500ms) e desenha por diferença | Recalcular todo frame | Ler o retângulo de 3.000 elementos todo frame é caro; scroll/resize/timer pegam rolagem, redimensionamento e mudanças de layout. |
| Vazamento por `position: fixed` | Ignorado | Contar | O bloco de contenção de `fixed` é o viewport, não o pai: seria sempre falso positivo (cabeçalhos fixos, toasts). |
| Captura da Lupa | `captureWithoutUi` extraído de `screenshot.ts` | Copiar as 5 linhas na Lupa | Mesmo comportamento do print (UI escondida, 2 frames). Mudança pequena num arquivo que os outros andares não tocam. |
| GRAD-03 | Grade vive no host do PxA: `ui.setHidden(true)` do print já esconde | Esconder à mão | `visibility: hidden` herda; nada a fazer além de testar. |

---

## Componentes

### `lib/design-audit.ts` (pura — DETE-07)

```ts
export interface AuditSample {           // um elemento visível, estilos computados crus
  colors: string[]                       // color, background-color, border-{top,right,bottom,left}-color
  fontSize: string; fontFamily: string; fontWeight: string
  spacings: string[]                     // margin-*, padding-*, row-gap, column-gap
}
export type Flag = 'off-scale' | 'similar' | 'orphan'
export interface AuditEntry { value: string; count: number; elements: number[]; flags: Flag[]; similarTo?: string }
export interface AuditReport {
  scale: 4 | 8
  colors: AuditEntry[]; fonts: AuditEntry[]; spacings: AuditEntry[]
  fontSizes: number                      // tamanhos distintos (cabeçalho)
  offScale: number                       // espaçamentos distintos fora da escala (cabeçalho)
}
export function normalizeColor(css: string): string | null   // rgb()/rgba()/hex → #rrggbb | #rrggbbaa; transparente → null
export function colorDistance(a: string, b: string): number  // ΔE76 em Lab
export function parsePx(v: string): number | null           // 'auto'/'normal'/não-px → null; negativo → absoluto
export function isOnScale(px: number, scale: number): boolean // tolerância 0,01px (rem/zoom)
export function buildAuditReport(samples: AuditSample[], scale: 4 | 8): AuditReport
export function auditHeadline(r: AuditReport): string        // "23 cores · 11 tamanhos de fonte · 3 espaçamentos fora da escala de 4px"
export function findingNote(kind: 'color'|'font'|'spacing', e: AuditEntry, scale: number): string
// ex: "[Raio-X] espaçamento 13px fora da escala de 4px (3 elementos)"
//     "[Raio-X] cor #7a7a7a parecida com #777777 (2 elementos)"
//     "[Raio-X] fonte 13px Arial 400 órfã: usada 1× (1 elemento)"
```

- Valores de fonte: chave `"<size>px <primeira família> <peso>"` (família sem aspas; a lista inteira fica no `title`).
- Espaçamento `0px` conta (está na escala). Órfão = `count ≤ 2`.
- Ordenação de cada seção: com marca primeiro, depois por `count` decrescente.

### `audit-scan.ts` (DETE-01/06)

```ts
export interface ScanResult { elements: Element[]; samples: AuditSample[]; truncated: boolean; ms: number }
export async function scanDocument(opts?: { batch?: number; limit?: number; onProgress?(done: number): void; idle?: (cb: () => void) => void }): Promise<ScanResult>
```

- Percorre `document.body` com `TreeWalker` (pula a subárvore com `data-pxa-ignore`).
- Visível = retângulo com largura e altura > 0, e `visibility` diferente de `hidden`/`collapse` (`display:none` dá retângulo zero, inclusive nos descendentes).
- Lotes de 500 com `requestIdleCallback(cb, { timeout: 50 })` (cai para `setTimeout(0)` sem rIC). Para em 10.000 elementos visíveis com `truncated: true` (aviso no relatório).

### `ui/audit-report.ts` (DETE-02/04/05)

Janela `.pxa-audit` (fixa, à esquerda, `max-height` com rolagem):
- Cabeçalho com `auditHeadline` + botão fechar.
- Linha de controles: "Escala: 4px/8px" (alterna e recalcula a partir das amostras, sem varrer de novo) e "Varrer de novo".
- Avisos: "Cortado em 10.000 elementos" (DETE-06), "A página mudou. Varra de novo." (SPA: o `href` mudou desde a varredura).
- Três seções (`Cores`, `Fontes`, `Espaçamentos`), cada linha: amostra de cor (só cores), valor, `N×`, etiquetas (`fora da escala`, `parecida com #…`, `órfã`) e "Anotar" se tiver etiqueta.
- `mouseenter` na linha → `highlight(elements)`; `mouseleave` → limpa. O destaque é desenhado no `measure()` via `ui/boxes.ts` (acompanha a rolagem), até 300 caixas.
- "Anotar" → `actions.annotate(elements, findingNote(...))`.

### `ui/xray.ts` + `lib/leak.ts` (XRAY-01..06)

```ts
// lib/leak.ts
export interface Box { left: number; top: number; right: number; bottom: number }
export function overflowOutside(child: Box, parent: Box, clipX: boolean, clipY: boolean): number // px além de 1px, 0 se não vaza
export function contentOverflow(scrollW: number, clientW: number, scrollH: number, clientH: number, visibleX: boolean, visibleY: boolean): number
export function clips(overflow: string): boolean                 // hidden | clip | auto | scroll
export function shortSelector(el: Element): string               // #id | tag.classe (sem classes geradas) | tag
export function leakNote(kind: 'parent' | 'content', sel: string, px: number): string
// "[Raio-X] vaza do pai div.card em 12px" | "[Raio-X] conteúdo vaza de div.card em 12px"
```

- `measure()`: se ligado e "sujo", lista os elementos visíveis que cruzam o viewport (mesma regra de visibilidade da varredura), profundidade a partir do `<body>`, cor `depth % 6` da paleta pixel. Vazamento:
  1. filho fora do retângulo do pai (primeiro ancestral com caixa > 0) em mais de 1px num eixo que o pai **não** corta; ignora `position: fixed`;
  2. `scrollWidth > clientWidth` (ou altura) com `overflow` visível no eixo (ignora `html` e `body`, que rolam o viewport).
- Mais de 1.500 elementos no viewport → desenha só os vazamentos e mostra aviso na barra (XRAY-06).
- `pickLeak(el)`: sobe de `el` até achar um elemento marcado → `{ target, note }` (XRAY-04). Clique fora de vermelho segue o fluxo normal (XRAY-05).

### `ui/grid.ts` (GRAD-01..03)

Uma `div.pxa-grid` fixa em tela cheia, `pointer-events: none`, com dois `repeating-linear-gradient` (colunas a cada 8 ou 4px em rosa translúcido; linha de base a cada 4px em azul translúcido). `measure()` ajusta `background-position` para `-scrollX -scrollY` (alinhada ao topo do documento). O botão alterna `desligada → 8px → 4px → desligada`.

### `ui/loupe.ts` + `lib/loupe.ts` (LUPA-01..04)

```ts
// lib/loupe.ts
export interface Pixels { width: number; height: number; data: Uint8ClampedArray }
export function physicalPoint(cssX: number, cssY: number, img: { width: number; height: number }, vw: number, vh: number): { x: number; y: number } // escala = img/viewport (DPR + zoom)
export function sampleWindow(px: Pixels, cx: number, cy: number, size = 15): Array<string | null>   // hex por pixel, null fora do print
export const toHex: (r: number, g: number, b: number) => string
```

- Ligar → `captureWithoutUi` → `createImageBitmap` → canvas → `ImageData` guardado.
- `pointermove` (captura, passivo) guarda o cursor; `measure()` redesenha o canvas 120×120 (15×15 pixels × 8) com grade, pixel central marcado e hex, perto do cursor (vira para o outro lado na borda).
- `scroll`/`resize` → print inválido, mostra "atualizando…", novo pedido 300ms depois de parar; contador de geração descarta respostas velhas. A fila do background garante ≥ 550ms.
- Clique (via `pick`) → `navigator.clipboard.writeText(hex)` + toast "#rrggbb copiado"; não cria Anotação. `Esc` (keydown em captura) desliga.
- Falha na captura → toast "Print indisponível nesta página" (mesmo termo do M1: "Print: indisponível") e a Lupa desliga.

### `raio-x.ts` (composição)

```ts
export interface RaioXActions {
  annotate(elements: Element[], note: string): void   // controller.annotateElements
}
export function createRaioX(ui: UiHost, actions: RaioXActions, deps?: { capture?: CaptureTab; scan?: typeof scanDocument }) {
  return {
    toolbar: HTMLElement,           // barra inserida no Painel
    measure(): () => void,          // leituras de todas as ferramentas; devolve as escritas
    pick(el: Element): { handled: true } | { target: Element; note: string } | null,
    reset(): void,                  // desliga tudo (desativar o modo)
  }
}
```

### Mudanças no `controller.ts`

```ts
const raioX = createRaioX(ui, { annotate: annotateElements })
const panel = createPanel(ui, store, actions, raioX.toolbar)
// onPick:
const rx = raioX.pick(el)
if (rx && 'handled' in rx) return
const target = rx?.target ?? el
openEditor(target.getBoundingClientRect(), rx?.note, (note) => void save(target, note))
// tick: [overlay.measure(), markers.measure(), raioX.measure()]
// deactivate: raioX.reset()

/** Genérico: uma nota editável, um print por alvo. A regra do DETE-05 (pular sumidos e avisar,
 *  máx. 5 alvos, senão só o primeiro) fica em raio-x.ts (`annotateFinding`), fora do controller. */
function annotateElements(targets: Element[], note: string) {
  if (state !== 'active' || !targets[0]) return
  targets[0].scrollIntoView({ block: 'center', inline: 'nearest' })
  overlay.highlight(targets[0])
  openEditor(targets[0].getBoundingClientRect(), note, async (final) => {
    for (const t of targets) { if (state === 'inactive') break; if (t.isConnected) await save(t, final) }
  })
}
```

---

## Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| Elemento do Achado sumiu antes de "Anotar" | Pula e avisa "N elemento(s) sumiram da página"; nenhum vivo → só o aviso |
| Varredura > 10.000 elementos | Para e mostra "Cortado em 10.000 elementos" |
| Rota SPA mudou com relatório aberto | Aviso "A página mudou. Varra de novo." |
| Lupa em página sem captura | Toast "Print indisponível nesta página" e desliga |
| Clipboard indisponível | Toast "Não consegui copiar #rrggbb" |
| X-ray com > 1.500 elementos no viewport | Só vazamentos + aviso na barra |

## Riscos

| Risco | Mitigação |
|---|---|
| Conflito de merge no Painel/estilos/controller com os andares Diversão e Equipe | Inserções em pontos únicos; CSS num bloco no fim de `styles.ts`; cores literais atuais (Diversão converte depois) |
| Custo do X-ray em páginas grandes | Flag de sujo + desenho por diferença + corte em 1.500 |
| Lupa pisca a UI a cada novo print | Mesmo comportamento do print do M1; só após 300ms parado |
| Firefox: `requestIdleCallback`, `createImageBitmap`, clipboard | APIs existem no Firefox; verificação manual listada para o dev |

## Testes

| Camada | Teste |
|---|---|
| `lib/design-audit.ts`, `lib/leak.ts`, `lib/loupe.ts` | unit puro (Vitest), nomes com o ID |
| `audit-scan.ts`, `ui/*` novos, `raio-x.ts`, `controller.ts` | unit no happy-dom com `createHost()` (retângulos simulados com `vi.spyOn(Element.prototype, 'getBoundingClientRect')` quando preciso) |
| Integração | E2E `tests/e2e/raio-x.spec.ts` com a fixture `raio-x.html`: 3 espaçamentos fora da escala, 2 cores quase iguais, 1 filho vazando (critério de sucesso); Anotar cria anotação; X-ray marca o vazamento e o clique abre a nota; Grade some no print; Lupa copia hex |

---

## Revisão 2 — 2026-11-14 (dev: "gostei só do detector e da lupa; o detector tá meio burro")

### Corte

Saem `ui/xray.ts`, `ui/grid.ts`, `lib/leak.ts` e seus testes. `raio-x.pick()` volta a ser só da Lupa (`boolean`: clique consumido ou não); o `onPick` do controller volta quase ao original (`if (raioX.pick(el)) return`). `page.ts` volta para dentro de `audit-scan.ts` (único usuário). `ui/boxes.ts` fica (destaque do relatório).

### Diagnóstico (Detector rodado em demo, GitHub, tailwindcss.com, Wikipédia e Hacker News)

| Sintoma | Causa | Correção |
|---|---|---|
| 214 "cores" no site do Tailwind, quase todas `lab(...)`/`oklab(...)` órfãs | `normalizeColor` só entendia `rgb()`/hex | DETE-08: conversão pura de `lab/lch/oklab/oklch/color()` para sRGB (`lib/color.ts`) |
| Fonte de 96px do hero, largura de 600px etc. viram Achado | marca "órfã" (≤ 2 usos) sozinha | órfã sai; raridade só conta **perto** de um valor popular |
| Dois cinzas do design system (28× e 68×) acusados como "parecidos" | parecida = só distância | parecida = distância **e** rara perto da semente (≤ 2 ou ≤ 10% dos usos) |
| 2, 6, 10 e 14px acusados em site Tailwind; `0px 1336×` no topo; `1px` de `sr-only` | escala só em múltiplos; zeros listados; 1×1 varrido | escala com meios passos do Tailwind < 16px; tolerância 0,5px; zeros, `%` e elementos ≤ 1×1 / interior de SVG fora |
| Nota não diz o que mudar | — | DETE-05: propriedade + sugestão ("usar 12px ou 14px", "usar #777777", "usar 14px", "font-family: inherit") |
| `button` que caiu em Times/system-ui passa batido | fonte agrupada por tamanho+família+peso, só órfã | seções separadas de tamanho e família + marca "fonte padrão do navegador" |
| Valor raro longe da tela: hover destaca algo invisível | — | DETE-10: clicar no valor rola até o próximo elemento |
| Relatório gigante | todos os valores abertos | DETE-09: Achados primeiro, resto em `<details>` "outros N valores" |

### `lib/design-audit.ts` (rev. 2)

```ts
export type SpacingProp = 'margin-top' | 'margin-right' | … | 'row-gap' | 'column-gap'
export interface AuditSample { colors: string[]; fontSize: string; fontFamily: string; spacings: Array<{ prop: SpacingProp; value: string }> }
export type AuditFlag = 'off-scale' | 'similar' | 'default-font'
export interface AuditEntry { value: string; count: number; elements: number[]; flags: AuditFlag[]; similarTo?: string; props?: string[]; suggestion?: string }
export interface AuditReport { scale; colors; fontSizes; families; spacings: AuditEntry[]; offScale: number }
export function allowedOnScale(px, scale): boolean       // múltiplo (±0,5) ou meio passo permitido
export function scaleNeighbors(px, scale): [number, number] // sugestão: valor permitido abaixo e acima
```

- **Raridade perto da semente** (`RARITY` em `lib/design-audit.ts`, ajustado depois de rodar em GitHub, tailwindcss.com, Wikipédia e Hacker News): a semente tem ao menos **3×** os usos do valor, e o valor tem até `min(5, max(2, ⌊semente × 10%⌋))` usos. Dois parecidos e bem usados são tokens; dois raros entre si não têm referência clara (ex: amostras de paleta). Uma cor de fundo que pinta **10%+ da página** (maior área de elemento) é superfície e nunca vira Achado (ex: o bege do Hacker News).
- **Escala que não serve:** `scaleFit` = fração dos usos de espaçamento na escala; abaixo de 0,5 o relatório avisa (`scaleNotice`).
- **Fonte padrão:** famílias `times new roman, times, serif, system-ui, -apple-system, blinkmacsystemfont, sans-serif, arial, helvetica, segoe ui, roboto` contam como padrão do navegador só quando a família dominante (mais elementos) **não** é uma delas e a família tem até `max(2, 10%)` dos elementos da dominante.
- **Propriedades:** cada valor guarda as propriedades onde aparece; os 4 lados juntam no nome base (`padding`), `row-gap`+`column-gap` viram `gap`.

### `lib/color.ts` (rev. 2)

`parseCssColor(css) → { r, g, b, a } | null` (0–255, alfa 0–1) e `deltaE(a, b)` (ΔE76 em Lab D65; único lugar com a matemática de Lab). Suporta hex, `rgb()/rgba()`, `lab()/lch()` (D50 → Bradford → D65), `oklab()/oklch()` (matrizes de Ottosson), `color(srgb|srgb-linear|display-p3 …)`, `none` = 0, `/ alfa`. Fora do gamut: corta em 0–255. `normalizeColor` passa a usar `parseCssColor`.

### `audit-scan.ts` (rev. 2)

- Pula elementos ≤ 1×1px e o interior de `<svg>` (o `<svg>` em si conta).
- Um `computedStyleMap()` por elemento com espaçamento > 0 (só Chrome): descarta `auto` (margens) e percentuais. Sem Typed OM (Firefox): margens laterais iguais contam como `auto`; percentual não é detectável.
- Amostra leva a propriedade de cada espaçamento.

### `ui/audit-report.ts` (rev. 2)

Quatro seções; Achados primeiro e `<details>` "outros N valores"; clique no valor rola até o próximo elemento (índice por linha, cíclico); a etiqueta mostra o motivo e as propriedades (espaçamentos).

### Pós-/simplify (rev. 2)

- `AUDIT_KINDS` (lib) concentra título da seção, palavras da nota/cabeçalho e o acesso às entradas; o relatório itera essa tabela.
- Memo de cor e de px por varredura dentro de `buildAuditReport`; o `Rgba` de cada cor fica num mapa (sem reparsear o hex).
- `intersectsViewport` voltou a ser privado do relatório: `lib/crop.ts` igual ao `develop`.
- Pulados (registrados no STATE.md): `computedStyleMap()` só para valores "suspeitos" (muda contagens), fatias por tempo no `requestIdleCallback`, separar agrupamento e escala para alternar a escala sem refazer o relatório, `Record<AuditKind, …>` no relatório, detectar fonte não herdada pelo DOM (pai × filho) em vez da lista de famílias padrão.

## Revisão 3 — 2026-11-14 (dev: "não entendi se isso é erro"; `#7c7760` parecida com `#7c775f`)

| Sintoma | Causa | Correção |
|---|---|---|
| `#7c7760` "parecida com" `#7c775f` (ΔE 0,58) | diferença invisível (arredondamento de `oklch()`/`color-mix()`) tratada como Achado | `markSimilar` ganhou o limiar `same` (ΔE < 1): a variante junta na semente (`variants`), soma os elementos e não vira Achado nem conta como cor |
| "8 outros valores" em Espaçamentos parecia problema | o relatório não dizia o que estava ok | cabeçalho começa por "N achados"/"Nenhum achado"; seção sem Achado mostra "✓ tudo certo"; recolhido vira "N valores sem problema" |
| Achado sem contexto | etiqueta só dizia "parecida com X" | etiqueta mostra os usos da referência ("parecida com #777777 (30×)") e uma linha "→ usar …" com a sugestão |

`markSimilar` agora recebe `{ key, distance, near, same?, canStray? }`: um só agrupamento por semente decide "mesmo valor", "parecido e raro" e "token". `isFinding(e)` no lib é a definição única de Achado.

## Revisão 4 — 2026-11-14 (dev: "o card do Raio-X pode cair bem em cima de um card"; "o check poderia ser o do phren")

- `ui/draggable.ts` (novo, genérico): `makeDraggable(box, handle)`. O ponteiro no cabeçalho arrasta, e as setas movem 16px. A janela fica sempre dentro da tela, inclusive no `resize`.
- **Captura de ponteiro é obrigatória, não detalhe.** Sem ela, soltar o arraste fora da janela gera um `click` no ancestral comum (`<html>`), e o Modo Anotação abre o editor na página (pego pelo E2E).
- A posição fica no `style` da janela, que vive enquanto a aba estiver aberta: fechar e reabrir mantém.
- Ícone "tudo certo": SVG inline do `circle-check` do lucide (o `CheckCircle2Icon` do phren), em `#059669` (emerald-600). Fica no `audit-report.ts`, não no `icons.ts`: é o único ícone vetorial, e o `icons.ts` é compartilhado com os outros andares.
