# Modo Anotação — Especificação

## Problema

Quando o dev front pede ajuste visual ao Claude, gasta tempo descrevendo qual elemento, em qual página e em qual tamanho de tela o problema aparece, e ainda assim a descrição fica ambígua. Com vários ajustes, isso vira várias idas e voltas. O PxA permite apontar os elementos na própria página, anotar em lote e exportar um pacote com contexto suficiente para o Claude Code resolver tudo de uma vez.

## Objetivos

- [ ] Anotar 5 elementos e exportar em menos de 2 minutos.
- [ ] Cada anotação exportada identifica o elemento sem ambiguidade (seletor único na página e, quando houver, nome do componente React/Vue).
- [ ] Cada anotação exportada informa a categoria de tela (mobile/tablet/desktop) e a largura em px em que foi feita.
- [ ] O mesmo código gera extensão funcional no Chrome e no Firefox.

## Fora do Escopo

| Item | Motivo |
|---|---|
| Persistir anotações após reload/navegação completa | Decisão do dev: MVP só na sessão (adiado para M2) |
| Ponte MCP com o Claude Code | M2 |
| Anotar dentro de iframes | Complexidade de injeção cross-frame |
| Anotar dentro de Shadow DOM da página | Seletores não atravessam shadow roots de forma padrão |
| Configurar breakpoints customizados | Tailwind default atende o MVP |
| Marcar anotação como resolvida, sons, pet | Considerações futuras |
| Print de página inteira (full page) | Só o recorte do elemento é necessário |
| Publicar nas lojas | Após MVP validado em modo dev |
| Atalho de teclado para alternar o modo | Não pedido pelo dev; sugestão registrada no M2 (ROADMAP) |

---

## Glossário

> Termos canônicos consolidados em `.specs/codebase/CONVENTIONS.md`, seção "Glossário".

| Termo | Definição canônica | Fonte |
|---|---|---|
| Anotação | Registro de feedback ligado a um elemento: nota + contexto capturado + print | CONVENTIONS.md |
| Marcador | Ícone pixel art numerado fixado na página sobre o elemento anotado | CONVENTIONS.md |
| Modo Anotação | Estado da aba em que hover destaca e clique cria anotação | CONVENTIONS.md |
| Painel | Lista lateral (estilo quest log) das anotações da aba | CONVENTIONS.md |
| Breakpoint | Faixa Tailwind da largura do viewport: `base` (<640), `sm` (≥640), `md` (≥768), `lg` (≥1024), `xl` (≥1280), `2xl` (≥1536) | decisão desta spec |
| Categoria de tela | `mobile` (<768px), `tablet` (768–1023px), `desktop` (≥1024px) | decisão desta spec |
| Export | Pacote `.zip` com `feedback.md` + `shots/` | CONVENTIONS.md |
| Pin, comentário, nota de feedback | NÃO usar — usar `Anotação` (o objeto) ou `nota` (o texto) | decisão desta spec |

---

## User Stories

### P1: Ativar o Modo Anotação e anotar elementos ⭐ MVP

**User Story**: Como dev front, quero clicar em elementos da página e escrever uma nota em cada um, para registrar vários ajustes visuais sem sair da página.

**Por que P1**: É o núcleo da extensão.

**Critérios de Aceite**:

