# Convenções

- Código e identificadores em inglês; docs, specs e UI em PT-BR (com acentuação).
- Prefixo `pxa` em classes, atributos, eventos e mensagens (ex: `data-pxa-ignore`, `data-pxa-probe`, eventos `pxa:probe-request`/`pxa:probe-response`, mensagens `pxa:toggle`/`pxa:capture`). Os nomes ficam em `lib/messages.ts`; não escrever as strings à mão.
- Arquivos TS em kebab-case; tipos em PascalCase; funções camelCase.
- UI injetada: elementos criados com `el()` (`ui/dom.ts`) dentro do host do Shadow DOM; CSS só em `ui/styles.ts`.
- Módulos de UI com desenho por frame expõem `measure()`, que lê o layout e devolve a escrita. O tick junta todas as leituras antes das escritas.
- Modais (Apresentação, Desenho) registram atalhos com `captureKeys()` (`ui/dom.ts`), na captura em `window`, e o desligam no `close()` idempotente.
- Bytes vindos de objetos da página (`File` do input, Blobs de elementos criados no DOM) passam por `ownBytes()` antes de `subarray`/fflate: no Firefox eles pertencem à página e ler `constructor` é negado.
- Campos novos de `Annotation` são opcionais e só existem com conteúdo (`errors` com ≥1 erro; o store normaliza). Nomes de arquivos em `shots/` saem só de `shotFiles()` (`lib/export-names.ts`).
- Lógica pura vai em `lib/` (sem `browser.*`), testável no Vitest.
- Cores da UI só por `var(--pxa-*)` em `ui/styles.ts`; valor novo de cor vira variável em `THEME_VARS` com valor em todos os temas (o teste de contraste cobre texto/fundo). Exceção: marcadores (cor da categoria). Ícones pixel: `K` (contorno) é `currentColor` e segue o texto do botão; as demais letras da paleta são cores fixas.
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
| Mascote | Alfinete em pixel 16×16 (2×) no cabeçalho do Painel, com Humor `idle`/`feliz`/`susto`/`festa`/`dormindo`; mesma cor em todos os Temas |
| Tema | Paleta da UI do PxA via custom properties `--pxa-*` (`ui/themes.ts`) |
| Perfil | Tema e som, em `storage.local` (`pxa:profile`); único estado persistido |
| Raio-X | Ferramentas de inspeção abertas pela barra do Painel: Detector e Lupa |
| Detector | Varre estilos computados e lista cores, fontes e espaçamentos com contagem |
| Achado | Valor marcado pelo Detector (fora da escala, quase igual a um valor bem mais usado, fonte padrão do navegador); vira Anotação com nota `[Raio-X] …` que diz o que usar |
| Escala | Espaçamentos esperados: múltiplos de 4px com os meios passos do Tailwind (1, 2, 6, 10, 14px), ou de 8px com 1, 2 e 4px; folga de 0,5px |
| Lupa | Zoom 8× de 15×15 pixels físicos sobre um print congelado; clique copia o hex |
| Modo Apresentação | Navegação em sequência pelas Anotações, uma por vez, com recorte (spotlight) e cartão |
| Desenho | Traços pixel (pincel, seta, círculo, X) por cima do print; camada separada + print composto |
| Sessão importada | Anotações carregadas de um `.zip` de outro PxA; guardam `#n de origem` |
| Manifesto do export | `pxa.json`: dados das Anotações legíveis por máquina, com `schemaVersion` |
| Registro de erros | Erros de console e falhas de rede capturados pelo probe desde a ativação (até 50, ×N) |
