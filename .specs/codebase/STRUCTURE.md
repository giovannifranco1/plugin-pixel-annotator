# Estrutura (planejada, padrão WXT)

```
pixel-annotator/
├── entrypoints/
│   ├── background.ts
│   ├── annotator.content/   # content script injetado sob demanda
│   └── component-probe.ts   # script main world (React/Vue)
├── lib/                     # lógica pura testável (selector, breakpoint, markdown, css)
├── assets/                  # sprites, fonte pixel
├── public/icon/             # ícones da extensão
├── tests/                   # unit (Vitest) e e2e (Playwright)
├── .specs/
└── wxt.config.ts
```
