# Raio-X — Especificação

> **Status:** Aprovada pelo dev em 2026-11-14. Próximas fases neste andar: Design → Tasks → Execute.
> **Branch:** `feature/content-raio-x` (andar "Raio-X" no Maestri), a partir de `develop` em `91e6134`.

## Problema

O PxA hoje depende do olho do dev: ele precisa *perceber* o problema para anotá-lo. Vários problemas de layout passam despercebidos porque são invisíveis a olho nu: 23 tons de cinza parecidos, um espaçamento de 13px no meio de uma escala de 4px, uma borda desalinhada em meio pixel, um filho vazando do pai. O Raio-X dá ferramentas para *achar* esses problemas e virar cada achado numa Anotação com um clique.

## Objetivos

- [ ] Em uma página média (até ~3.000 elementos), o Detector mostra o relatório em menos de 1s.
- [ ] Cada achado do Raio-X vira uma Anotação normal (com seletor, print e contexto) em 1 clique.
- [ ] As ferramentas não mudam a página: tudo é desenhado no Shadow DOM do PxA.
- [ ] Nenhuma permissão nova: só `activeTab` + `scripting`.

## Fora do Escopo

| Item | Motivo |
|---|---|
| Comparar com tokens de um arquivo de design system (Figma, `tailwind.config`) | Exige ler arquivo do projeto; fica como evolução. O MVP só aponta inconsistência interna da página |
| Corrigir automaticamente o CSS | O PxA anota; quem corrige é o Claude Code |
| Auditoria de acessibilidade completa (WCAG) | Escopo de outra ferramenta; contraste fica como evolução |
| Varrer elementos dentro de iframes e Shadow DOM da página | Mesma limitação do M1 |
| Lupa ao vivo a cada movimento do mouse com print novo | `captureVisibleTab` tem limite de ~2 capturas/s (ver LUPA-03) |

---

## Glossário

| Termo | Definição canônica |
|---|---|
| Raio-X | Conjunto de ferramentas de inspeção do PxA, abertas por uma barra no Painel |
| Detector | Ferramenta que varre estilos computados e lista inconsistências de design system |
| Achado | Uma inconsistência listada pelo Detector ou pelo modo X-ray (ex: "cor `#7a7a7a` usada 2×") |
| Escala | Múltiplos de espaçamento esperados (padrão 4px) e tamanhos de fonte |
| Lupa | Zoom pixelado sob o cursor feito a partir de um print congelado da aba |
| Grade | Sobreposição de linhas a cada N px (colunas de 8px e linha de base) |
| Modo X-ray | Contorna os elementos visíveis e destaca em vermelho os que vazam do pai |

---

## User Stories

### P1: Detector de bagunça de design system ⭐

**User Story**: Como dev, quero ver quantas cores, fontes e espaçamentos diferentes a página usa e quais fogem da escala, para achar inconsistências que não percebo no olho.

**Critérios de Aceite**:

1. QUANDO o dev aciona o Detector ENTÃO o sistema DEVE varrer os elementos **visíveis** do documento (excluindo a UI do PxA e elementos `display:none`/`visibility:hidden`/tamanho 0) e ler os estilos computados. (DETE-01)
2. O relatório DEVE ter três seções com contagens: **Cores** (`color`, `background-color`, `border-*-color`, normalizadas para hex, ignorando `transparent`), **Fontes** (`font-size` + `font-family` + `font-weight`) e **Espaçamentos** (`margin-*`, `padding-*`, `gap`). Cabeçalho tipo "23 cores · 11 tamanhos de fonte · 3 espaçamentos fora da escala de 4px". (DETE-02)
3. O sistema DEVE marcar como Achado: espaçamentos que não são múltiplos da Escala (padrão 4px, configurável para 8px); cores **quase iguais** (distância de cor pequena, limiar no Design) agrupadas como "parecidas"; valores usados 1 ou 2 vezes na página ("órfãos"). (DETE-03)
4. QUANDO o dev passa o mouse num valor do relatório ENTÃO o sistema DEVE destacar no overlay todos os elementos visíveis que usam esse valor. (DETE-04)
5. QUANDO o dev clica em "Anotar" num Achado ENTÃO o sistema DEVE criar Anotações para os elementos afetados (máximo 5; acima disso, uma Anotação no primeiro com a contagem na nota), com nota pré-preenchida editável, ex: `[Raio-X] espaçamento 13px fora da escala de 4px (3 elementos)`. (DETE-05)
6. A varredura DEVE ser dividida em fatias (ex: `requestIdleCallback`/lotes de 500 elementos) para não travar a página, com limite de 10.000 elementos e aviso quando cortar. (DETE-06)
7. A lógica de agrupamento (normalização de cor, distância, escala, órfãos) DEVE ficar em `lib/` como função pura testável. (DETE-07)

### P1: Modo X-ray ⭐

**User Story**: Como dev, quero ver a "caixa" de cada elemento e os que estão vazando, para achar bugs de layout na hora.

**Critérios de Aceite**:

