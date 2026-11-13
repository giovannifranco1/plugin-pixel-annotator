# Modo Anotação — Checklist manual (dev)

Tudo que roda em Chromium já está coberto pelos testes automatizados (`npm test` e `npm run test:e2e`). Este checklist cobre o que só dá para ver à mão: o Firefox e o fluxo real com o Claude Code.

## Preparação

```bash
npm install
npm run build          # .output/chrome-mv3
npm run build:firefox  # .output/firefox-mv3
```

## Chrome

- [ ] Abrir `chrome://extensions`, ativar o modo desenvolvedor, clicar em "Carregar sem compactação" e escolher `.output/chrome-mv3`.
- [ ] Conferir que a instalação não pede permissão além de "ler e alterar a aba ativa quando clicada" (`activeTab` + `scripting`).
- [ ] Numa app React real, em 390px (DevTools → modo responsivo), clicar no ícone. O painel deve abrir recolhido no rodapé.
- [ ] Anotar 2 elementos em 390px e 3 em 1440px, expandir o painel e clicar em "Exportar .zip".
- [ ] Descompactar o zip no projeto e pedir ao Claude Code: "resolve o feedback.md". Ele deve localizar os componentes certos (Critério de Sucesso).

## Firefox ≥ 128

- [ ] Abrir `about:debugging#/runtime/this-firefox`, clicar em "Carregar extensão temporária" e escolher `.output/firefox-mv3/manifest.json`.
- [ ] **PLAT-01:** anotar um elemento e exportar. O `shots/01.png` precisa existir, o que confirma que `captureVisibleTab` funciona só com `activeTab`.
- [ ] **COMP:** numa app React ou Vue em dev, o export deve trazer a linha "Componente", o que confirma o `world: "MAIN"`.
- [ ] **AVIS-01:** anotar sem exportar e recarregar a página. O aviso nativo de saída deve aparecer.
  - Se **não** aparecer, aplicar o plano B do `design.md`: mover o listener `beforeunload` para o probe (main world), controlado por `CustomEvent('pxa:dirty')`.
- [ ] **PLAT-02:** clicar no ícone em `about:addons`. Deve aparecer o badge `!` e o título "PxA não pode anotar esta página".

## Resultado

| Item | Chrome | Firefox | Observação |
|---|---|---|---|
| Instalação sem permissões extras | | | |
| Print com activeTab | | | |
| Componente React/Vue | | | |
| Aviso antes de sair (AVIS-01) | | | |
| Badge em página restrita | | | |
| Claude Code resolve o feedback.md | | — | |
