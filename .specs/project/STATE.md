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

- 2026-11-14 — Raio-X (andar próprio, em paralelo com Diversão e Equipe e Claude): spec aprovada pelo dev; design/tasks seguiram sem parar para aprovação, por instrução do dev.
- 2026-11-14 — Raio-X: relatório do Detector numa janela própria (`.pxa-audit`, à esquerda); o Painel ganha só a barra. "Usado N×" = elementos distintos. Cor/fonte do texto só contam em elemento com texto próprio; cor de borda só com borda > 0.
- 2026-11-14 — Raio-X: cores "parecidas" = ΔE76 ≤ 5 em Lab, agrupadas pela semente mais usada, só entre cores com o mesmo alfa. Um Achado por valor (linha), com a nota juntando os motivos.
- 2026-11-14 — Raio-X: margem `auto` detectada pelo Typed OM no Chrome; no Firefox, margens laterais iguais e > 0 contam como `auto` (heurística conservadora para não acusar centralização como espaçamento fora da escala).
- 2026-11-14 — Raio-X: X-ray ignora `position: fixed`, usa o `offsetParent` para `absolute` e não pinta o pai que só transborda por causa de um filho vermelho. Nota do caso "conteúdo maior que a caixa": `[Raio-X] conteúdo vaza de <seletor> em Npx` (a spec só define o texto de "vaza do pai").
- 2026-11-14 — Raio-X: Grade cicla desligada → 8px → 4px; Lupa com hover normal por baixo (o print é congelado, a UI não aparece nele); falha de captura na Lupa → "Print indisponível nesta página".

## Blockers

(nenhum)

## Lições

- 2026-11-13 — **Painel cobria a página no mobile.** Sintoma: E2E em 390px estourava o tempo no clique. Causa raiz (medida com `elementFromPoint`): painel de 320px a 12px da direita começa em x=58 e cobre o conteúdo. Correção: painel recolhível e recolhido por padrão abaixo de 768px. Prevenção: E2E de captura roda em 390px e verifica o painel recolhido.
- 2026-11-13 — **Listeners em `window` vazam entre testes.** Controllers ativos de um teste interceptavam cliques do seguinte (`stopImmediatePropagation` na captura). Teardown desativa todo controller criado.
- 2026-11-13 — **WXT 0.21:** Firefox sai em MV2 sem `manifestVersion: 3`; `matches` de content script `runtime` vira `host_permissions`; `--mode e2e` gera `.output/chrome-mv3-e2e`; `fakeBrowser` em `wxt/testing/fake-browser`. Chrome sem polyfill: listener de `onMessage` responde com `sendResponse` + `return true`.

- 2026-11-14 — **Overflow vazio no happy-dom.** Sintoma: X-ray não marcava nenhum vazamento no unit. Causa raiz: o happy-dom devolve `overflowX` vazio e `clips(v)` era `v !== 'visible'`. Correção: `clips` só aceita `hidden|clip|auto|scroll` (também mais correto para valores desconhecidos). Prevenção: teste `clips('')`.
- 2026-11-14 — **Pai vermelho em dobro.** O filho que vaza também faz o pai ter `scrollWidth > clientWidth`. Correção: o pai de um vazamento "fora do pai" não é marcado pela regra de conteúdo. Teste XRAY-02 dedicado.

## Ideias adiadas

- Ponte MCP com Claude Code (M2)
- Persistência por origem (M2)
- Pet do console, raio-X responsivo, marcar como resolvida
- Raio-X: comparar com tokens do design system (Figma/`tailwind.config`), contraste/WCAG, X-ray com throttle ou `IntersectionObserver` em páginas enormes, helper único de clipboard (`copyText`) junto do `exporter.ts`

## Preferences

(nenhuma)
