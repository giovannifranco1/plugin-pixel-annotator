# Diversão — Tasks

**Spec**: `.specs/features/2026-11-14-diversao/spec.md`
**Design**: `.specs/features/2026-11-14-diversao/design.md`
**Status**: Done — 2026-11-14. Gate full: compile ok · 192 unit · builds Chrome/Firefox MV3 · check:manifest ok (activeTab, scripting, storage) · 34 E2E (`PXA_E2E_PORT=5175`). Checklist manual em `manual-check.md`.

> **Breakdown:** horizontal. Lógica pura em `lib/` (TDD), depois UI fina, depois integração e E2E.
> **Commits:** 1 por fase do nano-spec (regra do andar). As tasks não commitam.
> **Testes:** nome começa pelo ID do requisito. O agente roda a suite completa com `PXA_E2E_PORT=5175`.

## Gate Check Commands

| Gate | Comando |
|---|---|
| quick | `npm test` |
| full | `npm run compile && npm test && npm run build && npm run build:firefox && npm run check:manifest && PXA_E2E_PORT=5175 npm run test:e2e` |

## Execution Plan

```
T1 [P] profile ─┐
T2 [P] konami   │
T3 [P] contrast ├→ T5 achievements → T6 profile-storage → T10 fun → T11 integração → T12 E2E
T4 [P] permissão┘    T7 mascot ─┐
                     T8 sound  ─┼→ T10
                     T9 themes ─┘
```

---

### T1 [P] `lib/profile.ts` — perfil, normalização e nível

- **What:** `Profile`, `defaultProfile`, `normalizeProfile`, `levelOf`, `PROFILE_KEY`.
- **Where:** `lib/profile.ts`, `tests/unit/profile.test.ts`
- **Depends:** —
- **Done when:** campos inválidos viram padrão um a um; `levelOf(0)=Nv1`, `49→Nv1`, `50→Nv2`, `150→Nv3`, `into/span` corretos.
- **Tests:** `CONQ-03 curva de nível`, `CONQ-07 perfil corrompido descarta só o campo inválido`, `SOM-01 som desligado por padrão`.
- **Verify:** quick.

### T2 [P] `lib/konami.ts`

- **What:** matcher da sequência ↑↑↓↓←→←→BA.
- **Where:** `lib/konami.ts`, `tests/unit/konami.test.ts`
- **Done when:** sequência completa → `true` só no último passo; tecla errada reinicia; `B`/`A` maiúsculas aceitas; `↑↑↑↓↓…` ainda casa.
- **Tests:** `EGG-01 ...`.
- **Verify:** quick.

### T3 [P] `lib/contrast.ts`

- **What:** razão de contraste WCAG.
- **Where:** `lib/contrast.ts`, `tests/unit/themes.test.ts` (início)
- **Done when:** preto/branco = 21; cor igual = 1.
- **Verify:** quick.

### T4 [P] Permissão `storage` (Q-01)

- **What:** `storage` em `wxt.config.ts`; `check-manifest.mjs` exige exatamente `activeTab`, `scripting`, `storage`.
- **Where:** `wxt.config.ts`, `scripts/check-manifest.mjs`
- **Verify:** `npm run build && npm run build:firefox && npm run check:manifest`.

### T5 `lib/achievements.ts`

- **What:** catálogo das 7 conquistas e `applyEvent`.
- **Where:** `lib/achievements.ts`, `tests/unit/achievements.test.ts`
- **Depends:** T1
- **Done when:** cada conquista desbloqueia na condição exata e uma vez só; XP de anotar = 10; export = 5·N; edição não existe como evento.
- **Tests:** `CONQ-01`, `CONQ-02`, `CONQ-04 desbloqueia uma vez`, `CONQ-05 <cada conquista>`, `EGG-01 Código Secreto`.
- **Verify:** quick.

### T6 `profile-storage.ts`

- **What:** `createProfileStorage(area)` com fila serializada, `onChange`, fallback em memória.
- **Where:** `entrypoints/annotator.content/profile-storage.ts`, `tests/unit/profile-storage.test.ts`
- **Depends:** T1
- **Done when:** 20 `update(+1)` concorrentes somam 20; outra "aba" (escrita direta no storage) chega no `onChange`; `area` ausente ou que lança → memória.
- **Tests:** `CONQ-07 ...`.
- **Verify:** quick.

