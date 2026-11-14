# Equipe e Claude — Especificação

> **Status:** Rascunho, aguardando aprovação do dev. Próximas fases neste andar: Design → Tasks → Execute.
> **Branch:** `feature/content-equipe-claude` (andar "Equipe e Claude" no Maestri), a partir de `develop` em `91e6134`.

## Problema

O PxA hoje é de uma pessoa para o Claude Code. Em equipe faltam peças: apresentar as anotações numa call de revisão, mostrar com um rabisco o que o texto não explica, passar a sessão para um colega continuar e, para o Claude, saber se havia erro no console quando o problema apareceu.

## Objetivos

- [ ] Revisar 10 anotações numa call sem sair da página, navegando só pelo teclado.
- [ ] Um colega abre o `.zip` de outro dev e vê os mesmos marcadores na própria página.
- [ ] Cada anotação pode levar desenho por cima do print e os erros de console/rede do momento.
- [ ] Nenhuma permissão nova, nenhum servidor: tudo continua local.

## Fora do Escopo

| Item | Motivo |
|---|---|
| Colaboração em tempo real (dois devs na mesma sessão) | Exige servidor |
| Comentários/respostas em thread por anotação | Fica para depois do import (evolução) |
| Gravar passos/rotas até a anotação ("como cheguei aqui") | Descartado pelo dev (ideia 13) |
| Ditar nota por voz | Descartado pelo dev (ideia 15) |
| Capturar erros que aconteceram **antes** de ligar o modo | O probe só é injetado ao clicar no ícone (`activeTab`) |
| Corpo de requisições/respostas e headers | Privacidade e tamanho; só método, URL e status |

---

## Glossário

| Termo | Definição canônica |
|---|---|
| Modo Apresentação | Navegação em sequência pelas Anotações, uma por vez, com destaque e nota em destaque |
| Desenho | Traços pixel feitos por cima do print de uma Anotação (pincel, seta, círculo, X) |
| Sessão importada | Anotações carregadas de um `.zip` exportado por outro PxA |
| Manifesto do export | `pxa.json` dentro do `.zip`: dados das Anotações legíveis por máquina, com versão de esquema |
| Registro de erros | Lista de erros de console e falhas de rede capturados pelo probe desde a ativação |

---

## User Stories

### P1: Modo Apresentação ⭐

**User Story**: Como dev, quero passar pelas anotações uma a uma, como slides, para revisar com o time ou com o cliente numa call.

**Critérios de Aceite**:

1. QUANDO o dev clica em "Apresentar" no Painel (habilitado com ≥1 Anotação) ENTÃO o sistema DEVE entrar no Modo Apresentação na primeira Anotação da rota atual, recolher o Painel e desligar hover/clique de anotar. (APRE-01)
2. Em cada passo o sistema DEVE rolar suavemente até o elemento, escurecer o resto da página com um recorte (spotlight) em volta dele, e mostrar um cartão grande com `#n`, ícone e largura da tela, e a nota. (APRE-02)
3. → / Espaço avançam, ← volta, Home/End vão à primeira/última, Esc sai. Também DEVE haver botões ◀ ▶ ✕ no cartão e um contador `3/7`. (APRE-03)
4. QUANDO a Anotação é de outra rota ENTÃO o cartão DEVE mostrar a nota, o print e "anotada em `/rota`", sem spotlight. (APRE-04)
5. QUANDO a Anotação foi feita em outra Categoria de tela ENTÃO o cartão DEVE avisar "anotada em 📱 390px, você está em 🖥️ 1440px". (APRE-05)
6. Sair do modo DEVE restaurar o Painel e o estado anterior (ativo). (APRE-06)

### P1: Erros do console junto da nota ⭐

**User Story**: Como dev, quero que a anotação leve os erros de console e de rede do momento, para o Claude Code ter a pista técnica junto do visual.

**Critérios de Aceite**:

1. QUANDO o probe é injetado ENTÃO ele DEVE começar a registrar, no main world: chamadas a `console.error`, eventos `error` e `unhandledrejection` em `window`, e falhas de rede de `fetch` e `XMLHttpRequest` (status ≥ 400 ou erro de rede). O comportamento original de cada API DEVE ser preservado. (ERRO-01)
2. O Registro de erros DEVE guardar no máximo 50 entradas (FIFO), cada uma com tipo, mensagem (até 500 caracteres), horário e, se houver, `arquivo:linha`; para rede, método, URL **sem query string e sem fragmento** e status. Repetições idênticas viram uma entrada com contador `×N`. (ERRO-02)
3. QUANDO uma Anotação é salva ENTÃO o sistema DEVE anexar a ela os erros dos últimos 60s (configurável no Design), pedidos ao probe pelo mesmo canal `CustomEvent` com timeout de 300ms; falha ou timeout DEVE resultar em lista vazia, sem bloquear a Anotação. (ERRO-03)
4. O Painel DEVE mostrar um selo `⚠ N` no item que tem erros, e o editor de nota DEVE permitir ver e remover erros antes de salvar. (ERRO-04)
5. O `feedback.md` DEVE ter, por Anotação, uma seção **Erros no console** em bloco `text`; o markdown compacto DEVE ganhar só `⚠ N erros` na linha de metadados. (ERRO-05)
6. Se o probe não puder ser injetado (CSP, página especial) ENTÃO a Anotação sai sem erros e sem aviso. (ERRO-06)

