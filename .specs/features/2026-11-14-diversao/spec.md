# Diversão — Especificação

> **Status:** Implementada em 2026-11-14 (andar Diversão). Design, tasks e checklist manual nesta pasta. Q-02 (arte do mascote) aguarda confirmação do dev: `assets/mascot-preview.html`.
> **Branch:** `feature/ui-diversao` (andar "Diversão" no Maestri), a partir de `develop` em `91e6134`.

## Problema

O PxA já funciona, mas é uma ferramenta "séria" com cara de pixel art e nada mais. O que faz a galera instalar, usar de novo e mostrar pros colegas é o charme: reação, recompensa, som e personalização. Hoje anotar 20 ajustes é trabalho repetitivo sem nenhum retorno além da lista.

## Objetivos

- [ ] O PxA tem personalidade visível: um mascote que reage ao que o dev faz.
- [ ] Usar o PxA dá pequenas recompensas (XP, nível, conquistas) que persistem entre sessões.
- [ ] Tudo é opcional e nunca atrapalha o fluxo de anotar: sem modal bloqueante, sem som por padrão.
- [ ] Nenhuma permissão nova além de `storage`, aprovada pelo dev só para o Perfil (Q-01). Nada sai do navegador.

## Fora do Escopo

| Item | Motivo |
|---|---|
| Ranking entre devs, perfil online, compartilhar conquistas | Exigiria servidor; o PxA não envia nada |
| Mascote reagindo a erros do console | Depende da captura de erros da feature "Equipe e Claude" (ERRO-*); fica como evolução |
| Editor de mascote / skins compradas | Escopo de produto, não de MVP |
| Arquivos de áudio | Sons gerados com Web Audio; zero assets de áudio |
| Mudar a cor dos marcadores por tema | Cores de categoria (verde/amarelo/azul) são semânticas e ficam fixas |

---

## Glossário

| Termo | Definição canônica |
|---|---|
| Mascote | Personagem pixel art 16×16 (desenhado em 2× ou 3×) no cabeçalho do Painel, com estados de humor |
| Humor | Estado visual do Mascote: `idle`, `feliz`, `susto`, `festa`, `dormindo` |
| XP | Pontos ganhos por ações no PxA; acumulam entre sessões |
| Nível | Faixa de XP; mostrado como `Nv 3` no Painel |
| Conquista | Marco desbloqueável com nome, ícone pixel e descrição; vale uma vez |
| Tema | Paleta da UI do PxA (painel, editor, overlay, toast) |
| Perfil | Registro persistido de XP, conquistas e preferências (tema, som) |

---

## User Stories

### P1: Mascote no painel ⭐

**User Story**: Como dev, quero um bichinho pixel no painel que reage ao que eu faço, para o PxA ter personalidade.

**Critérios de Aceite**:

1. QUANDO o Painel está aberto ENTÃO o sistema DEVE mostrar o Mascote no cabeçalho, à esquerda do título, também no Painel recolhido. (MASC-01)
2. QUANDO uma anotação é salva ENTÃO o Mascote DEVE ficar `feliz` por ~1,5s; se a anotação foi feita em categoria `mobile`, DEVE fazer `susto` em vez de `feliz`. (MASC-02)
3. QUANDO um `.zip` é exportado ou o markdown é copiado ENTÃO o Mascote DEVE ficar em `festa` por ~2s. (MASC-03)
4. QUANDO não há interação com o PxA (hover, clique, tecla no editor) por 60s ENTÃO o Mascote DEVE ir para `dormindo`, e voltar a `idle` na próxima interação. (MASC-04)
5. QUANDO o sistema tem `prefers-reduced-motion: reduce` ENTÃO os humores DEVEM trocar de quadro sem animação contínua. (MASC-05)
6. O Mascote DEVE ser SVG com `shape-rendering="crispEdges"` gerado a partir de grades de pixel, no mesmo padrão de `ui/icons.ts` (sem PNG). (MASC-06)

