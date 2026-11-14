# State

## Decisões

- 2026-11-13 — Nome: PixelAnnotator, apelido PxA (pasta `.pxa/`, prefixos curtos).
- 2026-11-13 — Funciona em qualquer site; injeção sob demanda via `activeTab` (sem host permission ampla).
- 2026-11-13 — Anotações só na sessão da aba no MVP (dev escolheu; risco: reload/HMR full-reload apaga tudo).
- 2026-11-13 — Detecção de componente React/Vue entra no MVP.
- 2026-11-13 — Export: `.zip` (feedback.md + shots/) + botão "copiar markdown".
- 2026-11-13 — Spec do Modo Anotação aprovada (Sentinel, dev ausente). ATAL-01 (atalho `Alt+Shift+A`) cortado: não foi pedido pelo dev → sugestão no M2. Persistência continua só na sessão.
- 2026-11-13 — Design aprovado (Sentinel). `beforeunload` no content script; plano B (main world via `pxa:dirty`) documentado; teste manual no Firefox fica com o dev no final.
- 2026-11-13 — Execute: painel recolhível (abre recolhido < 768px) para não cobrir a página no mobile; fonte pixel = `monospace` (default do design, sem fonte embutida).
- 2026-11-13 — Execução sem esperar teste do dev: o agente roda as suítes; o dev testa só no final (Sentinel).
- 2026-11-13 — Regras de execução (Sentinel): seguir o nano-spec fase a fase, 1 commit por fase, nunca push/merge/PR.
- 2026-11-14 — Equipe e Claude: os erros são pedidos ao probe **no clique de anotar** (não no Enter), porque o editor precisa mostrá-los para o dev remover (ERRO-04). A janela de 60s conta desse clique.
- 2026-11-14 — Equipe e Claude: "recolher o Painel" na Apresentação (APRE-01) foi lido como **tirar da frente**: a classe `pxa-presenting` esconde o Painel por CSS e ele volta exatamente como estava (APRE-06). A barra recolhida ficaria embaixo do cartão.
- 2026-11-14 — Equipe e Claude: **dúvida registrada** — o Painel do M1 não tem miniatura, mas DESE-04 pede "a miniatura no Painel". Leitura conservadora diante da regra "só ícones novos por item": a miniatura aparece só em itens com Desenho.
- 2026-11-14 — Equipe e Claude: o Desenho é guardado como vetores (`strokes`, camada separada) + PNG composto em cache; bloco de 2px **CSS** (`2 × DPR` em pixels do print) para o traço não sumir em print retina. Ícone novo de rabisco, porque o lápis já é "Editar nota".
- 2026-11-14 — Equipe e Claude: anotação importada mantém o `id` original (é a chave do dedupe, IMPO-06) e os `createdAt/updatedAt` originais; reimportar algo que já era importado mantém a origem primeira. Toast de origem diferente fica 5s.
- 2026-11-14 — Equipe e Claude: limites do Importar: 50 MB no arquivo, 100 MB descompactados (tamanho declarado no zip), 1000 arquivos, só `pxa.json` e `shots/*.png` descompactados.

## Blockers

(nenhum)

## Lições

- 2026-11-13 — **Painel cobria a página no mobile.** Sintoma: E2E em 390px estourava o tempo no clique. Causa raiz (medida com `elementFromPoint`): painel de 320px a 12px da direita começa em x=58 e cobre o conteúdo. Correção: painel recolhível e recolhido por padrão abaixo de 768px. Prevenção: E2E de captura roda em 390px e verifica o painel recolhido.
- 2026-11-13 — **Listeners em `window` vazam entre testes.** Controllers ativos de um teste interceptavam cliques do seguinte (`stopImmediatePropagation` na captura). Teardown desativa todo controller criado.
- 2026-11-13 — **WXT 0.21:** Firefox sai em MV2 sem `manifestVersion: 3`; `matches` de content script `runtime` vira `host_permissions`; `--mode e2e` gera `.output/chrome-mv3-e2e`; `fakeBrowser` em `wxt/testing/fake-browser`. Chrome sem polyfill: listener de `onMessage` responde com `sendResponse` + `return true`.

- 2026-11-14 — **Editores de teste abertos engolem o teclado.** Sintoma: Ctrl+Z e Esc não faziam nada em testes do editor de Desenho. Causa raiz: editores de testes anteriores continuavam com `keydown` na captura em `window` e `stopImmediatePropagation`. Correção e prevenção: os testes guardam os handles e fecham no `afterEach` (mesma lição dos controllers do M1, agora em TESTING.md).
- 2026-11-14 — **Vite responde 200 para caminho inexistente** (fallback de SPA), inclusive para `.json` e `.js` com `Accept: */*`. Para simular 404 de API no E2E, mandar `Accept: application/json`.
- 2026-11-14 — **Ponto flutuante na elipse do Desenho:** `sin(π/2)` amostrado dava 39,999… e a elipse não encostava na borda. Correção: passos múltiplos de 4 e arredondamento das amostras.

## Ideias adiadas

- Ponte MCP com Claude Code (M2)
- Persistência por origem (M2)
- Pet do console, raio-X responsivo, marcar como resolvida
- Comentários em thread por anotação (depois do Importar, spec Equipe e Claude)
- Miniatura do print em todos os itens do Painel (hoje só com Desenho); helper comum para a linha `#n + ícone + largura` do Painel e da Apresentação — adiados para não mexer em linhas do Painel que outros andares editam
- `unzip` assíncrono (worker do fflate) se imports grandes ficarem comuns; `console.error` com `JSON.stringify` limitado por tamanho

## Preferences

(nenhuma)
