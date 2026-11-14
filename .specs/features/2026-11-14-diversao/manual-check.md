# Diversão — Checklist manual (dev)

Tudo que roda em Chromium está coberto por `npm test` (192) e `PXA_E2E_PORT=5175 npm run test:e2e` (34). Este checklist cobre o que só dá para ver ou ouvir à mão, e o Firefox (não instalado na máquina de desenvolvimento).

## Preparação

```bash
npm run build          # .output/chrome-mv3
npm run build:firefox  # .output/firefox-mv3
```

## Chrome

- [ ] **Q-01:** reinstalar a extensão e conferir que a instalação **não** mostra aviso novo por causa de `storage`.
- [ ] **Q-02:** abrir `assets/mascot-preview.html` e aprovar (ou pedir ajuste) a arte dos 5 humores.
- [ ] **MASC-02/03/04:** anotar em desktop (feliz), em 390px (susto), exportar (festa) e esperar 60s parado (dormindo).
- [ ] **SOM-01..03:** ligar o som no 🔇 e ouvir: blip ao salvar, fanfarra no `.zip`, jingle numa conquista. Volume baixo, nada passa de ~0,8s.
- [ ] **TEMA-01/05:** passar pelos 5 temas e conferir a leitura do painel, do editor de nota e do toast; no CRT, as scanlines no painel.
- [ ] **EGG-01:** com o modo ativo, digitar ↑↑↓↓←→←→BA fora do editor.
- [ ] **CONQ-07:** abrir o PxA em dois sites diferentes e ver o mesmo `Nv` e as mesmas conquistas.

## Firefox ≥ 128

- [ ] **Q-01/CONQ-07:** o Perfil persiste após fechar e reabrir a aba (`storage.local`), e uma segunda aba vê o XP da primeira (`storage.local.onChanged`).
- [ ] **SOM-04:** ligar o som e anotar: os sons tocam, ou falham em silêncio (sem erro no console da página).
- [ ] **MASC-05:** com "reduzir movimento" ligado no sistema, o mascote troca de quadro sem animar.
- [ ] **TEMA-02:** trocar de tema aplica na hora.

## Resultado

Anotar aqui o que falhou, com navegador e versão.
