# Arquitetura (planejada)

Contextos de execução da extensão:

- **Background (service worker / event page):** recebe clique no ícone, injeta o content script via `scripting` + `activeTab`, tira print com `tabs.captureVisibleTab`.
- **Content script (isolated world):** overlay de anotação (Shadow DOM), estado das anotações em memória, seletor, CSS computado, montagem do markdown/zip.
- **Main-world script:** lê internals de React/Vue (`__reactFiber$*`, `__vueParentComponent`) que o isolated world não enxerga; responde via `postMessage`/CustomEvent.

Fluxo: ícone → background injeta → content ativa overlay → clique no elemento → content pede componente ao main world e print ao background → anotação montada → export gera zip/markdown no content.

Detalhes no `design.md` da feature Modo Anotação.
