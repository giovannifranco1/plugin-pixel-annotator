# Roadmap

**Milestone atual:** M1 — MVP Modo Anotação
**Status:** Implementado — aguardando verificação manual do dev (Firefox + fluxo real com o Claude Code)

---

## M1 — MVP Modo Anotação

**Objetivo:** Dá para anotar uma página em qualquer site, no Chrome e no Firefox, exportar e o Claude Code resolver a partir do export.
**Alvo:** Extensão carregável em modo dev nos dois navegadores, com todos os critérios P1 da spec verificados.

### Features

**Modo Anotação** - IMPLEMENTADA, verificação manual pendente (`.specs/features/2026-11-13-modo-anotacao/`, checklist em `manual-check.md`)

- Ativar/desativar pelo ícone e marcar elementos com nota
- Captura de contexto (URL, seletor, componente React/Vue, viewport/breakpoint, print, CSS)
- Painel quest log (listar, editar, excluir)
- Export `.zip` + copiar markdown

---

## M2 — Ponte com o Claude Code

**Objetivo:** O Claude Code lê as anotações direto da extensão, sem download.

### Features

**Servidor MCP local do PxA** - PLANEJADA
**Persistência de anotações por origem** - FEITA em 2026-11-14 (PERS-01, IndexedDB do site, pedido do dev)

### Sugestões (não pedidas pelo dev — avaliar antes de planejar)

- Atalho de teclado (`Alt+Shift+A`, via `commands` do manifest) para alternar o Modo Anotação. Removido do MVP (era ATAL-01) em 2026-11-13.

---

## Considerações Futuras

- Pet pixel art que reage a erros do console
- Raio-X responsivo (prints em vários breakpoints com 1 clique)
- Marcar anotação como resolvida + sons de "quest complete"
- Publicação na Chrome Web Store e AMO
