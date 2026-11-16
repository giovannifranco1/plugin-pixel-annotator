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

- 2026-11-14 — Diversão: permissão `storage` aprovada pelo dev só para o Perfil (Q-01); anotações continuam só na sessão. `check:manifest` exige `activeTab` + `scripting` + `storage`.
- 2026-11-14 — Diversão (agente do andar, sem decisão do dev): fanfarra só no `.zip`, copiar markdown faz festa sem som (D14).
- 2026-11-14 — Diversão: botão primário do tema Padrão com texto branco sobre `#e0266b` (4,51:1), variável `--pxa-primary`. A 1ª tentativa (tinta escura sobre o rosa) foi recusada pelo dev; ele escolheu escurecer o rosa do botão.
- 2026-11-14 — **Diversão, Revisão 1 (dev, após testar):** o 1º mascote "dava medo" → alfinete fofo sem boca (opção C de 3), com cores por tema (MASC-07); XP, nível e conquistas removidos; só os temas Padrão e Noite; ícone de som em pixel art no lugar do emoji; Konami mantido só como dança + jingle (dev escolheu). O som foi aprovado como estava.
- 2026-11-14 — **Diversão, Revisão 2 (dev):** mascote com a mesma cor nos dois temas (MASC-07 removido) e mais magro/menos fofo: cabeça de 10 px, sem bochecha, rosa da marca.
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
- 2026-11-14 — **Menu de ações (pedido do dev, feito direto na `develop`):** Detector, Lupa, Apresentar, Importar .zip e Exportar .zip saem da barra Raio-X, do rodapé e do ícone de exportar e vão para um dropdown no ícone ⋮ ao lado do recolher. Rodapé fica só com Limpar tudo e Copiar markdown. Com o menu aberto, clicar na página só fecha o menu. Abre para cima com o painel recolhido. Sem o título "Raio-X" no menu: recuado menos que os itens, ele fazia Apresentar/Importar/Exportar parecerem parte do Raio-X (dev).
- 2026-11-14 — **Ícones de Editar e Desenhar refeitos (dev achou feios):** Editar virou o símbolo clássico de editar, quadrado com lápis por cima, cheio na cor do tema e com borracha rosa (dois lápis diagonais, colorido e cheio, foram recusados: viravam mancha/faca em 12px); Desenhar virou paleta de pintor (`PAINT_PALETTE`), porque lápis e pincel lado a lado ficavam iguais em 12px. Contorno de 1px na diagonal descartado: abre buracos em 12px.
- 2026-11-14 — **PERS-01: anotações salvas no site (pedido do dev: "não posso perder quando der refresh").** Revoga a decisão do M1 de "só na sessão da aba". IndexedDB da origem (prints como Blob, sem permissão nova, sem limite de 10 MB do `storage.local`); o `index.ts` carrega antes de criar o controller (o mascote não comemora as restauradas); `lib/persist.ts` grava só a diferença, em lote. Aviso de saída (AVIS-01) desligado com a persistência ativa; volta se o IndexedDB falhar. Saem com Limpar tudo/excluir; exportar não apaga.
- 2026-11-14 — Check do menu de ações em círculo e rosa (`--pxa-accent`), à direita do item; sem recuo reservado à esquerda (dev).
- 2026-11-14 — **⋮ por anotação (ideia do dev):** Editar, Desenhar no print e Excluir saem dos ícones soltos do item e vão para um dropdown no ⋮ de cada anotação (o mesmo componente do ⋮ do cabeçalho: um menu só, posicionado no botão que abriu, abre para cima sem espaço embaixo). Excluir por último, em rosa. Encerra a discussão do ícone de editar; ícones de lápis, paleta, lixeira e download removidos do código.
- 2026-11-16 — **Changelog (pedido do dev):** item "Changelog" no fim do menu de ações (o dev recusou "Novidades"; feature e branch também se chamam `changelog`), janela `.pxa-window` arrastável, conteúdo de um `CHANGELOG.md` manual em PT-BR embutido no build. Ponto de novidade no ⋮ após atualizar (dev escolheu); instalação nova não mostra o ponto (agente). O ponto é bolinha à esquerda em `--pxa-primary`, para não se confundir com o quadrado de ferramenta ligada.
- 2026-11-16 — Changelog, /simplify: `ProfileStorage.update()` não grava quando a função devolve o mesmo objeto (evita `onChanged` em todas as abas a cada abertura); Detector e Changelog compartilham `.pxa-window`. **Adiado:** generalizar `MenuTool` para itens de ação com "atenção" (tiraria `onChangelog`/`setNews` do Painel) e extrair um `createWindow()` comum às janelas.