1. QUANDO o dev liga o modo X-ray ENTÃO o sistema DEVE desenhar no overlay o contorno de cada elemento visível dentro do viewport, com cor por profundidade (paleta pixel de 4–6 cores). (XRAY-01)
2. O sistema DEVE destacar em vermelho, com rótulo, os elementos que vazam: `scrollWidth > clientWidth` com `overflow` visível no eixo, ou retângulo do filho fora do retângulo do pai em mais de 1px quando o pai não corta o conteúdo. (XRAY-02)
3. Rolar ou redimensionar DEVE redesenhar só o que está no viewport, usando o laço por frame existente (`tick.ts`, medir-depois-escrever). (XRAY-03)
4. QUANDO o dev clica num elemento vermelho ENTÃO o sistema DEVE abrir o editor de nota normal, com nota pré-preenchida `[Raio-X] vaza do pai <seletor curto> em Npx`. (XRAY-04)
5. Hover e clique para anotar continuam funcionando com o X-ray ligado. (XRAY-05)
6. Com mais de 1.500 elementos no viewport, o sistema DEVE desenhar só os vazamentos e avisar. (XRAY-06)

### P2: Grade de 8px e linha de base

**Critérios de Aceite**:

1. O sistema DEVE ter um botão que liga e desliga uma Grade sobre a página: colunas a cada 8px (configurável 4/8) e linha de base a cada 4px, alinhadas ao topo do documento e acompanhando a rolagem. (GRAD-01)
2. A Grade DEVE ser desenhada no Shadow DOM com `repeating-linear-gradient`, translúcida, sem capturar eventos. (GRAD-02)
3. Prints de Anotação feitos com a Grade ligada DEVEM sair sem ela (esconder durante a captura, como o resto da UI). (GRAD-03)

### P2: Lupa pixel

**User Story**: Como dev, quero um zoom pixelado sob o cursor com a cor em hex, para pegar bordas tortas e desalinhamento de meio pixel.

**Critérios de Aceite**:

1. QUANDO o dev liga a Lupa ENTÃO o sistema DEVE pedir um print da aba ao background (fila de captura existente) e mostrar, perto do cursor, um zoom 8× de 15×15 pixels físicos com grade, o pixel central marcado e o hex dele. (LUPA-01)
2. Clicar com a Lupa ligada DEVE copiar o hex para a área de transferência e mostrar toast, sem criar Anotação. Esc desliga a Lupa. (LUPA-02)
3. Rolar ou redimensionar DEVE invalidar o print; um novo é pedido após 300ms parado, respeitando a fila de captura (≥550ms entre capturas). Enquanto isso a Lupa mostra "atualizando…". (LUPA-03)
4. A Lupa DEVE considerar o DPR (o print está em pixels físicos). (LUPA-04)

---

## Casos Limite

- Página com milhares de elementos (tabelas, feeds): fatiamento e limites de DETE-06 e XRAY-06.
- Cores com transparência: normalizar para `#rrggbbaa`; não comparar com cores opacas como "parecidas".
- `font-size` com `rem` e zoom do navegador: usar o valor computado em px.
- Spacing `auto` e negativos: ignorar `auto`; negativos contam pelo valor absoluto.
- SPA trocando de rota com o relatório aberto: marcar como desatualizado e oferecer "varrer de novo".
- Lupa em páginas protegidas (sem permissão de captura): mesma mensagem do print do M1.
- Achado com elemento que sumiu da página antes do clique em "Anotar": pular e avisar.

## Coordenação entre andares

Três features rodam em paralelo a partir do mesmo `develop`: **Diversão**, **Raio-X** e **Equipe e Claude**. As três mexem no Painel. Para reduzir conflito no merge:

- Código novo em módulos próprios (`lib/design-audit.ts`, `ui/xray.ts`, `ui/grid.ts`, `ui/loupe.ts`, `ui/audit-report.ts`).
- Em `ui/panel.ts`, adicionar só uma barra de ferramentas Raio-X (ponto de inserção único abaixo do cabeçalho). Não reorganizar o arquivo.
- A criação de Anotação pré-preenchida deve reusar `openEditor` do `controller.ts` com um parâmetro de nota inicial, sem duplicar o fluxo de captura.
- Usar as cores atuais de `styles.ts`; a feature Diversão converte tudo para custom properties (Temas). Quem fizer merge depois ajusta.

---

## Rastreabilidade de Requisitos

| ID | Story | Status |
|---|---|---|
| DETE-01..07 | Detector de design system | Pending |
| XRAY-01..06 | Modo X-ray | Pending |
| GRAD-01..03 | Grade de 8px | Pending |
| LUPA-01..04 | Lupa pixel | Pending |

## Critérios de Sucesso

- [ ] Numa página de teste com 3 espaçamentos fora da escala, 2 cores quase iguais e 1 filho vazando, o Raio-X aponta todos (fixture E2E).
- [ ] Nenhuma regressão nos 127 testes unitários e 27 E2E do M1.
- [ ] `check:manifest` continua passando sem permissões novas.
