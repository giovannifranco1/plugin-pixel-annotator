# Equipe e Claude — Design

**Spec**: `.specs/features/2026-11-14-equipe-claude/spec.md`
**Status**: Pronto para Tasks (spec aprovada; o dev pediu para seguir sem pausa de aprovação).

> Restrições que moldam tudo: só `activeTab` + `scripting`, nada de servidor, e três andares mexendo no Painel ao mesmo tempo. Código novo em módulos próprios; em `panel.ts`, `styles.ts` e `controller.ts` só acréscimos localizados.

---

## Visão geral

```mermaid
flowchart LR
  subgraph MAIN["Main world (probe)"]
    H[lib/error-hooks.ts<br/>console.error · error · unhandledrejection · fetch · XHR] --> L[lib/error-log.ts<br/>FIFO 50 · ×N · since 60s]
    L -- pxa:errors-response --> C
  end
  subgraph ISO["Isolated world (annotator)"]
    C[probe-client.probeErrors<br/>timeout 300ms → []] --> NE[note-editor<br/>lista de erros removíveis]
    NE --> CT[controller]
    CT --> S[(store<br/>errors? · drawing? · importedFrom?)]
    P[panel<br/>Apresentar · Importar · ✏️ · ⚠ N] --> CT
    CT --> PR[ui/presentation.ts]
    CT --> DE[ui/draw-editor.ts] --> D[lib/drawing.ts<br/>raster em blocos de 2px]
    CT --> IM[lib/import.ts + lib/manifest.ts]
    S --> EX[exporter<br/>feedback.md · pxa.json · shots/NN(-original).png]
  end
```

## Modelo de dados (`lib/types.ts`, só campos opcionais novos)

```ts
export type PageErrorKind = 'console' | 'exception' | 'rejection' | 'network'
export interface PageError {
  kind: PageErrorKind
  message: string        // até 500 caracteres
  at: string             // ISO da última ocorrência
  count: number          // repetições idênticas (×N)
  source?: string        // arquivo:linha, sem query/fragmento
  method?: string        // rede
  url?: string           // rede, sem query/fragmento
  status?: number        // rede; 0 = falha de rede (sem resposta)
}
export type DrawTool = 'brush' | 'arrow' | 'circle' | 'cross'
export interface Stroke { tool: DrawTool; color: string; points: Array<[number, number]> } // coordenadas do print
export interface Drawing { strokes: Stroke[]; block: number; composite: Blob }           // composite = print + traços (PNG)
export interface ImportedFrom { origin: string; number: number }

interface Annotation { /* … campos atuais … */ errors?: PageError[]; drawing?: Drawing; importedFrom?: ImportedFrom }
```

- `errors` só existe com ≥1 erro (snapshots e markdown do M1 ficam idênticos).
- O Desenho é **camada separada**: `shot` continua sendo o original; `drawing.strokes` é a camada; `drawing.composite` é o cache do print composto (gerado ao salvar o Desenho), usado pelo Painel, pela Apresentação e pelo export. Helper `displayShot(a) = a.drawing?.composite ?? a.shot`.

## Componentes

### 1. Registro de erros (ERRO-01..03, ERRO-06)

**`lib/error-log.ts`** (puro): `createErrorLog({ max = 50, now })` → `push(input)`, `since(windowMs)`, `list()`.
- Chave de repetição: `kind|message|source|method|url|status`. Repetição incrementa `count`, atualiza `at` e move a entrada para o fim (é a mais recente). Acima de 50, descarta a mais antiga (FIFO).
- `sanitizeUrl(url, base)`: resolve relativa contra `base`, remove `search` e `hash`; inválida → string cortada no primeiro `?`/`#`.
- `clip(text, 500)`.

**`lib/error-hooks.ts`** (roda no main world, testável no happy-dom): `installErrorHooks(win, log)`.
- `console.error`: guarda a função **atual** (Sentry/Datadog podem já ter envolvido) e a substitui por um wrapper que registra e chama a anterior com `apply(this, arguments)`. Argumentos viram texto: `Error` → `Nome: mensagem`, string como está, objeto → `JSON.stringify` (falhou → `String`).
- `window` `error` (só `ErrorEvent`, ignora erro de carregamento de recurso) → `exception` com `arquivo:linha`; `unhandledrejection` → `rejection` com a mensagem do `reason`.
- `fetch`: wrapper devolve **a mesma promise** do fetch anterior e observa em paralelo: `status ≥ 400` → entrada de rede; rejeição → `status 0` ("falha de rede"). Método de `init.method` ou do `Request`.
- `XMLHttpRequest`: `open` anota método/URL num `WeakMap`; `send` liga `loadend` uma vez: `status ≥ 400` → rede; `status 0` sem `abort` → falha de rede.
- Todo registro é envolvido em `try/catch`: o hook nunca quebra a página.

