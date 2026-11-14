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

- 2026-11-14 — Diversão: permissão `storage` aprovada pelo dev só para o Perfil (Q-01); anotações continuam só na sessão. `check:manifest` exige `activeTab` + `scripting` + `storage`.
- 2026-11-14 — Diversão (agente do andar, sem decisão do dev): fanfarra só no `.zip`, copiar markdown faz festa sem som (D14).
- 2026-11-14 — Diversão: botão primário do tema Padrão passou de texto branco para tinta escura sobre o rosa (3,36:1 → 5,39:1) para cumprir TEMA-05.
- 2026-11-14 — **Diversão, Revisão 1 (dev, após testar):** o 1º mascote "dava medo" → alfinete fofo sem boca (opção C de 3), com cores por tema (MASC-07); XP, nível e conquistas removidos; só os temas Padrão e Noite; ícone de som em pixel art no lugar do emoji; Konami mantido só como dança + jingle (dev escolheu). O som foi aprovado como estava.
- 2026-11-14 — **Diversão, Revisão 2 (dev):** mascote com a mesma cor nos dois temas (MASC-07 removido) e mais magro/menos fofo: cabeça de 10 px, sem bochecha, rosa da marca.

## Blockers

(nenhum)

## Lições

- 2026-11-13 — **Painel cobria a página no mobile.** Sintoma: E2E em 390px estourava o tempo no clique. Causa raiz (medida com `elementFromPoint`): painel de 320px a 12px da direita começa em x=58 e cobre o conteúdo. Correção: painel recolhível e recolhido por padrão abaixo de 768px. Prevenção: E2E de captura roda em 390px e verifica o painel recolhido.
- 2026-11-13 — **Listeners em `window` vazam entre testes.** Controllers ativos de um teste interceptavam cliques do seguinte (`stopImmediatePropagation` na captura). Teardown desativa todo controller criado.
- 2026-11-13 — **WXT 0.21:** Firefox sai em MV2 sem `manifestVersion: 3`; `matches` de content script `runtime` vira `host_permissions`; `--mode e2e` gera `.output/chrome-mv3-e2e`; `fakeBrowser` em `wxt/testing/fake-browser`. Chrome sem polyfill: listener de `onMessage` responde com `sendResponse` + `return true`.

- 2026-11-14 — **Contador do painel sumia com o mascote no cabeçalho.** Sintoma: com Nv + 🏆 no cabeçalho, o título virava "PxA · Anota…" e o `(3)` sumia; os testes passavam porque checam `textContent`. Causa: título com `ellipsis` disputando 300px com 5 itens fixos. Correção: título quebra linha (2 linhas cabem na altura do mascote) e gaps menores. Prevenção: conferir o cabeçalho num print de 320px sempre que entrar item novo nele.
- 2026-11-14 — **Mascote em cabeçalho escuro:** o contorno escuro some no fundo do cabeçalho, então olho colado na borda vira listra e o "z" de 3×3 parece um `I`. Olhos ficam a 2 px do contorno e o "z" é 4×4 com diagonal. Prevenção: conferir a arte num print sobre a cor do cabeçalho, não só em fundo claro.
- 2026-11-14 — **Interceptor engole `pointerdown` da página** (`stopImmediatePropagation` na captura em `window`). Listener novo em `window` que precise ver gestos na página tem de ser registrado antes do `installInterceptor` (ordem do array de teardown no controller).
- 2026-11-14 — **Anotar em página servida por `context.route` falha** ("Falha ao anotar") já no commit base; descoberto ao testar CSP. Não investigado (fora do escopo); o E2E da Diversão usa essas páginas só para o que não depende da captura.

## Ideias adiadas

- Ponte MCP com Claude Code (M2)
- Persistência por origem (M2)
- Pet do console, raio-X responsivo, marcar como resolvida

## Preferences

(nenhuma)
