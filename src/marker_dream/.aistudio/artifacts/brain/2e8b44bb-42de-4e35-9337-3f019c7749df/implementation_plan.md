# Sistema Test Spawn no Menu do Jogador & Editor Dedicado de Inventários e Itens do Game

Implementação de um laboratório interativo de **Test Spawn (em Anel e Manual 1 a 1)** diretamente no Menu do Jogador para testar coleta real no mapa, aliado a um **Editor Completo de Inventários & Itens do Game** acessível no topo da engine e integrado ao fluxo do Jogador, com auto-registro imediato ao importar PNGs/pastas e Modal de Registro detalhado sob demanda.

## User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo refletem suas escolhas confirmadas e definem como o sistema funcionará de ponta a ponta:

- **Decisão Confirmada 1 — Acesso ao Editor de Inventários & Itens**: Será criado um **Editor Dedicado de Inventários & Itens do Game** acessível diretamente pela barra superior da Engine (ao lado de Personagens e Mapa Global) e também integrado com atalho direto dentro do **Menu do Jogador** e do **Editor de Personagens**.
- **Decisão Confirmada 2 — Fluxo de Registro de Itens (Híbrido sem Burocracia)**: Ao importar uma pasta ou múltiplos PNGs, todos os arquivos recebem **auto-registro instantâneo** no catálogo como itens coletáveis prontos para spawn e coleta imediata. Quando desejar refinar um item, o botão **"Ficha / Registro"** abre o **Modal de Registro Completo** (categoria, raridade, cura HP/MP, bônus de ataque/defesa, preço de compra/venda, limite de stack e ações permitidas).
- **Decisão Confirmada 3 — Modo Test Spawn & Spawn Manual 1 a 1 no Menu do Jogador**: O Menu do Jogador ganhará um painel dedicado **"Modo Test Spawn & Laboratório de Coleta"** permitindo:
  1. **Test Spawn em Anel (360°)**: Cria todos os itens do catálogo/acervo em um círculo ao redor da coordenada atual `(X, Y)` do herói para testar a caminhada e coleta em sequência.
  2. **Menu de Spawn Manual (1 a 1)**: Lista visual e buscável com todos os itens criados/importados para clicar em **"Spawnar Perto do Herói"** individualmente (com controle de distância/raio e quantidade), além de botão para **Limpar Spawns de Teste** do mapa com um clique.

---

## 1. Overview & Core Concept

- **O que faz**: Conecta a criação de itens (importação de PNGs/pastas e ficha de atributos) ao teste prático em tempo real no mapa. Sem sair do Menu do Jogador ou pelo novo Editor de Inventários no topo, o criador pode gerar itens ao redor do personagem no mapa e caminhar sobre eles com o joystick/WASD para coletá-los direto para a mochila.
- **Público / Fluxo de Uso**: Criadores de fases e sistemas de RPG/aventura no Marker Dream que precisam validar rapidamente o visual do item no chão, a colisão de coleta, o feedback sonoro/visual e o empilhamento (stack) nos slots da mochila do herói.
- **Valor Principal**: Elimina o trabalho manual de criar marcadores um por um apenas para testar itens de inventário, unificando acervo de imagens, banco de dados de itens, regras de mochila e spawn de teste.

---

## 2. User Experience & Visual Design

- **Fluxos Principais do Usuário**:
  1. **Fluxo Rápido no Menu do Jogador (Test Spawn)**:
     - O usuário abre a aba **Jogador** no editor de fases (ou no editor de personagens).
     - Acima/abaixo do perfil do herói, acessa a seção **"Modo Test Spawn de Itens"**.
     - Pode acionar **"⚡ Spawn em Anel ao Redor do Herói"** (posicionando os itens em círculo em volta do player) ou abrir a aba **"🎯 Spawn Manual 1 a 1"**, onde escolhe exatamente qual item recém-criado quer dropar ao lado do personagem (podendo escolher raio de distância e limpar todos os itens de teste quando terminar).
     - Ao mover o herói no Emulador até encostar no item spawnado, o item é coletado automaticamente e entra na mochila do jogador com contador de stack atualizado.
  2. **Fluxo no Editor Completo de Inventários & Itens do Game**:
     - Clicando no botão **"Inventário & Itens"** na barra superior (ou no botão **"Abrir Editor Completo de Itens"** dentro do Menu do Jogador), abre-se o workspace dedicado em tela cheia/painel expandido.
     - Divide-se em 4 áreas claras: **Acervo & Importação em Massa (Pastas/PNGs)** · **Catálogo Central de Registros** · **Mochila & Equipamentos do Herói** · **Laboratório Test Spawn + Preview ao Vivo**.
  3. **Fluxo de Auto-Registro + Modal de Ficha do Item**:
     - Ao importar PNGs, cada imagem já nasce registrada com valores padrão (Coletável, Comum, Stack 99x).
     - Clicando em **"Editar Registro"** em qualquer card, abre-se o **Modal de Registro de Item** para configurar efeitos de uso (HP/MP), atributos de equipamento (Ataque/Defesa/Velocidade), raridade, categoria, descrição e valor em ouro/gemas.

