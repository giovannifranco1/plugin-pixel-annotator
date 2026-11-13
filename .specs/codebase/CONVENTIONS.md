# Convenções

- Código e identificadores em inglês; docs, specs e UI em PT-BR (com acentuação).
- Prefixo `pxa` em classes, atributos, eventos e mensagens (ex: `data-pxa-ignore`, `data-pxa-probe`, eventos `pxa:probe-request`/`pxa:probe-response`, mensagens `pxa:toggle`/`pxa:capture`). Os nomes ficam em `lib/messages.ts`; não escrever as strings à mão.
- Arquivos TS em kebab-case; tipos em PascalCase; funções camelCase.
- UI injetada: elementos criados com `el()` (`ui/dom.ts`) dentro do host do Shadow DOM; CSS só em `ui/styles.ts`.
- Módulos de UI com desenho por frame expõem `measure()`, que lê o layout e devolve a escrita. O tick junta todas as leituras antes das escritas.
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
| Export | Pacote `.zip` com `feedback.md` + `shots/` |
