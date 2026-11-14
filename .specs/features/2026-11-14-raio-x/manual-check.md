# Raio-X — Checklist manual (dev)

Tudo que roda em Chromium está coberto pelos testes automatizados (`npm test` e `PXA_E2E_PORT=5176 npm run test:e2e`, arquivo `tests/e2e/raio-x.spec.ts`). Este checklist cobre o que só dá para ver à mão: o Firefox, uma tela com DPR 2 real e a sensação de uso numa página de verdade.

## Preparação

```bash
npm install
npm run build          # .output/chrome-mv3
npm run build:firefox  # .output/firefox-mv3
```

Página de teste: `npx vite tests/e2e/fixtures --port 5176` e abrir `http://localhost:5176/raio-x.html` (use `?n=3000` para a página média).

## Chrome

- [ ] Instalar `.output/chrome-mv3` e conferir que **não** aparece permissão nova (só `activeTab` + `scripting`).
- [ ] Numa app real com bastante conteúdo, clicar em **Detector**: o relatório aparece em menos de 1s e a página não trava ao rolar durante a varredura.
- [ ] Passar o mouse nas linhas do relatório: os elementos destacados batem com o valor.
- [ ] **X-ray**: rolar e redimensionar a janela; os contornos acompanham sem tremer. Clicar num vermelho e conferir a nota "vaza do pai…".
- [ ] **Lupa** num monitor Retina (DPR 2): a grade da lupa mostra 15×15 pixels físicos; uma borda de 1px CSS aparece com 2 pixels de largura.
- [ ] **Grade**: alternar 8px → 4px → desligada; com a grade ligada, anotar e conferir que o print no `.zip` sai sem a grade.

## Firefox ≥ 128

- [ ] Carregar `.output/firefox-mv3/manifest.json` em `about:debugging#/runtime/this-firefox`.
- [ ] **DETE-06:** Detector numa página grande (`raio-x.html?n=3000`). Confirma `requestIdleCallback` e o tempo < 1s.
- [ ] **DETE-01:** numa página com `margin: 0 auto` (conteúdo centralizado), as margens laterais **não** devem aparecer como espaçamento. No Firefox (sem Typed OM) a regra é "margens laterais iguais = auto".
- [ ] **LUPA-01/04:** a Lupa mostra a cor certa (`#12ab34` no quadrado verde da fixture). Confirma `captureVisibleTab` + `createImageBitmap` + `getImageData` no Firefox.
- [ ] **LUPA-02:** clicar com a Lupa copia o hex (área de transferência no content script do Firefox) e mostra o toast.
- [ ] **LUPA:** em `about:addons` ou página sem captura, a Lupa avisa "Print indisponível nesta página" e desliga.
- [ ] **XRAY-01..04:** contornos, vermelho no `#vazando` e nota pré-preenchida ao clicar.
- [ ] **GRAD-03:** print com a Grade ligada sai sem a grade.

## Resultado

| Item | Chrome | Firefox | Observação |
|---|---|---|---|
| Detector | | | |
| X-ray | | | |
| Grade | | | |
| Lupa | | | |
