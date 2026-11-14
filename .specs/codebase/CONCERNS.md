# Riscos e áreas frágeis

- **Internals de React/Vue não são API pública:** mudam entre versões. O React 19 já removeu `_debugSource`, então o arquivo de origem não aparece. A detecção é best-effort (`lib/component-detect.ts`), com timeout de 300ms, e nunca quebra a anotação.
- **`captureVisibleTab` tem limite de chamadas por segundo no Chrome.** Mitigado pela fila com intervalo de 550ms no background.
- **O print só cobre a área visível.** Elementos maiores que o viewport saem cortados, com a marcação `(print parcial)`.
- **Páginas restritas** (`chrome://`, lojas de extensão, `about:`, visualizador de PDF) não aceitam injeção. O ícone mostra o badge `!`.
- **Estado só na sessão:** reload ou full reload do dev server apaga as anotações (decisão consciente do MVP). O aviso de saída (AVIS-01) ameniza isso. A persistência por origem está no M2.
- **Diferenças Chrome × Firefox no MV3:** três pontos ainda **não verificados no Firefox**, com checklist em `manual-check.md`: o `beforeunload` registrado no content script, o `world: 'MAIN'` e o print com `activeTab`.
- **Ordem dos listeners:** um listener da página registrado em `window`/captura **antes** da injeção do PxA ainda roda antes do interceptor. É uma limitação aceita.
- **Top layer:** `<dialog>` modal e `popover` da página podem cobrir a UI do PxA. É uma limitação aceita.
- **Atributo temporário `data-pxa-probe`:** o probe marca o elemento por alguns milissegundos, e isso pode acordar um `MutationObserver` da página.
- **Hooks de `fetch`/XHR no main world:** observar a promise do `fetch` marca a rejeição como tratada; se a página chamar `fetch()` sem encadear nada, deixa de sair o `unhandledrejection` dela (o erro de rede continua registrado). `console.error` com objeto grande paga um `JSON.stringify` inteiro antes do corte em 500 caracteres.
- **Privacidade do Registro de erros:** só query e fragmento saem da URL; tokens no caminho continuam. Documentado no README; o dev revisa a lista no editor antes de salvar.
- **Import:** `unzipSync` roda na thread da página; um `.zip` perto do limite (50 MB) pode travar a página por um instante. O limite de 100 MB descompactados usa o tamanho declarado no cabeçalho do zip.
- **Bytes da página no Firefox:** objetos DOM (File, Blob do canvas) chegam ao content script por Xray; métodos de typed array que leem `constructor` (`subarray`, `slice`, `map`) falham com "Permission denied". Entrada de arquivo passa por `ownBytes()` (`lib/import.ts`). O export usa só `set` no fflate e funciona.
- **Firefox ainda não verificado** para o Registro de erros, a Apresentação, o Desenho e o Importar: checklist em `.specs/features/2026-11-14-equipe-claude/manual-check.md`.
- **Painel em telas estreitas:** abaixo de 768px o painel se recolhe sozinho para não cobrir a página, até o dev recolher ou expandir à mão.