## Blockers

(nenhum)

## Lições

- 2026-11-13 — **Painel cobria a página no mobile.** Sintoma: E2E em 390px estourava o tempo no clique. Causa raiz (medida com `elementFromPoint`): painel de 320px a 12px da direita começa em x=58 e cobre o conteúdo. Correção: painel recolhível e recolhido por padrão abaixo de 768px. Prevenção: E2E de captura roda em 390px e verifica o painel recolhido.
- 2026-11-13 — **Listeners em `window` vazam entre testes.** Controllers ativos de um teste interceptavam cliques do seguinte (`stopImmediatePropagation` na captura). Teardown desativa todo controller criado.
- 2026-11-13 — **WXT 0.21:** Firefox sai em MV2 sem `manifestVersion: 3`; `matches` de content script `runtime` vira `host_permissions`; `--mode e2e` gera `.output/chrome-mv3-e2e`; `fakeBrowser` em `wxt/testing/fake-browser`. Chrome sem polyfill: listener de `onMessage` responde com `sendResponse` + `return true`.

- 2026-11-14 — **Contador do painel sumia com o mascote no cabeçalho.** Sintoma: com Nv + 🏆 no cabeçalho, o título virava "PxA · Anota…" e o `(3)` sumia; os testes passavam porque checam `textContent`. Causa: título com `ellipsis` disputando 300px com 5 itens fixos. Correção: título quebra linha (2 linhas cabem na altura do mascote) e gaps menores. Prevenção: conferir o cabeçalho num print de 320px sempre que entrar item novo nele.
- 2026-11-14 — **Ícones pixel com contorno fixo somem no tema escuro.** O `K` era `#1a1226` fixo: no Noite, o ícone de exportar virava uma mancha rosa. Correção: `K` = `currentColor` (segue `--pxa-ink`). Prevenção: ícone novo usa `K` para contorno e é conferido nos dois temas. No cabeçalho do Noite isso ainda não bastou: o dev quer só o ícone, numa cor só, sem caixa (regra `[data-pxa-theme="noite"]` no `styles.ts`).
- 2026-11-14 — **Mascote em cabeçalho escuro:** o contorno escuro some no fundo do cabeçalho, então olho colado na borda vira listra e o "z" de 3×3 parece um `I`. Olhos ficam a 2 px do contorno e o "z" é 4×4 com diagonal. Prevenção: conferir a arte num print sobre a cor do cabeçalho, não só em fundo claro.
- 2026-11-14 — **Interceptor engole `pointerdown` da página** (`stopImmediatePropagation` na captura em `window`). Listener novo em `window` que precise ver gestos na página tem de ser registrado antes do `installInterceptor` (ordem do array de teardown no controller).
- 2026-11-14 — **Anotar em página servida por `context.route` falha** ("Falha ao anotar") já no commit base; descoberto ao testar CSP. Não investigado (fora do escopo); o E2E da Diversão usa essas páginas só para o que não depende da captura.
- 2026-11-14 — **Heurística testada só em fixture engana.** O Detector da rev. 1 passava em todos os testes e era "burro" na prática (214 "cores" `lab()` no site do Tailwind, tokens acusados, fundo da página como "cor perdida"). Prevenção: rodar o Detector em páginas reais (GitHub, Tailwind, Wikipédia, HN) antes e depois de mexer nas regras, e transformar cada falso positivo em teste (`design-audit.test.ts`).
- 2026-11-14 — **Fixture irreal.** Um `sr-only` com `padding: 3px` e `border-box` tem 6×6px de verdade; o `sr-only` real tem `padding: 0`. E o `<button>` sem `font: inherit` cai em Arial no Chromium, não em `system-ui`. Prevenção: copiar o CSS real (Tailwind/Bootstrap) na fixture e conferir no navegador antes de afirmar no teste.
- 2026-11-14 — **Revisor de /simplify com premissa errada.** Um achado mandou tirar o `sync()` do `reset()` do Raio-X dizendo que `loupe.setOn(false)` chama `onOff`, mas só Esc/falha chamam. Conferido no código e mantido. Prevenção: verificar a premissa de cada achado antes de aplicar.
- 2026-11-14 — **Arrastar sem captura de ponteiro abre o editor na página.** Sintoma (E2E): soltar o arraste do relatório fora da janela abria o editor de nota. Causa raiz: o `click` do fim do gesto vai para o ancestral comum (`<html>`), que o interceptor trata como clique de anotação. Correção: `setPointerCapture` na alça (o `click` vai para a UI do PxA). Prevenção: E2E arrasta até o limite da tela e confere que nenhum editor abriu.
- 2026-11-14 — **Teste de arraste antes da varredura terminar mede errado.** O cabeçalho do relatório muda de altura quando o resultado chega; medir antes dá deslocamentos "errados" (68px em vez de 300). Esperar o rodapé "… ms" antes de arrastar.
- 2026-11-14 — **Relatório que não se explica parece bug.** O Detector estava certo (nada fora da escala), mas "8 outros valores" sob Espaçamentos foi lido como problema. Prevenção: toda seção diz explicitamente se está ok; todo Achado diz por que e o que fazer.
- 2026-11-14 — **Heredoc com `$` no Bash é barrado pelo verificador de `rm`.** Edições com `$$`/`${}` em heredoc Python não passam pelo verificador de segurança; usar o Edit nesses casos.
- 2026-11-14 — **Editores de teste abertos engolem o teclado.** Sintoma: Ctrl+Z e Esc não faziam nada em testes do editor de Desenho. Causa raiz: editores de testes anteriores continuavam com `keydown` na captura em `window` e `stopImmediatePropagation`. Correção e prevenção: os testes guardam os handles e fecham no `afterEach` (mesma lição dos controllers do M1, agora em TESTING.md).
- 2026-11-14 — **Importar falhava no Zen/Firefox com "Não consegui ler este .zip."** Causa raiz (console: `Permission denied to access property "constructor"`): no Firefox o `File` do input é objeto da página; os bytes de `arrayBuffer()` e o `Uint8Array` sobre eles pertencem à página (Xray), e o `subarray` do fflate (`slc`) lê `constructor` para criar o resultado → acesso negado. No Chromium (testes) o isolamento é outro e não aparece. Correção: `ownBytes()` em `lib/import.ts` copia os bytes com `set` para um buffer da extensão antes do fflate. Prevenção: teste que simula o `constructor` negado; erro de leitura agora vai para o console com `[PxA]`; regra em CONVENTIONS/CONCERNS: bytes vindos de objetos da página passam por `ownBytes` antes de `subarray`/fflate.
- 2026-11-14 — **Vite responde 200 para caminho inexistente** (fallback de SPA), inclusive para `.json` e `.js` com `Accept: */*`. Para simular 404 de API no E2E, mandar `Accept: application/json`.
- 2026-11-14 — **Ponto flutuante na elipse do Desenho:** `sin(π/2)` amostrado dava 39,999… e a elipse não encostava na borda. Correção: passos múltiplos de 4 e arredondamento das amostras.

## Ideias adiadas

- Ponte MCP com Claude Code (M2)
- Persistência por origem (M2)
- Pet do console, raio-X responsivo, marcar como resolvida
- Raio-X: comparar com tokens do design system (Figma/`tailwind.config`), contraste/WCAG, helper único de clipboard (`copyText`) junto do `exporter.ts`
- Detector: detectar "não herdou a fonte" pelo DOM (família do controle ≠ do pai) em vez da lista de famílias padrão; `computedStyleMap()` só para valores suspeitos (mais rápido, mas muda contagens); fatias da varredura por tempo (`IdleDeadline`); separar agrupamento e escala para alternar a escala sem refazer o relatório; peso de fonte de volta se fizer falta
- Comentários em thread por anotação (depois do Importar, spec Equipe e Claude)
- Miniatura do print em todos os itens do Painel (hoje só com Desenho); helper comum para a linha `#n + ícone + largura` do Painel e da Apresentação — adiados para não mexer em linhas do Painel que outros andares editam
- `unzip` assíncrono (worker do fflate) se imports grandes ficarem comuns; `console.error` com `JSON.stringify` limitado por tamanho

## Preferences

(nenhuma)
