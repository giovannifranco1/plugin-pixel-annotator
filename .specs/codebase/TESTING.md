# Testes (planejado)

- **Unit (Vitest):** toda lógica pura em `lib/` — geração de seletor, classificação de breakpoint, filtro de CSS, montagem do markdown, nomes de arquivos do zip. Nome do teste referencia ID do requisito (ex: `CAPT-03 classifica 390px como mobile`).
- **E2E (Playwright, Chromium):** página fixture local (HTML + app React e Vue mínimos) → ativar modo → anotar → exportar → validar conteúdo do zip.
- **Firefox:** verificação manual via `wxt -b firefox` até existir automação viável.
- Comandos: `npm test` (unit), `npm run test:e2e` — criados no scaffold.
