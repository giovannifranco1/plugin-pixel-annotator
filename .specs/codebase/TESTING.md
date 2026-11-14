# Testes

| Comando | O que roda |
|---|---|
| `npm test` | Unit (Vitest + happy-dom): 30 arquivos, 178 testes |
| `npm run test:e2e` | `wxt build --mode e2e` + Playwright no Chromium: 36 testes |
| `npm run compile` | `tsc --noEmit` (inclui os testes) |
| `npm run screenshots` | Regera os prints do README (`media/`) com a página `demo.html`; não é teste |
| `npm run check:manifest` | Builds de produção: MV3, só `activeTab` + `scripting` + `storage` (Q-01, só para o Perfil), sem host permissions nem content scripts (PLAT-01) |

**Gate full** (antes de commit): `npm run compile && npm test && npm run build && npm run build:firefox && npm run check:manifest && npm run test:e2e`. Em worktrees paralelos, defina `PXA_E2E_PORT` (o andar Diversão usa 5175).

## Padrões

- **Nome do teste começa pelo ID do requisito** (ex: `CAPT-03 breakpoint nas fronteiras`, `PAIN-06 SPA: ...`).
- **Unit:** toda lógica pura em `lib/`. Os módulos de UI são testados no happy-dom com o host real (`createHost()`). O background usa o `fakeBrowser` (`wxt/testing/fake-browser`) e `spy()` com tipo livre, porque as assinaturas do `@wxt-dev/browser` não descrevem os retornos.
- **Listeners em `window`:** todo controller criado num teste é desativado no teardown. Senão o interceptor de um teste bloqueia os cliques do seguinte.
- **E2E:** o build `--mode e2e` (`.output/chrome-mv3-e2e`) recebe `host_permissions: <all_urls>` e expõe `__pxaToggle` no service worker, porque o Playwright não clica no ícone da extensão. O build de produção nunca recebe isso. O harness (`tests/e2e/harness.ts`) traz os helpers `toggle`, `annotate`, `exportZip` (expande o painel se estiver recolhido), `pngSize`, `activeTabId` e os locators `pxa/panel/items/markers/editor/toast`, que atravessam o shadow root aberto.
- **Fixtures E2E** (`tests/e2e/fixtures/`, servidas pelo Vite na porta 5174, ou na `PXA_E2E_PORT` quando definida): HTML estático com CSS hostil e z-index alto, React 19 sem JSX, Vue 3 com `__file`, SPA com `pushState` e `demo.html`, um painel de clientes em React usado só nos prints do README.

- **Perfil (storage):** unit com `fakeBrowser.storage.local` (`fakeBrowser.reset()` no `beforeEach`) ou `createProfileStorage(undefined)` (memória). No E2E cada teste abre um perfil de navegador novo, então o Perfil começa zerado.
- **Outra origem no E2E:** `context.route('http://x.test/**', …)` serve páginas de teste (inclusive com header CSP). Limitação: **anotar** nessas páginas falha na captura desde o M1 (ver CONCERNS); use-as para o que não depende da captura.
- **Timers da Diversão:** `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })` e espere a fila do storage com `await storage.load()` em vez de contar microtasks.

## Parallel-safe

| Tipo | Parallel-safe |
|---|---|
| Unit | Sim |
| E2E | Não (`workers: 1`, um navegador com extensão por teste) |

## Firefox

Verificação manual: `.specs/features/2026-11-13-modo-anotacao/manual-check.md`. O Firefox não está instalado na máquina de desenvolvimento e o Playwright não carrega extensões no Firefox.
