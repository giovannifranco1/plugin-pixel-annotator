# Raio-X — Tasks

**Spec**: `.specs/features/2026-11-14-raio-x/spec.md`
**Design**: `.specs/features/2026-11-14-raio-x/design.md`
**Status**: Done (rev. 4) — 2026-11-14. Gate full: compile ok · 195 unit · builds Chrome/Firefox MV3 · check:manifest ok · 34 E2E (`PXA_E2E_PORT=5176`). Checklist manual do dev em `manual-check.md`.

> T1–T12 são a revisão 1 (histórico; T2, T7 e T8 foram desfeitas pela R1). O trabalho atual está em **Revisão 2**, no fim.

> **Breakdown:** horizontal. Lógica pura em `lib/` primeiro (TDD), depois a UI de cada ferramenta (unit no happy-dom), depois a composição, a integração no controller/painel e o E2E.
> **Commits:** 1 por fase do nano-spec; não por task.
> **Código de referência:** está no design.md. Os testes listados são o contrato; o nome de cada teste começa pelo ID.

## Gate Check Commands

| Gate | Comando | Quando |
|---|---|---|
| quick | `npm test` | tasks T1–T9 |
| full | `npm run compile && npm test && npm run build && npm run build:firefox && npm run check:manifest && PXA_E2E_PORT=5176 npm run test:e2e` | T10 e fechamento |

## Execution Plan

```
T1 ─┐
T2 ─┼─ (puras, independentes)
T3 ─┘
T1 → T4 (scan) → T6 (relatório)
T5 (boxes) → T6, T7 (xray, usa T2)
T8 (grade)   T9 (lupa, usa T3)
T6..T9 → T10 (raio-x.ts + controller + painel) → T11 (E2E) → T12 (manual-check)
```

---

### T1: `lib/design-audit.ts` — normalização, distância, escala, relatório
- **What:** funções puras do Detector (design.md § lib/design-audit).
- **Where:** `lib/design-audit.ts`, `tests/unit/design-audit.test.ts`
- **Depends:** —
- **Requirement:** DETE-02, DETE-03, DETE-05 (texto da nota), DETE-07
- **Done when / Tests:**
  - `DETE-07 normalizeColor`: `rgb(122, 122, 122)` → `#7a7a7a`; `rgba(0, 0, 0, 0.5)` → `#00000080`; `rgb(0 0 0 / 50%)` → `#00000080`; `transparent`/`rgba(0,0,0,0)` → `null`; hex curto `#abc` → `#aabbcc`.
  - `DETE-03 colorDistance`: idênticas = 0; `#7a7a7a` × `#777777` ≤ 5; `#000000` × `#ffffff` > 50.
  - `DETE-03 parsePx/isOnScale`: `auto`/`normal` → null; `-12px` → 12; `13px` fora de 4; `12.004px` dentro de 4; `12px` fora de 8.
  - `DETE-02 buildAuditReport`: conta elementos distintos por valor (cor repetida no mesmo elemento conta 1); ignora transparente; seções Cores/Fontes/Espaçamentos; `fontSizes` e `offScale` corretos.
  - `DETE-03` marca `off-scale`, `orphan` (≤ 2 elementos), `similar` com `similarTo` = semente mais usada; translúcida não fica parecida com opaca.
  - `DETE-02 auditHeadline` com plural/singular.
  - `DETE-05 findingNote` nos três tipos, ex: `[Raio-X] espaçamento 13px fora da escala de 4px (3 elementos)`.
- **Verify:** quick.

### T2: `lib/leak.ts` — regras de vazamento e seletor curto
- **Where:** `lib/leak.ts`, `tests/unit/leak.test.ts`
- **Requirement:** XRAY-02, XRAY-04
- **Tests:** `XRAY-02 overflowOutside` (dentro → 0; 1px de folga → 0; 12px à direita → 12; eixo cortado → 0); `XRAY-02 contentOverflow` (scrollWidth maior com overflow visível → diferença; cortado → 0); `XRAY-02 clips`; `XRAY-04 shortSelector` (`#id`, `div.card` sem classe gerada, `span`); `XRAY-04 leakNote`.
- **Verify:** quick.

### T3: `lib/loupe.ts` — cursor → pixel físico e janela 15×15
- **Where:** `lib/loupe.ts`, `tests/unit/loupe.test.ts`
- **Requirement:** LUPA-01, LUPA-04
- **Tests:** `LUPA-04 physicalPoint` com DPR 2 (print 2× o viewport) e DPR 1; `LUPA-01 sampleWindow` devolve 225 hex, centro correto, `null` fora do print; `toHex`.
- **Verify:** quick.

