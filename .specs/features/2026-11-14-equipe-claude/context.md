# Equipe e Claude — Contexto e Decisões

## Origem

Conversa de 2026-11-14 sobre "o que mais a extensão poderia ter". Do grupo "Equipe e Claude", o dev aprovou: modo apresentação (10), desenho livre no print (11), importar sessão (12) e erros do console junto da nota (14). Pediu uma spec por grupo e um andar do Maestri para cada, trabalhando em paralelo.

## Decisões

| Tema | Decisão |
|---|---|
| Itens incluídos | 10, 11, 12 e 14 |
| Itens descartados | 13 ("como cheguei aqui") e 15 (ditar por voz) |
| Prioridade | Apresentação e Erros do console são P1; Desenho e Importar são P2 |
| Formato do export | Ganha `pxa.json` (manifesto versionado) para o import; o `feedback.md` continua sendo o que o Claude lê |
| Privacidade da rede | Só método, URL sem query/fragmento e status. Sem corpo nem headers |
| Permissões | Nenhuma nova |
