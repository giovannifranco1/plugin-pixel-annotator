# Equipe e Claude — Checklist manual (dev)

Tudo que roda em Chromium está coberto por `npm test` (233 unitários) e `npm run test:e2e` (34 E2E, incluindo `team.spec.ts`). Este checklist cobre o que só dá para ver à mão: o **Firefox** (não instalado na máquina de desenvolvimento; o Playwright não carrega extensões no Firefox) e o uso real em equipe.

## Preparação

```bash
npm install
npm run build          # .output/chrome-mv3
npm run build:firefox  # .output/firefox-mv3
```

## Firefox ≥ 128

Carregar `.output/firefox-mv3/manifest.json` em `about:debugging#/runtime/this-firefox`.

- [ ] **ERRO-01/05:** numa página qualquer, clicar no ícone. No console da página rodar `console.error('teste pxa'); fetch('/nao-existe', { headers: { Accept: 'application/json' } })`. Clicar num elemento: o editor deve listar os 2 erros. Salvar e exportar; o `feedback.md` deve ter a seção **Erros no console** e a URL sem query.
- [ ] **ERRO-01:** confirmar que o `console.error` continua aparecendo no console da página e que o `fetch` continua devolvendo a resposta para a página (o wrapper no main world não pode quebrar nada).
- [ ] **ERRO-06:** numa página com CSP restritiva (ex: github.com), anotar normalmente. A anotação sai sem erros e sem aviso.
- [ ] **APRE-01..06:** com 3 anotações, clicar em **Apresentar**. Conferir o escurecimento em volta do elemento, → / Espaço / ← / Home / End / Esc, e que o Painel volta como estava ao sair.
- [ ] **DESE-01..05:** clicar no ícone de rabisco de um item, desenhar com as 4 ferramentas e as 3 cores, Ctrl+Z, Limpar, Esc (fecha sem salvar) e Salvar. A miniatura aparece no item; o `.zip` traz `shots/01.png` (com desenho) e `shots/01-original.png`.
- [ ] **IMPO-01..07:** exportar num site e, em outra aba (de preferência outro host, ex: `127.0.0.1` em vez de `localhost`), clicar em **Importar .zip**. Marcadores nas mesmas posições, aviso "anotações de …", importar de novo não duplica, e recarregar a aba mostra o aviso de saída (IMPO-07).

## Chrome (uso real)

- [ ] Numa call real, apresentar 10 anotações só pelo teclado (Objetivo 1 da spec).
- [ ] Mandar o `.zip` para um colega e conferir que ele vê os mesmos marcadores (Objetivo 2).
- [ ] Pedir ao Claude Code "resolve o feedback.md" com uma anotação que tenha erros de console: ele deve usar os erros como pista.

## Resultado

(preencher pelo dev)
