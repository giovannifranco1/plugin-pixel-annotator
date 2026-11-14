# PixelAnnotator (PxA)

**Visão:** Extensão de navegador (Chrome + Firefox) com estética pixel art que permite apontar elementos de qualquer página, deixar notas de feedback e exportar tudo num pacote que o Claude Code entende e resolve de uma vez.
**Para:** Devs front-end que usam o Claude (Claude Code / claude.ai) para ajustar UI.
**Resolve:** Explicar problema visual pro Claude é lento e ambíguo ("esse botão aqui, nessa tela"). O PxA captura automaticamente onde (URL, seletor, componente), em qual tela (viewport, breakpoint) e o quê (nota, print, CSS), em lote.

## Objetivos

- Reduzir o tempo de reportar N ajustes visuais ao Claude: anotar + exportar 5 itens em < 2 minutos.
- Feedback exportado é suficiente para o Claude Code localizar o código: em ≥ 80% das anotações em apps React/Vue, o export traz nome do componente ou seletor único.
- Mesmo código-fonte gera build funcional para Chrome e Firefox.

## Stack Tecnológica

**Core:**

- Framework de extensão: WXT (Manifest V3, build Chrome + Firefox) — versão fixada no scaffold
- Linguagem: TypeScript
- Banco de dados: IndexedDB do site anotado (anotações e prints, PERS-01); `storage.local` só para o Perfil da Diversão

**Dependências-chave:**

- WXT — build cross-browser, hot reload, `browser.*` unificado
- fflate (ou equivalente leve) — geração do `.zip` no cliente
- Vitest — testes unitários
- Playwright — E2E com extensão carregada (Chromium)

## Escopo

**v1 inclui:**

- Modo Anotação: hover destaca, clique fixa marcador pixel art numerado + nota
- Captura por anotação: URL/rota, seletor, componente React/Vue, viewport/breakpoint, print do recorte, CSS relevante
- Painel lateral (estilo quest log) para listar, editar e excluir anotações
- Export `.zip` (feedback.md + shots/*.png) e "copiar markdown"

**Explicitamente fora de escopo (v1):**

- Ponte MCP com o Claude Code (v2)
- Iframes e Shadow DOM da página anotada
- Sincronização/colaboração entre pessoas
- Publicação nas lojas (Chrome Web Store / AMO)

## Restrições

- Técnicas: Manifest V3 nos dois navegadores; permissões mínimas (`activeTab` + `scripting`, sem host permission ampla).
- Técnicas: UI injetada isolada em Shadow DOM para não sofrer nem causar vazamento de CSS da página.
- Recursos: projeto pessoal, 1 dev.