1. QUANDO o dev clica no ícone do PxA numa aba com o modo inativo ENTÃO o sistema DEVE ativar o Modo Anotação nessa aba e exibir o painel. (ANOT-01)
2. QUANDO o dev clica no ícone com o modo ativo ENTÃO o sistema DEVE desativar o modo, ocultar overlay e marcadores, e manter as anotações da sessão para quando for reativado. (ANOT-02)
3. QUANDO o modo está ativo e o cursor passa sobre um elemento ENTÃO o sistema DEVE destacá-lo com contorno e mostrar um rótulo com tag e dimensões (ex: `button 120×40`). (ANOT-03)
4. QUANDO o dev clica num elemento destacado ENTÃO o sistema DEVE interceptar o gesto na fase de captura em `window` (pointerdown, mousedown, click), de modo que nenhum handler da página nem ação padrão (link, botão, submit, dropdown) seja disparado, e abrir um campo de nota junto ao elemento. (ANOT-04)
5. QUANDO o dev confirma a nota (Enter ou botão salvar) ENTÃO o sistema DEVE criar a anotação, fixar um marcador numerado sequencialmente sobre o elemento e adicioná-la ao painel. (ANOT-05)
6. QUANDO o dev cancela (Esc) ou tenta salvar nota vazia ENTÃO o sistema DEVE não criar anotação. (ANOT-06)
7. QUANDO o cursor passa sobre a UI do próprio PxA ENTÃO o sistema DEVE não destacá-la nem permitir anotá-la. (ANOT-07)
8. QUANDO a página rola ou redimensiona ENTÃO os marcadores DEVEM acompanhar a posição atual dos elementos. (ANOT-08)

**Regra de resolução do elemento** (vale para ANOT-08, PAIN-02, PAIN-06 e casos limite): a anotação guarda uma referência fraca ao nó original. Para exibir o marcador ou rolar até o elemento, o sistema usa o nó original se ainda estiver conectado ao DOM; senão, se o `pathname` atual é igual ao da anotação, busca de novo pelo seletor salvo e usa o resultado somente se houver **exatamente 1** correspondência. Em qualquer outro caso o elemento é considerado **não encontrado**: o marcador fica oculto e a anotação permanece no painel e no export.

**Teste Independente**: E2E — abrir página fixture, ativar o modo, anotar 2 elementos, verificar 2 marcadores (1 e 2) e 2 itens no painel.

---

### P1: Capturar o contexto de cada anotação ⭐ MVP

**User Story**: Como dev front, quero que cada anotação guarde automaticamente onde, em qual tela e com qual aparência o elemento estava, para o Claude Code não precisar me perguntar.

**Por que P1**: Sem contexto, o export não resolve o problema da ambiguidade.

**Critérios de Aceite**:

1. QUANDO uma anotação é criada ENTÃO o sistema DEVE guardar a URL completa e o caminho (pathname + search + hash). (CAPT-01)
2. QUANDO uma anotação é criada ENTÃO o sistema DEVE gerar um seletor CSS que, aplicado com `document.querySelectorAll` no momento da captura, retorne exatamente esse elemento. (CAPT-02)
3. QUANDO uma anotação é criada ENTÃO o sistema DEVE guardar largura e altura do viewport em px (`window.innerWidth`/`innerHeight`, a mesma medida das media queries), o breakpoint Tailwind e a categoria de tela (conforme Glossário), o `devicePixelRatio` e a orientação (retrato/paisagem). (CAPT-03)
4. QUANDO uma anotação é criada ENTÃO o sistema DEVE guardar o retângulo do elemento (x, y, largura, altura) e a posição de scroll da página. (CAPT-04)
5. QUANDO uma anotação é criada ENTÃO o sistema DEVE guardar o HTML externo do elemento truncado em 2.000 caracteres, indicando quando houve truncamento. (CAPT-05)
6. QUANDO uma anotação é criada ENTÃO o sistema DEVE guardar o CSS computado das propriedades de layout, box model, tipografia e cor (lista fixa definida no design), omitindo valores iguais ao padrão do navegador para aquela tag. (CAPT-06)
7. QUANDO o dev confirma a nota ENTÃO o sistema DEVE ocultar toda a UI do PxA (campo de nota, destaque de hover, marcadores, painel), capturar a aba e guardar um print PNG do recorte do elemento com margem de 16px CSS ao redor e contorno desenhado sobre o elemento, escalado pelo `devicePixelRatio`. Contexto e print são capturados no momento da confirmação. (CAPT-07)
8. QUANDO o elemento está parcialmente fora do viewport ENTÃO o sistema DEVE rolar a página até o elemento antes do print; se ainda for maior que o viewport, DEVE recortar a parte visível e registrar `print parcial` na anotação. (CAPT-08)
9. QUANDO a página usa React ENTÃO o sistema DEVE guardar o nome do componente mais próximo que contém o elemento e a cadeia de até 5 componentes ancestrais. (COMP-01)
10. QUANDO a página usa Vue 2 ou Vue 3 ENTÃO o sistema DEVE guardar o nome do componente mais próximo e a cadeia de até 5 ancestrais. (COMP-02)
11. QUANDO o framework expõe o arquivo de origem do componente (ex: builds de desenvolvimento) ENTÃO o sistema DEVE guardar o caminho do arquivo e, se houver, a linha. (COMP-03)
12. QUANDO a página não usa React/Vue, ou a detecção falha ou demora mais de 300ms ENTÃO o sistema DEVE criar a anotação sem dados de componente, sem erro visível. (COMP-04)

