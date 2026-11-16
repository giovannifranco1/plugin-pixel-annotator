# Changelog — Contexto e decisões

**Data:** 2026-11-16 · **Escopo:** Medium · **Pedido do dev:** "um changelog na extensão, dentro do dropdown de ações, para ver os changelogs".

## Decisões do discovery

| # | Pergunta | Decisão | Alternativa descartada |
|---|---|---|---|
| D1 | De onde vêm os itens? | **`CHANGELOG.md` manual na raiz**, em PT-BR, escrito para quem usa a extensão. Entra no bundle no build; a extensão só lê. | Gerar dos commits entre tags: automático, mas o texto fica técnico (scopes, merges, chores). |
| D2 | Como aparece? | **Janela própria arrastável**, no mesmo molde do relatório do Detector (`makeDraggable`, Esc/× fecham). | Trocar a lista do Painel pelo changelog: some com as anotações e precisa de "voltar". |
| D3 | Aviso de novidade? | **Sim: um ponto no ⋮ do cabeçalho e no item "Changelog"** até o dev abrir a janela. A última versão vista fica no Perfil (`storage.local`, permissão já aprovada em Q-01). | Só o item no menu, sem aviso. |
| D4 | Referência "/upi" | Dev disse "esquece": sem modelo externo. Formato segue a lista por versão, mais nova em cima. | — |

## Decisões do agente (não perguntadas, registradas para revisão)

- **Instalação nova não mostra o ponto.** Sem versão vista gravada, o PxA grava a versão atual em silêncio: quem acabou de instalar não tem "novidade". O ponto só aparece quando a versão do manifest é maior que a última vista.
- **Nome do item no menu: "Changelog"** (decisão do dev, 2026-11-16, revoga a proposta "Novidades"), título da janela "Changelog do PxA". Feature e branch também se chamam `changelog`.
- **Item no fim do menu, depois de Exportar .zip, separado por linha**: não é uma ação sobre as anotações.
- **Versão vem de `browser.runtime.getManifest().version`** (o WXT copia do `package.json`), não do CHANGELOG.
- **Parser sem lib de Markdown**: o formato é restrito (`## X.Y.Z — AAAA-MM-DD` + bullets `- `), com `**negrito**` e `` `código` `` como único inline. Sem dependência nova.
- **CHANGELOG inicial** cobre 1.0.0, 1.1.0 e 1.2.0, reescrito a partir dos `feat`/`fix` de cada tag.