- **Identidade Visual & Tema**:
  - *Direção Estética*: Console de desenvolvimento dark-slate de alto contraste combinado com HUD tátil de RPG 2D.
  - *Paleta de Cores (60-30-10)*:
    - **60% Canvas Dominante**: Preto profundo e ardósia escuro (`#09090b` / `bg-zinc-950`) para destacar os sprites PNG transparentes.
    - **30% Superfícies Estruturais**: Painéis em `bg-zinc-900` com divisórias finas `border-zinc-800` e fundo quadriculado sutil nos slots de preview de sprite.
    - **10% Acentos de Ação**: Âmbar vibrante (`#f59e0b` / `amber-500`) para ações de **Test Spawn** e **Mochila**, Azul (`#3b82f6`) para **Catálogo de Registro**, e Esmeralda (`#10b981`) para confirmação de coleta e vínculo ativo.
  - *Tipografia & Hierarquia*:
    - Títulos de seção em `Plus Jakarta Sans` (SemiBold/Bold), descrições limpas sem excesso de badges, e todos os contadores de quantidade, coordenadas `(X, Y)`, slots (`25/30`), preços e atributos numéricos em `JetBrains Mono` com `tabular-nums`.
- **Feedback Interativo**:
  - Toasts imediatos ao spawnar um item (`"⚡ 1x Poção Solar spawnada a 65px do herói"`), indicador da quantidade atual de itens de teste ativos no mapa e botão rápido de limpeza (`"Limpar X Spawns de Teste"`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Auto-Registro na Importação + Modal Sob Demanda**
  - *Abordagem Escolhida*: Importar PNGs cria automaticamente a definição no catálogo (`itemCatalog`) e o asset na galeria (`galleryAssets`), enquanto o Modal de Registro é aberto apenas quando o usuário clica para detalhar atributos.
  - *Por quê*: Quando o criador importa uma pasta com 15 ou 30 ícones de itens, obrigar o preenchimento de 30 modais seguidos travaria o fluxo criativo. O auto-registro permite testar o spawn no mapa imediatamente e detalhar a ficha de cada item conforme a necessidade.
- **Decisão 2: Marcação de "Spawns de Teste" vs. Marcadores Permanentes da Fase**
  - *Abordagem Escolhida*: Os itens gerados pelo **Test Spawn** (em anel ou manual 1 a 1) são criados como marcadores coletáveis reais no mapa (permitindo coleta autêntica pelo jogador no emulador), identificados por um prefixo/flag de teste para que o usuário possa tanto mantê-los na fase quanto removê-los todos de uma vez com o botão **"Limpar Spawns de Teste"**.
  - *Por quê*: Garante que o teste reflita 100% a física, a distância de coleta e a entrada do item na mochila real do jogo, sem poluir permanentemente a fase caso o usuário esteja apenas experimentando.
- **Decisão 3: Editor Dedicado no Topo + Painel Ágil no Menu do Jogador**
  - *Abordagem Escolhida*: Disponibilizar o **Modo Test Spawn + Spawn Manual 1 a 1** diretamente dentro do Menu do Jogador (para acesso rápido lado a lado com o mapa/emulador) e um **Editor Dedicado de Inventários & Itens** acessível no topo da aplicação.
  - *Por quê*: No Menu do Jogador você ajusta e testa rapidamente cada item ao redor do herói vendo o resultado na hora no canvas da fase; já no Editor Dedicado você tem espaço amplo para organizar dezenas de assets, editar o catálogo completo, configurar slots da mochila e testar no emulador acoplado.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Diagrama de Arquitetura e Componentes**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Barra Superior (TopNav / App)                        │
│   [Dashboard]  [Mapa Global]  [Personagens]  [🎒 Inventário & Itens (Solo)]  │
└───────────────┬──────────────────────────────────────────────┬───────────────┘
                │                                              │
                ▼                                              ▼
┌─────────────────────────────────────────┐  ┌─────────────────────────────────┐
│     Menu do Jogador (PlayerStudio)      │  │   Editor Solo de Inventários &  │
│  ┌───────────────────────────────────┐  │  │         Itens do Game           │
│  │ ⚡ Painel Modo Test Spawn          │  │  │ ┌─────────────────────────────┐ │
│  │ • Botão Spawn em Anel (360°)      │  │  │ │ 1. Acervo & Importação PNGs │ │
│  │ • Controle de Raio (px) & Limpeza │  │  │ │ 2. Catálogo Central (Ficha) │ │
│  │ • Lista Spawn Manual (1 a 1)      │  │  │ │ 3. Mochila & Equipamentos   │ │
│  │ • Atalho -> Editor de Itens       │  │  │ │ 4. Test Spawn + Emulador    │ │
│  └─────────────────┬─────────────────┘  │  │ └──────────────┬──────────────┘ │
└────────────────────┼────────────────────┘  └────────────────┼────────────────┘
                     │                                        │
                     └───────────────────┬────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                Estado Central do Projeto (MapProject & Storage)              │
│  • itemCatalog: InventoryItemDefinition[] (Atributos, Raridade, Efeitos)     │
│  • playerInventory: PlayerInventoryConfig (Slots, Moedas, Itens na Bolsa)    │
│  • markers: MapMarker[] (Spawns Coletáveis no Mapa ao redor de player.x/y)   │
└────────────────────────────────────────┬─────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  Emulador / Mapa Interativo (PortraitEmulator)               │
│  • Renderiza os itens spawnados ao redor do herói                            │
│  • Detecta aproximação/coleta -> Move o item do mapa para `playerInventory`  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Modelo de Dados & Estado**:
  - **Catálogo Central (`project.itemCatalog`)**: Armazena as definições de cada item (`id`, `name`, `iconPng`, `iconEmoji`, `category`, `rarity`, `stackable`, `maxStack`, `buyPrice`, `sellPrice`, `consumableEffect`, `equipmentStats`).
  - **Mochila do Jogador (`project.playerInventory`)**: Armazena `maxSlots`, `columns`, `currencies` (`gold`, `gems`), equipamentos ativos e a lista de `items` coletados ou adicionados.
  - **Marcadores de Spawn de Teste (`project.markers`)**: Marcadores do tipo `collectible` gerados com ID prefixado (`marker-collectible-spawn-...`) nas coordenadas calculadas ao redor de `(player.x, player.y)`, vinculados ao `questResource` e `iconPng` do item correspondente.
- **Mapeamento Interativo de Componentes e Estados**:
  - **No `PlayerStudio` (Menu do Jogador)**:
    - Nova seção **"⚡ Modo Test Spawn & Spawn Manual de Itens"** logo abaixo da configuração do personagem.
    - Controles de **Raio do Spawn** (`45px` a `160px`), botão **"Spawn em Anel (Todos)"**, contador de spawns ativos no mapa e botão **"Limpar Spawns de Teste"**.
    - **Seletor de Spawn Manual 1 a 1**: Busca rápida + lista de todos os itens do `itemCatalog` e `galleryAssets` com botões individuais para **"⚡ Spawnar no Mapa"** (1x ou múltiplos ao redor do herói), **"+ Mochila"** (envia direto para a bolsa) e **"Ficha"** (abre o Modal de Registro do item).
  - **No Editor Dedicado de Inventários & Itens**:
    - Nova visão dedicada acessível pelo topo (`TopNav`) e pelo botão **"Abrir Editor de Inventários & Itens"** no `PlayerStudio`.
    - Integra o painel completo de importação de pastas/PNGs com auto-registro, o Catálogo de Itens com o Modal de Registro expandido (incluindo atributos de ataque/defesa para equipamentos além de HP/MP para consumíveis), o gerenciador visual de slots da mochila e o Emulador lateral para testar o spawn e a coleta ao vivo.
  - **Coleta Real no Emulador (`PortraitEmulator`)**:
    - Garante que ao caminhar sobre qualquer item spawnado pelo Test Spawn (ou tocar nele quando próximo), o marcador coletável seja recolhido do mapa e adicionado/empilhado diretamente em `project.playerInventory.items`, refletindo instantaneamente na Mochila HUD do jogador.