**Teste Independente**: Unit (seletor, breakpoint, filtro de CSS) + E2E em fixtures HTML puro, React e Vue verificando os campos capturados.

---

### P1: Gerenciar anotações no painel ⭐ MVP

**User Story**: Como dev front, quero ver, editar e apagar as anotações da aba, para revisar o lote antes de exportar.

**Por que P1**: Sem revisão o lote sai com erros.

**Critérios de Aceite**:

1. QUANDO o Modo Anotação está ativo ENTÃO o painel DEVE estar visível (não fecha separadamente; desativar o modo o oculta) e listar as anotações em ordem de criação com número, ícone da categoria de tela, largura em px, caminho e início da nota. (PAIN-01)
2. QUANDO o dev clica num item do painel ENTÃO o sistema DEVE rolar até o elemento e destacá-lo; se o elemento for considerado não encontrado (Regra de resolução do elemento), DEVE informar "elemento não encontrado nesta tela". (PAIN-02)
3. QUANDO o dev edita a nota de um item e confirma ENTÃO o sistema DEVE atualizar a nota sem recapturar o contexto. (PAIN-03)
4. QUANDO o dev exclui um item ENTÃO o sistema DEVE removê-lo e remover o marcador; a numeração das anotações restantes NÃO muda. (PAIN-04)
5. QUANDO não há anotações ENTÃO o painel DEVE mostrar estado vazio com instrução de uso e botões de export desabilitados. (PAIN-05)
6. QUANDO o dev navega para outra rota numa SPA (sem reload) ENTÃO o sistema DEVE manter todas as anotações no painel e exibir marcadores apenas das anotações cujo `pathname` é igual ao atual (query string e hash são ignorados nessa comparação). (PAIN-06)

**Teste Independente**: E2E — criar 3 anotações, editar a 2ª, excluir a 1ª, verificar painel com #2 e #3 e nota atualizada.

---

### P1: Exportar o lote ⭐ MVP

**User Story**: Como dev front, quero exportar as anotações num formato que o Claude Code leia, para pedir que ele resolva tudo de uma vez.

**Por que P1**: É a entrega de valor ao Claude.

**Critérios de Aceite**:

1. QUANDO o dev clica em "Exportar .zip" ENTÃO o sistema DEVE baixar `pxa-feedback-YYYY-MM-DD-HHmm.zip` contendo `feedback.md` e `shots/NN.png` (NN = número da anotação com 2 dígitos). (EXPO-01)
2. QUANDO o `feedback.md` é gerado ENTÃO DEVE conter um cabeçalho (origem, data/hora, total de anotações, instrução curta para o Claude) e uma seção por anotação com: número, categoria de tela + largura px + breakpoint, caminho, componente/arquivo (se houver), seletor, nota, CSS relevante, HTML em bloco de código e link relativo para o print. (EXPO-02)
3. QUANDO o dev clica em "Copiar markdown" ENTÃO o sistema DEVE copiar o mesmo `feedback.md` para a área de transferência, trocando cada link de imagem por `(print disponível no .zip)`, e mostrar confirmação. (EXPO-03)
4. QUANDO o export é gerado ENTÃO as anotações DEVEM permanecer na sessão (exportar não apaga). (EXPO-04)
5. QUANDO o dev clica em "Limpar tudo" e confirma ENTÃO o sistema DEVE apagar todas as anotações e marcadores da aba. (EXPO-05)

