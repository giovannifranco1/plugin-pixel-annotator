# Convenções

- Código e identificadores em inglês; docs, specs e UI em PT-BR (com acentuação).
- Prefixo `pxa` em classes/atributos/eventos injetados na página (ex: `data-pxa-ignore`, evento `pxa:component-request`).
- Arquivos TS em kebab-case; tipos em PascalCase; funções camelCase.
- Commits: Conventional Commits. Scopes: `content`, `background`, `capture`, `export`, `ui`, `build`, `specs`.

## Glossário

| Termo | Definição |
|---|---|
| Anotação | Registro de feedback ligado a um elemento: nota + contexto capturado + print |
| Marcador | Ícone pixel art numerado fixado na página sobre o elemento anotado |
| Modo Anotação | Estado da aba em que hover destaca e clique cria anotação |
| Painel | Lista lateral (estilo quest log) das anotações da aba |
| Breakpoint | Faixa nomeada da largura do viewport (sm/md/lg/xl/2xl) |
| Categoria de tela | Mobile, tablet ou desktop, derivada da largura do viewport |
| Export | Pacote `.zip` com `feedback.md` + `shots/` |
