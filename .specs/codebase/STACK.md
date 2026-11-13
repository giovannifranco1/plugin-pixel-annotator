# Stack

> Greenfield — nada instalado ainda. Versões serão fixadas no scaffold e este doc atualizado.

| Camada | Escolha | Motivo |
|---|---|---|
| Framework de extensão | WXT | Um código → builds MV3 Chrome e Firefox, hot reload, `browser.*` unificado |
| Linguagem | TypeScript (strict) | Contratos claros entre content script, background e main world |
| UI injetada | DOM + CSS puro dentro de Shadow DOM | Isolamento do CSS da página, bundle pequeno |
| Zip | fflate | Leve, roda no browser |
| Fonte pixel | fonte bitmap embutida (licença livre, a definir) | Identidade pixel art |
| Testes unit | Vitest (+ happy-dom/jsdom) | Padrão do ecossistema WXT |
| Testes E2E | Playwright (Chromium com extensão carregada) | Fluxo real de anotação/export |
| Gerenciador | npm (node 22) | Já instalado na máquina |
