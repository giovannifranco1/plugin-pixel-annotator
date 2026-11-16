# Changelog — Especificação

## Problema

Quem usa o PxA não tem como saber o que mudou entre versões: as mudanças só existem nos commits e nas tags (1.0.0, 1.1.0, 1.2.0). Uma atualização passa despercebida e recursos novos (Detector, Lupa, persistência) ficam sem ser descobertos.

## Objetivos

- [x] O dev abre o histórico de versões pelo menu ⋮ em até 2 cliques, sem sair da página.
- [x] Depois de uma atualização, o PxA avisa que há novidade até o dev abrir a janela.
- [x] O conteúdo vem de um `CHANGELOG.md` versionado no repositório, escrito em PT-BR para quem usa.

## Fora do Escopo

| Item | Motivo |
|---|---|
| Gerar o changelog a partir dos commits | D1: texto manual e para o usuário. |
| Buscar o changelog na rede (GitHub, release) | Sem host permission nova; o conteúdo vai no bundle. |
| Abrir a janela sozinha depois de atualizar | Não pedido; o ponto já avisa sem atrapalhar a página. |
| Notificação do navegador / página de "obrigado por atualizar" | Não pedido. |
| Busca, filtro ou links dentro da janela | YAGNI. |
| Script/CI que exige entrada no CHANGELOG a cada release | Não pedido; vira lembrete em CONVENTIONS. |

---

## Glossário

| Termo | Definição canônica | Fonte |
|---|---|---|
| Changelog | Item do menu ⋮ e janela que mostram o histórico de versões. Nome também da feature e da branch. | decisão do dev (2026-11-16) |
| Entrada | Uma versão do `CHANGELOG.md`: número, data e lista de itens. | esta spec |
| Ponto de novidade | Bolinha rosa (`--pxa-primary`, à esquerda do ⋮) no ⋮ do cabeçalho e no item Changelog. | D3 |
| Última versão vista | Versão gravada no Perfil quando o dev abre a janela (ou na instalação). | D3 |
| Novidades | NÃO usar — usar `Changelog`. | decisão do dev (2026-11-16) |

---

## User Stories

### P1: Ver o Changelog pelo menu ⭐ MVP

**User Story**: Como dev que usa o PxA, quero abrir "Changelog" no menu ⋮ para ver o que mudou em cada versão.

**Por que P1**: É o pedido.

**Critérios de Aceite**:

1. **NOVI-01** — QUANDO o dev abre o menu ⋮ do cabeçalho ENTÃO o menu DEVE ter o item "Changelog" depois de "Exportar .zip", separado por uma linha.
2. **NOVI-02** — QUANDO o dev clica em "Changelog" ENTÃO o PxA DEVE abrir a janela "Changelog do PxA" (Shadow DOM, `data-pxa-ignore`) com as entradas da mais nova para a mais antiga, cada uma com versão, data (`16/11/2026`) e os itens em lista.
3. **NOVI-03** — QUANDO a entrada é a versão instalada ENTÃO a janela DEVE marcá-la como "atual".
4. **NOVI-04** — QUANDO o dev aperta Esc, clica no × ou clica de novo em "Changelog" com a janela aberta ENTÃO a janela DEVE fechar.
5. **NOVI-05** — QUANDO o dev arrasta a janela pelo cabeçalho ENTÃO ela DEVE se mover presa à tela, igual ao relatório do Detector (`makeDraggable`).
6. **NOVI-06** — QUANDO o conteúdo passa da altura da janela ENTÃO a lista DEVE rolar dentro dela, sem rolar a página.
7. **NOVI-07** — QUANDO um item tem `**texto**` ou `` `texto` `` ENTÃO a janela DEVE mostrar negrito / código; qualquer outro Markdown aparece como texto puro (nunca HTML injetado).

**Teste Independente**: `npm test` (parser + janela em happy-dom) e E2E: abrir o menu, clicar em Changelog, ver "1.2.0" com "atual", Esc fecha.

---

### P2: Ponto de novidade depois de atualizar

**User Story**: Como dev, quero ver um ponto no ⋮ quando a extensão atualizou para descobrir o que entrou sem ter que lembrar de olhar.

**Por que P2**: Faz o changelog ser visto; sem ele o P1 já funciona.

**Critérios de Aceite**:

1. **NOVI-08** — QUANDO não há última versão vista no Perfil (instalação nova) ENTÃO o PxA DEVE gravar a versão atual e NÃO mostrar o ponto.
2. **NOVI-09** — QUANDO a versão do manifest é maior que a última vista (comparação semver numérica: `1.10.0 > 1.9.0`) ENTÃO o ⋮ do cabeçalho e o item "Changelog" DEVEM mostrar o ponto, e o título do ⋮ DEVE dizer "Ações (há novidades)".
3. **NOVI-10** — QUANDO o dev abre a janela Changelog ENTÃO o PxA DEVE gravar a versão atual como vista e tirar o ponto.
4. **NOVI-11** — QUANDO a versão vista muda em outra aba ENTÃO o ponto DEVE sumir nesta também (via `onChange` do Perfil).
5. **NOVI-12** — QUANDO o storage falha ou não existe ENTÃO o ponto NÃO DEVE aparecer e a janela continua funcionando.
6. **NOVI-13** — QUANDO o Perfil gravado tem `lastSeenVersion` inválido ENTÃO `normalizeProfile` DEVE tratá-lo como ausente (NOVI-08).

