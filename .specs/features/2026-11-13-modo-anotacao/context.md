# Modo Anotação — Contexto e Decisões

## Origem

Brainstorm de 2026-11-13. Partimos de ideias de extensão "divertida + pixel art" para o Claude e afunilamos para dev front. Das opções (mira de elemento, anotação em lote, caçador de bugs do console, raio-X responsivo, extrator de tokens), o dev escolheu o **Modo Anotação em lote** e acrescentou: registrar onde e em qual largura de tela (px) a anotação foi feita, para saber se o problema é no mobile, no tablet ou no desktop.

## Decisões do dev

| Tema | Decisão | Alternativas descartadas |
|---|---|---|
| Nome | PixelAnnotator (PxA) | PixelPin, Mira, Quest Log |
| Sites | Qualquer site | Só localhost; localhost + lista |
| Persistência | Só na sessão da aba | Salvar por origem (adiado para M2) |
| Componente React/Vue | No MVP | Adiar para v2 |
| Export | `.zip` (feedback.md + shots/) + copiar markdown | Só zip; salvar direto no projeto; MCP (M2) |

## Abordagem aprovada

- Injeção sob demanda pelo ícone (`activeTab` + `scripting`). Funciona em qualquer site sem pedir permissão ampla na instalação.
- Overlay e painel em Shadow DOM, com marcadores pixel art numerados e cor por categoria de tela.
- Script no main world para ler internals de React/Vue (best-effort).
- Print via `captureVisibleTab` no background, recortado no content com o elemento destacado.

## Riscos aceitos

- Reload da página apaga anotações (escolha consciente; mitigação: aviso antes de sair com anotações não exportadas).
- Detecção de componente depende de internals não públicos — falha silenciosa para seletor.
