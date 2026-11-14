# Equipe e Claude — Tasks

**Spec**: `.specs/features/2026-11-14-equipe-claude/spec.md`
**Design**: `.specs/features/2026-11-14-equipe-claude/design.md`
**Status**: Em execução.

> **Breakdown:** horizontal, como no M1. Lógica pura em `lib/` primeiro (TDD), depois probe e UI, depois o controller e o E2E.
> **Commits:** 1 por fase do nano-spec. A coluna "Commit" não existe aqui de propósito.
> **Execução:** um agente só, em sequência. As tasks `[P]` são independentes, mas mexem nos mesmos arquivos de teste de fixture e tipos; o ganho de paralelizar não paga o risco de conflito.
> **Testes:** nome de cada teste começa pelo ID do requisito. Os blocos de código do design são referência, não copy-paste.

## Gate Check Commands

| Gate | Comando |
|---|---|
| quick | `npm test` |
| build | `npm run compile && npm run build && npm run build:firefox` |
| full | `npm run compile && npm test && npm run build && npm run build:firefox && npm run check:manifest && PXA_E2E_PORT=5177 npm run test:e2e` |

## Execution Plan

```
T1 tipos/mensagens
 ├→ T2 [P] error-log ──→ T3 error-hooks ──→ T4 probe + probe-client
 ├→ T5 [P] drawing
 ├→ T6 [P] store.update / importAnnotations
 └→ T7 [P] manifest ──→ T8 import
T2+T5 ──→ T9 markdown (erros, desenho)
T7+T9 ──→ T10 exporter (pxa.json, -original)
T4+T6 ──→ T11 note-editor (erros)
T6 ──→ T12 panel (botões, selo, brush, importados)
T5 ──→ T13 draw-editor
T6 ──→ T14 presentation
T10..T14 ──→ T15 controller ──→ T16 styles ──→ T17 E2E ──→ T18 gate full
```

---

### T1 — Tipos e nomes de mensagens
- **What:** `PageError`, `PageErrorKind`, `DrawTool`, `Stroke`, `Drawing`, `ImportedFrom`; campos opcionais `errors?`, `drawing?`, `importedFrom?` em `Annotation`. Em `messages.ts`: `ERRORS_REQUEST`, `ERRORS_RESPONSE`, `ERROR_WINDOW_MS`.
- **Where:** `lib/types.ts`, `lib/messages.ts`
- **Depends:** —
- **Done when:** `npm run compile` passa sem tocar em código existente.
- **Verify:** build gate.

### T2 — Registro de erros (ERRO-02)
- **What:** `createErrorLog`, `sanitizeUrl`, `clip`, `errorKey`.
- **Where:** `lib/error-log.ts`, `tests/unit/error-log.test.ts`
- **Depends:** T1
- **Done when (testes):** `ERRO-02 FIFO de 50`, `ERRO-02 repetição vira ×N e vai para o fim`, `ERRO-02 mensagem cortada em 500`, `ERRO-02 URL sem query e sem fragmento`, `ERRO-03 since(60s) filtra pela última ocorrência`.
- **Verify:** quick.

### T3 — Hooks do main world (ERRO-01)
- **What:** `installErrorHooks(win, log)`: console.error, `error`, `unhandledrejection`, fetch, XHR.
- **Where:** `lib/error-hooks.ts`, `tests/unit/error-hooks.test.ts`
- **Depends:** T2
- **Done when (testes):** `ERRO-01 console.error registra e chama o anterior (wrapper sobre wrapper)`, `ERRO-01 ErrorEvent vira exception com arquivo:linha`, `ERRO-01 unhandledrejection`, `ERRO-01 fetch 404 registrado e a mesma resposta volta`, `ERRO-01 fetch rejeitado vira falha de rede e continua rejeitando`, `ERRO-01 fetch 200 não registra`, `ERRO-01 XHR 500 registrado`, `ERRO-01 hook que falha não quebra a chamada`.
- **Verify:** quick.

