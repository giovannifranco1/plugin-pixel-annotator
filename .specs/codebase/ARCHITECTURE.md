# Arquitetura

Contextos de execução da extensão (todos injetados **sob demanda** pelo clique no ícone, sem `content_scripts` no manifest):

- **Background** (`entrypoints/background.ts`; service worker no Chrome, event page no Firefox): no clique do ícone, pergunta ao isolated world se o annotator já existe (`executeScript({ func })`). Se não existe, injeta o annotator e o probe (`world: 'MAIN'`) e então envia `pxa:toggle`. Qualquer falha marca a aba com badge `!`. Também serve `pxa:capture`: fila de `tabs.captureVisibleTab` com intervalo ≥ 550ms, respondendo via `sendResponse` + `return true` (o Chrome sem polyfill não aceita Promise como retorno).
- **Annotator** (`entrypoints/annotator.content/`, isolated world): estado em memória (`lib/store.ts`), UI num único host `<pxa-root>` com Shadow DOM, máquina de estados `inactive → active → editing → capturing` (`controller.ts`), captura de contexto, recorte do print e export.
- **Probe** (`entrypoints/component-probe.ts`, main world): lê internals de React/Vue (`lib/component-detect.ts`) e responde por `CustomEvent` com JSON em string. O elemento é apontado por um atributo temporário `data-pxa-probe`. Os nomes dos eventos ficam em `lib/messages.ts`.

Fluxo: ícone → background checa/injeta → annotator ativa overlay e painel → clique no elemento (interceptado na captura em `window`) → editor de nota → ao confirmar: probe (timeout 300ms) + print (UI escondida, background fotografa, recorte em canvas) → anotação no store → marcador e item no painel → export `.zip` (`<a download>`) ou "copiar markdown".

**Laço por frame** (`tick.ts`, só com o modo ativo): todas as leituras de layout primeiro (`overlay.measure()`, `markers.measure()`), depois todas as escritas, escrevendo só o que mudou. Elementos que sumiram são buscados de novo pelo seletor no máximo a cada 500ms ou na troca de rota. O nó reencontrado fica memorizado (`store.rememberRef`).

Detalhes e decisões: `.specs/features/2026-11-13-modo-anotacao/design.md`.
