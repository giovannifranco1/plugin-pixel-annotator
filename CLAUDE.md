# PixelAnnotator (PxA)

Extensão Chrome + Firefox (WXT, Manifest V3, TypeScript) para anotar elementos de páginas e exportar feedback para o Claude Code. Estética pixel art.

## Convenções

- Idioma: specs, docs e UI em PT-BR com acentuação; código em inglês.
- Branching: gitflow clássico (git-flow-next).
- Scopes de commit: `content`, `background`, `capture`, `export`, `ui`, `build`, `specs`.
- Comandos (criados no scaffold): `npm run dev` (Chrome), `npm run dev:firefox`, `npm test`, `npm run test:e2e`.
- Permissões mínimas: `activeTab` + `scripting`. Não adicionar host permissions amplas sem decisão registrada.
- UI injetada sempre dentro de Shadow DOM, com elementos marcados `data-pxa-ignore`.

## Referência .specs/

Documentação estruturada do projeto. Consultar antes de tomar decisões.

### Projeto
- `.specs/project/PROJECT.md` — Visão, goals, stack, scope
- `.specs/project/ROADMAP.md` — Features planejadas e milestones
- `.specs/project/STATE.md` — Decisões, blockers, lições, ideias adiadas

### Codebase
- `.specs/codebase/STACK.md` — Stack tecnológica e dependências
- `.specs/codebase/ARCHITECTURE.md` — Padrões arquiteturais e fluxo de dados
- `.specs/codebase/CONVENTIONS.md` — Convenções de código, naming e glossário
- `.specs/codebase/STRUCTURE.md` — Estrutura de diretórios
- `.specs/codebase/TESTING.md` — Infraestrutura e padrões de teste
- `.specs/codebase/INTEGRATIONS.md` — Integrações externas
- `.specs/codebase/CONCERNS.md` — Tech debt, riscos e áreas frágeis

### Features
- `.specs/features/YYYY-MM-DD-[feature]/spec.md` — Requisitos e critérios de aceite
- `.specs/features/YYYY-MM-DD-[feature]/design.md` — Arquitetura e componentes
- `.specs/features/YYYY-MM-DD-[feature]/tasks.md` — Tasks atômicas de implementação

### Decisões (opcional, criado lazy pelo grill)
- `.specs/decisions/NNNN-titulo.md` — ADRs