**Teste Independente**: Unit no gerador de markdown (snapshot) + E2E abrindo o zip baixado e validando arquivos.

---

### P1: Funcionar em Chrome e Firefox ⭐ MVP

**User Story**: Como dev front, quero usar o PxA no Chrome e no Firefox.

**Por que P1**: Requisito do projeto desde o início.

**Critérios de Aceite**:

1. QUANDO o build é executado para cada navegador ENTÃO o sistema DEVE gerar uma extensão MV3 carregável em modo dev no Chrome (≥ 95) e no Firefox (≥ 128, com `browser_specific_settings.gecko.id`), declarando **apenas** as permissões `activeTab` e `scripting`. O download do `.zip` usa `<a download>` com blob no content script e o clipboard usa `navigator.clipboard` a partir do clique do dev, ambos sem permissão extra. (PLAT-01)
2. QUANDO o dev aciona o ícone numa página onde a injeção falha (ex: `chrome://`, `about:`, lojas de extensão, visualizador de PDF) ENTÃO o sistema DEVE exibir o badge `!` no ícone e trocar o título do ícone, nessa aba, para "PxA não pode anotar esta página", sem usar a permissão `notifications`. (PLAT-02)

**Teste Independente**: Carregar o build em cada navegador e executar o fluxo anotar → exportar manualmente; E2E automatizado no Chromium.

---

### P2: Marcadores por categoria de tela

**User Story**: Como dev front, quero distinguir visualmente em qual tela cada anotação foi feita, para revisar o lote responsivo.

**Por que P2**: Melhora a revisão, mas o export já traz a informação.

**Critérios de Aceite**:

1. QUANDO um marcador é exibido ENTÃO DEVE ter cor por categoria: mobile verde, tablet amarelo, desktop azul. (MARC-01)
2. QUANDO a categoria de tela atual difere da categoria da anotação ENTÃO o marcador DEVE ficar com 35% de opacidade. (MARC-02)

---

### P2: Aviso antes de perder anotações

**User Story**: Como dev front, quero ser avisado antes de recarregar/fechar a aba com anotações não exportadas, já que elas vivem só na sessão.

**Por que P2**: Mitiga o risco aceito de persistência só em sessão.

**Critérios de Aceite**:

1. QUANDO existem anotações criadas ou editadas após o último export `.zip` ("Copiar markdown" não conta, pois não leva os prints) e a página vai ser descarregada ENTÃO o sistema DEVE disparar o aviso nativo de saída do navegador. (AVIS-01)

---

## Casos Limite

- QUANDO o elemento anotado é removido do DOM depois ENTÃO o marcador DEVE sumir e a anotação DEVE continuar no painel e no export com os dados capturados.
- QUANDO a página recarrega ENTÃO as anotações da sessão SÃO perdidas (comportamento aceito; ver AVIS-01).
- QUANDO prints são pedidos em sequência rápida ENTÃO o sistema DEVE enfileirar as capturas respeitando o limite de chamadas do navegador, sem perder nenhuma.
- QUANDO o elemento tem `id` duplicado ou classes geradas (CSS-in-JS/hash) ENTÃO o seletor DEVE ainda ser único (CAPT-02), usando posição estrutural se necessário.
- QUANDO a nota contém markdown ou crases ENTÃO o `feedback.md` DEVE continuar válido (nota escapada ou em bloco).
- QUANDO o CSS da página tenta estilizar elementos genéricos (`* {}`, `div {}`) ENTÃO a UI do PxA NÃO DEVE ser afetada (Shadow DOM).
- QUANDO a página define `z-index` muito alto ENTÃO overlay, marcadores e painel DEVEM ficar acima do conteúdo da página. Limitação aceita: conteúdo no top layer da página (`<dialog>` modal, `popover`) pode cobrir a UI do PxA.
- QUANDO há 0 anotações ENTÃO os botões de export ficam desabilitados (PAIN-05).
- QUANDO a escrita no clipboard é negada ou a API não existe (página `http://` que não é localhost) ENTÃO o sistema DEVE mostrar erro e sugerir o `.zip`.
- QUANDO o dev aciona o ícone numa aba onde o PxA já foi injetado ENTÃO o sistema NÃO DEVE injetar de novo; apenas alterna o modo (ANOT-01/02).

