# Stack

> Versões fixadas no `package-lock.json` (scaffold de 2026-11-13).

| Camada | Escolha | Versão | Motivo |
|---|---|---|---|
| Framework de extensão | WXT | 0.21.5 | Um código → builds MV3 Chrome e Firefox, hot reload, `browser.*` unificado |
| Linguagem | TypeScript (strict + `noUncheckedIndexedAccess`, via `.wxt/tsconfig.json`) | 7.0.2 | Contratos claros entre content script, background e main world |
| UI injetada | DOM + CSS puro dentro de Shadow DOM | — | Isolamento do CSS da página, bundle pequeno (~34 kB o annotator) |
| Zip | fflate | 0.8.3 | Leve, roda no browser; PNGs entram sem deflate (`level: 0`) |
| Sons | Web Audio API (osciladores `square`/`triangle`) | — | Sons 8-bit sem arquivos de áudio (Diversão) |
| Fonte | `ui-monospace`/`monospace` com estética pixel (bordas e sombras em degrau) | — | Default do design; sem fonte embutida no MVP |
| Testes unit | Vitest + happy-dom + `WxtVitest()` | 5.1.0 / 21.0.4 | Padrão do ecossistema WXT; `fakeBrowser` para as APIs da extensão |
| Testes E2E | Playwright (Chromium headless com extensão carregada) | 1.65.0 | Fluxo real de anotação/export |
| Fixtures E2E | Vite (servidor), React 19, Vue 3 | 8.3.8 / 19.3.1 / 3.5.45 | Só devDependencies, para as páginas de teste |
| Gerenciador | npm (node 22) | 10.9 / 22.20 | Já instalado na máquina |

**Alvos:** Chrome ≥ 95, Firefox ≥ 128 (`browser_specific_settings.gecko`), ambos MV3 (`manifestVersion: 3` no `wxt.config.ts`; sem isso o WXT gera MV2 para Firefox).
