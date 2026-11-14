# Diversão — Checklist manual (dev)

Tudo que roda em Chromium está coberto por `npm test` (178) e `PXA_E2E_PORT=5175 npm run test:e2e` (36). Este checklist cobre o que só dá para ver ou ouvir à mão, e o Firefox (não instalado na máquina de desenvolvimento).

## Preparação

```bash
npm run build          # .output/chrome-mv3
npm run build:firefox  # .output/firefox-mv3
```

## Chrome

- [ ] **Q-01:** reinstalar a extensão e conferir que a instalação **não** mostra aviso novo por causa de `storage`.
- [ ] **MASC-06:** o alfinete mais magro (Revisão 2) ficou como você queria? Preview: `assets/mascot-preview.html`.
- [ ] **MASC-02/03/04:** anotar em desktop (feliz), em 390px (susto), exportar (festa) e esperar 60s parado (dormindo).
- [ ] **TEMA-01:** trocar entre Padrão e Noite: painel, editor e toast mudam de cor; o mascote continua rosa.
- [ ] **SOM-01..03:** ligar o som no alto-falante e ouvir: blip ao salvar, fanfarra no `.zip`, jingle no Konami.
- [ ] **EGG-01:** com o modo ativo, digitar ↑↑↓↓←→←→BA fora do editor: o mascote dança.
- [ ] **TEMA-02:** abrir o PxA em dois sites diferentes e ver o mesmo tema e o mesmo som.

## Firefox ≥ 128

- [ ] **Q-01:** tema e som persistem após fechar e reabrir a aba (`storage.local`), e uma segunda aba recebe a troca (`storage.local.onChanged`).
- [ ] **SOM-04:** ligar o som e anotar: os sons tocam, ou falham em silêncio (sem erro no console da página).
- [ ] **MASC-05:** com "reduzir movimento" ligado no sistema, o mascote troca de quadro sem animar.

## Resultado

Anotar aqui o que falhou, com navegador e versão.
