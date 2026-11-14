# Integrações

- **APIs do navegador:**
  - `action` (clique, badge e título por aba) e `scripting.executeScript` (com `files` e `func`, `world: 'MAIN'` para o probe), autorizados por `activeTab`.
  - `tabs.captureVisibleTab`: no Firefox funciona só com `activeTab` a partir da versão 126 (bug 1784920).
  - `runtime.onMessage` / `tabs.sendMessage`.
  - Download via `<a download>` com blob, **sem** a permissão `downloads`.
  - Clipboard via `navigator.clipboard.writeText` a partir do clique do dev.
- **Frameworks da página (leitura, não dependência):**
  - React: `__reactFiber$*`/`__reactInternalInstance$*`, com `_debugSource` só até o React 18 em dev.
  - Vue 3: `__vueParentComponent`, com `type.__file` em dev.
  - Vue 2: `__vue__`, com `$options.__file`.
- **APIs da página envolvidas pelo probe (main world):** `console.error`, `fetch`, `XMLHttpRequest.prototype.open/send` e os eventos `error`/`unhandledrejection` de `window`. O wrapper sempre chama o que encontrou (Sentry, Datadog) e devolve o mesmo resultado.
- **Claude Code:** consumidor do export (`feedback.md` + `shots/`). Sem integração direta no MVP; ponte MCP planejada para M2.
- **Outro PxA:** consome o `pxa.json` do export pelo "Importar .zip" (esquema versionado, `schemaVersion: 1`).