**Teste Independente**: `npm test` com `ProfileArea` falso: Perfil com `1.1.0` e manifest `1.2.0` → ponto; abrir janela → Perfil com `1.2.0` e sem ponto.

---

## Casos Limite

- **NOVI-14** — QUANDO o `CHANGELOG.md` não tem entrada para a versão instalada ENTÃO a janela DEVE mostrar as entradas que existem, sem marcar "atual", e o build NÃO falha (o teste de NOVI-16 é que pega isso).
- **NOVI-15** — QUANDO uma linha do `CHANGELOG.md` não segue o formato (texto solto, título sem versão) ENTÃO o parser DEVE ignorá-la, sem quebrar as outras entradas.
- **NOVI-16** — QUANDO roda `npm test` ENTÃO um teste DEVE garantir que o `CHANGELOG.md` do repositório tem uma entrada para a `version` do `package.json` (lembra de escrever a entrada na release).
- QUANDO o menu abre com o Painel recolhido ENTÃO "Changelog" aparece igual (o menu já abre para cima).
- QUANDO os temas Padrão e Noite estão ativos ENTÃO a janela e o ponto DEVEM ter contraste legível nos dois (conferir em print).

---

## Rastreabilidade de Requisitos

| ID | Story | Fase | Status |
|---|---|---|---|
| NOVI-01 | P1 | Execute | Verified |
| NOVI-02 | P1 | Execute | Verified |
| NOVI-03 | P1 | Execute | Verified |
| NOVI-04 | P1 | Execute | Verified |
| NOVI-05 | P1 | Execute | Verified |
| NOVI-06 | P1 | Execute | Verified |
| NOVI-07 | P1 | Execute | Verified |
| NOVI-08 | P2 | Execute | Verified |
| NOVI-09 | P2 | Execute | Verified |
| NOVI-10 | P2 | Execute | Verified |
| NOVI-11 | P2 | Execute | Verified |
| NOVI-12 | P2 | Execute | Verified |
| NOVI-13 | P2 | Execute | Verified |
| NOVI-14 | Limite | Execute | Verified |
| NOVI-15 | Limite | Execute | Verified |
| NOVI-16 | Limite | Execute | Verified |

**Cobertura:** 16 total, 16 com teste (unit `changelog*.test.ts`, `panel.test.ts`, `profile*.test.ts`; E2E `changelog.spec.ts`).

---

## Critérios de Sucesso

- [x] Menu ⋮ → Changelog abre a janela com 1.2.0, 1.1.0 e 1.0.0, a 1.2.0 marcada "atual".
- [x] Trocar a `lastSeenVersion` do Perfil para `1.1.0` faz o ponto aparecer; abrir a janela o tira.
- [x] `npm test`, `npm run test:e2e` e `npm run check:manifest` verdes; nenhuma permissão nova.
- [x] Print da janela conferido nos temas Padrão e Noite a 320px de largura.

---

## Notas Técnicas

- **Conteúdo:** `CHANGELOG.md` na raiz, formato restrito:
  ```markdown
  # Changelog do PxA

  ## 1.2.0 — 2026-11-16
  - Focar uma anotação feita em outra rota leva até a URL dela.
  - O menu de ações fecha ao clicar fora dele.
  ```
  Importado com `?raw` do Vite (`import changelog from '@/CHANGELOG.md?raw'`) e parseado em runtime por `lib/changelog.ts` (função pura, testável). Sem lib de Markdown.
- **Perfil:** `lib/profile.ts` ganha `lastSeenVersion?: string` (validado em `normalizeProfile`). Mesma chave `pxa:profile`, sem migração.
- **Comparação de versão:** função pura em `lib/changelog.ts` (`compareVersions`), sem dependência.
- **UI:** `ui/changelog.ts` (janela, reaproveita `makeDraggable` e o padrão do `audit-report.ts`); `ui/panel.ts` ganha o item e o ponto; estilos em `ui/styles.ts` com variáveis do tema.
- **Permissões:** nenhuma nova (`storage` já existe para o Perfil).
- **Scopes afetados:** `ui`, `content`, `build` (se precisar de tipagem `?raw`), `specs`.
- **Rascunho do `CHANGELOG.md` inicial** (dev revisa o texto na Execute):
  - **1.2.0 — 2026-11-16:** focar anotação de outra rota leva até a URL dela; menu de ações fecha ao clicar fora.
  - **1.1.0 — 2026-11-14:** anotações salvas no site (sobrevivem ao refresh); Detector de inconsistências de design e Lupa; Apresentar; erros do console na anotação; desenhar no print; importar `.zip`; mascote, sons e temas Padrão/Noite; menus ⋮ no cabeçalho e por anotação; importar no Firefox corrigido.
  - **1.0.0 — 2026-11-13:** Modo Anotação: marcar elementos com nota em qualquer site, captura de contexto (seletor, componente React/Vue, viewport, print, CSS), painel, exportar `.zip` e copiar markdown.

---

## Self-Review

- [x] Placeholder scan — sem TBD/TODO/seções vazias
- [x] Consistência interna — D1–D3 refletidos nas stories; "Changelog" usado em toda a UI
- [x] Scope check — um item de menu, uma janela, um campo no Perfil
- [x] Ambiguity check — posição do item, regra do ponto e formato do arquivo definidos
- [x] YAGNI — ponto de novidade foi pedido (D3); abrir sozinha, busca e geração automática ficaram fora

**Reviewer:** self-review manual (Medium)
**Status:** Aprovada pelo dev (com o nome "Changelog") e implementada
**Data:** 2026-11-16