### T4: `audit-scan.ts` — varredura fatiada
- **Where:** `entrypoints/annotator.content/audit-scan.ts`, `tests/unit/audit-scan.test.ts`
- **Depends:** T1
- **Requirement:** DETE-01, DETE-06
- **Tests:** `DETE-01` pula `pxa-root`, `display:none`, `visibility:hidden`, tamanho 0; lê cores/fonte/espaçamentos computados. `DETE-06` lotes: com `batch: 2` e 5 elementos chama `idle` 3 vezes e `onProgress`; `limit` corta e marca `truncated`.
- **Verify:** quick.

### T5: `ui/boxes.ts` — pool de caixas
- **Where:** `entrypoints/annotator.content/ui/boxes.ts`, `tests/unit/boxes.test.ts`
- **Requirement:** suporte a DETE-04, XRAY-01
- **Tests:** desenha N caixas com classe/cor/rótulo; reaproveita nós; esconde as sobrando; não reescreve se nada mudou.
- **Verify:** quick.

### T6: `ui/audit-report.ts` — janela do relatório
- **Where:** `entrypoints/annotator.content/ui/audit-report.ts`, `tests/unit/audit-report.test.ts`
- **Depends:** T1, T4, T5
- **Requirement:** DETE-02, DETE-04, DETE-05, DETE-06 (aviso), caso limite SPA
- **Tests:** `DETE-02` cabeçalho e três seções com contagens; `DETE-04` hover na linha destaca os elementos no `measure()` e sair limpa; `DETE-05` "Anotar" chama `annotate(elements, nota)`; alternar escala recalcula sem varrer; `DETE-06` aviso de corte; SPA: `href` mudou → aviso "varra de novo".
- **Verify:** quick.

### T7: `ui/xray.ts` — contornos e vazamentos
- **Where:** `entrypoints/annotator.content/ui/xray.ts`, `tests/unit/xray.test.ts`
- **Depends:** T2, T5
- **Requirement:** XRAY-01, XRAY-02, XRAY-03, XRAY-04, XRAY-06
- **Tests:** `XRAY-01` contorna visíveis no viewport com cor por profundidade e ignora fora do viewport; `XRAY-02` filho que vaza fica vermelho com rótulo; `XRAY-03` só recalcula quando sujo (scroll/resize); `XRAY-04` `pickLeak` sobe até o vermelho e devolve a nota; `XRAY-06` acima do limite só vazamentos + aviso.
- **Verify:** quick.

### T8: `ui/grid.ts` — grade
- **Where:** `entrypoints/annotator.content/ui/grid.ts`, `tests/unit/grid.test.ts`
- **Requirement:** GRAD-01, GRAD-02, GRAD-03
- **Tests:** `GRAD-01` ciclo desligada → 8 → 4 → desligada e `background-position` segue o scroll; `GRAD-02` dentro do shadow root, `pointer-events: none`, `repeating-linear-gradient`; `GRAD-03` `ui.setHidden(true)` deixa a grade invisível (herança de `visibility`).
- **Verify:** quick.

### T9: `ui/loupe.ts` + `captureWithoutUi`
- **Where:** `entrypoints/annotator.content/ui/loupe.ts`, `screenshot.ts`, `tests/unit/loupe-ui.test.ts`
- **Depends:** T3
- **Requirement:** LUPA-01, LUPA-02, LUPA-03
- **Tests:** `LUPA-01` ligar pede um print com a UI escondida; `LUPA-02` `copy()` grava hex na área de transferência + toast; Esc desliga; `LUPA-03` scroll invalida, mostra "atualizando…", novo pedido só após 300ms parado (fake timers); falha → toast e desliga. Testes existentes de `screenshot` continuam verdes.
- **Verify:** quick.

### T10: `raio-x.ts` + integração em `controller.ts` / `panel.ts` / `styles.ts`
- **Depends:** T6–T9
- **Requirement:** DETE-05, XRAY-04, XRAY-05, LUPA-02 (clique), integração geral
- **Tests:** `raio-x.test.ts` (barra com 4 botões e `aria-pressed`; `reset` desliga tudo); `controller.test.ts` novos: `DETE-05 annotateElements` cria 1 anotação por elemento (≤ 5), 1 acima de 5, pula elemento desconectado e avisa; `XRAY-04/05` clique em vermelho abre nota pré-preenchida, clique comum segue normal; `LUPA-02` clique com Lupa não cria anotação. `panel.test.ts` existentes verdes.
- **Verify:** quick + `npm run compile`.

### T11: E2E `tests/e2e/raio-x.spec.ts` + fixture `raio-x.html`
- **Depends:** T10
- **Requirement:** critério de sucesso da spec; DETE-01..05, XRAY-01/02/04, GRAD-01/03, LUPA-01/02
- **Tests:** fixture com 3 espaçamentos fora da escala, 2 cores quase iguais, 1 filho vazando → Detector aponta os três; tempo < 1s; "Anotar" cria anotação com a nota `[Raio-X]…`; X-ray marca o filho em vermelho e o clique abre a nota `vaza do pai`; Grade ligada e print da anotação sem a grade (pixels do recorte); Lupa mostra hex e o clique copia (clipboard com permissão concedida no contexto).
- **Verify:** full.

