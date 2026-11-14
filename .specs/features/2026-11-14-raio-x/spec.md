# Raio-X — Especificação

> **Status:** Revisão 2 em 2026-11-14. Depois de ver a primeira versão, o dev cortou o X-ray e a Grade ("gostei só do detector e da lupa") e pediu uma passada geral no Detector ("tá meio burro"). DETE-02/03/05 revisados; DETE-08..10 novos. Verificação manual no Firefox pendente (`manual-check.md`).
> **Branch:** `feature/content-raio-x` (andar "Raio-X" no Maestri), a partir de `develop` em `91e6134`.

## Problema

O PxA hoje depende do olho do dev: ele precisa *perceber* o problema para anotá-lo. Vários problemas de layout passam despercebidos porque são invisíveis a olho nu: 23 tons de cinza parecidos, um espaçamento de 13px no meio de uma escala de 4px, uma borda desalinhada em meio pixel, um filho vazando do pai. O Raio-X dá ferramentas para *achar* esses problemas e virar cada achado numa Anotação com um clique.

## Objetivos

- [x] Em uma página média (até ~3.000 elementos), o Detector mostra o relatório em menos de 1s.
- [x] Cada achado do Raio-X vira uma Anotação normal (com seletor, print e contexto) em 1 clique.
- [x] As ferramentas não mudam a página: tudo é desenhado no Shadow DOM do PxA.
- [x] Nenhuma permissão nova: só `activeTab` + `scripting`.

## Fora do Escopo

| Item | Motivo |
|---|---|
| Comparar com tokens de um arquivo de design system (Figma, `tailwind.config`) | Exige ler arquivo do projeto; fica como evolução. O MVP só aponta inconsistência interna da página |
| Corrigir automaticamente o CSS | O PxA anota; quem corrige é o Claude Code |
| Auditoria de acessibilidade completa (WCAG) | Escopo de outra ferramenta; contraste fica como evolução |
| Varrer elementos dentro de iframes e Shadow DOM da página | Mesma limitação do M1 |
| Lupa ao vivo a cada movimento do mouse com print novo | `captureVisibleTab` tem limite de ~2 capturas/s (ver LUPA-03) |
| Modo X-ray (XRAY-01..06) e Grade de 8px (GRAD-01..03) | Implementados na revisão 1 e **removidos pelo dev** em 2026-11-14 depois de testar. Código no histórico da branch (`17adb7b`) |
| Marcar valores "órfãos" (usados 1–2×) como Achado | Revisão 2: virou ruído em páginas reais (hero de 96px, largura máxima de 600px). A contagem `N×` continua visível |

---

## Glossário

| Termo | Definição canônica |
|---|---|
| Raio-X | Conjunto de ferramentas de inspeção do PxA, abertas por uma barra no Painel |
| Detector | Ferramenta que varre estilos computados e lista inconsistências de design system |
| Achado | Uma inconsistência listada pelo Detector (ex: "cor `#7a7a7a` parecida com `#777777`"), com botão Anotar |
| Escala | Espaçamentos esperados: múltiplos de 4px (com os meios passos do Tailwind abaixo de 16px: 1, 2, 6, 10 e 14px) ou de 8px (com 1, 2 e 4px) |
| Lupa | Zoom pixelado sob o cursor feito a partir de um print congelado da aba |

---

## User Stories

### P1: Detector de bagunça de design system ⭐

**User Story**: Como dev, quero ver quantas cores, fontes e espaçamentos diferentes a página usa e quais fogem da escala, para achar inconsistências que não percebo no olho.

**Critérios de Aceite**:

1. QUANDO o dev aciona o Detector ENTÃO o sistema DEVE varrer os elementos **visíveis** do documento (excluindo a UI do PxA, elementos `display:none`/`visibility:hidden`/tamanho 0, elementos de até 1×1px como `sr-only` e o interior de `<svg>`) e ler os estilos computados. (DETE-01)
2. O relatório DEVE ter quatro seções com contagens de elementos: **Cores** (`color` só em elemento com texto próprio, `background-color`, `border-*-color` só com borda > 0, normalizadas para hex, ignorando `transparent`), **Tamanhos de fonte**, **Famílias de fonte** e **Espaçamentos** (`margin-*`, `padding-*`, `gap`, ignorando `0`, `auto` e percentuais). Cabeçalho tipo "23 cores · 11 tamanhos de fonte · 2 famílias · 3 espaçamentos fora da escala de 4px". *(rev. 2: fontes separadas em tamanho e família; peso saiu; zeros saíram)* (DETE-02)
3. O sistema DEVE marcar como Achado: *(rev. 2)* (DETE-03)
   - espaçamento fora da Escala (4px padrão com os meios passos do Tailwind abaixo de 16px; 8px com 1, 2 e 4px), com tolerância de 0,5px para valores subpixel;
   - cor **quase igual** a outra (ΔE76 ≤ 5, mesmo alfa) **e rara perto dela** (até 2 elementos ou até 10% dos usos da mais usada); duas cores parecidas e ambas bem usadas são tokens, não Achado;
   - tamanho de fonte a até 1px de outro e raro perto dele (mesma regra);
   - família de fonte padrão do navegador (Times, serif, system-ui, Arial…) em poucos elementos enquanto a página usa outra família: sinal de `button`/`input` que não herdou a fonte.
