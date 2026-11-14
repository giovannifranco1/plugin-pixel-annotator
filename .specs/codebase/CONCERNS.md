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
- **Raio-X — heurísticas:** margem `auto` vem resolvida em px no `getComputedStyle`; o Chrome confirma pelo Typed OM, mas no Firefox (sem `computedStyleMap`) margens laterais iguais e > 0 contam como `auto` e somem do relatório. O X-ray ignora `position: fixed` (o contêiner é o viewport) e usa o `offsetParent` para `absolute`.
- **Raio-X — custo:** com o X-ray ligado, cada scroll relê o retângulo de todos os elementos (flag de sujo, sem throttle) e há um recálculo a cada 500ms. Acima de 1.500 elementos no viewport só os vazamentos são desenhados. A Lupa guarda o print inteiro da aba (`ImageData`, ~15–33MB em DPR 2) enquanto está ligada.
- **Raio-X — Firefox não verificado:** `requestIdleCallback`, clipboard no content script e `createImageBitmap`/`getImageData` da Lupa. Checklist em `.specs/features/2026-11-14-raio-x/manual-check.md`.
- **Painel em telas estreitas:** abaixo de 768px o painel se recolhe sozinho para não cobrir a página, até o dev recolher ou expandir à mão.