### P1: XP, nível e conquistas ⭐

**User Story**: Como dev, quero ganhar XP e desbloquear conquistas enquanto anoto, para dar vontade de usar.

**Critérios de Aceite**:

1. QUANDO uma anotação nova é salva ENTÃO o Perfil DEVE ganhar 10 XP; editar ou excluir não dá XP. (CONQ-01)
2. QUANDO um `.zip` é exportado com N anotações ainda não exportadas ENTÃO o Perfil DEVE ganhar 5×N XP. (CONQ-02)
3. O Nível DEVE seguir uma curva fixa definida no Design (ex: Nv n exige `50·n·(n+1)/2` XP) e aparecer no cabeçalho como `Nv n` com barra de progresso pixel. (CONQ-03)
4. QUANDO uma condição de Conquista é satisfeita pela primeira vez ENTÃO o sistema DEVE desbloqueá-la, persistir, mostrar um toast pixel `🏆 <nome>` e o Mascote em `festa`. (CONQ-04)
5. O MVP DEVE ter ao menos estas Conquistas (catálogo em `lib/`, puro e testável): (CONQ-05)
   - **Primeiro Pixel:** primeira anotação de todas.
   - **Caçador Mobile:** 10 anotações em categoria `mobile` (acumulado).
   - **Pixel Perfect:** na mesma aba, anotações nas 3 categorias de tela.
   - **Speedrun:** 5 anotações em menos de 60s.
   - **Quest Completa:** primeiro `.zip` exportado.
   - **Maratona:** 20 anotações na mesma aba.
   - **Código Secreto:** Konami code (ver EGG-01).
6. O Painel DEVE ter uma visão "Conquistas" (aberta por um ícone no cabeçalho) listando todas, com as bloqueadas em silhueta e descrição `???` para as secretas. (CONQ-06)
7. O Perfil DEVE persistir entre sessões e abas, e ser compartilhado por todas as origens (é do dev, não do site). (CONQ-07)

### P2: Sons 8-bit opcionais

**User Story**: Como dev, quero sons de videogame ao anotar e exportar, para dar sensação de recompensa, mas desligados por padrão.

**Critérios de Aceite**:

1. O som DEVE começar **desligado** e ter um botão 🔈/🔇 no Painel; a escolha persiste no Perfil. (SOM-01)
2. COM som ligado, QUANDO uma anotação é salva ENTÃO o sistema DEVE tocar um *blip* curto; QUANDO exporta, uma fanfarra curta; QUANDO desbloqueia Conquista, um jingle. (SOM-02)
3. Os sons DEVEM ser sintetizados com Web Audio (osciladores quadrados/triangulares), sem arquivos de áudio, com duração ≤ 800ms e volume baixo fixo. (SOM-03)
4. Falha do Web Audio (bloqueado pelo navegador ou pela CSP da página) DEVE ser silenciosa. (SOM-04)

### P2: Temas de paleta

**User Story**: Como dev, quero trocar a paleta do PxA, para combinar com meu gosto.

**Critérios de Aceite**:

1. O sistema DEVE oferecer os Temas: `Padrão` (atual, rosa), `Game Boy` (4 tons de verde), `NES`, `CRT` (escuro com scanlines no painel) e `Noite` (escuro). (TEMA-01)
2. A troca de Tema DEVE ser feita por um seletor no Painel e aplicar na hora, sem recarregar; a escolha persiste no Perfil. (TEMA-02)
3. Os Temas DEVEM ser implementados com custom properties em `ui/styles.ts` (a paleta atual vira o Tema `Padrão`), sem duplicar o CSS. (TEMA-03)
4. As cores de categoria dos Marcadores (verde/amarelo/azul) NÃO DEVEM mudar com o Tema. (TEMA-04)
5. Todo Tema DEVE manter contraste ≥ 4.5:1 entre texto e fundo no Painel e no editor. (TEMA-05)

