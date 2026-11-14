# Riscos e áreas frágeis

- **Internals de React/Vue não são API pública:** mudam entre versões. O React 19 já removeu `_debugSource`, então o arquivo de origem não aparece. A detecção é best-effort (`lib/component-detect.ts`), com timeout de 300ms, e nunca quebra a anotação.
- **`captureVisibleTab` tem limite de chamadas por segundo no Chrome.** Mitigado pela fila com intervalo de 550ms no background.
- **O print só cobre a área visível.** Elementos maiores que o viewport saem cortados, com a marcação `(print parcial)`.
- **Páginas restritas** (`chrome://`, lojas de extensão, `about:`, visualizador de PDF) não aceitam injeção. O ícone mostra o badge `!`.
- **Estado só na sessão:** reload ou full reload do dev server apaga as anotações (decisão consciente do MVP). O aviso de saída (AVIS-01) ameniza isso. A persistência por origem está no M2.
- **Diferenças Chrome × Firefox no MV3:** três pontos ainda **não verificados no Firefox**, com checklist em `manual-check.md` (mais `storage.local.onChanged`, Web Audio e animações da Diversão em `.specs/features/2026-11-14-diversao/manual-check.md`): o `beforeunload` registrado no content script, o `world: 'MAIN'` e o print com `activeTab`.
- **Ordem dos listeners:** um listener da página registrado em `window`/captura **antes** da injeção do PxA ainda roda antes do interceptor. É uma limitação aceita.
- **Top layer:** `<dialog>` modal e `popover` da página podem cobrir a UI do PxA. É uma limitação aceita.
- **Atributo temporário `data-pxa-probe`:** o probe marca o elemento por alguns milissegundos, e isso pode acordar um `MutationObserver` da página.
- **Perfil entre abas (Diversão):** gravação ler → modificar → gravar em fila por aba; duas abas trocando tema/som no mesmo milissegundo: vale a última gravação.
- **`ui/styles.ts` todo em custom properties:** merges de outras features que tragam cores em hex precisam convertê-las para `var(--pxa-*)` (e o teste TEMA-03 acusa hex fora do lugar).
- **Anotar em página servida por `context.route` falha no E2E** ("Falha ao anotar"), já no commit base do M1. Causa não investigada (fora do escopo da Diversão); provavelmente a captura de print. Só afeta testes que usam páginas roteadas.
- **Raio-X — heurísticas do Detector:** margem `auto` e `%` vêm resolvidas em px no `getComputedStyle`; o Chrome confirma pelo Typed OM, mas no Firefox (sem `computedStyleMap`) margens laterais iguais e > 0 contam como `auto` (some uma margem simétrica de verdade, ex: `margin: 0 16px`) e percentual não é detectável. "Fonte padrão do navegador" usa uma lista de famílias (Times, Arial, system-ui…): uma página que escolhe Roboto ao lado de Inter pode dar falso positivo. As constantes de raridade (`RARITY`) foram calibradas em 4 sites reais.
- **Raio-X — custo:** a Lupa guarda o print inteiro da aba (`ImageData`, ~15–33MB em DPR 2) enquanto está ligada. O Detector roda em ~65ms com 1.200 elementos e ~400ms no limite de 10.000.
- **Raio-X — Firefox não verificado:** `requestIdleCallback`, clipboard no content script, `createImageBitmap`/`getImageData` da Lupa e o nome da família do `<button>`. Checklist em `.specs/features/2026-11-14-raio-x/manual-check.md`.
- **Painel em telas estreitas:** abaixo de 768px o painel se recolhe sozinho para não cobrir a página, até o dev recolher ou expandir à mão.
