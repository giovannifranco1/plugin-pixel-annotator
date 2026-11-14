# Convenções

- Código e identificadores em inglês; docs, specs e UI em PT-BR (com acentuação).
- Prefixo `pxa` em classes, atributos, eventos e mensagens (ex: `data-pxa-ignore`, `data-pxa-probe`, eventos `pxa:probe-request`/`pxa:probe-response`, mensagens `pxa:toggle`/`pxa:capture`). Os nomes ficam em `lib/messages.ts`; não escrever as strings à mão.
- Arquivos TS em kebab-case; tipos em PascalCase; funções camelCase.
- UI injetada: elementos criados com `el()` (`ui/dom.ts`) dentro do host do Shadow DOM; CSS só em `ui/styles.ts`.
- Módulos de UI com desenho por frame expõem `measure()`, que lê o layout e devolve a escrita. O tick junta todas as leituras antes das escritas.
- Modais (Apresentação, Desenho) registram atalhos com `captureKeys()` (`ui/dom.ts`), na captura em `window`, e o desligam no `close()` idempotente.
- Campos novos de `Annotation` são opcionais e só existem com conteúdo (`errors` com ≥1 erro; o store normaliza). Nomes de arquivos em `shots/` saem só de `shotFiles()` (`lib/export-names.ts`).
- Lógica pura vai em `lib/` (sem `browser.*`), testável no Vitest.
- Commits: Conventional Commits. Scopes: `content`, `background`, `capture`, `export`, `ui`, `build`, `specs`.

## Glossário

| Termo | Definição |
|---|---|
| Anotação | Registro de feedback ligado a um elemento: nota + contexto capturado + print |
| Marcador | Ícone pixel art numerado fixado na página sobre o elemento anotado |
| Modo Anotação | Estado da aba em que hover destaca e clique cria anotação |
| Painel | Lista lateral (estilo quest log) das anotações da aba; recolhível para uma barra com o contador |
| Breakpoint | Faixa Tailwind da largura do viewport (base/sm/md/lg/xl/2xl) |
| Categoria de tela | Mobile, tablet ou desktop, derivada da largura do viewport |
| Export | Pacote `.zip` com `feedback.md` + `pxa.json` + `shots/` |
| Modo Apresentação | Navegação em sequência pelas Anotações, uma por vez, com recorte (spotlight) e cartão |
| Desenho | Traços pixel (pincel, seta, círculo, X) por cima do print; camada separada + print composto |
| Sessão importada | Anotações carregadas de um `.zip` de outro PxA; guardam `#n de origem` |
| Manifesto do export | `pxa.json`: dados das Anotações legíveis por máquina, com `schemaVersion` |
| Registro de erros | Erros de console e falhas de rede capturados pelo probe desde a ativação (até 50, ×N) |