### P3: Easter egg

**Critérios de Aceite**:

1. QUANDO o modo está ativo e o dev digita ↑↑↓↓←→←→BA (fora do editor de nota) ENTÃO o sistema DEVE desbloquear **Código Secreto**, fazer o Mascote dançar e, com som ligado, tocar o jingle. (EGG-01)
2. O listener do Konami NÃO DEVE impedir as teclas de chegarem à página. (EGG-02)

---

## Casos Limite

- Muitas Conquistas de uma vez (ex: a 1ª anotação também completa outra): toasts em fila, um por vez.
- Perfil corrompido ou de versão antiga: descartar o campo inválido e seguir, sem quebrar o modo.
- Duas abas anotando ao mesmo tempo: o XP soma nas duas; gravação deve ler-modificar-gravar sem perder pontos (ou aceitar perda mínima, decidir no Design).
- Sem permissão de storage (Q-01 negada): XP e Conquistas valem só para a aba; a UI continua igual.
- Página com CSP restritiva: Web Audio e SVG inline funcionam no isolated world; validar no E2E.
- Painel recolhido no mobile: Mascote e `Nv` cabem na barra; visão Conquistas abre o painel.

## Questões em Aberto

- **Q-01 (decidida em 2026-11-14: aprovada a permissão `storage` só para o Perfil):** Persistir o Perfil exige a permissão `storage` (`chrome.storage.local`). Ela **não gera aviso** na instalação, mas o CLAUDE.md pede decisão registrada para permissão nova. Recomendação: aprovar `storage` só para o Perfil. As anotações continuam só na sessão (decisão do M1 mantida).
- **Q-02:** Arte do Mascote. Proposta: um alfinete rosa com olhos (o mesmo do ícone) para manter a marca. Confirmar no Design com um preview.

## Coordenação entre andares

Três features rodam em paralelo a partir do mesmo `develop`: **Diversão**, **Raio-X** e **Equipe e Claude**. As três mexem no Painel. Para reduzir conflito no merge:

- Código novo em módulos próprios (`ui/mascot.ts`, `lib/achievements.ts`, `lib/profile.ts`, `ui/sound.ts`, `ui/themes.ts`).
- Em `ui/panel.ts` e `ui/styles.ts`, mudanças pequenas e localizadas: um ponto de inserção no cabeçalho para o Mascote/`Nv`, nada de reorganizar o arquivo.
- Eventos de "anotação salva" e "exportou" já saem do `store` (`markExported` emite); preferir ouvir o `store` a mexer no `controller.ts`.
- Esta feature é a dona dos **Temas**: as outras usam as cores atuais em `styles.ts`; quem fizer merge depois converte para as custom properties.

---

## Rastreabilidade de Requisitos

| ID | Story | Status |
|---|---|---|
| MASC-01..06 | Mascote no painel | Verified (unit `mascot`/`fun`, E2E `fun.spec`; MASC-05 com `emulateMedia`) |
| CONQ-01..07 | XP, nível e conquistas | Verified (unit `achievements`/`profile`/`profile-storage`/`fun`, E2E recarregar + outra origem) |
| SOM-01..04 | Sons 8-bit | Verified (unit `sound`/`fun`; E2E com CSP). Ouvir os sons: checklist manual |
| TEMA-01..05 | Temas de paleta | Verified (unit `themes` com contraste WCAG, E2E troca/persistência/marcador) |
| EGG-01..02 | Easter egg | Verified (unit `konami`/`fun`, E2E teclas chegam à página) |

## Critérios de Sucesso

- [ ] Em uma sessão de 5 anotações + export, o dev vê o Mascote reagir pelo menos 3 vezes e desbloqueia ao menos 2 Conquistas.
- [x] Nenhuma regressão nos 127 testes unitários e 27 E2E do M1 (agora 192 unit e 34 E2E).
- [x] `check:manifest` atualizado: só `activeTab`, `scripting` e `storage`.