**Probe (`component-probe.ts`)**: na injeção, cria o log e instala os hooks; responde a `pxa:errors-request` com `since(windowMs)`. Nomes novos em `lib/messages.ts`: `ERRORS_REQUEST`, `ERRORS_RESPONSE`, `ERROR_WINDOW_MS = 60_000`.

**`probe-client.ts`**: `probeErrors(windowMs)` pelo mesmo padrão `CustomEvent` + JSON em string + timeout de 300ms → `[]` em timeout, JSON inválido ou probe ausente (ERRO-06: CSP/página especial = sem probe = lista vazia, sem aviso). O pedido/resposta genérico vira `request()` interno, reaproveitado por `probeComponent`.

### 2. Erros na nota e no export (ERRO-03..05)

- **Quando pedir os erros:** no clique de anotar (abertura do editor), não no Enter, porque o editor precisa mostrá-los para o dev remover (ERRO-04). A janela de 60s conta a partir desse clique. Decisão registrada no STATE.
- **`note-editor.ts`**: opção nova `errors?: PageError[] | Promise<PageError[]>`; mostra `⚠ N erros` com uma lista `<ul>` em que cada item tem `✕ Remover`. `onSave(note, errors?)` recebe a lista restante (segundo argumento: compatível com quem já chama `onSave(note)`).
- **Editar nota** de uma Anotação existente mostra e permite remover os erros dela (`store.update(id, { note, errors })`).
- **`store.ts`**: `update(id, patch)` genérico (note/errors/drawing) com `updatedAt` e `dirty`; `updateNote` passa a delegar para ele.
- **Painel**: selo `⚠ N` na linha de meta do item (ERRO-04).
- **`markdown.ts`**: seção `**Erros no console:**` + bloco `text`, uma linha por erro: `HH:MM:SS console.error: msg (app.js:12) ×3` / `HH:MM:SS rede: GET http://x/api → 404` / `HH:MM:SS rede: POST http://x/api → falha de rede`. Compacto: `⚠ N erros` (singular `⚠ 1 erro`) no fim da linha de metadados.

### 3. Modo Apresentação (APRE-01..06) — `ui/presentation.ts`

`openPresentation(ui, store, { onClose, resolve? })` → `{ close() }`.

- Ordem = ordem do store. Começa na **primeira Anotação da rota atual** (nenhuma na rota → a primeira).
- Elementos: `.pxa-spot` (recorte: `box-shadow: 0 0 0 100vmax rgba(26,18,38,.65)` em volta do rect do elemento, `pointer-events: none`) e `.pxa-present` (cartão grande, centro-baixo, `#n` + ícone pixel da Categoria + largura + nota + contador `3/7` + ◀ ▶ ✕).
- Passo com elemento resolvido na rota atual: `scrollIntoView({ behavior: 'smooth', block: 'center' })`; um `requestAnimationFrame` próprio reposiciona o recorte enquanto a rolagem acontece (lê rect, escreve só se mudou).
- Outra rota (APRE-04): sem recorte, cartão com print (`displayShot`) e "anotada em `/rota`". Mesma rota mas elemento sumiu: sem recorte, print e "elemento não encontrado".
- Categoria diferente (APRE-05): "anotada em 📱 390px, você está em 🖥️ 1440px".
- Teclado (APRE-03): `keydown` na captura em `window`, `preventDefault` + `stopImmediatePropagation` (Espaço não rola a página): → / Espaço / ← / Home / End / Esc.
- O print aparece por `URL.createObjectURL`, revogado ao trocar de passo e ao fechar.
- **Painel durante a apresentação:** a classe `pxa-presenting` em `ui.layer` some com o Painel via CSS. Assim nada muda em `panel.ts` e, ao sair, o Painel volta exatamente como estava, recolhido ou não (APRE-06). Decisão registrada: "recolher" foi lido como "tirar da frente"; a barra recolhida ficaria embaixo do cartão.
- **Controller:** estado novo `presenting`. Hover e clique de anotar já ignoram estados diferentes de `active`; o interceptor continua bloqueando cliques na página (não navega sem querer no meio da call). Overlay escondido ao entrar. Desligar o modo pelo ícone fecha a apresentação.

