# Riscos e áreas frágeis

- **Internals de React/Vue não são API pública** — mudam entre versões (ex: localização da fonte do componente). Detecção deve ser best-effort e nunca quebrar a anotação.
- **`captureVisibleTab` tem limite de chamadas por segundo no Chrome** — prints precisam de fila/throttle.
- **Print só cobre a área visível** — elementos maiores que o viewport saem cortados.
- **Páginas restritas** (chrome://, lojas de extensão, about:) não aceitam injeção.
- **Estado só na sessão** — reload ou full reload do dev server apaga as anotações (decisão consciente do MVP).
- **Diferenças Chrome × Firefox no MV3** (service worker vs event page, API de print) — testar nos dois.