### T7 `ui/mascot.ts` + `pixelIcon` com paleta

- **What:** grades 16×16 dos 5 humores, `createMascot`, `set(mood, ms)` volta para `idle`; `pixelIcon(rows, scale, palette)`.
- **Where:** `ui/mascot.ts`, `ui/icons.ts`, `tests/unit/mascot.test.ts`
- **Done when:** SVG `crispEdges` 32×32; `data-mood`; transitório volta a `idle`; preview `assets/mascot-preview.html`.
- **Tests:** `MASC-06 ...`, `MASC-02 feliz por 1,5s volta a idle`.

### T8 `ui/sound.ts`

- **What:** sequências e `createSound(factory)`.
- **Where:** `ui/sound.ts`, `tests/unit/sound.test.ts`
- **Done when:** toda sequência ≤ 800ms, ondas `square`/`triangle`, ganho fixo; fábrica que lança ou `undefined` não propaga erro.
- **Tests:** `SOM-03`, `SOM-04`.

### T9 `ui/themes.ts` + `ui/styles.ts` com custom properties

- **What:** 5 temas, `applyTheme`; cores do CSS viram `var(--pxa-*)` com o `Padrão` em `.pxa-layer`; marcador sem variáveis.
- **Where:** `ui/themes.ts`, `ui/styles.ts`, `tests/unit/themes.test.ts`
- **Done when:** nenhum hex de UI fora de `.pxa-layer` e do marcador; todo tema define todas as variáveis; contraste ≥ 4.5 nos pares do design (D16).
- **Tests:** `TEMA-01`, `TEMA-03`, `TEMA-04`, `TEMA-05`.

### T10 `ui/fun.ts` + slots do painel

- **What:** orquestrador (mascote, `Nv`, 🏆, barra tema/som, visão Conquistas, fila de toasts, sono, Konami) e slots `headStart`/`headEnd`/`expand()` em `panel.ts`.
- **Where:** `ui/fun.ts`, `ui/panel.ts`, `ui/styles.ts`, `tests/unit/fun.test.ts`
- **Depends:** T5–T9
- **Done when:** com store/storage/som falsos e fake timers: anotar → feliz/susto, +10 XP, toast de conquista em fila, blip só com som ligado; export zip → festa + 5·N; markdown → festa; 60s → dormindo; Konami fora do editor desbloqueia sem `preventDefault`; tema e som persistem.
- **Tests:** `MASC-01..05`, `CONQ-01..04`, `CONQ-06`, `SOM-01/02`, `TEMA-02`, `EGG-01/02`.

### T11 Integração no controller e exporter

- **What:** `exportZip`/`copyMarkdown` devolvem `boolean`; controller cria `fun`, liga `activate` ao teardown e chama `exported`.
- **Where:** `controller.ts`, `exporter.ts`, testes existentes de controller/exporter
- **Depends:** T10
- **Done when:** os 127 unitários antigos continuam verdes + teste de retorno do exporter.
- **Verify:** quick + compile.

### T12 E2E `tests/e2e/fun.spec.ts`

- **What:** mascote visível; anotar dá XP e "Primeiro Pixel"; perfil sobrevive a recarregar (e outra origem/aba); tema aplica e persiste; Konami desbloqueia e a página recebe as teclas; reduced motion sem animação; página com CSP restritiva continua funcionando.
- **Where:** `tests/e2e/fun.spec.ts`, fixture `tests/e2e/fixtures/csp.html` se preciso
- **Depends:** T11
- **Verify:** full.

## Cobertura Spec → Tasks

| Requisito | Tasks |
|---|---|
| MASC-01..06 | T7, T10, T12 |
| CONQ-01..07 | T1, T5, T6, T10, T12 |
| SOM-01..04 | T1, T8, T10 |
| TEMA-01..05 | T3, T9, T10, T12 |
| EGG-01..02 | T2, T5, T10, T12 |
| Q-01 (permissão) | T4 |
