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
- 2026-11-14 — Raio-X: margem `auto` e `%` detectadas pelo Typed OM no Chrome; no Firefox, margens laterais iguais e > 0 contam como `auto` (heurística conservadora para não acusar centralização como espaçamento fora da escala).
- 2026-11-14 — Raio-X: Lupa com hover normal por baixo (o print é congelado, a UI não aparece nele); falha de captura na Lupa → "Print indisponível nesta página".
- 2026-11-14 — **Raio-X rev. 2 (dev: "gostei só do detector e da lupa; o detector tá meio burro"):** X-ray e Grade removidos (código no histórico, `17adb7b`). Detector revisto depois de rodar em GitHub, tailwindcss.com, Wikipédia e Hacker News:
  - cores de qualquer formato CSS (`lab/lch/oklab/oklch/color()`) viram sRGB;
  - "órfã" saiu (virava ruído); "parecido" (cor ΔE76 ≤ 5 com mesmo alfa, ou tamanho de fonte a ≤ 1px) só quando a referência tem 3× os usos e o valor tem até 5 usos; fundo que pinta 10%+ da página nunca é "perdido";
  - escala de 4px aceita os meios passos do Tailwind (1, 2, 6, 10, 14px), folga 0,5px; zeros, `auto`, `%`, `sr-only` (≤ 1×1) e interior de SVG fora;
  - nova marca "fonte padrão do navegador" (família de controle/serif/sans padrão rara numa página com outra família);
  - nota com propriedade e sugestão ("usar 12px ou 14px"); Achados primeiro, resto em `<details>`; clique no valor rola até o elemento; aviso quando menos de 50% dos espaçamentos seguem a escala.
  - Fonte agora é tamanho e família separados; o peso saiu do relatório (sem uso para achar inconsistência).
- 2026-11-14 — **Raio-X rev. 4:** relatório arrastável pelo cabeçalho (setas também), preso à tela, posição mantida ao reabrir (DETE-11); "tudo certo" com o check em círculo do phren (lucide `circle-check`, ISC, inline, `#059669`).
- 2026-11-14 — **Raio-X rev. 3** (dev viu `#7c7760` "parecida com" `#7c775f` e não entendeu se "8 outros valores" em Espaçamentos era problema): ΔE < 1 é a mesma cor (junta como variante, sem Achado); relatório diz "N achados"/"Nenhum achado", "✓ tudo certo", "N valores sem problema", a referência com os usos e "→ usar …".

## Blockers

(nenhum)

## Lições

- 2026-11-13 — **Painel cobria a página no mobile.** Sintoma: E2E em 390px estourava o tempo no clique. Causa raiz (medida com `elementFromPoint`): painel de 320px a 12px da direita começa em x=58 e cobre o conteúdo. Correção: painel recolhível e recolhido por padrão abaixo de 768px. Prevenção: E2E de captura roda em 390px e verifica o painel recolhido.
- 2026-11-13 — **Listeners em `window` vazam entre testes.** Controllers ativos de um teste interceptavam cliques do seguinte (`stopImmediatePropagation` na captura). Teardown desativa todo controller criado.
- 2026-11-13 — **WXT 0.21:** Firefox sai em MV2 sem `manifestVersion: 3`; `matches` de content script `runtime` vira `host_permissions`; `--mode e2e` gera `.output/chrome-mv3-e2e`; `fakeBrowser` em `wxt/testing/fake-browser`. Chrome sem polyfill: listener de `onMessage` responde com `sendResponse` + `return true`.

- 2026-11-14 — **Heurística testada só em fixture engana.** O Detector da rev. 1 passava em todos os testes e era "burro" na prática (214 "cores" `lab()` no site do Tailwind, tokens acusados, fundo da página como "cor perdida"). Prevenção: rodar o Detector em páginas reais (GitHub, Tailwind, Wikipédia, HN) antes e depois de mexer nas regras, e transformar cada falso positivo em teste (`design-audit.test.ts`).
- 2026-11-14 — **Fixture irreal.** Um `sr-only` com `padding: 3px` e `border-box` tem 6×6px de verdade; o `sr-only` real tem `padding: 0`. E o `<button>` sem `font: inherit` cai em Arial no Chromium, não em `system-ui`. Prevenção: copiar o CSS real (Tailwind/Bootstrap) na fixture e conferir no navegador antes de afirmar no teste.
- 2026-11-14 — **Revisor de /simplify com premissa errada.** Um achado mandou tirar o `sync()` do `reset()` do Raio-X dizendo que `loupe.setOn(false)` chama `onOff`, mas só Esc/falha chamam. Conferido no código e mantido. Prevenção: verificar a premissa de cada achado antes de aplicar.
- 2026-11-14 — **Arrastar sem captura de ponteiro abre o editor na página.** Sintoma (E2E): soltar o arraste do relatório fora da janela abria o editor de nota. Causa raiz: o `click` do fim do gesto vai para o ancestral comum (`<html>`), que o interceptor trata como clique de anotação. Correção: `setPointerCapture` na alça (o `click` vai para a UI do PxA). Prevenção: E2E arrasta até o limite da tela e confere que nenhum editor abriu.
- 2026-11-14 — **Teste de arraste antes da varredura terminar mede errado.** O cabeçalho do relatório muda de altura quando o resultado chega; medir antes dá deslocamentos "errados" (68px em vez de 300). Esperar o rodapé "… ms" antes de arrastar.
- 2026-11-14 — **Relatório que não se explica parece bug.** O Detector estava certo (nada fora da escala), mas "8 outros valores" sob Espaçamentos foi lido como problema. Prevenção: toda seção diz explicitamente se está ok; todo Achado diz por que e o que fazer.
- 2026-11-14 — **Heredoc com `$` no Bash é barrado pelo verificador de `rm`.** Edições com `$$`/`${}` em heredoc Python não passam pelo verificador de segurança; usar o Edit nesses casos.

## Ideias adiadas

- Ponte MCP com Claude Code (M2)
- Persistência por origem (M2)
- Pet do console, raio-X responsivo, marcar como resolvida
- Raio-X: comparar com tokens do design system (Figma/`tailwind.config`), contraste/WCAG, helper único de clipboard (`copyText`) junto do `exporter.ts`
- Detector: detectar "não herdou a fonte" pelo DOM (família do controle ≠ do pai) em vez da lista de famílias padrão; `computedStyleMap()` só para valores suspeitos (mais rápido, mas muda contagens); fatias da varredura por tempo (`IdleDeadline`); separar agrupamento e escala para alternar a escala sem refazer o relatório; peso de fonte de volta se fizer falta

## Preferences

(nenhuma)