### T12: Checklist manual Firefox
- **Where:** `.specs/features/2026-11-14-raio-x/manual-check.md`
- **Done when:** passos para o dev conferir as 4 ferramentas no Firefox (rIC, clipboard, createImageBitmap, DPR).

## Cobertura Spec → Tasks

| Requisito | Tasks |
|---|---|
| DETE-01 | T4, T11 |
| DETE-02 | T1, T6, T11 |
| DETE-03 | T1, T11 |
| DETE-04 | T5, T6, T11 |
| DETE-05 | T1, T6, T10, T11 |
| DETE-06 | T4, T6 |
| DETE-07 | T1 |
| XRAY-01 | T5, T7, T11 |
| XRAY-02 | T2, T7, T11 |
| XRAY-03 | T7 |
| XRAY-04 | T2, T7, T10, T11 |
| XRAY-05 | T10 |
| XRAY-06 | T7 |
| GRAD-01..03 | T8, T11 |
| LUPA-01 | T3, T9, T11 |
| LUPA-02 | T9, T10, T11 |
| LUPA-03 | T9 |
| LUPA-04 | T3 |

---

## Revisão 2 — 2026-11-14

> Corte do X-ray e da Grade + passada geral no Detector (design.md § Revisão 2). Mesmas regras: TDD na lógica, 1 commit por fase.

### R1: Remover X-ray e Grade ✅
- **Where:** apagar `ui/xray.ts`, `ui/grid.ts`, `lib/leak.ts`, `tests/unit/{xray,grid,leak}.test.ts`; `raio-x.ts` (2 botões), `controller.ts` (`onPick`), `styles.ts`, `page.ts` → `audit-scan.ts`, E2E e fixture.
- **Done when:** compile + unit + E2E verdes sem referências a X-ray/Grade.

### R2: `lib/color.ts` — cores modernas (DETE-08) ✅
- **Tests:** `DETE-08` lab/lch/oklab/oklch/`color(srgb|srgb-linear|display-p3)` de vermelho → `#ff0000`; cinza do GitHub `color(srgb 0.838902 0.90902 0.858824)` → `#d6e8db`; alfa (`/ 0.75`), `none`, fora do gamut cortado; `normalizeColor` usa o parser.

### R3: `lib/design-audit.ts` — regras novas (DETE-02/03/05/07) ✅
- **Ajuste depois de rodar em páginas reais:** referência 3× mais usada, teto de 5 usos, fundo de 10%+ da página nunca é "perdido", aviso de escala (`scaleFit`).
- **Tests:** escala com meios passos e tolerância; zeros fora; parecida só quando rara perto da semente; tamanho de fonte quase igual; fonte padrão do navegador; propriedades agregadas; sugestões nas notas; cabeçalho com famílias.

### R4: `audit-scan.ts` — ruído (DETE-01) ✅
- **Tests:** pula ≤ 1×1 e interior de SVG; amostra com propriedade; percentuais/auto fora quando há Typed OM (stub de `computedStyleMap`).

### R5: `ui/audit-report.ts` — UX (DETE-09/10) ✅
- **Tests:** quatro seções; Achados fora do `<details>`, demais dentro com "outros N valores"; clique no valor rola até o próximo elemento (cíclico).

### R6: E2E + fixture ✅
- **Tests:** fixture com tokens Tailwind (2/6/10/14px), cor `oklch()`, botão sem herdar a fonte, 13px vs 14px; critério de sucesso da spec rev. 2; Lupa intacta.

---

## Revisão 3 — 2026-11-14 ✅

- **R7** `lib/design-audit.ts`: ΔE < 1 é a mesma cor (variante na semente); `similarCount`; cabeçalho com nº de Achados; `isFinding`. Testes `DETE-03`/`DETE-02`/`DETE-05` atualizados.
- **R8** `ui/audit-report.ts`: "✓ tudo certo", "N valores sem problema", "→ usar …", "também #…". Testes `DETE-09`/`DETE-03`.
- **R9** E2E: fixture com `#777778` (imperceptível de `#777777`) → junta, sem Achado; cabeçalho "6 achados · …".

## Revisão 4 — 2026-11-14 ✅

- **R10** `ui/draggable.ts` + testes `DETE-11` (arrastar, limite da tela, botão do cabeçalho, setas, resize); E2E com mouse real (desloca 300×40, limite, sem abrir editor).
- **R11** Ícone check em círculo do phren no "tudo certo".