### 4. Desenho (DESE-01..05) — `lib/drawing.ts` + `ui/draw-editor.ts`

**`lib/drawing.ts`** (puro): rasteriza traços em blocos `block × block` (sem antialias por construção: só `fillRect` inteiros).
- `snap(p, block)`: alinha à grade.
- `rasterLine(a, b, block)`: Bresenham na grade de blocos.
- `rasterStroke(stroke, block)` → lista de blocos `[x, y]` sem repetição: pincel = linhas entre pontos consecutivos; seta = linha + duas hastes de 30° com comprimento `max(4 blocos, 25% da linha)`; círculo = elipse (ponto médio) inscrita no retângulo início→fim; X = duas diagonais do retângulo.
- `blockFor(dpr) = 2 × max(1, round(dpr))`: "2px" em pixels CSS, para o traço não sumir em print de tela retina.
- `DRAW_COLORS`: rosa `#ff3e7f`, amarelo `#f2c94c`, ciano `#3fd0e0`.

**`ui/draw-editor.ts`**: `openDrawEditor(ui, { shot, drawing?, dpr, compose?, onSave(drawing), onCancel })`.
- Modal `.pxa-draw` (fundo escuro + caixa) com `<canvas>` no tamanho real do print, exibido escalado com `image-rendering: pixelated`. Barra: 4 ferramentas (radio), 3 cores, Desfazer, Limpar, Cancelar, Salvar.
- Ponteiro: `pointerdown/move/up` no canvas, coordenadas convertidas para pixels do print. Pincel acumula pontos; formas usam início + ponto atual (prévia ao arrastar).
- Redesenho = `drawImage(print)` + `fillRect` dos blocos (`imageSmoothingEnabled = false`).
- `Ctrl/Cmd+Z` desfaz, `Esc` cancela (DESE-05). Teclas param no modal (`stopPropagation`) para atalhos da página não dispararem.
- Salvar: `compose(shot, strokes, block)` gera o PNG composto (canvas → `toBlob`) e devolve `Drawing`. Sem traços → remove o Desenho (`drawing: undefined`). `compose` é injetável para o teste unitário (happy-dom não tem canvas 2D).
- Controller: estado `editing` durante o editor; `onDraw(id)` só em `active`; salva com `store.update(id, { drawing })`.
- **Painel:** ícone pixel novo `BRUSH` (o lápis já é "Editar nota") com `title="Desenhar"`, só em itens com print (DESE-05). Itens com Desenho mostram uma miniatura do composto (DESE-04). **Dúvida registrada:** o Painel do M1 não tem miniatura; mostrar só quando há Desenho foi a leitura mais conservadora diante da regra "só ícones novos por item".

**Export (DESE-03):** com Desenho, `shots/NN.png` = composto e `shots/NN-original.png` = original. A linha de print no `feedback.md` ganha `(com desenho; original em shots/NN-original.png)`.

### 5. Manifesto e Importar (IMPO-01..07) — `lib/manifest.ts` + `lib/import.ts`

**`lib/manifest.ts`**
```ts
export const SCHEMA_VERSION = 1
export interface PxaManifest {
  schemaVersion: 1; generator: 'PixelAnnotator'; origin: string /* location.origin */; exportedAt: string
  annotations: ManifestAnnotation[]
}
// Annotation sem Blobs: `shot` vira o nome do original em shots/ (ou null); drawing vira { strokes, block, file }.
export type ManifestAnnotation = Omit<Annotation, 'shot' | 'drawing'> & { shot: string | null; drawing?: { strokes: Stroke[]; block: number; file: string } }
buildManifest(list, { origin, exportedAt }): PxaManifest
parseManifest(text): { ok: true; manifest } | { ok: false; error }   // JSON inválido, versão desconhecida, forma inválida
```
- `shotName(n)` existente continua sendo o print exibido; `originalShotName(n)` = `shots/NN-original.png`.

