# Raio-X — Contexto e Decisões

## Origem

Conversa de 2026-11-14 sobre "o que mais a extensão poderia ter". O dev aprovou o grupo **Raio-X** inteiro: detector de bagunça de design system (6), lupa pixel (7), grade de 8px e linha de base (8) e modo X-ray (9). Pediu uma spec por grupo e um andar do Maestri para cada, trabalhando em paralelo.

## Decisões

| Tema | Decisão |
|---|---|
| Agrupamento | Itens 6–9 numa feature só ("Raio-X") |
| Prioridade | Detector e X-ray são P1 (o detector foi o mais elogiado na conversa); Grade e Lupa são P2 |
| Permissões | Nenhuma nova. A Lupa usa a mesma captura do print (`captureVisibleTab` via `activeTab`) |
| Página | Nunca alterada: tudo desenhado no Shadow DOM do PxA |

## Ideias descartadas pelo dev na mesma conversa

- Ditar a nota por voz (15)
- "Como cheguei aqui" (13)