### T4 — Probe e cliente (ERRO-03/06)
- **What:** probe instala log + hooks e responde `ERRORS_REQUEST`; `probeErrors(windowMs)` no cliente, com `request()` interno compartilhado por `probeComponent`.
- **Where:** `entrypoints/component-probe.ts`, `entrypoints/annotator.content/probe-client.ts`, `tests/unit/probe-client.test.ts`
- **Depends:** T3
- **Done when (testes):** `ERRO-03 probeErrors devolve a lista do probe`, `ERRO-06 sem probe → [] em 300ms`, `ERRO-06 resposta inválida → []`; testes COMP existentes verdes.
- **Verify:** quick + build.

### T5 — Rasterização do Desenho (DESE-02)
- **What:** `snap`, `rasterLine`, `rasterStroke`, `blockFor`, `DRAW_COLORS`.
- **Where:** `lib/drawing.ts`, `tests/unit/drawing.test.ts`
- **Depends:** T1
- **Done when (testes):** `DESE-02 blocos alinhados à grade de 2px`, `DESE-02 linha contínua sem buracos`, `DESE-02 seta tem haste e duas pontas`, `DESE-02 círculo inscrito no retângulo`, `DESE-02 X cruza as diagonais`, `DESE-02 blockFor por DPR`.
- **Verify:** quick.

### T6 — Store: update e importação (IMPO-03/06/07)
- **What:** `update(id, patch)`; `updateNote` delega; `importAnnotations(list)`.
- **Where:** `lib/store.ts`, `tests/unit/store.test.ts`
- **Depends:** T1
- **Done when (testes):** `update troca campos, atualiza updatedAt e marca dirty`, `IMPO-03 numeração na sequência e importedFrom`, `IMPO-06 mesmo id não duplica`, `IMPO-07 importar marca dirty`.
- **Verify:** quick.

### T7 — Manifesto (IMPO-01/02)
- **What:** `SCHEMA_VERSION`, `buildManifest`, `parseManifest`, `originalShotName`.
- **Where:** `lib/manifest.ts`, `lib/export-names.ts`, `tests/unit/manifest.test.ts`
- **Depends:** T1
- **Done when (testes):** `IMPO-01 manifesto sem Blob, shot por nome, drawing com file`, `IMPO-02 JSON inválido`, `IMPO-02 versão desconhecida`, `IMPO-02 forma inválida`, `IMPO-01 ida e volta preserva campos`.
- **Verify:** quick.

### T8 — Leitura do .zip (IMPO-02/03, casos limite)
- **What:** `readImportZip(bytes)` com limites e mensagens.
- **Where:** `lib/import.ts`, `tests/unit/import.test.ts`
- **Depends:** T7
- **Done when (testes):** `IMPO-02 zip sem pxa.json recusado`, `IMPO-02 zip corrompido`, `IMPO-03 prints e desenho vêm de shots/`, `caso limite: arquivo grande demais`, `caso limite: muitos arquivos`.
- **Verify:** quick.

### T9 — Markdown (ERRO-05, DESE-03)
- **What:** seção "Erros no console", `⚠ N erros` no compacto, linha de print com original, linha "Importada de".
- **Where:** `lib/markdown.ts`, `tests/unit/markdown.test.ts`
- **Depends:** T2, T5
- **Done when (testes):** `ERRO-05 seção com bloco text e ×N`, `ERRO-05 compacto com ⚠ N erros`, `DESE-03 print com desenho cita o original`; snapshot do M1 inalterado.
- **Verify:** quick.

### T10 — Exporter (IMPO-01, DESE-03)
- **What:** `pxa.json` e `shots/NN-original.png` no `buildZip`.
- **Where:** `entrypoints/annotator.content/exporter.ts`, `tests/unit/exporter.test.ts`
- **Depends:** T7, T9
- **Done when (testes):** `IMPO-01 zip tem pxa.json com schemaVersion e origem`, `DESE-03 composto em NN.png e original em NN-original.png`; EXPO-01 atualizado para incluir `pxa.json`.
- **Verify:** quick.