**`lib/import.ts`**: `readImportZip(bytes)` → `{ ok: true; origin; drafts: ImportedAnnotation[] } | { ok: false; error }`.
- Limites contra zip bomb: arquivo ≤ 50 MB; no `unzipSync({ filter })` aceita só `pxa.json` e `shots/*.png`, no máximo 1000 arquivos e 100 MB descompactados somados (pelo tamanho declarado no cabeçalho, checado antes de descompactar).
- Mensagens: sem `pxa.json` → "Este .zip não tem pxa.json. Só exports feitos a partir desta versão do PxA podem ser importados."; versão desconhecida → "pxa.json com versão N desconhecida."; JSON/forma inválidos → "pxa.json inválido."; zip corrompido/grande → "Não consegui ler este .zip." / ".zip grande demais para importar.".
- Prints: `Blob` PNG a partir de `shots/`; Desenho reconstruído com `composite` do arquivo referenciado.

**`store.importAnnotations(list)`** (IMPO-03/06/07): ignora `id` já presente; numera na sequência da aba; guarda `importedFrom = { origin, number original }` (mantém o `importedFrom` que já existir, se o .zip já era de uma importação); marca `dirty`. Devolve quantas entraram.

**Controller `onImport(file)`**: lê, importa, toast "N anotações importadas" (+ " · anotações de `host`" quando `origin ≠ location.origin`, IMPO-04) ou a mensagem de erro; "Nada novo: essas anotações já estão aqui." quando tudo era duplicado.

**Painel**: botão "Importar .zip" no rodapé com `<input type="file" accept=".zip,application/zip">` escondido; item importado mostra `#3 de host`; com `isMissing(id)` (opcional em `PanelActions`) mostra "elemento não encontrado" (IMPO-05). Marcador some sozinho (`resolveAnnotation` já devolve `null`).

**Export**: `buildZip` grava `pxa.json` (manifesto) junto do `feedback.md`.

## Painel — mudanças exatas (coordenação)

- Rodapé: `Apresentar` (desabilitado sem Anotações) e `Importar .zip` antes dos botões atuais.
- Por item: botão `BRUSH` (Desenhar), selo `⚠ N`, `#n de host`, "elemento não encontrado", miniatura quando há Desenho.
- `PanelActions` ganha `onPresent`, `onImport(file)`, `onDraw(id)` e `isMissing?(id)`.

## Testes (TESTING.md: nome começa pelo ID)

| Camada | Arquivo | Cobre |
|---|---|---|
| unit | `error-log.test.ts` | ERRO-02 (FIFO, ×N, corte, sanitização, janela) |
| unit | `error-hooks.test.ts` | ERRO-01 (cada fonte, comportamento original preservado, wrapper sobre wrapper) |
| unit | `probe-client.test.ts` | ERRO-03/06 (resposta, timeout, JSON inválido) |
| unit | `drawing.test.ts` | DESE-02 (grade, linha, seta, círculo, X) |
| unit | `manifest.test.ts`, `import.test.ts` | IMPO-01/02 (ida e volta, erros, limites) |
| unit | `store.test.ts` | IMPO-03/06/07, `update` |
| unit | `markdown.test.ts` | ERRO-05, DESE-03 |
| unit | `exporter.test.ts` | IMPO-01, DESE-03 |
| unit | `note-editor.test.ts`, `panel.test.ts` | ERRO-04, DESE-01/05, IMPO-05, botões novos |
| unit | `presentation.test.ts` | APRE-01..06 |
| unit | `draw-editor.test.ts` | DESE-02/05 (ferramentas, desfazer, Esc, salvar) |
| unit | `controller.test.ts` | APRE-01/06, ERRO-03, IMPO fluxo |
| E2E | `team.spec.ts` | Critérios de Sucesso: export → import em outra aba; `console.error` + fetch 404 no `feedback.md`; apresentação pelo teclado; desenho no export |

## Riscos

- **Promise do `fetch` observada pelo hook:** observar a rejeição marca a promise original como tratada; se a página chamar `fetch()` sem encadear nada, deixa de sair o `unhandledrejection` dela. Aceito (caso raro, o erro de rede já é registrado). Documentado no CONCERNS.
- **Tamanho declarado no zip** pode mentir; o `fflate` aloca pelo tamanho real ao descompactar. Limite de 50 MB do arquivo de entrada segura o pior caso razoável.
- **Firefox:** hooks no main world e `CustomEvent` com JSON em string seguem o padrão já validado do probe, mas a verificação no Firefox fica com o dev (`manual-check.md`).