4. QUANDO o dev passa o mouse num valor do relatório ENTÃO o sistema DEVE destacar no overlay todos os elementos visíveis que usam esse valor. (DETE-04)
5. QUANDO o dev clica em "Anotar" num Achado ENTÃO o sistema DEVE criar Anotações para os elementos afetados (máximo 5; acima disso, uma Anotação no primeiro com a contagem na nota), com nota pré-preenchida editável que diz **o que trocar**, ex: `[Raio-X] espaçamento 13px (padding) fora da escala de 4px: usar 12px ou 14px (3 elementos)`. *(rev. 2: propriedade + sugestão)* (DETE-05)
6. A varredura DEVE ser dividida em fatias (ex: `requestIdleCallback`/lotes de 500 elementos) para não travar a página, com limite de 10.000 elementos e aviso quando cortar. (DETE-06)
7. A lógica de agrupamento (normalização de cor, distância, escala, raridade, sugestão) DEVE ficar em `lib/` como função pura testável. (DETE-07)
8. Cores em formatos modernos (`lab()`, `lch()`, `oklab()`, `oklch()`, `color(srgb|srgb-linear|display-p3 …)`), que o navegador devolve para CSS feito com Tailwind 4 e afins, DEVEM ser convertidas para hex sRGB (fora do gamut: corta no limite) e entrar no agrupamento como qualquer outra. *(rev. 2)* (DETE-08)
9. Cada seção DEVE mostrar primeiro os Achados; os demais valores ficam recolhidos em "outros N valores". *(rev. 2)* (DETE-09)
10. QUANDO o dev clica num valor do relatório ENTÃO o sistema DEVE rolar até o próximo elemento que usa esse valor (cíclico), mantendo o destaque. *(rev. 2)* (DETE-10)

### P2: Lupa pixel

**User Story**: Como dev, quero um zoom pixelado sob o cursor com a cor em hex, para pegar bordas tortas e desalinhamento de meio pixel.

**Critérios de Aceite**:

1. QUANDO o dev liga a Lupa ENTÃO o sistema DEVE pedir um print da aba ao background (fila de captura existente) e mostrar, perto do cursor, um zoom 8× de 15×15 pixels físicos com grade, o pixel central marcado e o hex dele. (LUPA-01)
2. Clicar com a Lupa ligada DEVE copiar o hex para a área de transferência e mostrar toast, sem criar Anotação. Esc desliga a Lupa. (LUPA-02)
3. Rolar ou redimensionar DEVE invalidar o print; um novo é pedido após 300ms parado, respeitando a fila de captura (≥550ms entre capturas). Enquanto isso a Lupa mostra "atualizando…". (LUPA-03)
4. A Lupa DEVE considerar o DPR (o print está em pixels físicos). (LUPA-04)

---

## Casos Limite

- Página com milhares de elementos (tabelas, feeds): fatiamento e limite de DETE-06.
- Cores com transparência: normalizar para `#rrggbbaa`; não comparar com cores opacas como "parecidas".
- `font-size` com `rem` e zoom do navegador: usar o valor computado em px.
- Spacing `auto`, percentual e negativos: ignorar `auto` e percentual (o navegador devolve em px; no Chrome o Typed OM diz a unidade, no Firefox margens laterais iguais contam como `auto`); negativos contam pelo valor absoluto.
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
| DETE-01..10 | Detector de design system | Pending (rev. 2) |
| XRAY-01..06 | Modo X-ray | Removido pelo dev (rev. 2) |
| GRAD-01..03 | Grade de 8px | Removido pelo dev (rev. 2) |
| LUPA-01..04 | Lupa pixel | Verified — unit (`loupe`, `loupe-ui`) + E2E (LUPA-01/02). LUPA-04 com DPR 2 real e Firefox: pendente manual (`manual-check.md`) |

## Critérios de Sucesso

- [ ] Numa página de teste com 3 espaçamentos fora da escala, 2 cores quase iguais, 1 tamanho de fonte quase igual e 1 botão sem herdar a fonte, o Detector aponta todos e **não** acusa tokens do Tailwind nem cores modernas (fixture E2E). *(rev. 2)*
- [x] Nenhuma regressão nos 127 testes unitários e 27 E2E do M1 (agora 186 unit e 34 E2E).
- [x] `check:manifest` continua passando sem permissões novas.