---

## Rastreabilidade de Requisitos

| ID Requisito | Story | Fase | Status |
|---|---|---|---|
| ANOT-01..08 | P1: Ativar e anotar | Execute | Verified (unit + E2E Chromium) |
| CAPT-01..08 | P1: Capturar contexto | Execute | Verified (unit + E2E Chromium) |
| COMP-01..04 | P1: Capturar contexto (componente) | Execute | Verified (unit; E2E React 19 e Vue 3). COMP-03 no React ≤ 18 só em unit |
| PAIN-01..06 | P1: Painel | Execute | Verified (unit + E2E Chromium) |
| EXPO-01..05 | P1: Exportar | Execute | Verified (unit + E2E Chromium) |
| PLAT-01 | P1: Chrome e Firefox | Execute | Implemented — manifests checados por `npm run check:manifest`; carregar no Firefox: verificação manual pendente (`manual-check.md`) |
| PLAT-02 | P1: Chrome e Firefox | Execute | Verified (E2E Chromium) |
| MARC-01..02 | P2: Marcadores por categoria | Execute | Verified (unit + E2E Chromium) |
| AVIS-01 | P2: Aviso antes de perder | Execute | Verified no Chromium (E2E); Firefox: verificação manual pendente |

**Cobertura:** 36 total, 36 mapeados em tasks, 0 sem mapeamento. 34 Verified, 2 com verificação manual no Firefox pendente (PLAT-01, AVIS-01).

---

## Critérios de Sucesso

- [ ] Todos os critérios P1 com teste passando (unit ou E2E) ou verificação manual registrada (Firefox).
- [ ] Fluxo completo validado: anotar 5 elementos numa app React real em 390px e 1440px → exportar → Claude Code lê `feedback.md` + prints e localiza os componentes certos.
- [ ] Builds Chrome e Firefox carregam sem erros nem avisos de permissão além dos listados em PLAT-01.

---

## Notas Técnicas

- **Injeção:** sob demanda via `action` + `scripting.executeScript` com `activeTab`; sem `content_scripts` estáticos com `<all_urls>`.
- **Componente:** precisa de script no main world (o isolated world não enxerga propriedades expando como `__reactFiber$*`). Script com `world: "MAIN"`. Arquivo de origem: React ≤ 18 em dev expõe `_debugSource`, o React 19 removeu (COMP-03 fica vazio); Vue expõe `__file` em dev. Confirmar no Design.
- **Verificar no Design (riscos de plataforma):** (1) o Firefox aceita `tabs.captureVisibleTab` só com `activeTab`? Versões antigas exigiam `<all_urls>`; se exigir, PLAT-01 volta para o dev decidir. (2) `beforeunload` registrado no content script dispara o aviso no Firefox? Se não, registrar no script do main world.
- **UI isolada:** host do Shadow DOM com `all: initial` para bloquear fonte/cor herdadas da página.
- **Print:** `tabs.captureVisibleTab` só no background; recorte e contorno via canvas/OffscreenCanvas no content. Esconder UI do PxA durante a captura.
- **Clipboard:** `navigator.clipboard.writeText` a partir de gesto do usuário no content.
- **Scopes afetados:** `content`, `background`, `capture`, `export`, `ui`, `build`.

---

## Self-Review

- [x] Placeholder scan — sem TBD/TODO/seções vazias
- [x] Consistência interna — sem contradições entre seções
- [x] Scope check — focada em um plano único
- [x] Ambiguity check — todos os requisitos têm uma única interpretação
- [x] YAGNI — só features solicitadas pelo dev

**Reviewer:** `spec-document-reviewer` subagent (Large) — 4 issues + recomendações aplicadas inline em 2026-11-13
**Status:** Approved — aprovada em 2026-11-13 (decisão do Sentinel com o dev ausente). ATAL-01 removido: não foi pedido pelo dev; movido para sugestão do M2.
**Data:** 2026-11-13