### P2: Desenho no print

**User Story**: Como dev, quero rabiscar por cima do print (setas, círculos, X), porque às vezes um desenho explica melhor que texto.

**Critérios de Aceite**:

1. Cada item do Painel com print DEVE ter um ícone ✏️ "Desenhar" que abre o print num editor sobre a página. (DESE-01)
2. O editor DEVE ter as ferramentas pincel, seta, círculo e X; 3 cores (rosa do PxA, amarelo, ciano); desfazer (Ctrl/Cmd+Z) e limpar. Os traços são pixelados (sem antialias, espessura em blocos de 2px). (DESE-02)
3. Salvar DEVE gravar o Desenho como camada separada na Anotação; o export DEVE incluir o print composto em `shots/NN.png` e o original em `shots/NN-original.png`. (DESE-03)
4. A miniatura no Painel e o print no Modo Apresentação DEVEM mostrar o print com Desenho. (DESE-04)
5. Esc ou "Cancelar" fecha sem salvar; anotação sem print não mostra o ícone. (DESE-05)

### P2: Importar sessão

**User Story**: Como dev, quero abrir o `.zip` que um colega exportou e ver os marcadores dele na minha página, para continuar o trabalho ou revisar.

**Critérios de Aceite**:

1. O export `.zip` DEVE passar a incluir o Manifesto do export `pxa.json` com `schemaVersion`, origem, data e as Anotações (todos os campos de `Annotation` exceto o `Blob` do print, que é referenciado pelo nome em `shots/`). (IMPO-01)
2. O Painel DEVE ter "Importar .zip" (input de arquivo) que lê o `.zip` com `fflate`, valida o `pxa.json` e recusa com mensagem clara: arquivo sem manifesto, `schemaVersion` desconhecida ou JSON inválido. (IMPO-02)
3. As Anotações importadas DEVEM entrar no store com números novos na sequência da aba e guardar o número original (`#3 de <origem>`) para referência; os prints vêm de `shots/`. (IMPO-03)
4. QUANDO a origem do `.zip` difere da página ENTÃO o sistema DEVE avisar ("anotações de `staging.app.com`") e importar mesmo assim. (IMPO-04)
5. Para cada Anotação importada, o sistema DEVE resolver o elemento pelo seletor (`resolveAnnotation` existente); se não achar, o item no Painel mostra "elemento não encontrado" e não tem Marcador. (IMPO-05)
6. Importar o mesmo `.zip` duas vezes NÃO DEVE duplicar (deduplicar por `id`). (IMPO-06)
7. Anotações importadas contam como não exportadas para o aviso antes de sair (AVIS-01). (IMPO-07)

---

## Casos Limite

- Página que já sobrescreve `console.error`/`fetch` (Sentry, Datadog): o probe envolve o que encontrar e repassa; nunca substitui sem chamar o anterior.
- Erros em loop (100/s): FIFO de 50 + contador de repetição evitam explosão de memória.
- URLs de rede com tokens no path: fora do escopo de redação; documentar no README que só query e fragmento são removidos.
- Modo Apresentação com elemento que sumiu (SPA): cartão sem spotlight e aviso "elemento não encontrado".
- Desenho em print parcial (`shotPartial`): permitido; o aviso de print parcial continua no export.
- `.zip` grande (>50 MB) ou malicioso (zip bomb): limitar tamanho descompactado total (ex: 100 MB) e quantidade de arquivos.
- Importar `.zip` exportado antes desta feature (sem `pxa.json`): recusar explicando que só exports novos podem ser importados.

## Coordenação entre andares

Três features rodam em paralelo a partir do mesmo `develop`: **Diversão**, **Raio-X** e **Equipe e Claude**. As três mexem no Painel. Para reduzir conflito no merge:

- Código novo em módulos próprios (`ui/presentation.ts`, `ui/draw-editor.ts`, `lib/import.ts`, `lib/manifest.ts`, `lib/error-log.ts`).
- Esta feature é a única que mexe no **formato de export** (`exporter.ts`, `markdown.ts`, `types.ts`): mudanças em `Annotation` devem ser campos opcionais novos (`errors?`, `drawing?`, `importedFrom?`), sem renomear os existentes.
- Esta feature é a única que mexe no **probe** (`component-probe.ts`, `messages.ts`).
- Em `ui/panel.ts`, só botões novos no rodapé ("Apresentar", "Importar") e ícones novos por item; não reorganizar o arquivo.
- Usar as cores atuais de `styles.ts`; a feature Diversão converte para custom properties (Temas).

---

## Rastreabilidade de Requisitos

| ID | Story | Status |
|---|---|---|
| APRE-01..06 | Modo Apresentação | Pending |
| ERRO-01..06 | Erros do console | Pending |
| DESE-01..05 | Desenho no print | Pending |
| IMPO-01..07 | Importar sessão | Pending |

## Critérios de Sucesso

- [ ] E2E: exportar numa aba e importar em outra aba da mesma fixture recria todos os marcadores nas mesmas posições.
- [ ] E2E: fixture que dispara `console.error` e um `fetch` 404 gera Anotação com os dois erros no `feedback.md`.
- [ ] Nenhuma regressão nos 127 testes unitários e 27 E2E do M1.
- [ ] `check:manifest` continua passando sem permissões novas.
