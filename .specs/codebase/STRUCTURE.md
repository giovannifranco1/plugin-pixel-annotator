# Estrutura

```
pixel-annotator/
├── entrypoints/
│   ├── background.ts             # toggle/injeção, badge, fila de captureVisibleTab
│   ├── component-probe.ts        # main world: detecta componente React/Vue
│   └── annotator.content/        # content script (registration: 'runtime', sem matches)
│       ├── index.ts              # entrada: guarda de injeção única + listener pxa:toggle
│       ├── controller.ts         # máquina de estados e montagem
│       ├── interceptor.ts        # bloqueio de cliques/hover na captura em window
│       ├── capture.ts            # contexto da anotação
│       ├── screenshot.ts         # print: esconder UI, fotografar, recortar
│       ├── default-style.ts      # CSS padrão por tag (iframe no shadow root)
│       ├── probe-client.ts       # ponte com o probe do main world
│       ├── exporter.ts           # .zip e copiar markdown
│       ├── unload-guard.ts       # aviso de saída (AVIS-01)
│       ├── tick.ts               # laço requestAnimationFrame
│       └── ui/                   # host (Shadow DOM), dom (el()), styles, overlay, note-editor, markers, panel, toast
├── lib/                          # lógica pura testável
│   ├── types.ts  store.ts  messages.ts  format.ts
│   ├── selector.ts  viewport.ts  css-filter.ts  outer-html.ts  crop.ts  resolve.ts
│   ├── markdown.ts  export-names.ts  capture-queue.ts  component-detect.ts
├── public/icon/                  # ícones pixel 16/32/48/128 (gerados por scripts/gen-icons.mjs)
├── media/                        # imagens do README: icon.png (256) e prints (npm run screenshots)
├── scripts/                      # check-manifest.mjs (PLAT-01), gen-icons.mjs, screenshots/ (prints do README)
├── tests/
│   ├── unit/                     # Vitest (+ fixtures/annotations.ts, __snapshots__)
│   └── e2e/                      # Playwright: harness.ts, *.spec.ts, fixtures/ (html, react, vue, spa, demo)
├── .specs/
├── README.md
├── wxt.config.ts  vitest.config.ts  playwright.config.ts  playwright.screenshots.config.ts  tsconfig.json
└── .output/                      # builds (ignorado): chrome-mv3, firefox-mv3, chrome-mv3-e2e
```