### T11 — Editor de nota com erros (ERRO-04)
- **Where:** `entrypoints/annotator.content/ui/note-editor.ts`, `tests/unit/note-editor.test.ts`
- **Depends:** T1
- **Done when (testes):** `ERRO-04 editor lista erros e remove antes de salvar`, `ERRO-04 erros chegando por Promise`, `ERRO-04 sem erros não mostra lista`.
- **Verify:** quick.

### T12 — Painel (APRE-01, ERRO-04, DESE-01/04/05, IMPO-02/03/05)
- **Where:** `entrypoints/annotator.content/ui/panel.ts`, `ui/icons.ts` (BRUSH), `tests/unit/panel.test.ts`
- **Depends:** T6
- **Done when (testes):** `APRE-01 Apresentar desabilitado sem anotações`, `IMPO-02 Importar .zip entrega o arquivo`, `ERRO-04 selo ⚠ N`, `DESE-01 ícone Desenhar só com print`, `DESE-04 miniatura quando há desenho`, `IMPO-03 item mostra #n de host`, `IMPO-05 elemento não encontrado`.
- **Verify:** quick.

### T13 — Editor de Desenho (DESE-02/03/05)
- **Where:** `entrypoints/annotator.content/ui/draw-editor.ts`, `tests/unit/draw-editor.test.ts`
- **Depends:** T5
- **Done when (testes):** `DESE-02 traço de seta vira stroke com cor`, `DESE-02 Ctrl+Z desfaz e Limpar zera`, `DESE-03 Salvar chama compose e devolve Drawing`, `DESE-05 Esc e Cancelar fecham sem salvar`.
- **Verify:** quick.

### T14 — Modo Apresentação (APRE-01..06)
- **Where:** `entrypoints/annotator.content/ui/presentation.ts`, `tests/unit/presentation.test.ts`
- **Depends:** T6
- **Done when (testes):** `APRE-01 começa na primeira da rota atual`, `APRE-02 cartão com #n, largura e nota; recorte no elemento`, `APRE-03 teclas e botões; contador`, `APRE-04 outra rota: sem recorte, print e rota`, `APRE-05 aviso de categoria`, `APRE-06 Esc chama onClose e tira o pxa-presenting`.
- **Verify:** quick.

### T15 — Controller
- **What:** estados `presenting`; erros no pick; `onPresent`, `onDraw`, `onImport`, `isMissing`; toggle fecha a apresentação.
- **Where:** `entrypoints/annotator.content/controller.ts`, `tests/unit/controller.test.ts`
- **Depends:** T10..T14
- **Done when (testes):** `APRE-01 apresentar desliga o clique de anotar`, `APRE-06 sair volta para active`, `ERRO-03 erros do probe entram na anotação`, `IMPO-04 origem diferente avisa e importa`.
- **Verify:** quick + build.

### T16 — Estilos
- **Where:** `entrypoints/annotator.content/ui/styles.ts` (só acréscimos no fim, cores atuais)
- **Depends:** T12..T14
- **Verify:** E2E visual pelo T17.

### T17 — E2E (Critérios de Sucesso)
- **Where:** `tests/e2e/team.spec.ts`, helpers em `tests/e2e/harness.ts`
- **Depends:** T15, T16
- **Done when (testes):** `IMPO-01..05 exportar numa aba e importar em outra recria os marcadores nas mesmas posições`, `IMPO-06 importar duas vezes não duplica`, `ERRO-01/05 console.error e fetch 404 no feedback.md`, `APRE-01..06 apresentação pelo teclado`, `DESE-01..04 desenho entra no export com original`.
- **Verify:** full.

### T18 — Gate full + rastreabilidade
- **What:** gate full; spec Pending → Verified; `manual-check.md` (Firefox) da feature.
- **Depends:** T17
